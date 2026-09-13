import type { ItemColetado } from "../modelos/item-coletado.model.js";

export interface DiagnosticoColetaFonte {
	paginasProcessadas: number;
	produtosPorPagina: number[];
}

export interface FonteProdutos {
	nome: string;
	categoria: string;
	identificadorColeta: string;
	coletar(): Promise<ItemColetado[]>;
	obterDiagnosticoColeta?(): DiagnosticoColetaFonte | undefined;
}
