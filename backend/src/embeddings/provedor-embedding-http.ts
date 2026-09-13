import type { EmbeddingProvider } from "./provedor-embedding.js";

type RespostaEmbedding = { embedding?: number[]; embeddings?: number[][]; data?: Array<{ embedding?: number[] }> };

export class ProvedorEmbeddingHttp implements EmbeddingProvider {
	constructor(
		private readonly endpoint: string,
		private readonly modelo: string,
		private readonly chaveApi?: string,
	) {}

	async generateEmbedding(texto: string): Promise<number[]> {
		return (await this.generateEmbeddings([texto]))[0]!;
	}

	async generateEmbeddings(textos: string[]): Promise<number[][]> {
		if (textos.length === 0) return [];
		const resposta = await fetch(this.endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...(this.chaveApi ? { Authorization: `Bearer ${this.chaveApi}` } : {}),
			},
			body: JSON.stringify({ model: this.modelo, input: textos.length === 1 ? textos[0] : textos }),
		});
		if (!resposta.ok) throw new Error(`Erro no provedor de embeddings: HTTP ${resposta.status}`);

		const dados = (await resposta.json()) as RespostaEmbedding;
		const vetores = dados.embeddings ?? (dados.data ? dados.data.map((item) => item.embedding).filter((item): item is number[] => Boolean(item)) : dados.embedding ? [dados.embedding] : []);
		if (vetores.length !== textos.length || vetores.some((vetor) => !vetor.length || vetor.some((valor) => !Number.isFinite(valor)))) throw new Error("O provedor de embeddings retornou vetores inválidos");
		return vetores;
	}
}
