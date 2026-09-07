import { Router } from "express";
import type { ControladorAutenticacao } from "../controladores/controlador-autenticacao.js";
import type { ServicoAutenticacao } from "../../autenticacao/servico-autenticacao.js";

export function criarRotasAutenticacao(controlador: ControladorAutenticacao, autenticacao: ServicoAutenticacao): Router {
	const roteador = Router();
	const administrador = autenticacao.middlewareAdministrador();
	const csrf = autenticacao.middlewareCsrf();
	roteador.post("/login", controlador.login);
	roteador.post("/login/verificar-mfa", controlador.verificarMfa);
	roteador.get("/sessao", administrador, controlador.sessao);
	roteador.post("/logout", administrador, csrf, controlador.logout);
	roteador.post("/mfa/iniciar", administrador, csrf, controlador.iniciarMfa);
	roteador.post("/mfa/ativar", administrador, csrf, controlador.ativarMfa);
	return roteador;
}
