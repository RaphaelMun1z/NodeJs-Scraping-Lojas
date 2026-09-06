import { RepositorioItem } from "../banco/repositorios/repositorio-item.js";
import type { FonteProdutos } from "../fontes/fonte-produtos.js";
import { logger } from "../config/logger.js";

export class ServicoColeta {
	private execucaoAtual?: Promise<number>;

	constructor(
		private readonly fontes: FonteProdutos[],
		private readonly repositorioItem: RepositorioItem,
		private readonly salvarColeta: boolean,
	) {}

	executar(): Promise<number> {
		// Compartilha a promessa atual para impedir coletas concorrentes.
		if (this.execucaoAtual) return this.execucaoAtual;

		this.execucaoAtual = this.executarColeta().finally(() => {
			this.execucaoAtual = undefined;
		});

		return this.execucaoAtual;
	}

	private async executarColeta(): Promise<number> {
		const inicio = Date.now();
		console.log("🔎 Iniciando busca de produtos...");

		let totalItens = 0;

		for (const fonte of this.fontes) {
			try {
				const itens = await fonte.coletar();
				totalItens += itens.length;

				if (this.salvarColeta) {
					await this.repositorioItem.sincronizarFonte(
						fonte.nome,
						itens,
					);
				}

				console.log(
					`${this.salvarColeta ? "💾" : "✅"} ${fonte.nome}: ${itens.length} produto(s) ${this.salvarColeta ? "encontrado(s) e salvo(s)" : "encontrado(s)"}.`,
				);
			} catch (erro) {
				logger.error(
					{
						fonte: fonte.nome,
						erro: erro instanceof Error
							? { name: erro.name, message: erro.message, stack: erro.stack }
							: erro,
					},
					"Erro na coleta da fonte",
				);
			}
		}

		console.log(`📦 Total da coleta: ${totalItens} produto(s).`);
		console.log(`⏱️ Tempo da busca: ${Date.now() - inicio}ms.`);
		return totalItens;
	}
}
