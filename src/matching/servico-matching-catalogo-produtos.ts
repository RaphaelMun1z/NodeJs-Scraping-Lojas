import type { EmbeddingProvider } from "../embeddings/provedor-embedding.js";
import type { ProvedorClassificacaoProduto, ResultadoClassificacaoProduto } from "../classificacao/provedor-classificacao.js";
import type { RepositorioIndiceProdutos, ProdutoIndexado } from "../elasticsearch/repositorio-indice-produtos.js";
import type { ItemColetado } from "../modelos/item-coletado.model.js";
import { gerarChaveItem } from "../utilitarios/chave-item.js";
import { normalizarTituloProduto } from "./normalizador-titulo.js";
import { ServicoMatchingProduto } from "./servico-matching-produto.js";
import type { RepositorioItem } from "../banco/repositorios/repositorio-item.js";
import { VERSAO_CLASSIFICACAO_PRODUTO } from "../classificacao/categorias-produto.js";

export interface ProgressoMatching {
	classificacao?: number;
	embeddings?: number;
	indexacao?: number;
}
export type EventoEtapaMatching = (etapa: "classificacao" | "embeddings" | "indexacao", estado: "inicio" | "fim") => Promise<void> | void;

export class ServicoMatchingCatalogoProdutos {
	private readonly cacheEmbeddings = new Map<string, number[]>();
	private readonly cacheClassificacoes = new Map<string, ResultadoClassificacaoProduto>();
	private filaIndexacao: Promise<void> = Promise.resolve();

	constructor(
		private readonly indice: RepositorioIndiceProdutos,
		private readonly embeddings: EmbeddingProvider,
		private readonly matching: ServicoMatchingProduto,
		private readonly repositorioItem: RepositorioItem,
		private readonly classificador?: ProvedorClassificacaoProduto,
	) {}

	async processarProdutosColetados(itens: ItemColetado[], atualizarProgresso?: (progresso: ProgressoMatching) => Promise<void> | void, registrarEtapa?: EventoEtapaMatching): Promise<void> {
		const tarefa = this.filaIndexacao.then(() => this.processarProdutosColetadosInterno(itens, atualizarProgresso, registrarEtapa));
		this.filaIndexacao = tarefa.catch(() => undefined);
		return tarefa;
	}

	private async processarProdutosColetadosInterno(itens: ItemColetado[], atualizarProgresso?: (progresso: ProgressoMatching) => Promise<void> | void, registrarEtapa?: EventoEtapaMatching): Promise<void> {
		const itensUnicos = Array.from(new Map(itens.map((item) => [gerarChaveItem(item), item])).values());
		const chaves = itensUnicos.map((item) => gerarChaveItem(item));
		const estados = await this.repositorioItem.consultarEstadosIndexacao(chaves);
		const pendentes = itensUnicos.filter((item) => {
			const estado = estados.get(gerarChaveItem(item));
			return !estado || estado.titulo !== item.titulo || !estado.grupoProdutoId || !estado.classificacaoProcessada || estado.classificacaoVersao !== VERSAO_CLASSIFICACAO_PRODUTO;
		});
		await atualizarProgresso?.({ classificacao: 0, embeddings: 0, indexacao: 0 });
		await registrarEtapa?.("classificacao", "inicio");
		let classificacoes: Map<string, ResultadoClassificacaoProduto>;
		try { classificacoes = await this.classificarPendentes(pendentes, async (classificacao) => atualizarProgresso?.({ classificacao })); } finally { await registrarEtapa?.("classificacao", "fim"); }
		await registrarEtapa?.("embeddings", "inicio");
		let embeddings: Map<string, number[]>;
		try { embeddings = await this.gerarEmbeddingsPendentes(pendentes); } finally { await registrarEtapa?.("embeddings", "fim"); }
		await atualizarProgresso?.({ embeddings: 100 });
		const documentos: ProdutoIndexado[] = [];

		for (const item of pendentes) {
			const chave = gerarChaveItem(item);
			const tituloNormalizado = normalizarTituloProduto(item.titulo);
			const embedding = embeddings.get(tituloNormalizado)!;
			const classificacao = classificacoes.get(tituloNormalizado);
			if (classificacao) await this.repositorioItem.salvarClassificacao(chave, classificacao);
			const resultado = await this.matching.encontrarEquivalente(item.titulo, chave, embedding, item.fonte);
			const grupoProdutoId = resultado.equivalente?.grupoProdutoId ?? `grupo-${resultado.equivalente?.chave ?? chave}`;
			if (resultado.equivalente) {
				console.log(`🔗 Possível equivalente: "${item.titulo}" -> "${resultado.equivalente.titulo}" (${resultado.score.toFixed(3)})`);
				await this.repositorioItem.vincularGrupoProduto(resultado.equivalente.chave, grupoProdutoId);
				await this.indice.atualizarGrupoProduto(resultado.equivalente.chave, grupoProdutoId);
			}
			await this.repositorioItem.vincularGrupoProduto(chave, grupoProdutoId);
			documentos.push({ id: chave, chave, grupoProdutoId, fonte: item.fonte, titulo: item.titulo, tituloNormalizado, ativo: true, url: item.url, embedding, ...classificacao && { categoriaOriginal: classificacao.categoriaOriginal, categoriaNormalizada: classificacao.categoriaNormalizada, categoria: classificacao.categoria, subcategoria: classificacao.subcategoria, tipoProduto: classificacao.tipoProduto, confiancaCategoria: classificacao.confianca } });
		}

		await atualizarProgresso?.({ indexacao: 0 });
		await registrarEtapa?.("indexacao", "inicio");
		try { await this.indice.indexarProdutos(documentos); } finally { await registrarEtapa?.("indexacao", "fim"); }
		await atualizarProgresso?.({ indexacao: 100 });
		await this.indice.ativarPresentesDaFonte(itensUnicos[0]?.fonte ?? "", chaves);
		await this.indice.inativarAusentesDaFonte(itensUnicos[0]?.fonte ?? "", chaves);
	}

