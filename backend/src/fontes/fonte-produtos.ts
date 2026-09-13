import type { ItemColetado } from "../modelos/item-coletado.model.js";

export interface FonteProdutos {
	nome: string;
	categoria: string;
	identificadorColeta: string;
	coletar(): Promise<ItemColetado[]>;
}
