import { AnalisadorSite } from "../analisadores/analisador-site.js";
import { ClienteHttp } from "../clientes/cliente-http.js";
import { load } from "cheerio";
import type { ItemColetado } from "../modelos/item-coletado.model.js";
import { ColetorBase } from "../coletores/coletor-base.js";
import { criarOpcoesColeta } from "../coleta/opcoes-coleta.js";
import { logger } from "../config/logger.js";
import type { SeletoresSite } from "../modelos/seletores-site.js";
import type { FonteProdutos } from "./fonte-produtos.js";
import type { DiagnosticoColetaFonte } from "./fonte-produtos.js";

export class ColetorFonteSite extends ColetorBase<ItemColetado> implements FonteProdutos {
	private diagnostico?: DiagnosticoColetaFonte;
	constructor(
		public readonly nome: string,
		public readonly categoria: string,
		public readonly identificadorColeta: string,
		private readonly url: string,
		private readonly clienteHttp: ClienteHttp,
		private readonly analisador: AnalisadorSite,
		private readonly seletores: SeletoresSite,
		private readonly obterConfiguracaoAtual?: () => Promise<{ url: string; seletores: SeletoresSite } | undefined>,
	) {
		super();
	}

	async coletar(navegadorVisivel?: boolean): Promise<ItemColetado[]> {
		const configuracaoAtual = await this.obterConfiguracaoAtual?.();
		const url = configuracaoAtual?.url ?? this.url;
		const seletores = configuracaoAtual?.seletores ?? this.seletores;
		const opcoes = criarOpcoesColeta(seletores);
		logger.info(
			{
				fonte: this.nome,
				categoria: this.categoria,
				url,
				paginacao: opcoes.paginacao,
			},
			"Configuração resolvida para coleta real",
		);
		const resultado = await this.clienteHttp.obterHtmlComDiagnostico(url, {
			...opcoes,
			navegadorVisivel,
		});
		const { html } = resultado;
		this.diagnostico = {
			paginasProcessadas: resultado.paginacao.paginasProcessadas,
			produtosPorPagina: resultado.produtosPorPagina,
		};

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

		return this.analisador.analisar(html, url, this.nome, this.categoria, seletores);
	}

	obterDiagnosticoColeta(): DiagnosticoColetaFonte | undefined {
		return this.diagnostico;
	}
}
