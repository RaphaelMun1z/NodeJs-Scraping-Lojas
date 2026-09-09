// Incrementada após o endurecimento dos identificadores de modelo no matching.
export const VERSAO_CLASSIFICACAO_PRODUTO = 6;

export const CATEGORIAS_PRODUTO = {
	Computadores: ["Notebook", "Desktop", "All-in-one"],
	["Placas de v\u00eddeo"]: [],
	Processadores: [],
	Smartphones: [],
	["Televis\u00f5es"]: [],
	["\u00c1udio"]: ["Fones de ouvido", "Caixas de som", "Soundbar"],
	Smartwatches: [],
	["C\u00e2meras"]: [],
	Projetores: [],
	["Mem\u00f3ria RAM"]: [],
	Armazenamento: ["SSD", "HD", "Cart\u00e3o de mem\u00f3ria"],
	Monitores: [],
	Perif\u00e9ricos: ["Mouse", "Headset", "Teclado"],
	["Fontes de alimenta\u00e7\u00e3o"]: [],
	Gabinete: [],
	Mousepad: [],
	["Suporte Monitor"]: [],
	["Robo Aspirador"]: [],
	["Carregadores e power banks"]: [],
	["Pilhas e baterias"]: [],
	Consoles: [],
	["Jogos e gift cards"]: [],
	["Software e servi\u00e7os"]: [],
	Acess\u00f3rios: [],
	Eletrodom\u00e9sticos: [],
	Outros: [],
} as const;

export type CategoriaProduto = keyof typeof CATEGORIAS_PRODUTO;

export function categoriaValida(categoria: string, subcategoria?: string): boolean {
	if (!(categoria in CATEGORIAS_PRODUTO)) return false;
	const subcategorias = CATEGORIAS_PRODUTO[categoria as CategoriaProduto];
	return !subcategoria || subcategorias.includes(subcategoria as never);
}

export function formatarCategoria(categoria: CategoriaProduto, subcategoria?: string): string {
	return subcategoria ? `${categoria} > ${subcategoria}` : categoria;
}
