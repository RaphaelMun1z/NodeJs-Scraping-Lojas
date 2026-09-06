import type { ItemColetado } from "../../modelos/item-coletado.model.js";
import { gerarChaveItem } from "../../utilitarios/chave-item.js";
import { ModeloItemBanco } from "../modelos/item-banco.model.js";

export interface ConsultaItens {
  pagina: number;
  limite: number;
  busca?: string;
}

export interface ResultadoConsultaItens {
  itens: unknown[];
  total: number;
}

export class RepositorioItem {
  async salvarMuitos(itens: ItemColetado[]): Promise<void> {
    if (itens.length === 0) return;

    const agora = new Date();

    // Upsert atualiza itens existentes e cria somente os que ainda não existem.
    const operacoes = itens.map((item) => ({
      updateOne: {
        filter: { chave: gerarChaveItem(item) },
        update: {
          $set: {
            titulo: item.titulo,
            preco: item.preco,
            imagemUrl: item.imagemUrl,
            url: item.url,
            ultimaColetaEm: agora,
          },
          $setOnInsert: {
            chave: gerarChaveItem(item),
            primeiraColetaEm: agora,
          },
        },
        upsert: true,
      },
    }));

    await ModeloItemBanco.bulkWrite(operacoes, { ordered: false });
  }

  async consultar({ pagina, limite, busca }: ConsultaItens): Promise<ResultadoConsultaItens> {
    const filtro: Record<string, unknown> = {};

    if (busca) {
      const termo = this.escaparExpressaoRegular(busca);
      filtro.$or = [
        { titulo: { $regex: termo, $options: "i" } },
      ];
    }

    const deslocamento = (pagina - 1) * limite;

    // Busca e contagem são executadas em paralelo para reduzir a latência da API.
    // lean() evita criar documentos Mongoose completos em consultas somente leitura.
    const [itens, total] = await Promise.all([
      ModeloItemBanco.find(filtro)
        .select("titulo preco imagemUrl url primeiraColetaEm ultimaColetaEm")
        .sort({ ultimaColetaEm: -1 })
        .skip(deslocamento)
        .limit(limite)
        .lean()
        .exec(),
      ModeloItemBanco.countDocuments(filtro).exec(),
    ]);

    return { itens, total };
  }

  async buscarPorId(id: string): Promise<unknown | null> {
    return ModeloItemBanco.findById(id)
      .select("titulo preco imagemUrl url primeiraColetaEm ultimaColetaEm")
      .lean()
      .exec();
  }

  private escaparExpressaoRegular(valor: string): string {
    return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
