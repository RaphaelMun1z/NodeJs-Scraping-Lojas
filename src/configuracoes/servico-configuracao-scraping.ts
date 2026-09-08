import { z } from "zod";
import { seletoresPorFonte, type NomeFonte } from "../config/fontes.js";
import type { SeletoresSite } from "../config/selectors.js";
import { ModeloConfiguracaoScraping } from "./modelos/configuracao-scraping.model.js";

const esquemaAtualizacao = z.object({
	fontes: z.array(z.object({ fonte: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), nome: z.string().min(1).optional(), logo: z.string().default(""), url: z.string().default(""), ativa: z.boolean(), seletores: z.object({ item: z.string().default(""), titulo: z.string().default(""), preco: z.string().default(""), precoAntigo: z.string().default(""), imagem: z.string().default(""), url: z.string().default(""), paginaVirtualizada: z.boolean().default(false), carregarMais: z.string().default("") }) })),
}).superRefine((dados, contexto) => {
	if (new Set(dados.fontes.map((fonte) => fonte.fonte)).size !== dados.fontes.length) {
		contexto.addIssue({ code: "custom", path: ["fontes"], message: "Cada fonte deve ser informada uma única vez" });
	}
});

export interface FonteConfigurada {
	fonte: NomeFonte;
	nome: string;
	logo?: string;
	url: string;
	ativa: boolean;
	seletores: SeletoresSite;
}

export interface ConfiguracaoScraping {
	fontes: FonteConfigurada[];
	atualizadaEm: Date;
}

export class ServicoConfiguracaoScraping {
	private aplicarSeletores(fonte: { fonte: NomeFonte; nome: string; url: string; ativa: boolean; seletores?: SeletoresSite }): FonteConfigurada {
		return { ...fonte, seletores: { ...seletoresPorFonte[fonte.fonte], ...fonte.seletores } as SeletoresSite };
	}

	async obterOuCriarPadrao(): Promise<ConfiguracaoScraping> {
		const existente = await ModeloConfiguracaoScraping.findOne({ chave: "principal" }).lean().exec();
		if (existente) return { fontes: existente.fontes.map((fonte) => this.aplicarSeletores(fonte as FonteConfigurada)), atualizadaEm: existente.atualizadaEm };
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
			if (!z.string().url().safeParse(fonte.url).success) throw new Error(`Configure uma URL vÃ¡lida antes de ativar a fonte ${fonte.nome ?? fonte.fonte}`);
			for (const campo of ["item", "titulo", "preco", "imagem"] as const) if (!fonte.seletores[campo].trim()) throw new Error(`Configure o seletor obrigatÃ³rio ${campo} antes de ativar a fonte ${fonte.nome ?? fonte.fonte}`);
		}
		const existente = await ModeloConfiguracaoScraping.findOne({ chave: "principal" }).lean().exec();
		const fontes = valido.fontes.map((fonte) => ({ ...fonte, logo: fonte.logo || existente?.fontes.find((item) => item.fonte === fonte.fonte)?.logo || "", nome: fonte.nome ?? fonte.fonte, seletores: { ...seletoresPorFonte[fonte.fonte], ...fonte.seletores } }));
		const atualizadaEm = new Date();
		const configuracao = await ModeloConfiguracaoScraping.findOneAndUpdate({ chave: "principal" }, { $set: { fontes, atualizadaEm } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }).lean().exec();
		return { fontes: configuracao.fontes.map((fonte) => this.aplicarSeletores(fonte as FonteConfigurada)), atualizadaEm: configuracao.atualizadaEm };
	}

	async adicionar(dados: unknown): Promise<ConfiguracaoScraping> {
		const fonte = z.object({ fonte: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), nome: z.string().min(1), logo: z.string().default(""), url: z.string().default(""), ativa: z.boolean().default(false), seletores: z.object({ item: z.string().default(""), titulo: z.string().default(""), preco: z.string().default(""), precoAntigo: z.string().default(""), imagem: z.string().default(""), url: z.string().default(""), paginaVirtualizada: z.boolean().default(false), carregarMais: z.string().default("") }) }).parse(dados);
		const atual = await this.obterOuCriarPadrao();
		if (atual.fontes.some((item) => item.fonte === fonte.fonte)) throw new Error("Já existe uma fonte com esse identificador");
		// Uma fonte nova nunca entra em produÃ§Ã£o antes de os seletores serem
		// revisados e salvos na pÃ¡gina especÃ­fica da fonte.
		return this.atualizar({ fontes: [...atual.fontes, { ...fonte, ativa: false }] });
	}

	async remover(nomeFonte: string): Promise<ConfiguracaoScraping> {
		const atual = await this.obterOuCriarPadrao();
		if (!atual.fontes.some((fonte) => fonte.fonte === nomeFonte)) throw new Error("Fonte não encontrada");
		return this.atualizar({ fontes: atual.fontes.filter((fonte) => fonte.fonte !== nomeFonte) });
	}

	async obterFontesAtivas(): Promise<FonteConfigurada[]> {
		const configuracao = await this.obterOuCriarPadrao();
		return configuracao.fontes.filter((fonte) => fonte.ativa);
	}
}
