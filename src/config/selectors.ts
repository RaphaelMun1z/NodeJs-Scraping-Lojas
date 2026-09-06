export interface SeletoresSite {
	item: string;
	titulo: string;
	preco: string;
	precoAntigo?: string;
	imagem: string;
	url?: string;
	paginaVirtualizada?: boolean;
	carregarMais?: string;
}

export const seletores: SeletoresSite = {
	// Cada produto é um <a> dentro do <main>, e o próprio <a> possui o href.
	// A busca por /produto/ é mais estável que as classes CSS geradas pelo site.
	item: 'main a[href*="/produto/"]',
	titulo: "span.line-clamp-2",
	preco: "div.flex.gap-4.items-center > span.text-base.font-semibold",
	imagem: "img[src]",
} as const;
