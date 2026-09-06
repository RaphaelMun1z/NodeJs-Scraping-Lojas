import "dotenv/config";
import { z } from "zod";

const esquemaConfiguracao = z.object({
  PORTA_API: z.coerce.number().int().positive().default(3000),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/scraping_lojas"),
  SCRAPER_URL: z.string().url(),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15_000),
  USER_AGENT: z.string().min(1).default("Mozilla/5.0 (compatible; ScrapingLojas/2.0)"),
  SALVAR_COLETA: z
    .enum(["true", "false"])
    .default("false")
    .transform((valor) => valor === "true"),
  CRON_EXPRESSAO: z.string().min(1).default("0 15 * * *"),
  CRON_FUSO_HORARIO: z.string().min(1).default("America/Sao_Paulo"),
  EXECUTAR_COLETA_AO_INICIAR: z
    .enum(["true", "false"])
    .default("true")
    .transform((valor) => valor === "true"),
});

const ambiente = esquemaConfiguracao.parse(process.env);

export const configuracaoAplicacao = {
  api: {
    porta: ambiente.PORTA_API,
  },
  banco: {
    uri: ambiente.MONGODB_URI,
  },
  coleta: {
    url: ambiente.SCRAPER_URL,
    tempoLimiteMs: ambiente.REQUEST_TIMEOUT_MS,
    agenteUsuario: ambiente.USER_AGENT,
    salvarColeta: ambiente.SALVAR_COLETA,
    executarAoIniciar: ambiente.EXECUTAR_COLETA_AO_INICIAR,
  },
  agendamento: {
    expressao: ambiente.CRON_EXPRESSAO,
    fusoHorario: ambiente.CRON_FUSO_HORARIO,
  },
} as const;
