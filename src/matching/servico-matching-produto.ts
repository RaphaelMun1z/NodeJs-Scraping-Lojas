import type { EmbeddingProvider } from "../embeddings/provedor-embedding.js";
import type { ProdutoCandidato, RepositorioIndiceProdutos } from "../elasticsearch/repositorio-indice-produtos.js";
import { configuracaoMatching, validarConfiguracaoMatching } from "./configuracao-matching.js";
import { normalizarTituloProduto } from "./normalizador-titulo.js";
import { avaliarCandidato, escolherMelhorMatch, type AvaliacaoMatch } from "./comparador-produtos.js";

export interface ResultadoMatchingProduto {
	equivalente: ProdutoCandidato | null;
	score: number;
	candidatos: AvaliacaoMatch[];
}

export class ServicoMatchingProduto {
	constructor(
		private readonly indice: RepositorioIndiceProdutos,
		private readonly embeddings: EmbeddingProvider,
		private readonly configuracao = configuracaoMatching,
	) {}

	async encontrarEquivalente(titulo: string, chaveIgnorada?: string, embeddingPronto?: number[], fonteIgnorada?: string): Promise<ResultadoMatchingProduto> {
		validarConfiguracaoMatching();
		// Gera o embedding a partir do título normalizado.
		const tituloNormalizado = normalizarTituloProduto(titulo);
		const embedding = embeddingPronto ?? await this.embeddings.generateEmbedding(tituloNormalizado);
		if (embedding.length !== this.configuracao.dimensaoEmbedding) {
			throw new Error(`Dimensão do embedding (${embedding.length}) diferente de EMBEDDING_DIMENSIONS (${this.configuracao.dimensaoEmbedding})`);
		}
		// Busca somente os candidatos mais próximos no Elasticsearch.
		const candidatos = await this.indice.buscarCandidatos(tituloNormalizado, embedding, this.configuracao.candidatos, chaveIgnorada, fonteIgnorada);
		const avaliacoes = candidatos.map((candidato) => avaliarCandidato(titulo, candidato, { vetor: this.configuracao.pesoVetor, texto: this.configuracao.pesoTexto, tokens: this.configuracao.pesoTokens }));
		const melhor = escolherMelhorMatch(avaliacoes, this.configuracao.threshold);
		return { equivalente: melhor?.candidato ?? null, score: melhor?.scoreFinal ?? 0, candidatos: avaliacoes };
	}
}
