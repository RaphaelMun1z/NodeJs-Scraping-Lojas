import { Router } from "express";
import type { ServicoAutenticacao } from "../../autenticacao/servico-autenticacao.js";
import type { ControladorMonitoramentoScraping } from "../controladores/controlador-monitoramento-scraping.js";

export function criarRotasMonitoramentoScraping(controlador: ControladorMonitoramentoScraping, autenticacao: ServicoAutenticacao): Router {
	const roteador = Router();
	roteador.use(autenticacao.middlewareAdministrador());
	roteador.get("/status", controlador.status);
	roteador.post("/executar", autenticacao.middlewareCsrf(), controlador.iniciarAgora);
	roteador.get("/execucoes", controlador.listarExecucoes);
	roteador.get("/execucoes/:id", controlador.buscarExecucao);
	roteador.get("/execucoes/:id/logs", controlador.listarLogs);
	roteador.get("/eventos", controlador.eventos);
	return roteador;
}
