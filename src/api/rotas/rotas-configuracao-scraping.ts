import { Router } from "express";
import type { ControladorConfiguracaoScraping } from "../controladores/controlador-configuracao-scraping.js";
import type { ServicoAutenticacao } from "../../autenticacao/servico-autenticacao.js";

export function criarRotasConfiguracaoScraping(controlador: ControladorConfiguracaoScraping, autenticacao: ServicoAutenticacao): Router {
	const roteador = Router();
	roteador.use(autenticacao.middlewareAdministrador());
	roteador.get("/", controlador.obter);
	roteador.put("/", autenticacao.middlewareCsrf(), controlador.atualizar);
	return roteador;
}
