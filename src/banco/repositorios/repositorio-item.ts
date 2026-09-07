import type { ItemColetado } from "../../modelos/item-coletado.model.js";
import { gerarChaveItem } from "../../utilitarios/chave-item.js";
import { ModeloItemBanco } from "../modelos/item-banco.model.js";
import { ModeloHistoricoPreco } from "../modelos/historico-preco.model.js";
import type { ResultadoClassificacaoProduto } from "../../classificacao/provedor-classificacao.js";
import { CATEGORIAS_PRODUTO } from "../../classificacao/categorias-produto.js";

export interface ConsultaItens {
	pagina: number;
	limite: number;
	busca?: string;
	categoria?: string;
	fonte?: string;
	precoMin?: number;
	precoMax?: number;
	ativo?: boolean;
}

export interface ResultadoConsultaItens {
	itens: unknown[];
	total: number;
}

export interface MetricasSincronizacaoFonte {
	novos: number;
	atualizados: number;
	inativados: number;
}

export interface EstadoIndexacaoItem {
	titulo: string;
	grupoProdutoId?: string | null;
	classificacaoProcessada?: boolean;
	classificacaoVersao?: number | null;
}

export class RepositorioItem {
	async consultarCategorias(): Promise<string[]> {
		const categoriasSalvas = await ModeloItemBanco.distinct("categoriaNormalizada", {
			categoriaNormalizada: { $exists: true, $nin: [null, ""] },
			$or: [{ ativo: true }, { ativo: { $exists: false } }],
		});
		const disponiveis = new Set<string>();
		for (const categoriaNormalizada of categoriasSalvas) {
			if (typeof categoriaNormalizada !== "string") continue;
			const [categoria] = categoriaNormalizada.split(" > ");
			if (!categoria) continue;
			const subcategoria = categoriaNormalizada.includes(" > ") ? categoriaNormalizada.slice(categoriaNormalizada.indexOf(" > ") + 3) : undefined;
			if (!(categoria in CATEGORIAS_PRODUTO)) continue;
			const subcategoriasPermitidas = CATEGORIAS_PRODUTO[categoria as keyof typeof CATEGORIAS_PRODUTO];
			if (subcategoria && !subcategoriasPermitidas.includes(subcategoria as never)) continue;
			disponiveis.add(categoria);
			if (subcategoria) disponiveis.add(categoriaNormalizada);
		}
		return Object.entries(CATEGORIAS_PRODUTO).flatMap(([categoria, subcategorias]) => [
			disponiveis.has(categoria) ? categoria : undefined,
			...subcategorias.map((subcategoria) => disponiveis.has(`${categoria} > ${subcategoria}`) ? `${categoria} > ${subcategoria}` : undefined),
		].filter((item): item is string => Boolean(item)));
	}

	async sugerirTitulos(texto: string, limite = 8): Promise<string[]> {
		const itens = await ModeloItemBanco.find({ ativo: true, titulo: { $regex: texto, $options: "i" } })
			.select("titulo")
			.sort({ ultimaColetaEm: -1 })
			.limit(limite * 3)
			.lean()
			.exec();
		return [...new Set(itens.map((item) => item.titulo))].slice(0, limite);
	}

