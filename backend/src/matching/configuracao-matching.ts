import "dotenv/config";

export const configuracaoMatching = {
	habilitado: process.env.ELASTICSEARCH_HABILITADO === "true",
	url: process.env.ELASTICSEARCH_URL ?? "http://127.0.0.1:9200",
	indice: process.env.ELASTICSEARCH_INDICE ?? "produtos",
	chaveApi: process.env.ELASTICSEARCH_API_KEY,
	dimensaoEmbedding: Number(process.env.EMBEDDING_DIMENSIONS ?? 0),
	embeddingUrl: process.env.EMBEDDING_URL,
	embeddingModelo: process.env.EMBEDDING_MODEL,
	embeddingApiKey: process.env.EMBEDDING_API_KEY,
	candidatos: Number(process.env.MATCHING_CANDIDATOS ?? 20),
	pesoVetor: Number(process.env.MATCHING_PESO_VETOR ?? 0.45),
	pesoTexto: Number(process.env.MATCHING_PESO_TEXTO ?? 0.30),
	pesoTokens: Number(process.env.MATCHING_PESO_TOKENS ?? 0.25),
	threshold: Number(process.env.MATCHING_THRESHOLD ?? 0.78),
} as const;

export function validarConfiguracaoMatching(): void {
	if (!configuracaoMatching.habilitado) return;
	if (!configuracaoMatching.dimensaoEmbedding || configuracaoMatching.dimensaoEmbedding < 1) {
		throw new Error("EMBEDDING_DIMENSIONS deve ser informado e corresponder ao modelo configurado");
	}
	if (!configuracaoMatching.embeddingUrl || !configuracaoMatching.embeddingModelo) {
		throw new Error("EMBEDDING_URL e EMBEDDING_MODEL são obrigatórios quando o matching está habilitado");
	}
	const soma = configuracaoMatching.pesoVetor + configuracaoMatching.pesoTexto + configuracaoMatching.pesoTokens;
	if (soma <= 0) throw new Error("Os pesos do matching devem somar um valor maior que zero");
}
