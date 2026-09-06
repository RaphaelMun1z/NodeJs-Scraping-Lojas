import type { ItemColetado } from "../modelos/item-coletado.model.js";

export interface FonteProdutos {
	nome: string;
	coletar(): Promise<ItemColetado[]>;
}
