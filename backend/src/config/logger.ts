import "dotenv/config";
import { execFileSync } from "node:child_process";
import pino from "pino";

if (process.platform === "win32") {
	try { execFileSync("chcp", ["65001"], { stdio: "ignore" }); } catch { /* Mantém o logger funcionando se o terminal não permitir a alteração. */ }
}
process.stdout.setDefaultEncoding("utf8");
process.stderr.setDefaultEncoding("utf8");

export const logger = pino({
	level: process.env.LOG_LEVEL ?? "info",
	transport: process.env.LOG_PRETTY !== "false" ? {
		target: "pino-pretty",
		options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" },
	} : undefined,
});

function formatarMensagemConsole(argumentos: unknown[]): string {
	return argumentos.map((argumento) => {
		if (typeof argumento === "string") return argumento;
		try { return JSON.stringify(argumento); } catch { return String(argumento); }
	}).join(" ");
}

// Redireciona mensagens legadas para manter o terminal padronizado.
console.log = (...argumentos: unknown[]) => logger.info(formatarMensagemConsole(argumentos));
console.warn = (...argumentos: unknown[]) => logger.warn(formatarMensagemConsole(argumentos));
console.error = (...argumentos: unknown[]) => logger.error(formatarMensagemConsole(argumentos));
