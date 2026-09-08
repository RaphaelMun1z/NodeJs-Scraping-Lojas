import { Router } from "express";
import type { ControladorConfiguracaoScraping } from "../controladores/controlador-configuracao-scraping.js";
import type { ServicoAutenticacao } from "../../autenticacao/servico-autenticacao.js";

export function criarRotasConfiguracaoScraping(controlador: ControladorConfiguracaoScraping, autenticacao: ServicoAutenticacao): Router {
	const roteador = Router();
	roteador.use(autenticacao.middlewareAdministrador());
	roteador.get("/", controlador.obter);
	roteador.put("/", autenticacao.middlewareCsrf(), controlador.atualizar);
	roteador.post("/fontes", autenticacao.middlewareCsrf(), controlador.adicionar);
	roteador.delete("/fontes/:fonte", autenticacao.middlewareCsrf(), controlador.remover);
	roteador.post("/testar-seletores", autenticacao.middlewareCsrf(), controlador.testarSeletores);
	roteador.post("/analisar-html", autenticacao.middlewareCsrf(), controlador.analisarHtml);
	roteador.post("/limpar-produtos", autenticacao.middlewareCsrf(), controlador.limparProdutos);
	roteador.post("/reset-total", autenticacao.middlewareCsrf(), controlador.resetTotal);
	roteador.post("/reset-total/validar-senha", autenticacao.middlewareCsrf(), controlador.validarSenhaReset);
	return roteador;
}
