import { z } from "zod";
import type { SeletoresSite } from "../modelos/seletores-site.js";
import { ModeloConfiguracaoScraping } from "./modelos/configuracao-scraping.model.js";

const esquemaSeletores = z.object({
	item: z.string().max(1_000).default(""),
	titulo: z.string().max(1_000).default(""),
	preco: z.string().max(1_000).default(""),
	precoAntigo: z.string().max(1_000).default(""),
	imagem: z.string().max(1_000).default(""),
	url: z.string().max(1_000).default(""),
	paginaVirtualizada: z.boolean().default(false),
	carregarMais: z.string().max(1_000).default(""),
});
const seletoresPadrao = {
	item: "",
	titulo: "",
	preco: "",
	precoAntigo: "",
	imagem: "",
	url: "",
	paginaVirtualizada: false,
	carregarMais: "",
};
const esquemaUrlFonte = z
	.string()
	.max(2_048)
	.refine((valor) => {
		if (!valor) return true;
		try {
			return ["http:", "https:"].includes(new URL(valor).protocol);
		} catch {
			return false;
		}
	}, "Informe uma URL HTTP ou HTTPS válida");

const esquemaFonte = z.object({
	fonte: z.string().max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	nome: z.string().trim().min(1).max(100).optional(),
	logo: z.string().max(950_000, "A logo deve ter no máximo 700 KB").default(""),
	url: esquemaUrlFonte.default(""),
	ativa: z.boolean(),
	seletores: esquemaSeletores.default(seletoresPadrao),
});

const esquemaAtualizacao = z.object({
	fontes: z.array(esquemaFonte).max(100),
}).superRefine((dados, contexto) => {
	if (
		new Set(dados.fontes.map((fonte) => fonte.fonte)).size !==
		dados.fontes.length
	) {
		contexto.addIssue({
			code: "custom",
			path: ["fontes"],
			message: "Cada fonte deve ser informada uma única vez",
		});
	}
});

export interface FonteConfigurada {
	fonte: string;
	nome: string;
	logo: string;
	url: string;
	ativa: boolean;
	seletores: SeletoresSite;
}

export interface ConfiguracaoScraping {
	fontes: FonteConfigurada[];
	atualizadaEm: Date;
}

export class ServicoConfiguracaoScraping {
	private aplicarSeletores(
		fonte: Omit<FonteConfigurada, "nome" | "seletores"> & {
			nome?: string;
			seletores?: SeletoresSite;
		},
	): FonteConfigurada {
		return {
			...fonte,
			nome: fonte.nome?.trim() || fonte.fonte,
			logo: fonte.logo ?? "",
			seletores: esquemaSeletores.parse(fonte.seletores ?? {}),
		};
	}

	async obterOuCriarPadrao(): Promise<ConfiguracaoScraping> {
		const existente = await ModeloConfiguracaoScraping.findOne({
			chave: "principal",
		})
			.lean()
			.exec();
		if (existente) {
			return {
				fontes: existente.fontes.map((fonte) =>
					this.aplicarSeletores(fonte as FonteConfigurada),
				),
				atualizadaEm: existente.atualizadaEm,
			};
		}
		// A configuração inicial é vazia. Fontes só entram após cadastro explícito
		// na área administrativa, com URL e seletores validados antes da ativação.
		const fontes: FonteConfigurada[] = [];
		const atualizadaEm = new Date();
		await ModeloConfiguracaoScraping.create({ chave: "principal", fontes, atualizadaEm });
		return { fontes, atualizadaEm };
	}

	async atualizar(dados: unknown): Promise<ConfiguracaoScraping> {
		const valido = esquemaAtualizacao.parse(dados);
		for (const fonte of valido.fontes) {
			if (!fonte.ativa) continue;
			if (!fonte.url) {
				throw new Error(
					`Configure uma URL válida antes de ativar a fonte ${fonte.nome ?? fonte.fonte}`,
				);
			}
			for (const campo of ["item", "titulo", "preco", "imagem"] as const) {
				if (!fonte.seletores[campo].trim()) {
					throw new Error(
						`Configure o seletor obrigatório ${campo} antes de ativar a fonte ${fonte.nome ?? fonte.fonte}`,
					);
				}
			}
		}
		const existente = await ModeloConfiguracaoScraping.findOne({
			chave: "principal",
		})
			.lean()
			.exec();
		const fontes = valido.fontes.map((fonte) => ({
			...fonte,
			logo:
				fonte.logo ||
				existente?.fontes.find((item) => item.fonte === fonte.fonte)?.logo ||
				"",
			nome: fonte.nome ?? fonte.fonte,
			seletores: { ...fonte.seletores },
		}));
		const atualizadaEm = new Date();
		const configuracao = await ModeloConfiguracaoScraping.findOneAndUpdate(
			{ chave: "principal" },
			{ $set: { fontes, atualizadaEm } },
			{ upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
		)
			.lean()
			.exec();
		return {
			fontes: configuracao.fontes.map((fonte) =>
				this.aplicarSeletores(fonte as FonteConfigurada),
			),
			atualizadaEm: configuracao.atualizadaEm,
		};
	}

	async adicionar(dados: unknown): Promise<ConfiguracaoScraping> {
		const fonte = esquemaFonte
			.extend({
				nome: z.string().trim().min(1).max(100),
				ativa: z.boolean().default(false),
			})
			.parse(dados);
		const atual = await this.obterOuCriarPadrao();
		if (atual.fontes.some((item) => item.fonte === fonte.fonte)) {
			throw new Error("Já existe uma fonte com esse identificador");
		}
		// Uma fonte nova nunca entra em produção antes de os seletores serem
		// revisados e salvos na página específica da fonte.
		return this.atualizar({ fontes: [...atual.fontes, { ...fonte, ativa: false }] });
	}

	async remover(nomeFonte: string): Promise<ConfiguracaoScraping> {
		const atual = await this.obterOuCriarPadrao();
		if (!atual.fontes.some((fonte) => fonte.fonte === nomeFonte)) {
			throw new Error("Fonte não encontrada");
		}
		return this.atualizar({
			fontes: atual.fontes.filter((fonte) => fonte.fonte !== nomeFonte),
		});
	}

	async obterFontesAtivas(): Promise<FonteConfigurada[]> {
		const configuracao = await this.obterOuCriarPadrao();
		return configuracao.fontes.filter((fonte) => fonte.ativa);
	}
}
