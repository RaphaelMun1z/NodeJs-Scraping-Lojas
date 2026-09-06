import type { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import type { RepositorioItem } from "../../banco/repositorios/repositorio-item.js";

const esquemaConsulta = z.object({
	pagina: z.coerce.number().int().positive().default(1),
	limite: z.coerce.number().int().positive().max(100).default(20),
	busca: z.string().trim().min(1).optional(),
	fonte: z.string().trim().min(1).optional(),
	precoMin: z.coerce.number().nonnegative().optional(),
	precoMax: z.coerce.number().nonnegative().optional(),
	ativo: z.enum(["true", "false"]).transform((valor) => valor === "true").optional(),
});

export class ControladorItem {
	constructor(private readonly repositorioItem: RepositorioItem) {}

	listar = async (requisicao: Request, resposta: Response): Promise<void> => {
		// O schema aplica valores padrão e limita o tamanho da página.
		const consulta = esquemaConsulta.parse(requisicao.query);
		const resultado = await this.repositorioItem.consultar(consulta);
		const totalPaginas = Math.ceil(resultado.total / consulta.limite);

		resposta.json({
			dados: resultado.itens,
			paginacao: {
				pagina: consulta.pagina,
				limite: consulta.limite,
				totalItens: resultado.total,
				totalPaginas,
			},
		});
	};

	buscarPorId = async (
		requisicao: Request,
		resposta: Response,
	): Promise<void> => {
		const { id } = requisicao.params;

		if (typeof id !== "string" || !isValidObjectId(id)) {
			resposta.status(400).json({ erro: "Identificador inválido" });
			return;
		}

		const item = await this.repositorioItem.buscarPorId(id);

		if (!item) {
			resposta.status(404).json({ erro: "Item não encontrado" });
			return;
		}

		resposta.json({ dados: item });
	};

	historico = async (
		requisicao: Request,
		resposta: Response,
	): Promise<void> => {
		const { id } = requisicao.params;
		if (typeof id !== "string" || !isValidObjectId(id)) {
			resposta.status(400).json({ erro: "Identificador inválido" });
			return;
		}

		const resultado = await this.repositorioItem.buscarComHistorico(id);
		if (!resultado) {
			resposta.status(404).json({ erro: "Item não encontrado" });
			return;
		}

		resposta.json(resultado);
	};
}
