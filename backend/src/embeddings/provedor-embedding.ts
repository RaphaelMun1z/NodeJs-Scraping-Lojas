export interface EmbeddingProvider {
	generateEmbedding(text: string): Promise<number[]>;
	generateEmbeddings?(textos: string[]): Promise<number[][]>;
}
