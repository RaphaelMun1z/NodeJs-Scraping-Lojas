import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pino from "pino";
import { config as carregarAmbiente } from "dotenv";

carregarAmbiente({ quiet: true });

if (process.platform === "win32") {
	try { execFileSync("chcp", ["65001"], { stdio: "ignore" }); } catch { /* Mantém o logger funcionando se o terminal não permitir a alteração. */ }
}

process.stdout.setDefaultEncoding("utf8");
process.stderr.setDefaultEncoding("utf8");

const diretorioPadrao = resolve(dirname(fileURLToPath(import.meta.url)), "../../.dados/logs");
const arquivoLog = process.env.LOG_FILE ?? join(diretorioPadrao, "aplicacao.log");
mkdirSync(dirname(arquivoLog), { recursive: true });

const destino = process.env.LOG_PRETTY === "true"
	? pino.transport({
		target: "pino-pretty",
		options: {
			destination: arquivoLog,
			colorize: false,
			translateTime: "yyyy-mm-dd HH:MM:ss.l",
			singleLine: true,
			errorLikeObjectKeys: ["err", "error", "erro"],
			ignore: "pid,hostname",
		},
	})
	: pino.destination({ dest: arquivoLog, sync: false });

export const logger = pino({
	level: process.env.LOG_LEVEL ?? "info",
}, destino);

function formatarMensagemArquivo(argumentos: unknown[]): string {
	return argumentos.map((argumento) => {
		if (typeof argumento === "string") return argumento;
		try { return JSON.stringify(argumento); } catch { return String(argumento); }
	}).join(" ");
}

// Redireciona mensagens legadas para que também sejam persistidas no arquivo.
console.log = (...argumentos: unknown[]) => logger.info(formatarMensagemArquivo(argumentos));
console.warn = (...argumentos: unknown[]) => logger.warn(formatarMensagemArquivo(argumentos));
console.error = (...argumentos: unknown[]) => logger.error(formatarMensagemArquivo(argumentos));
