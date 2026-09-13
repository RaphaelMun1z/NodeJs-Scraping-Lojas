import type { Request, Response } from "express";
import type { ServicoBuscaManual } from "../../servicos/servico-busca-manual.js";

export class ControladorBuscaManual {
	constructor(private readonly servicoBusca: ServicoBuscaManual) {}

	executar = async (requisicao: Request, resposta: Response): Promise<void> => {
		const fontes = Array.isArray(requisicao.body?.fontes) ? requisicao.body.fontes.filter((fonte: unknown): fonte is string => typeof fonte === "string") : [];
		resposta.json({ dados: await this.servicoBusca.executar(fontes) });
	};
}
