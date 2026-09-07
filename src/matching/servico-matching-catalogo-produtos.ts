import type { EmbeddingProvider } from "../embeddings/provedor-embedding.js";
import type { RepositorioIndiceProdutos, ProdutoIndexado } from "../elasticsearch/repositorio-indice-produtos.js";
import type { ItemColetado } from "../modelos/item-coletado.model.js";
import { gerarChaveItem } from "../utilitarios/chave-item.js";
import { normalizarTituloProduto } from "./normalizador-titulo.js";
import { ServicoMatchingProduto } from "./servico-matching-produto.js";
import type { RepositorioItem } from "../banco/repositorios/repositorio-item.js";

export class ServicoMatchingCatalogoProdutos {
	private readonly cacheEmbeddings = new Map<string, number[]>();
	private filaIndexacao: Promise<void> = Promise.resolve();

	constructor(
		private readonly indice: RepositorioIndiceProdutos,
		private readonly embeddings: EmbeddingProvider,
		private readonly matching: ServicoMatchingProduto,
		private readonly repositorioItem: RepositorioItem,
	) {}

	async processarProdutosColetados(itens: ItemColetado[]): Promise<void> {
		const tarefa = this.filaIndexacao.then(() => this.processarProdutosColetadosInterno(itens));
		this.filaIndexacao = tarefa.catch(() => undefined);
		return tarefa;
	}

	private async processarProdutosColetadosInterno(itens: ItemColetado[]): Promise<void> {
		const itensUnicos = Array.from(new Map(itens.map((item) => [gerarChaveItem(item), item])).values());
		const chaves = itensUnicos.map((item) => gerarChaveItem(item));
		const estados = await this.repositorioItem.consultarEstadosIndexacao(chaves);
		const pendentes = itensUnicos.filter((item) => {
			const estado = estados.get(gerarChaveItem(item));
			return !estado || estado.titulo !== item.titulo || !estado.grupoProdutoId;
		});
		const embeddings = await this.gerarEmbeddingsPendentes(pendentes);
		const documentos: ProdutoIndexado[] = [];

		for (const item of pendentes) {
			const chave = gerarChaveItem(item);
			const tituloNormalizado = normalizarTituloProduto(item.titulo);
			const embedding = embeddings.get(tituloNormalizado)!;
			const resultado = await this.matching.encontrarEquivalente(item.titulo, chave, embedding);
			const grupoProdutoId = resultado.equivalente?.grupoProdutoId ?? `grupo-${resultado.equivalente?.chave ?? chave}`;
			if (resultado.equivalente) {
				console.log(`🔗 Possível equivalente: "${item.titulo}" -> "${resultado.equivalente.titulo}" (${resultado.score.toFixed(3)})`);
				await this.repositorioItem.vincularGrupoProduto(resultado.equivalente.chave, grupoProdutoId);
				await this.indice.atualizarGrupoProduto(resultado.equivalente.chave, grupoProdutoId);
			}
			await this.repositorioItem.vincularGrupoProduto(chave, grupoProdutoId);
			documentos.push({
				id: chave,
				chave,
				grupoProdutoId,
				fonte: item.fonte,
				titulo: item.titulo,
				tituloNormalizado,
				ativo: true,
				url: item.url,
				embedding,
			});
		}

		await this.indice.indexarProdutos(documentos);
		await this.indice.ativarPresentesDaFonte(itensUnicos[0]?.fonte ?? "", chaves);
		await this.indice.inativarAusentesDaFonte(itensUnicos[0]?.fonte ?? "", chaves);
	}

	private async gerarEmbeddingsPendentes(itens: ItemColetado[]): Promise<Map<string, number[]>> {
		const textos = [...new Set(itens.map((item) => normalizarTituloProduto(item.titulo)))];
		const faltantes = textos.filter((texto) => !this.cacheEmbeddings.has(texto));
		if (faltantes.length > 0) {
			const vetores = this.embeddings.generateEmbeddings
				? await this.embeddings.generateEmbeddings(faltantes)
				: await Promise.all(faltantes.map((texto) => this.embeddings.generateEmbedding(texto)));
			faltantes.forEach((texto, indice) => this.cacheEmbeddings.set(texto, vetores[indice]!));
		}
		return new Map(textos.map((texto) => [texto, this.cacheEmbeddings.get(texto)!]));
	}
}
