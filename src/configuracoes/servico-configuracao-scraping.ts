import { z } from "zod";
import type { NomeFonte } from "../config/fontes.js";
import { configuracaoAplicacao } from "../config/aplicacao.config.js";
import { ModeloConfiguracaoScraping } from "./modelos/configuracao-scraping.model.js";

const nomesFontes: Record<NomeFonte, string> = { kabum: "KaBuM!", amazon: "Amazon", terabyteshop: "Terabyte Shop" };
const esquemaAtualizacao = z.object({
	fontes: z.array(z.object({ fonte: z.enum(["kabum", "amazon", "terabyteshop"]), url: z.string().url(), ativa: z.boolean() })).length(3),
}).superRefine((dados, contexto) => {
	if (new Set(dados.fontes.map((fonte) => fonte.fonte)).size !== 3) {
		contexto.addIssue({ code: "custom", path: ["fontes"], message: "As três fontes devem ser informadas uma única vez" });
	}
});

export interface FonteConfigurada {
	fonte: NomeFonte;
	nome: string;
	url: string;
	ativa: boolean;
}

export interface ConfiguracaoScraping {
	fontes: FonteConfigurada[];
	atualizadaEm: Date;
}

export class ServicoConfiguracaoScraping {
	async obterOuCriarPadrao(): Promise<ConfiguracaoScraping> {
		const existente = await ModeloConfiguracaoScraping.findOne({ chave: "principal" }).lean().exec();
		if (existente) return { fontes: existente.fontes as FonteConfigurada[], atualizadaEm: existente.atualizadaEm };
		if (!configuracaoAplicacao.coleta.url || !configuracaoAplicacao.coleta.urls.amazon || !configuracaoAplicacao.coleta.urls.terabyteshop) {
			throw new Error("Configure SCRAPER_URL, AMAZON_URL e TERABYTESHOP_URL na primeira execução para criar as configurações administrativas");
		}
		const fontes: FonteConfigurada[] = [
			{ fonte: "kabum", nome: nomesFontes.kabum, url: configuracaoAplicacao.coleta.url, ativa: configuracaoAplicacao.coleta.fontesAtivas.includes("kabum") },
			{ fonte: "amazon", nome: nomesFontes.amazon, url: configuracaoAplicacao.coleta.urls.amazon, ativa: configuracaoAplicacao.coleta.fontesAtivas.includes("amazon") },
			{ fonte: "terabyteshop", nome: nomesFontes.terabyteshop, url: configuracaoAplicacao.coleta.urls.terabyteshop, ativa: configuracaoAplicacao.coleta.fontesAtivas.includes("terabyteshop") },
		];
		const atualizadaEm = new Date();
		await ModeloConfiguracaoScraping.create({ chave: "principal", fontes, atualizadaEm });
		return { fontes, atualizadaEm };
	}

	async atualizar(dados: unknown): Promise<ConfiguracaoScraping> {
		const valido = esquemaAtualizacao.parse(dados);
		const fontes = valido.fontes.map((fonte) => ({ ...fonte, nome: nomesFontes[fonte.fonte] }));
		const atualizadaEm = new Date();
		const configuracao = await ModeloConfiguracaoScraping.findOneAndUpdate({ chave: "principal" }, { $set: { fontes, atualizadaEm } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }).lean().exec();
		return { fontes: configuracao.fontes as FonteConfigurada[], atualizadaEm: configuracao.atualizadaEm };
	}

	async obterFontesAtivas(): Promise<FonteConfigurada[]> {
		const configuracao = await this.obterOuCriarPadrao();
		return configuracao.fontes.filter((fonte) => fonte.ativa);
	}
}
