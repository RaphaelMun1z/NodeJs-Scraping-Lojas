import type { Request, Response } from "express";
import type { ServicoConfiguracaoScraping } from "../../configuracoes/servico-configuracao-scraping.js";
import type { ServicoLimpezaProdutos } from "../../servicos/servico-limpeza-produtos.js";
import type { ClienteHttp } from "../../clientes/cliente-http.js";
import { AnalisadorSite } from "../../analisadores/analisador-site.js";
import type { SeletoresSite } from "../../modelos/seletores-site.js";
import type { AnalisadorSeletoresOllama } from "../../analisadores/analisador-seletores-ollama.js";
import type { ServicoResetSistema } from "../../servicos/servico-reset-sistema.js";
import type { ServicoAutenticacao } from "../../autenticacao/servico-autenticacao.js";

export class ControladorConfiguracaoScraping {
	constructor(
		private readonly configuracao: ServicoConfiguracaoScraping,
		private readonly limpezaProdutos: ServicoLimpezaProdutos,
		private readonly clienteHttp: ClienteHttp,
		private readonly analisador = new AnalisadorSite(),
		private readonly analisadorSeletores?: AnalisadorSeletoresOllama,
		private readonly resetSistema?: ServicoResetSistema,
		private readonly autenticacao?: ServicoAutenticacao,
	) {}

	obter = async (_requisicao: Request, resposta: Response): Promise<void> => {
		resposta.json({ dados: await this.configuracao.obterOuCriarPadrao() });
	};

	atualizar = async (requisicao: Request, resposta: Response): Promise<void> => {
		resposta.json({ dados: await this.configuracao.atualizar(requisicao.body) });
	};

	adicionar = async (requisicao: Request, resposta: Response): Promise<void> => {
		resposta.status(201).json({ dados: await this.configuracao.adicionar(requisicao.body) });
	};

	remover = async (requisicao: Request, resposta: Response): Promise<void> => {
		const nomeFonte = String(requisicao.params.fonte ?? "");
		resposta.json({ dados: await this.configuracao.remover(nomeFonte) });
	};

	limparProdutos = async (requisicao: Request, resposta: Response): Promise<void> => {
		if (requisicao.body?.confirmacao !== "reset") {
			resposta.status(400).json({ erro: "Digite reset para confirmar a limpeza dos produtos" });
			return;
		}
		resposta.json({ dados: await this.limpezaProdutos.executar() });
	};

	resetTotal = async (requisicao: Request, resposta: Response): Promise<void> => {
		const senha = typeof requisicao.body?.senha === "string" ? requisicao.body.senha : "";
		const confirmacao = requisicao.body?.confirmacao;
		if (!this.resetSistema || !this.autenticacao) { resposta.status(503).json({ erro: "Reset total não está disponível" }); return; }
		if (!senha) { resposta.status(400).json({ erro: "Informe a senha do administrador" }); return; }
		if (confirmacao !== "RESETAR SISTEMA") { resposta.status(400).json({ erro: "Digite RESETAR SISTEMA para confirmar o reset" }); return; }
		if (!requisicao.administrador || !(await this.autenticacao.validarSenhaAdministrador(requisicao.administrador.id, senha))) { resposta.status(401).json({ erro: "Senha do administrador inválida" }); return; }
		resposta.json({ dados: await this.resetSistema.executar() });
	};

	validarSenhaReset = async (requisicao: Request, resposta: Response): Promise<void> => {
		const senha = typeof requisicao.body?.senha === "string" ? requisicao.body.senha : "";
		if (!senha) { resposta.status(400).json({ erro: "Informe a senha do administrador" }); return; }
		if (!requisicao.administrador || !this.autenticacao || !(await this.autenticacao.validarSenhaAdministrador(requisicao.administrador.id, senha))) { resposta.status(401).json({ erro: "Senha do administrador inválida" }); return; }
		resposta.status(204).send();
	};

	testarSeletores = async (requisicao: Request, resposta: Response): Promise<void> => {
		const { url, fonte, seletores } = requisicao.body as { url?: string; fonte?: string; seletores?: SeletoresSite };
		if (!url || !seletores || !fonte) {
			resposta.status(400).json({ erro: "Informe fonte, URL e todos os seletores obrigatórios" });
			return;
		}
		const html = await this.clienteHttp.obterHtml(url, { seletorItens: seletores.paginaVirtualizada ? seletores.item : undefined, seletorAguardar: seletores.item, seletorCarregarMais: seletores.carregarMais });
		const itens = this.analisador.analisar(html, url, fonte, seletores);
		const previewImagem = await this.clienteHttp.obterCaptura(url, seletores.item);
		resposta.json({ dados: { quantidadeProdutos: itens.length, produtos: itens.slice(0, 5), previewImagem } });
	};

	analisarHtml = async (requisicao: Request, resposta: Response): Promise<void> => {
		if (!this.analisadorSeletores) { resposta.status(503).json({ erro: "A análise por IA não está configurada. Defina CLASSIFICADOR_URL e CLASSIFICADOR_MODELO." }); return; }
		const html = typeof requisicao.body?.html === "string" ? requisicao.body.html : "";
		if (!html.trim()) { resposta.status(400).json({ erro: "Cole o HTML de pelo menos um card de produto." }); return; }
		try { resposta.json({ dados: await this.analisadorSeletores.analisar(html) }); } catch (erro) {
			const mensagem = erro instanceof Error ? erro.message : "Não foi possível analisar o HTML.";
			resposta.status(mensagem.includes("demorou mais") ? 504 : 422).json({ erro: mensagem });
		}
	};

}
