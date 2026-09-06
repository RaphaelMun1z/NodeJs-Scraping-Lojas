import * as cheerio from "cheerio";
import { seletores } from "../config/selectors.js";
import {
	esquemaItemColetado,
	type ItemColetado,
} from "../modelos/item-coletado.model.js";

export class AnalisadorSite {
	analisar(html: string, urlBase: string): ItemColetado[] {
		const $ = cheerio.load(html);
		const itens: ItemColetado[] = [];

		$(seletores.item).each((_, elemento) => {
			const itemAtual = $(elemento);
			const titulo = itemAtual.find(seletores.titulo).first().text().trim();
			const textoPreco = itemAtual
				.find(seletores.preco)
				.map((_, preco) => $(preco).text())
				.get()
				.join(" ");
			const href = itemAtual.attr("href");
			const imagemUrl = itemAtual.find(seletores.imagem).first().attr("src");

			const resultado = esquemaItemColetado.safeParse({
				titulo,
				preco: this.converterPreco(textoPreco),
				imagemUrl,
				url: href ? new URL(href, urlBase).toString() : undefined,
			});

			if (resultado.success) itens.push(resultado.data);
		});

		return itens;
	}

	private converterPreco(texto: string): number | undefined {
		const valor = texto.replace(/[^\d,.]/g, "");
		if (!valor) return undefined;

		const numero = Number(valor.replace(/\./g, "").replace(",", "."));
		return Number.isFinite(numero) ? numero : undefined;
	}
}
