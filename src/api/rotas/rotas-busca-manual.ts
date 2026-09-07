import { Router } from "express";
import type { ServicoAutenticacao } from "../../autenticacao/servico-autenticacao.js";
import type { ControladorBuscaManual } from "../controladores/controlador-busca-manual.js";

export function criarRotasBuscaManual(controlador: ControladorBuscaManual, autenticacao: ServicoAutenticacao): Router {
	const roteador = Router();
	roteador.use(autenticacao.middlewareAdministrador());
	roteador.post("/", autenticacao.middlewareCsrf(), controlador.executar);
	return roteador;
}
