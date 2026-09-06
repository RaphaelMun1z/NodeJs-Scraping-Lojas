import { RepositorioItem } from "../banco/repositorios/repositorio-item.js";
import { ColetorBase } from "../coletores/coletor-base.js";
import { ItemColetado } from "../modelos/item-coletado.model.js";

export class ServicoColeta {
	private execucaoAtual?: Promise<number>;

	constructor(
		private readonly coletor: ColetorBase<ItemColetado>,
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

		const itens = await this.coletor.coletar();

		if (this.salvarColeta) {
			await this.repositorioItem.salvarMuitos(itens);
			console.log(`💾 ${itens.length} produto(s) encontrado(s) e salvo(s).`);
		} else {
			console.log(`✅ Busca concluída: ${itens.length} produto(s) encontrado(s).`);
		}

		console.log(`⏱️ Tempo da busca: ${Date.now() - inicio}ms.`);
		return itens.length;
	}
}
