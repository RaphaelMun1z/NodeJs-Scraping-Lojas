import type { Client } from "@elastic/elasticsearch";
import { configuracaoMatching } from "../matching/configuracao-matching.js";
import { normalizarTituloProduto } from "../matching/normalizador-titulo.js";

export interface ProdutoIndexado {
	id: string;
	fonte: string;
	titulo: string;
	tituloNormalizado: string;
	ativo: boolean;
	url?: string;
	chave: string;
	grupoProdutoId?: string;
	categoriaOriginal?: string;
	categoriaNormalizada?: string;
	categoria?: string;
	subcategoria?: string;
	tipoProduto?: string;
	confiancaCategoria?: number;
	embedding?: number[];
}

export interface ProdutoCandidato extends ProdutoIndexado {
	scoreVetor: number;
	scoreTexto: number;
	scoreClassificacao: number;
}

export class RepositorioIndiceProdutos {
	constructor(
		private readonly client: Client,
		private readonly indice = configuracaoMatching.indice,
		private readonly dimensao = configuracaoMatching.dimensaoEmbedding,
	) {}

	async garantirIndice(): Promise<void> {
		const indiceExiste = await this.client.indices.exists({ index: this.indice });
		if (indiceExiste) {
			await this.client.indices.putMapping({ index: this.indice, properties: { grupoProdutoId: { type: "keyword" } } });
			await this.client.indices.putMapping({ index: this.indice, properties: { categoriaOriginal: { type: "text" }, categoriaNormalizada: { type: "keyword" }, categoria: { type: "keyword" }, subcategoria: { type: "keyword" }, tipoProduto: { type: "keyword" }, confiancaCategoria: { type: "float" } } });
			return;
		}
		await this.client.indices.create({
			index: this.indice,
			mappings: {
				properties: {
					id: { type: "keyword" },
					fonte: { type: "keyword" },
					titulo: { type: "text" },
					tituloNormalizado: { type: "text" },
					ativo: { type: "boolean" },
					url: { type: "keyword", index: false },
					chave: { type: "keyword" },
					grupoProdutoId: { type: "keyword" },
					categoriaOriginal: { type: "text" },
					categoriaNormalizada: { type: "keyword" },
					categoria: { type: "keyword" },
					subcategoria: { type: "keyword" },
					tipoProduto: { type: "keyword" },
					confiancaCategoria: { type: "float" },
					embedding: { type: "dense_vector", dims: this.dimensao, index: true, similarity: "cosine" },
				},
			},
		});
	}

	async indexarProduto(produto: ProdutoIndexado): Promise<void> {
		await this.client.index({ index: this.indice, id: produto.id, document: { ...produto, tituloNormalizado: normalizarTituloProduto(produto.titulo) }, refresh: "wait_for" });
	}

	async indexarProdutos(produtos: ProdutoIndexado[]): Promise<void> {
		if (produtos.length === 0) return;
		const operacoes = produtos.flatMap((produto) => [
			{ index: { _index: this.indice, _id: produto.id } },
			{ ...produto, tituloNormalizado: normalizarTituloProduto(produto.titulo) },
		]);
		const resultado = await this.client.bulk({ operations: operacoes, refresh: "wait_for" });
		if (resultado.errors) {
			const erro = resultado.items.find((item) => item.index?.error)?.index?.error;
			throw new Error(`Falha ao indexar produtos em lote${erro?.reason ? `: ${erro.reason}` : ""}`);
		}
	}

	async limparProdutos(): Promise<number> {
		const existe = await this.client.indices.exists({ index: this.indice });
		if (!existe) return 0;
		const resultado = await this.client.deleteByQuery({
			index: this.indice,
			query: { match_all: {} },
			conflicts: "proceed",
			refresh: true,
		});
		return resultado.deleted ?? 0;
	}

	async ativarPresentesDaFonte(fonte: string, categoria: string, chavesAtivas: string[]): Promise<void> {
		if (chavesAtivas.length === 0) return;
		await this.client.updateByQuery({
			index: this.indice,
			refresh: true,
			conflicts: "proceed",
			query: { bool: { filter: [{ term: { fonte } }, { term: { categoriaNormalizada: categoria } }, { terms: { chave: chavesAtivas } }] } },
			script: { lang: "painless", source: "ctx._source.ativo = true" },
		});
	}