	private async classificarPendentes(itens: ItemColetado[], atualizarProgresso?: (progresso: number) => Promise<void> | void): Promise<Map<string, ResultadoClassificacaoProduto>> {
		const textos = [...new Set(itens.map((item) => normalizarTituloProduto(item.titulo)))];
		if (!this.classificador) {
			await atualizarProgresso?.(100);
			return new Map(textos.map((texto) => [texto, this.criarClassificacaoFallback()]));
		}
		for (const [indice, texto] of textos.entries()) {
			if (this.cacheClassificacoes.has(texto)) {
				await atualizarProgresso?.(Math.round(((indice + 1) / textos.length) * 100));
				continue;
			}
			try {
				this.cacheClassificacoes.set(texto, await this.classificador.classificarProduto(texto));
			} catch (erro) {
				// Mantém o produto filtrável mesmo quando o classificador falha.
				this.cacheClassificacoes.set(texto, {
					categoriaOriginal: "Outros",
					categoriaNormalizada: "Outros",
					categoria: "Outros",
					tipoProduto: "outro",
					confianca: 0,
					versao: VERSAO_CLASSIFICACAO_PRODUTO,
				});
				console.warn(`Não foi possível classificar o produto: ${erro instanceof Error ? erro.message : "erro desconhecido"}`);
			}
			await atualizarProgresso?.(Math.round(((indice + 1) / textos.length) * 100));
		}
		return new Map(textos.map((texto) => [texto, this.cacheClassificacoes.get(texto)!]).filter((item): item is [string, ResultadoClassificacaoProduto] => Boolean(item[1])));
	}

	private criarClassificacaoFallback(): ResultadoClassificacaoProduto {
		return { categoriaOriginal: "Outros", categoriaNormalizada: "Outros", categoria: "Outros", tipoProduto: "outro", confianca: 0, versao: VERSAO_CLASSIFICACAO_PRODUTO };
	}

	private async gerarEmbeddingsPendentes(itens: ItemColetado[]): Promise<Map<string, number[]>> {
		const textos = [...new Set(itens.map((item) => normalizarTituloProduto(item.titulo)))];
		const faltantes = textos.filter((texto) => !this.cacheEmbeddings.has(texto));
		if (faltantes.length > 0) {
			const vetores = this.embeddings.generateEmbeddings ? await this.embeddings.generateEmbeddings(faltantes) : await Promise.all(faltantes.map((texto) => this.embeddings.generateEmbedding(texto)));
			faltantes.forEach((texto, indice) => this.cacheEmbeddings.set(texto, vetores[indice]!));
		}
		return new Map(textos.map((texto) => [texto, this.cacheEmbeddings.get(texto)!]));
	}
}
