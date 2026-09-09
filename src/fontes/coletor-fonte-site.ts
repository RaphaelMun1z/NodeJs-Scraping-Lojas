import { AnalisadorSite } from "../analisadores/analisador-site.js";
import { ClienteHttp } from "../clientes/cliente-http.js";
import { load } from "cheerio";
import type { ItemColetado } from "../modelos/item-coletado.model.js";
import { ColetorBase } from "../coletores/coletor-base.js";
import type { SeletoresSite } from "../modelos/seletores-site.js";
import type { FonteProdutos } from "./fonte-produtos.js";

export class ColetorFonteSite extends ColetorBase<ItemColetado> implements FonteProdutos {
	constructor(
		public readonly nome: string,
		private readonly url: string,
		private readonly clienteHttp: ClienteHttp,
		private readonly analisador: AnalisadorSite,
		private readonly seletores: SeletoresSite,
		private readonly obterConfiguracaoAtual?: () => Promise<{ url: string; seletores: SeletoresSite } | undefined>,
	) {
		super();
	}

	async coletar(): Promise<ItemColetado[]> {
		const configuracaoAtual = await this.obterConfiguracaoAtual?.();
		const url = configuracaoAtual?.url ?? this.url;
		const seletores = configuracaoAtual?.seletores ?? this.seletores;
		const html = await this.clienteHttp.obterHtml(url, {
			seletorItens: seletores.paginaVirtualizada
				? seletores.item
				: undefined,
			seletorAguardar: seletores.item,
			seletorCarregarMais: seletores.carregarMais,
		});

		const possuiSinaisDeBloqueio =
			/Just a moment|Performing security verification|cf-chl-|challenge-platform|challenge-running|Verify you are human/i.test(
				html,
			);
		const quantidadeDeProdutos = load(html)(seletores.item).length;

		// Scripts da protecao podem permanecer no HTML mesmo com os produtos
		// carregados. So interrompemos quando nao ha nenhum card disponivel.
		if (possuiSinaisDeBloqueio && quantidadeDeProdutos === 0) {
			throw new Error("A fonte retornou uma página de verificação/bloqueio");
		}

		return this.analisador.analisar(html, url, this.nome, seletores);
	}
}
