import type { Request, Response } from "express";
import type { ServicoAutenticacao } from "../../autenticacao/servico-autenticacao.js";

export class ControladorAutenticacao {
	constructor(private readonly autenticacao: ServicoAutenticacao) {}

	login = async (requisicao: Request, resposta: Response): Promise<void> => {
		const { email, senha, codigoTotp } = requisicao.body as { email?: string; senha?: string; codigoTotp?: string };
		if (!email || !senha) { resposta.status(400).json({ erro: "E-mail e senha são obrigatórios" }); return; }
		const resultado = await this.autenticacao.autenticar(email, senha, codigoTotp);
		if (!resultado) { resposta.status(401).json({ erro: "Credenciais inválidas" }); return; }
		this.autenticacao.definirCookies(resposta, resultado.token, resultado.tokenCsrf);
		resposta.json({ dados: resultado.administrador });
	};

	verificarMfa = async (requisicao: Request, resposta: Response): Promise<void> => {
		const { email, senha } = requisicao.body as { email?: string; senha?: string };
		if (!email || !senha) { resposta.status(400).json({ erro: "E-mail e senha são obrigatórios" }); return; }
		const mfaNecessario = await this.autenticacao.verificarMfaNecessario(email, senha);
		if (mfaNecessario === null) { resposta.status(401).json({ erro: "Credenciais inválidas" }); return; }
		resposta.json({ dados: { mfaNecessario } });
	};

	sessao = async (requisicao: Request, resposta: Response): Promise<void> => {
		if (!requisicao.administrador) { resposta.status(401).json({ erro: "Não autenticado" }); return; }
		resposta.json({ dados: requisicao.administrador });
	};

	logout = async (requisicao: Request, resposta: Response): Promise<void> => {
		await this.autenticacao.encerrarRequisicao(requisicao, resposta);
		resposta.status(204).send();
	};

	iniciarMfa = async (requisicao: Request, resposta: Response): Promise<void> => {
		const resultado = await this.autenticacao.iniciarMfa(requisicao.administrador!.id);
		resposta.json({ dados: resultado });
	};

	ativarMfa = async (requisicao: Request, resposta: Response): Promise<void> => {
		const { codigo } = requisicao.body as { codigo?: string };
		if (!codigo) { resposta.status(400).json({ erro: "Código MFA obrigatório" }); return; }
		await this.autenticacao.ativarMfa(requisicao.administrador!.id, codigo);
		resposta.status(204).send();
	};
}
