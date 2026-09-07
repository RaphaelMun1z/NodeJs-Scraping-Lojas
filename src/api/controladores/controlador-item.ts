import type { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import type { RepositorioItem } from "../../banco/repositorios/repositorio-item.js";
import type { RepositorioIndiceProdutos } from "../../elasticsearch/repositorio-indice-produtos.js";

const esquemaConsulta = z.object({
	pagina: z.coerce.number().int().positive().default(1),
	limite: z.coerce.number().int().positive().max(100).default(20),
	busca: z.string().trim().min(1).optional(),
	categoria: z.string().trim().min(1).optional(),
	fonte: z.string().trim().min(1).optional(),
	precoMin: z.coerce.number().nonnegative().optional(),
	precoMax: z.coerce.number().nonnegative().optional(),
	ativo: z.enum(["true", "false"]).transform((valor) => valor === "true").optional(),
});

export class ControladorItem {
	constructor(private readonly repositorioItem: RepositorioItem, private readonly repositorioIndice?: RepositorioIndiceProdutos) {}

	sugestoes = async (requisicao: Request, resposta: Response): Promise<void> => {
		const texto = z.string().trim().min(2).parse(requisicao.query.q);
		const sugestoes = this.repositorioIndice ? await this.repositorioIndice.sugerirTitulos(texto) : [];
		resposta.json({ dados: sugestoes.length > 0 ? sugestoes : await this.repositorioItem.sugerirTitulos(texto) });
	};

	novidades = async (requisicao: Request, resposta: Response): Promise<void> => {
		const limite = z.coerce.number().int().positive().max(30).default(12).parse(requisicao.query.limite);
		const dados = await this.repositorioItem.consultarNovidades(limite);
		resposta.json({ dados });
	};

	categorias = async (_requisicao: Request, resposta: Response): Promise<void> => {
		resposta.json({ dados: await this.repositorioItem.consultarCategorias() });
	};

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
