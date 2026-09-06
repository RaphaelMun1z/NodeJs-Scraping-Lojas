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

      const titulo = itemAtual.find(seletores.titulo).text().trim();
      const descricao =
        itemAtual.find(seletores.descricao).text().trim() || undefined;
      const href = itemAtual.find(seletores.link).attr("href");

      // Converte links relativos em URLs completas antes da validação.
      const resultado = esquemaItemColetado.safeParse({
        titulo,
        descricao,
        url: href ? new URL(href, urlBase).toString() : undefined,
      });

      // Itens inválidos são ignorados para não interromper toda a coleta.
      if (resultado.success) {
        itens.push(resultado.data);
      }
    });

    return itens;
  }
}
