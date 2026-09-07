export const VERSAO_CLASSIFICACAO_PRODUTO = 3;

export const CATEGORIAS_PRODUTO = {
	Computadores: ["Notebook", "Desktop", "All-in-one"],
	"Placas de vídeo": [],
	Processadores: [],
	"Memória RAM": [],
	Armazenamento: ["SSD", "HD", "Cartão de memória"],
	Monitores: [],
	Periféricos: ["Mouse", "Headset", "Teclado"],
	"Fontes de alimentação": [],
	Gabinete: [],
	Mousepad: [],
	"Suporte Monitor": [],
	"Robo Aspirador": [],
	Consoles: [],
	"Jogos e gift cards": [],
	"Software e serviços": [],
	Acessórios: [],
	Eletrodomésticos: [],
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
