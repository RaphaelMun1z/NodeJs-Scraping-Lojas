import type { ItemColetado } from "../../modelos/item-coletado.model.js";
import { gerarChaveItem } from "../../utilitarios/chave-item.js";
import { ModeloItemBanco } from "../modelos/item-banco.model.js";
import { ModeloHistoricoPreco } from "../modelos/historico-preco.model.js";

export interface ConsultaItens {
	pagina: number;
	limite: number;
	busca?: string;
	fonte?: string;
	precoMin?: number;
	precoMax?: number;
	ativo?: boolean;
}

export interface ResultadoConsultaItens {
	itens: unknown[];
	total: number;
}

export class RepositorioItem {
	async salvarMuitos(itens: ItemColetado[]): Promise<void> {
		if (itens.length === 0) return;

		const agora = new Date();
		const operacoes = itens.map((item) => ({
			updateOne: {
				filter: { chave: gerarChaveItem(item) },
				update: {
					$set: {
						fonte: item.fonte,
						titulo: item.titulo,
						preco: item.preco,
						precoAntigo: item.precoAntigo,
						ativo: true,
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

		const historicos = Array.from(
			new Map(
				itens
					.filter((item) => item.preco !== undefined)
					.map((item) => [gerarChaveItem(item), {
						chaveProduto: gerarChaveItem(item),
						fonte: item.fonte,
						preco: item.preco,
						precoAntigo: item.precoAntigo,
						coletadoEm: agora,
					}]),
			).values(),
		);
		if (historicos.length > 0) {
			await ModeloHistoricoPreco.insertMany(historicos, { ordered: false });
		}
	}

	async sincronizarFonte(fonte: string, itens: ItemColetado[]): Promise<void> {
		if (itens.length === 0) {
			console.warn(
				`${fonte}: nenhum produto retornado; sincronização ignorada para preservar os dados existentes.`,
			);
			return;
		}

		await this.salvarMuitos(itens);
		const chavesEncontradas = itens.map((item) => gerarChaveItem(item));
		const resultado = await ModeloItemBanco.updateMany(
			{ fonte, chave: { $nin: chavesEncontradas } },
			{ $set: { ativo: false } },
		).exec();

		if (resultado.modifiedCount > 0) {
			console.log(
				`${fonte}: ${resultado.modifiedCount} produto(s) marcado(s) como inativo(s).`,
			);
		}
	}

	async consultar({
		pagina,
		limite,
		busca,
		fonte,
		precoMin,
		precoMax,
		ativo,
	}: ConsultaItens): Promise<ResultadoConsultaItens> {
		const filtro: Record<string, unknown> = {};

		if (busca) {
			const termo = this.escaparExpressaoRegular(busca);
			filtro.$or = [{ titulo: { $regex: termo, $options: "i" } }];
		}

		if (fonte) filtro.fonte = fonte;
		if (precoMin !== undefined || precoMax !== undefined) {
			filtro.preco = {
				...(precoMin !== undefined ? { $gte: precoMin } : {}),
				...(precoMax !== undefined ? { $lte: precoMax } : {}),
			};
		}

		if (ativo === true) {
			filtro.$and = [{ $or: [{ ativo: true }, { ativo: { $exists: false } }] }];
		}

		const deslocamento = (pagina - 1) * limite;
		const campos = "fonte titulo preco precoAntigo ativo imagemUrl url primeiraColetaEm ultimaColetaEm";
		const [itens, total] = await Promise.all([
			ModeloItemBanco.find(filtro)
				.select(campos)
				.sort({ ativo: -1, ultimaColetaEm: -1 })
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
			.select("fonte titulo preco precoAntigo ativo imagemUrl url primeiraColetaEm ultimaColetaEm")
			.lean()
			.exec();
	}

	async buscarComHistorico(id: string): Promise<{
		produto: Record<string, unknown>;
		historico: unknown[];
	} | null> {
		const produto = await ModeloItemBanco.findById(id).lean().exec();
		if (!produto) return null;

		const historico = await ModeloHistoricoPreco.find({
			chaveProduto: produto.chave,
		})
			.select("preco precoAntigo coletadoEm")
			.sort({ coletadoEm: 1 })
			.lean()
			.exec();

		return { produto, historico };
	}

	private escaparExpressaoRegular(valor: string): string {
		return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}
}
