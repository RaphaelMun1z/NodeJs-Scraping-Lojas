import { config as carregarAmbiente } from "dotenv";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { z } from "zod";

// O backend pode ser iniciado a partir de backend/ ou da raiz do repositório.
// Carregamos explicitamente o .env compartilhado sem sobrescrever variáveis
// fornecidas pelo processo (como as do Docker).
carregarAmbiente({
	path: resolve(fileURLToPath(new URL("../../../.env", import.meta.url))),
});

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
	TELEGRAM_BOT_TOKEN: z.string().trim().default(""),
	SALVAR_COLETA: z
		.enum(["true", "false"])
		.default("true")
		.transform((valor) => valor === "true"),
	HORARIOS_COLETA: z.string().min(1).default("00:00,12:00"),
	CRON_FUSO_HORARIO: z.string().min(1).default("America/Sao_Paulo"),
	EXECUTAR_COLETA_AO_INICIAR: z
		.enum(["true", "false"])
		.default("true")
		.transform((valor) => valor === "true"),
	SCRAPING_RETENCAO_EXECUCOES: z.coerce.number().int().positive().default(100),
	SCRAPING_RETENCAO_LOGS: z.coerce.number().int().positive().default(2000),
	HISTORICO_PRECO_RETENCAO_DIAS: z.coerce.number().int().nonnegative().default(730),
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
	},
	telegram: { botToken: ambiente.TELEGRAM_BOT_TOKEN },
	agendamento: {
		horarios: ambiente.HORARIOS_COLETA.split(",").map((horario) => horario.trim()).filter(Boolean),
		fusoHorario: ambiente.CRON_FUSO_HORARIO,
	},
} as const;
