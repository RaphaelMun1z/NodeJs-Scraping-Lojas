export type TipoPaginacao = "nenhuma" | "proximaPagina" | "url";

export interface SeletoresSite {
	item: string;
	titulo: string;
	preco: string;
	precoAntigo?: string;
	imagem: string;
	url?: string;
	paginaVirtualizada?: boolean;
	carregarMais?: string;
	tipoPaginacao?: TipoPaginacao;
	seletorProximaPagina?: string;
	maxPaginas?: number;
	parametroPagina?: string;
	urlPaginacaoTemplate?: string;
}
