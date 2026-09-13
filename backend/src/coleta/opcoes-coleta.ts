import type { OpcoesHtml } from "../clientes/cliente-http.js";
import type { SeletoresSite } from "../modelos/seletores-site.js";

/**
 * Mapeia a configuração persistida de uma categoria para as opções usadas
 * pelo navegador. Teste de seletores e coleta normal devem usar este mesmo
 * mapeamento para não divergirem na paginação ou no carregamento incremental.
 */
export function criarOpcoesColeta(seletores: SeletoresSite): Pick<
	OpcoesHtml,
	"seletorItens" | "seletorAguardar" | "seletorCarregarMais" | "paginacao"
> {
	return {
		seletorItens: seletores.paginaVirtualizada ? seletores.item : undefined,
		seletorAguardar: seletores.item,
		seletorCarregarMais: seletores.carregarMais,
		paginacao: {
			tipo: seletores.tipoPaginacao,
			seletorProximaPagina: seletores.seletorProximaPagina,
			maxPaginas: seletores.maxPaginas,
			parametroPagina: seletores.parametroPagina,
			urlPaginacaoTemplate: seletores.urlPaginacaoTemplate,
		},
	};
}
