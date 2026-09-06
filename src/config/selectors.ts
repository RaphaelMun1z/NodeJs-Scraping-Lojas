export const seletores = {
	// Cada produto é um <a> dentro do <main>, e o próprio <a> possui o href.
	// A busca por /produto/ é mais estável que as classes CSS geradas pelo site.
	item: 'main a[href*="/produto/"]',
  titulo: "span.line-clamp-2",
  preco: "div.flex.gap-4.items-center > span.text-base.font-semibold",
  imagem: "img[src]",
} as const;
