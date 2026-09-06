import type { SeletoresSite } from "./selectors.js";

export type NomeFonte = "kabum" | "amazon" | "terabyteshop";

export const seletoresPorFonte: Record<NomeFonte, SeletoresSite> = {
	kabum: {
		item: 'main a[href*="/produto/"]',
		titulo: "span.line-clamp-2",
		preco: "div.flex.gap-4.items-center > span.text-base.font-semibold",
		precoAntigo: 'span.line-through, span[class*="line-through"]',
		imagem: "img[src]",
	},
	amazon: {
		item: 'div[data-testid="product-card"]',
		titulo: 'p[id^="title-"] .a-truncate-full',
		preco: 'div[data-testid="price-section"] div[class*="priceToPay"] .a-offscreen',
		precoAntigo: 'div[data-testid="price-section"] div[class*="wrapPrice"] .a-offscreen',
		imagem: 'img[class*="a-amazon-image"]',
		url: 'a[data-testid="product-card-link"]',
		paginaVirtualizada: true,
	},
	terabyteshop: {
		item: ".products-grid .product-item",
		titulo: ".product-item__name h2",
		preco: ".product-item__new-price > span",
		precoAntigo: ".product-item__old-price del > span",
		imagem: "img.image-thumbnail",
		url: "a.product-item__name",
		carregarMais: "a.btn-pdmore",
	},
};
