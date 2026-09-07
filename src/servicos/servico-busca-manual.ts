import type { FonteProdutos } from "../fontes/fonte-produtos.js";
import type { ItemColetado } from "../modelos/item-coletado.model.js";

export interface ResultadoBuscaManual {
	itens: ItemColetado[];
	erros: Array<{ fonte: string; mensagem: string }>;
	iniciadaEm: Date;
	finalizadaEm: Date;
}

export class ServicoBuscaManual {
	constructor(
		private readonly fontes: FonteProdutos[],
		private readonly obterFontesAtivas?: () => Promise<string[]>,
	) {}

	async executar(fontesSelecionadas: string[] = []): Promise<ResultadoBuscaManual> {
		const iniciadaEm = new Date();
		const fontesAtivas = this.obterFontesAtivas ? new Set(await this.obterFontesAtivas()) : undefined;
		const fontes = this.fontes.filter((fonte) =>
			(!fontesAtivas || fontesAtivas.has(fonte.nome)) && (fontesSelecionadas.length === 0 || fontesSelecionadas.includes(fonte.nome)),
		);
		const itens: ItemColetado[] = [];
		const erros: Array<{ fonte: string; mensagem: string }> = [];

		for (const fonte of fontes) {
			try {
				itens.push(...await fonte.coletar());
			} catch (erro) {
				erros.push({ fonte: fonte.nome, mensagem: erro instanceof Error ? erro.message : "Erro desconhecido na busca" });
			}
		}

		return { itens, erros, iniciadaEm, finalizadaEm: new Date() };
	}
}