	async salvarMuitos(itens: ItemColetado[]): Promise<void> {
		if (itens.length === 0) return;

		// A mesma fonte pode retornar o mesmo card mais de uma vez. Mantemos
		// somente uma operação por chave para evitar upserts duplicados na coleta.
		const itensUnicos = Array.from(
			new Map(itens.map((item) => [gerarChaveItem(item), item])).values(),
		);

		const agora = new Date();
		const operacoes = itensUnicos.map((item) => ({
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
						novaNaUltimaColeta: true,
					},
				},
				upsert: true,
			},
		}));

		await ModeloItemBanco.bulkWrite(operacoes, { ordered: false });

		const chavesComPreco = itensUnicos.filter((item) => item.preco !== undefined).map((item) => gerarChaveItem(item));
		const historicosRecentes = await ModeloHistoricoPreco.find({ chaveProduto: { $in: chavesComPreco } }).sort({ coletadoEm: -1 }).select("chaveProduto preco precoAntigo").lean().exec();
		const ultimoHistorico = new Map<string, { preco: number; precoAntigo?: number | null }>();
		for (const historico of historicosRecentes) if (!ultimoHistorico.has(historico.chaveProduto)) ultimoHistorico.set(historico.chaveProduto, { preco: historico.preco, precoAntigo: historico.precoAntigo });
		const historicos = itensUnicos
			.filter((item) => item.preco !== undefined)
			.filter((item) => {
				const anterior = ultimoHistorico.get(gerarChaveItem(item));
				return !anterior || anterior.preco !== item.preco || anterior.precoAntigo !== item.precoAntigo;
			})
			.map((item) => ({ chaveProduto: gerarChaveItem(item), fonte: item.fonte, preco: item.preco!, precoAntigo: item.precoAntigo, coletadoEm: agora }));
		if (historicos.length > 0) {
			await ModeloHistoricoPreco.insertMany(historicos, { ordered: false });
		}
	}

	async removerHistoricoAntigo(dias: number): Promise<number> {
		if (dias <= 0) return 0;
		const limite = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
		const resultado = await ModeloHistoricoPreco.deleteMany({ coletadoEm: { $lt: limite } }).exec();
		return resultado.deletedCount ?? 0;
	}

	async iniciarRodadaColeta(): Promise<void> {
		await ModeloItemBanco.updateMany({}, { $set: { novaNaUltimaColeta: false } }).exec();
	}

	async vincularGrupoProduto(chave: string, grupoProdutoId: string): Promise<void> {
		await ModeloItemBanco.updateOne({ chave }, { $set: { grupoProdutoId } }).exec();
		await ModeloHistoricoPreco.updateMany({ chaveProduto: chave }, { $set: { grupoProdutoId } }).exec();
	}

	async salvarClassificacao(chave: string, classificacao: ResultadoClassificacaoProduto): Promise<void> {
		await ModeloItemBanco.updateOne({ chave }, { $set: { ...classificacao, confiancaCategoria: classificacao.confianca, classificacaoProcessada: true } }).exec();
	}

	async consultarEstadosIndexacao(chaves: string[]): Promise<Map<string, EstadoIndexacaoItem>> {
		if (chaves.length === 0) return new Map();
		const itens = await ModeloItemBanco.find({ chave: { $in: chaves } }).select("chave titulo grupoProdutoId classificacaoProcessada classificacaoVersao").lean().exec();
		return new Map(itens.map((item) => [item.chave, { titulo: item.titulo, grupoProdutoId: item.grupoProdutoId, classificacaoProcessada: item.classificacaoProcessada, classificacaoVersao: item.classificacaoVersao }]));
	}

	async consultarNovidades(limite = 12): Promise<unknown[]> {
		return ModeloItemBanco.find({ novaNaUltimaColeta: true, ativo: true })
			.select("fonte titulo preco precoAntigo ativo imagemUrl url primeiraColetaEm ultimaColetaEm")
			.sort({ primeiraColetaEm: -1 })
			.limit(limite)
			.lean()
			.exec();
	}

	async sincronizarFonte(fonte: string, itens: ItemColetado[]): Promise<MetricasSincronizacaoFonte> {
		if (itens.length === 0) {
			console.warn(
				`${fonte}: nenhum produto retornado; sincronização ignorada para preservar os dados existentes.`,
			);
			return { novos: 0, atualizados: 0, inativados: 0 };
		}

		const chavesEncontradas = Array.from(
			new Set(itens.map((item) => gerarChaveItem(item))),
		);
		const existentes = await ModeloItemBanco.countDocuments({ chave: { $in: chavesEncontradas } }).exec();
		await this.salvarMuitos(itens);
		const resultado = await ModeloItemBanco.updateMany(
			{ fonte, chave: { $nin: chavesEncontradas } },
			{ $set: { ativo: false } },
		).exec();

		if (resultado.modifiedCount > 0) {
			console.log(
				`${fonte}: ${resultado.modifiedCount} produto(s) marcado(s) como inativo(s).`,
			);
		}
		return { novos: chavesEncontradas.length - existentes, atualizados: existentes, inativados: resultado.modifiedCount };
	}

	async consultar({
		pagina,
		limite,
		busca,
		categoria,
		fonte,
		precoMin,
		precoMax,
		ativo,
	}: ConsultaItens): Promise<ResultadoConsultaItens> {
		const filtro: Record<string, unknown> = {};

		if (busca) {
			const termo = this.escaparExpressaoRegular(busca);
			filtro.$or = [{ titulo: { $regex: termo, $options: "i" } }, { categoriaNormalizada: { $regex: termo, $options: "i" } }];
		}

		if (categoria) {
			const categoriaEscapada = this.escaparExpressaoRegular(categoria);
			filtro.categoriaNormalizada = new RegExp(`^${categoriaEscapada}(?: >|$)`, "i");
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
		const campos = "fonte titulo preco precoAntigo ativo imagemUrl url grupoProdutoId categoriaOriginal categoriaNormalizada categoria subcategoria tipoProduto confiancaCategoria classificacaoVersao primeiraColetaEm ultimaColetaEm";
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
		ofertas: unknown[];
	} | null> {
		const produto = await ModeloItemBanco.findById(id).lean().exec();
		if (!produto) return null;

		const filtroHistorico = produto.grupoProdutoId
			? { grupoProdutoId: produto.grupoProdutoId }
			: { chaveProduto: produto.chave };
		const historico = await ModeloHistoricoPreco.find(filtroHistorico)
			.select("preco precoAntigo coletadoEm fonte")
			.sort({ coletadoEm: 1 })
			.lean()
			.exec();
		const ofertas = produto.grupoProdutoId
			? await ModeloItemBanco.find({ grupoProdutoId: produto.grupoProdutoId })
				.select("fonte titulo preco precoAntigo ativo imagemUrl url")
				.sort({ preco: 1 })
				.lean()
				.exec()
			: [produto];

		return { produto, historico, ofertas };
	}

	private escaparExpressaoRegular(valor: string): string {
		return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	}
}
