import type { Request, Response } from "express";
import type { ServicoConfiguracaoScraping } from "../../configuracoes/servico-configuracao-scraping.js";

export class ControladorConfiguracaoScraping {
	constructor(private readonly configuracao: ServicoConfiguracaoScraping) {}

	obter = async (_requisicao: Request, resposta: Response): Promise<void> => {
		resposta.json({ dados: await this.configuracao.obterOuCriarPadrao() });
	};

	atualizar = async (requisicao: Request, resposta: Response): Promise<void> => {
		resposta.json({ dados: await this.configuracao.atualizar(requisicao.body) });
	};
}
