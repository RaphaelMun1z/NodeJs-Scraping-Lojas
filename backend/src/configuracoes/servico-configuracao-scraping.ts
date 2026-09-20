import { z } from "zod";
import { configuracaoAplicacao } from "../config/aplicacao.config.js";
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
	tipoPaginacao: z.enum(["nenhuma", "proximaPagina", "url"]).default("nenhuma"),
	seletorProximaPagina: z.string().max(1_000).default(""),
	maxPaginas: z.number().int().min(1).max(100).default(10),
	parametroPagina: z.string().trim().max(100).default("page"),
	urlPaginacaoTemplate: z.string().max(2_048).default(""),
}).superRefine((seletores, contexto) => {
	if (seletores.tipoPaginacao === "proximaPagina" && !seletores.seletorProximaPagina.trim()) {
		contexto.addIssue({ code: "custom", path: ["seletorProximaPagina"], message: "Informe o seletor da próxima página" });
	}
	if (seletores.tipoPaginacao === "url" && !seletores.parametroPagina.trim() && !seletores.urlPaginacaoTemplate.trim()) {
		contexto.addIssue({ code: "custom", path: ["parametroPagina"], message: "Informe o parâmetro ou o template da paginação" });
	}
	if (seletores.urlPaginacaoTemplate && !seletores.urlPaginacaoTemplate.includes("{pagina}")) {
		contexto.addIssue({ code: "custom", path: ["urlPaginacaoTemplate"], message: "O template deve conter {pagina}" });
	}
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
	tipoPaginacao: "nenhuma" as const,
	seletorProximaPagina: "",
	maxPaginas: 10,
	parametroPagina: "page",
	urlPaginacaoTemplate: "",
};
const esquemaHorario = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Informe um horário no formato HH:mm");
const esquemaFusoHorario = z.string().trim().min(1).max(100).refine((fusoHorario) => {
	try {
		Intl.DateTimeFormat(undefined, { timeZone: fusoHorario });
		return true;
	} catch {
		return false;
	}
}, "Informe um fuso horário IANA válido, por exemplo America/Sao_Paulo");
const esquemaAgendamento = z.object({
	horarios: z.array(esquemaHorario).min(1).max(12).superRefine((horarios, contexto) => {
		if (new Set(horarios).size !== horarios.length) {
			contexto.addIssue({ code: "custom", message: "Cada horário deve ser único" });
		}
	}),
	fusoHorario: esquemaFusoHorario,
});
const esquemaTelegram = z.object({
	habilitado: z.boolean().default(false),
	chatId: z.string().trim().max(100).default(""),
	percentualAbaixoMedia: z.number().min(1).max(99).default(65),
	formato: z.object({
		templateHtml: z.string().min(1).max(8_000).default("<b>{{titulo}}</b>\\nPreço: {{preco}}\\nMédia: {{media}}\\n{{percentual}}\\n{{url}}"),
		campos: z.array(z.object({
			chave: z.enum(["titulo", "preco", "media", "percentual", "url"]),
			habilitado: z.boolean().default(true),
			rotulo: z.string().trim().max(80).default(""),
		})).min(1).max(5).default([
			{ chave: "titulo", habilitado: true, rotulo: "Produto" },
			{ chave: "preco", habilitado: true, rotulo: "Preço" },
			{ chave: "media", habilitado: true, rotulo: "Média" },
			{ chave: "percentual", habilitado: true, rotulo: "Desconto" },
			{ chave: "url", habilitado: true, rotulo: "Link" },
		]),
		separador: z.string().max(20).default("\\n"),
		prefixo: z.string().max(500).default(""),
		sufixo: z.string().max(500).default(""),
		modoTexto: z.enum(["plain", "HTML", "MarkdownV2"]).default("plain"),
		previewLink: z.boolean().default(true),
		maxCaracteres: z.number().int().min(100).max(4096).default(4096),
	}).default({
		templateHtml: "<b>{{titulo}}</b>\\nPreço: {{preco}}\\nMédia: {{media}}\\n{{percentual}}\\n{{url}}",
		campos: [
			{ chave: "titulo", habilitado: true, rotulo: "Produto" },
			{ chave: "preco", habilitado: true, rotulo: "Preço" },
			{ chave: "media", habilitado: true, rotulo: "Média" },
			{ chave: "percentual", habilitado: true, rotulo: "Desconto" },
			{ chave: "url", habilitado: true, rotulo: "Link" },
		],
		separador: "\\n",
		prefixo: "",
		sufixo: "",
		modoTexto: "plain",
		previewLink: true,
		maxCaracteres: 4096,
	}),
});
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

const esquemaCategoriaFonte = z.object({
	id: z.string().max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	categoria: z.string().trim().min(1).max(100),
	icone: z.string().max(40).default("tag"),
	url: esquemaUrlFonte.default(""),
	ativa: z.boolean().default(false),
	seletores: esquemaSeletores.default(seletoresPadrao),
});

const esquemaFonte = z.object({
	fonte: z.string().max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
	nome: z.string().trim().min(1).max(100).optional(),
	logo: z.string().max(950_000, "A logo deve ter no máximo 700 KB").default(""),
	ativa: z.boolean(),
	categorias: z.array(esquemaCategoriaFonte).max(100).default([]),
}).superRefine((fonte, contexto) => {
	if (new Set(fonte.categorias.map((item) => item.id)).size !== fonte.categorias.length) {
		contexto.addIssue({ code: "custom", path: ["categorias"], message: "Cada configuração de categoria deve ter um identificador único" });
	}
	const nomes = fonte.categorias.map((item) => item.categoria.toLocaleLowerCase("pt-BR"));
	if (new Set(nomes).size !== nomes.length) {
		contexto.addIssue({ code: "custom", path: ["categorias"], message: "Cada categoria deve aparecer uma única vez por fonte" });
	}
});

const esquemaAtualizacao = z.object({
	fontes: z.array(esquemaFonte).max(100),
	telegram: esquemaTelegram.optional(),
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
	ativa: boolean;
	categorias: CategoriaFonteConfigurada[];
}

export interface CategoriaFonteConfigurada {
	id: string;
	categoria: string;
	icone: string;
	url: string;
	ativa: boolean;
	seletores: SeletoresSite;
}

export interface ConfiguracaoScraping {
	fontes: FonteConfigurada[];
	agendamento: AgendamentoColeta;
	telegram: TelegramConfig;
	atualizadaEm: Date;
}

export interface TelegramConfig {
	habilitado: boolean;
	chatId: string;
	percentualAbaixoMedia: number;
	formato: FormatoTelegram;
}

export interface CampoFormatoTelegram {
	chave: "titulo" | "preco" | "media" | "percentual" | "url";
	habilitado: boolean;
	rotulo: string;
}

export interface FormatoTelegram {
	templateHtml: string;
	campos: CampoFormatoTelegram[];
	separador: string;
	prefixo: string;
	sufixo: string;
	modoTexto: "plain" | "HTML" | "MarkdownV2";
	previewLink: boolean;
	maxCaracteres: number;
}

export interface AgendamentoColeta {
	horarios: string[];
	fusoHorario: string;
}

export class ServicoConfiguracaoScraping {
	constructor(
		private readonly agendamentoPadrao: AgendamentoColeta = configuracaoAplicacao.agendamento,
	) {}

	private normalizarAgendamento(agendamento: unknown): AgendamentoColeta {
		return esquemaAgendamento.parse(agendamento ?? this.agendamentoPadrao);
	}

	private normalizarFonte(
		fonte: Omit<FonteConfigurada, "nome" | "categorias"> & {
			nome?: string;
		categorias?: CategoriaFonteConfigurada[];
		url?: string;
		seletores?: SeletoresSite;
	},
	): FonteConfigurada {
		const categorias = fonte.categorias?.length
			? fonte.categorias.map((item) => ({
				...item,
				icone: item.icone ?? "tag",
				seletores: esquemaSeletores.parse(item.seletores ?? {}),
			}))
			: fonte.url
				? [{ id: "geral", categoria: "Definir categoria", icone: "tag", url: fonte.url, ativa: false, seletores: esquemaSeletores.parse(fonte.seletores ?? {}) }]
				: [];
		return {
			fonte: fonte.fonte,
			nome: fonte.nome?.trim() || fonte.fonte,
			logo: fonte.logo ?? "",
			ativa: fonte.ativa,
			categorias,
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
					this.normalizarFonte(fonte as FonteConfigurada),
				),
				agendamento: this.normalizarAgendamento(existente.agendamento),
				// Configurações anteriores à integração com Telegram não possuem esse campo.
				telegram: esquemaTelegram.parse(existente.telegram ?? {}),
				atualizadaEm: existente.atualizadaEm,
			};
		}
		// A configuração inicial é vazia. Fontes só entram após cadastro explícito
		// na área administrativa, com URL e seletores validados antes da ativação.
		const fontes: FonteConfigurada[] = [];
		const atualizadaEm = new Date();
		const agendamento = this.normalizarAgendamento(this.agendamentoPadrao);
		await ModeloConfiguracaoScraping.create({ chave: "principal", fontes, agendamento, atualizadaEm });
		return { fontes, agendamento, telegram: esquemaTelegram.parse({}), atualizadaEm };
	}

	async atualizar(dados: unknown): Promise<ConfiguracaoScraping> {
		const valido = esquemaAtualizacao.parse(dados);
		for (const fonte of valido.fontes) {
			if (fonte.ativa && !fonte.categorias.some((categoria) => categoria.ativa)) {
				throw new Error(`Ative ao menos uma categoria antes de ativar a fonte ${fonte.nome ?? fonte.fonte}`);
			}
			for (const categoria of fonte.categorias.filter((item) => item.ativa)) {
				if (!categoria.url) {
					throw new Error(
						`Configure uma URL válida para ${categoria.categoria} em ${fonte.nome ?? fonte.fonte}`,
					);
				}
				for (const campo of ["item", "titulo", "preco", "imagem"] as const) {
					if (!categoria.seletores[campo].trim()) {
						throw new Error(`Configure o seletor obrigatório ${campo} para ${categoria.categoria} em ${fonte.nome ?? fonte.fonte}`);
					}
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
			categorias: fonte.categorias.map((categoria) => ({ ...categoria, seletores: { ...categoria.seletores } })),
		}));
		const atualizadaEm = new Date();
		const configuracao = await ModeloConfiguracaoScraping.findOneAndUpdate(
			{ chave: "principal" },
			{ $set: { fontes, telegram: valido.telegram ?? existente?.telegram ?? { habilitado: false, chatId: "" }, atualizadaEm } },
			{ upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
		)
			.lean()
			.exec();
		return {
			fontes: configuracao.fontes.map((fonte) =>
				this.normalizarFonte(fonte as FonteConfigurada),
			),
			agendamento: this.normalizarAgendamento(configuracao.agendamento),
			telegram: esquemaTelegram.parse(configuracao.telegram),
			atualizadaEm: configuracao.atualizadaEm,
		};
	}

	async atualizarTelegram(dados: unknown): Promise<TelegramConfig> {
		const telegram = esquemaTelegram.parse(dados);
		const configuracao = await ModeloConfiguracaoScraping.findOneAndUpdate(
			{ chave: "principal" },
			{ $set: { telegram, atualizadaEm: new Date() }, $setOnInsert: { fontes: [], agendamento: this.agendamentoPadrao } },
			{ upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
		).lean().exec();
		return esquemaTelegram.parse(configuracao.telegram);
	}

	async atualizarAgendamento(dados: unknown): Promise<AgendamentoColeta> {
		const agendamento = esquemaAgendamento.parse(dados);
		const configuracao = await ModeloConfiguracaoScraping.findOneAndUpdate(
			{ chave: "principal" },
			{ $set: { agendamento, atualizadaEm: new Date() }, $setOnInsert: { fontes: [] } },
			{ upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
		).lean().exec();
		return this.normalizarAgendamento(configuracao.agendamento);
	}

	async adicionar(dados: unknown): Promise<ConfiguracaoScraping> {
		const fonteValidada = esquemaFonte.parse(dados);
		const fonte = {
			...fonteValidada,
			nome: z.string().trim().min(1).max(100).parse(fonteValidada.nome),
			ativa: false,
		};
		const atual = await this.obterOuCriarPadrao();
		if (atual.fontes.some((item) => item.fonte === fonte.fonte)) {
			throw new Error("Já existe uma fonte com esse identificador");
		}
		// Uma fonte nova nunca entra em produção antes de os seletores serem
		// revisados e salvos na página específica da fonte.
		return this.atualizar({ fontes: [...atual.fontes, { ...fonte, ativa: false, categorias: fonte.categorias ?? [] }] });
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