	async atualizarGrupoProduto(chave: string, grupoProdutoId: string): Promise<void> {
		await this.client.update({ index: this.indice, id: chave, doc: { grupoProdutoId }, refresh: "wait_for" });
	}

	async inativarAusentesDaFonte(fonte: string, categoria: string, chavesAtivas: string[]): Promise<void> {
		if (!chavesAtivas.length) return;
		// Mantém o estado do índice alinhado à última coleta da fonte.
		await this.client.updateByQuery({
			index: this.indice,
			refresh: true,
			conflicts: "proceed",
			query: { bool: { filter: [{ term: { fonte } }, { term: { categoriaNormalizada: categoria } }], must_not: [{ terms: { chave: chavesAtivas } }] } },
			script: { lang: "painless", source: "ctx._source.ativo = false" },
		});
	}

	async buscarCandidatos(texto: string, embedding: number[], limite: number, chaveIgnorada?: string, fonteIgnorada?: string, categoria?: string): Promise<ProdutoCandidato[]> {
		const exclusoes = [
			...(chaveIgnorada ? [{ term: { id: chaveIgnorada } }] : []),
			...(fonteIgnorada ? [{ term: { fonte: fonteIgnorada } }] : []),
		];
		const filtros = [{ term: { ativo: true } }, ...(categoria ? [{ term: { categoriaNormalizada: categoria } }] : [])];
		const filtroTexto = filtros;
		const filtroVetor = { bool: { filter: filtros, ...(exclusoes.length ? { must_not: exclusoes } : {}) } };
		const consultaTexto = { bool: { must: [{ multi_match: { query: texto, fields: ["titulo^2", "tituloNormalizado"], fuzziness: "AUTO" } }], filter: filtroTexto, ...(exclusoes.length ? { must_not: exclusoes } : {}) } };
		const [resultadoTexto, resultadoVetor] = await Promise.all([
			this.client.search<ProdutoIndexado>({
				index: this.indice,
				size: limite,
				query: consultaTexto,
			}),
			this.client.search<ProdutoIndexado>({
				index: this.indice,
				size: limite,
				knn: { field: "embedding", query_vector: embedding, k: limite, num_candidates: Math.max(limite * 5, 50), filter: filtroVetor },
			}),
		]);

		const candidatosMesclados = new Map<string, ProdutoCandidato>();
		const maiorScoreTexto = Math.max(...resultadoTexto.hits.hits.map((acerto) => acerto._score ?? 0), 1);
		const maiorScoreVetor = Math.max(...resultadoVetor.hits.hits.map((acerto) => acerto._score ?? 0), 1);
		resultadoTexto.hits.hits.forEach((acerto, posicao) => {
			if (!acerto._source || !acerto._id) return;
			candidatosMesclados.set(acerto._id, { ...acerto._source, id: acerto._id, scoreTexto: (acerto._score ?? 0) / maiorScoreTexto, scoreVetor: 0, scoreClassificacao: 1 / (posicao + 1) });
		});
		resultadoVetor.hits.hits.forEach((acerto, posicao) => {
			if (!acerto._source || !acerto._id) return;
			const atual = candidatosMesclados.get(acerto._id) ?? { ...acerto._source, id: acerto._id, scoreTexto: 0, scoreVetor: 0, scoreClassificacao: 0 };
			atual.scoreVetor = (acerto._score ?? 0) / maiorScoreVetor;
			atual.scoreClassificacao += 1 / (posicao + 1);
			candidatosMesclados.set(acerto._id, atual);
		});
		// Combina as listas BM25 e kNN antes do limite final de candidatos.
		return [...candidatosMesclados.values()].sort((a, b) => b.scoreClassificacao - a.scoreClassificacao).slice(0, limite);
	}

	async sugerirTitulos(texto: string, limite = 8): Promise<string[]> {
		const resultado = await this.client.search<ProdutoIndexado>({
			index: this.indice,
			size: limite * 3,
			_source: ["titulo"],
			query: { bool: { must: [{ match_phrase_prefix: { titulo: { query: texto } } }], filter: [{ term: { ativo: true } }] } },
		});
		return [...new Set(resultado.hits.hits.map((acerto) => acerto._source?.titulo).filter((titulo): titulo is string => Boolean(titulo)))].slice(0, limite);
	}
}
