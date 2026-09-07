import type { RepositorioItem } from "../banco/repositorios/repositorio-item.js";
import type { RepositorioIndiceProdutos } from "../elasticsearch/repositorio-indice-produtos.js";

export interface ResultadoLimpezaProdutos {
	itens: number;
	historico: number;
	indexados: number;
}

export class ServicoLimpezaProdutos {
	private emExecucao = false;

	constructor(
		private readonly repositorioItem: RepositorioItem,
		private readonly repositorioIndice?: RepositorioIndiceProdutos,
	) {}

	async executar(): Promise<ResultadoLimpezaProdutos> {
		if (this.emExecucao) throw new Error("Já existe uma limpeza de produtos em andamento");
		this.emExecucao = true;
		try {
			const mongo = await this.repositorioItem.limparProdutos();
			const indexados = await (this.repositorioIndice?.limparProdutos() ?? Promise.resolve(0));
			return { ...mongo, indexados };
		} finally {
			this.emExecucao = false;
		}
	}
}
