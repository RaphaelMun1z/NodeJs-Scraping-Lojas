import type { EmbeddingProvider } from "./provedor-embedding.js";

/**
 * Embedding determinístico local para manter o matching autossuficiente.
 * Combina tokens e n-gramas de caracteres, o que preserva proximidade entre
 * títulos com pequenas diferenças sem depender de um serviço externo.
 */
export class ProvedorEmbeddingLocal implements EmbeddingProvider {
	constructor(private readonly dimensoes = 768) {}

	async generateEmbedding(texto: string): Promise<number[]> {
		const vetor = new Array<number>(this.dimensoes).fill(0);
		const normalizado = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();
		const tokens = normalizado.split(/\s+/).filter(Boolean);
		const caracteristicas = new Map<string, number>();
		for (const token of tokens) caracteristicas.set(`w:${token}`, 1 + (caracteristicas.get(`w:${token}`) ?? 0));
		for (const token of tokens) {
			const preenchido = `^${token}$`;
			for (let tamanho = 2; tamanho <= 4; tamanho += 1) {
				for (let inicio = 0; inicio + tamanho <= preenchido.length; inicio += 1) {
					const chave = `g:${preenchido.slice(inicio, inicio + tamanho)}`;
					caracteristicas.set(chave, (caracteristicas.get(chave) ?? 0) + 0.35);
				}
			}
		}
		for (const [caracteristica, peso] of caracteristicas) {
			let hash = 2166136261;
			for (let indice = 0; indice < caracteristica.length; indice += 1) {
				hash ^= caracteristica.charCodeAt(indice);
				hash = Math.imul(hash, 16777619);
			}
			const posicao = (hash >>> 0) % this.dimensoes;
			vetor[posicao] = (vetor[posicao] ?? 0) + peso * ((hash & 1) === 0 ? 1 : -1);
		}
		const norma = Math.sqrt(vetor.reduce((total, valor) => total + valor * valor, 0));
		return norma ? vetor.map((valor) => valor / norma) : vetor;
	}

	async generateEmbeddings(textos: string[]): Promise<number[][]> {
		return Promise.all(textos.map((texto) => this.generateEmbedding(texto)));
	}
}
