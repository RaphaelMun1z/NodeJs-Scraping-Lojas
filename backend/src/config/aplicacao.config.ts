import "dotenv/config";
import { z } from "zod";

const esquemaConfiguracao = z.object({
	PORTA_API: z.coerce.number().int().positive().default(3000),
	MONGODB_URI: z
		.string()
		.min(1)
		.default("mongodb://127.0.0.1:27017/scraping_lojas"),
	REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
	USER_AGENT: z
		.string()
		.min(1)
		.default("Mozilla/5.0 (compatible; ScrapingLojas/2.0)"),
	SALVAR_COLETA: z
		.enum(["true", "false"])
		.default("false")
		.transform((valor) => valor === "true"),
	CRON_EXPRESSAO: z.string().min(1).default("*/30 * * * *"),
	CRON_FUSO_HORARIO: z.string().min(1).default("America/Sao_Paulo"),
	EXECUTAR_COLETA_AO_INICIAR: z
		.enum(["true", "false"])
		.default("true")
		.transform((valor) => valor === "true"),
	SCRAPING_RETENCAO_EXECUCOES: z.coerce.number().int().positive().default(100),
	SCRAPING_RETENCAO_LOGS: z.coerce.number().int().positive().default(2000),
	HISTORICO_PRECO_RETENCAO_DIAS: z.coerce.number().int().nonnegative().default(730),
	CLASSIFICADOR_URL: z.string().url().default("http://127.0.0.1:11434/api/generate"),
	ANALISADOR_SELETORES_MODELO: z.string().min(1).default("gemma3:1b"),
});

// Valida a configuração na inicialização para falhar cedo com uma mensagem clara.
const ambiente = esquemaConfiguracao.parse(process.env);

export const configuracaoAplicacao = {
	api: {
		porta: ambiente.PORTA_API,
	},
	banco: {
		uri: ambiente.MONGODB_URI,
	},
	coleta: {
		tempoLimiteMs: ambiente.REQUEST_TIMEOUT_MS,
		agenteUsuario: ambiente.USER_AGENT,
		salvarColeta: ambiente.SALVAR_COLETA,
		executarAoIniciar: ambiente.EXECUTAR_COLETA_AO_INICIAR,
		historicoRetencaoDias: ambiente.HISTORICO_PRECO_RETENCAO_DIAS,
		analisadorSeletores: { url: ambiente.CLASSIFICADOR_URL, modelo: ambiente.ANALISADOR_SELETORES_MODELO },
	},
	agendamento: {
		expressao: ambiente.CRON_EXPRESSAO,
		fusoHorario: ambiente.CRON_FUSO_HORARIO,
	},
} as const;
