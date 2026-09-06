import { AnalisadorSite } from "../analisadores/analisador-site.js";
import { ClienteHttp } from "../clientes/cliente-http.js";
import { configuracaoAplicacao } from "../config/aplicacao.config.js";
import type { ItemColetado } from "../modelos/item-coletado.model.js";
import { ColetorBase } from "./coletor-base.js";

export class ColetorSite extends ColetorBase<ItemColetado> {
	constructor(
		private readonly clienteHttp: ClienteHttp,
		private readonly analisador: AnalisadorSite,
	) {
		super();
	}

	async coletar(): Promise<ItemColetado[]> {
		const url = configuracaoAplicacao.coleta.url;
		const html = await this.clienteHttp.obterHtml(url);

		return this.analisador.analisar(html, url);
	}
}
