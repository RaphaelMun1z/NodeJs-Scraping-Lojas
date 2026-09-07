import type { Request, Response } from "express";
import type { ServicoConfiguracaoScraping } from "../../configuracoes/servico-configuracao-scraping.js";
import type { ServicoLimpezaProdutos } from "../../servicos/servico-limpeza-produtos.js";

export class ControladorConfiguracaoScraping {
	constructor(
		private readonly configuracao: ServicoConfiguracaoScraping,
		private readonly limpezaProdutos: ServicoLimpezaProdutos,
	) {}

	obter = async (_requisicao: Request, resposta: Response): Promise<void> => {
		resposta.json({ dados: await this.configuracao.obterOuCriarPadrao() });
	};

	atualizar = async (requisicao: Request, resposta: Response): Promise<void> => {
		resposta.json({ dados: await this.configuracao.atualizar(requisicao.body) });
	};

	limparProdutos = async (requisicao: Request, resposta: Response): Promise<void> => {
		if (requisicao.body?.confirmacao !== "reset") {
			resposta.status(400).json({ erro: "Digite reset para confirmar a limpeza dos produtos" });
			return;
		}
		resposta.json({ dados: await this.limpezaProdutos.executar() });
	};
}
