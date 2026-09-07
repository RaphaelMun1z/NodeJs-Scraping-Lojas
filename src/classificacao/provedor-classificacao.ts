import type { CategoriaProduto } from "./categorias-produto.js";

export interface ResultadoClassificacaoProduto {
	categoriaOriginal: string;
	categoriaNormalizada: string;
	categoria: CategoriaProduto;
	subcategoria?: string;
	tipoProduto: "principal" | "acessorio" | "consumivel" | "outro";
	confianca: number;
	versao: number;
}

export interface ProvedorClassificacaoProduto {
	classificarProduto(titulo: string): Promise<ResultadoClassificacaoProduto>;
}
