import assert from "node:assert/strict";
import type { OpcoesHtml } from "../clientes/cliente-http.js";
import { AnalisadorSite } from "../analisadores/analisador-site.js";
import { ColetorFonteSite } from "../fontes/coletor-fonte-site.js";
import type { SeletoresSite } from "../modelos/seletores-site.js";
import { ServicoColeta } from "../servicos/servico-coleta.js";

const base: SeletoresSite = {
	item: ".produto",
	titulo: ".titulo",
	preco: ".preco",
	precoAntigo: "",
	imagem: "img",
	url: "a",
	paginaVirtualizada: false,
	carregarMais: "",
	tipoPaginacao: "nenhuma",
	seletorProximaPagina: "",
	maxPaginas: 10,
	parametroPagina: "page",
	urlPaginacaoTemplate: "",
};
let seletoresPersistidos = base;
const chamadas: OpcoesHtml[] = [];
const clienteHttp = {
	async obterHtmlComDiagnostico(_url: string, opcoes: OpcoesHtml) {
		chamadas.push(opcoes);
		return {
			html: '<article class="produto"><a href="/produto"><img src="https://loja.test/imagem.jpg"><span class="titulo">Produto</span><span class="preco">R$ 10,00</span></a></article>',
			paginacao: {
				tipo: opcoes.paginacao?.tipo ?? "nenhuma",
				paginasProcessadas: opcoes.paginacao?.maxPaginas ?? 1,
				urlsVisitadas: ["https://loja.test/lista"],
				motivoParada: "limite-maximo" as const,
			},
			produtosPorPagina: [1],
		};
	},
};
const coletor = new ColetorFonteSite(
	"kabum",
	"Processadores",
	"kabum:processadores",
	"https://loja.test/lista",
	clienteHttp as never,
	new AnalisadorSite(),
	base,
	async () => ({ url: "https://loja.test/lista", seletores: seletoresPersistidos }),
);
const servico = new ServicoColeta(
	[],
	{} as never,
	false,
	undefined,
	undefined,
	undefined,
	async () => [coletor],
);

await servico.executar();
assert.equal(chamadas[0]?.paginacao?.tipo, "nenhuma");

seletoresPersistidos = {
	...base,
	tipoPaginacao: "proximaPagina",
	seletorProximaPagina: "#listingPagination a.nextLink",
	maxPaginas: 3,
};
await servico.executar();

assert.equal(chamadas[1]?.paginacao?.tipo, "proximaPagina");
assert.equal(chamadas[1]?.paginacao?.seletorProximaPagina, "#listingPagination a.nextLink");
assert.equal(chamadas[1]?.paginacao?.maxPaginas, 3);

console.log("Teste da coleta real com configuração atualizada sem reinício concluído");
