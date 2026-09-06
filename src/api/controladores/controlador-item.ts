import type { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import type { RepositorioItem } from "../../banco/repositorios/repositorio-item.js";

const esquemaConsulta = z.object({
  pagina: z.coerce.number().int().positive().default(1),
  limite: z.coerce.number().int().positive().max(100).default(20),
  busca: z.string().trim().min(1).optional(),
});

export class ControladorItem {
  constructor(private readonly repositorioItem: RepositorioItem) {}

  listar = async (requisicao: Request, resposta: Response): Promise<void> => {
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

  buscarPorId = async (requisicao: Request, resposta: Response): Promise<void> => {
    const { id } = requisicao.params;

    if (!id || !isValidObjectId(id)) {
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
}
