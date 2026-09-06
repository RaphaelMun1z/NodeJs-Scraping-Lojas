import { AnalisadorSite } from "../analisadores/analisador-site.js";
import { ClienteHttp } from "../clientes/cliente-http.js";
import type { ItemColetado } from "../modelos/item-coletado.model.js";
import { ColetorBase } from "../coletores/coletor-base.js";
import type { SeletoresSite } from "../config/selectors.js";
import type { FonteProdutos } from "./fonte-produtos.js";

export class ColetorFonteSite extends ColetorBase<ItemColetado> implements FonteProdutos {
	constructor(
		public readonly nome: string,
		private readonly url: string,
		private readonly clienteHttp: ClienteHttp,
		private readonly analisador: AnalisadorSite,
		private readonly seletores: SeletoresSite,
	) {
		super();
	}

	async coletar(): Promise<ItemColetado[]> {
		const html = await this.clienteHttp.obterHtml(this.url, {
			seletorItens: this.seletores.paginaVirtualizada
				? this.seletores.item
				: undefined,
			seletorCarregarMais: this.seletores.carregarMais,
		});

		if (/Just a moment|Performing security verification|Cloudflare/i.test(html)) {
			throw new Error("A fonte retornou uma página de verificação/bloqueio");
		}

		return this.analisador.analisar(html, this.url, this.nome, this.seletores);
	}
}
