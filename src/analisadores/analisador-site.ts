import * as cheerio from "cheerio";
import { seletores as seletoresPadrao, type SeletoresSite } from "../config/selectors.js";
import {
	esquemaItemColetado,
	type ItemColetado,
} from "../modelos/item-coletado.model.js";

export class AnalisadorSite {
	analisar(html: string, urlBase: string, fonte = "kabum", seletores: SeletoresSite = seletoresPadrao): ItemColetado[] {
		const $ = cheerio.load(html);
		const itens: ItemColetado[] = [];

		// Converte e valida cada card isoladamente para preservar os demais itens
		// quando um produto estiver incompleto ou fora do formato esperado.
		$(seletores.item).each((_, elemento) => {
			const itemAtual = $(elemento);
			const titulo = itemAtual
				.find(seletores.titulo)
				.first()
				.text()
				.trim();
			const textoPreco = itemAtual
				.find(seletores.preco)
				.map((_, preco) => $(preco).text())
				.get()
				.join(" ");
			const textoPrecoAntigo = seletores.precoAntigo
				? itemAtual
						.find(seletores.precoAntigo)
						.map((_, preco) => $(preco).text())
						.get()
						.join(" ")
				: "";
			const href = seletores.url
				? itemAtual.find(seletores.url).first().attr("href")
				: itemAtual.attr("href");
			const imagemUrl = itemAtual
				.find(seletores.imagem)
				.first()
				.attr("src") ?? itemAtual.find(seletores.imagem).first().attr("data-src");

			const resultado = esquemaItemColetado.safeParse({
				fonte,
				titulo,
				preco: this.converterPreco(textoPreco),
				precoAntigo: this.converterPreco(textoPrecoAntigo),
				imagemUrl,
				url: href ? new URL(href, urlBase).toString() : undefined,
			});

			if (resultado.success) itens.push(resultado.data);
		});

		return itens;
	}

	private converterPreco(texto: string): number | undefined {
		// Normaliza o formato brasileiro (1.234,56) para um número JavaScript.
		const valor = texto.replace(/[^\d,.]/g, "");
		if (!valor) return undefined;

		const numero = Number(valor.replace(/\./g, "").replace(",", "."));
		return Number.isFinite(numero) ? numero : undefined;
	}
}
