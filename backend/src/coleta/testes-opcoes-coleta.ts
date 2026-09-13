import assert from "node:assert/strict";
import { criarOpcoesColeta } from "./opcoes-coleta.js";
import { AnalisadorSite } from "../analisadores/analisador-site.js";

const seletores = {
	item: ".produto",
	titulo: ".titulo",
	preco: ".preco",
	precoAntigo: "",
	imagem: "img",
	url: "a",
	paginaVirtualizada: false,
	carregarMais: ".carregar-mais",
	tipoPaginacao: "proximaPagina" as const,
	seletorProximaPagina: "#listingPagination a.nextLink",
	maxPaginas: 3,
	parametroPagina: "page",
	urlPaginacaoTemplate: "",
};

const opcoesTeste = criarOpcoesColeta(seletores);
const opcoesColetaNormal = criarOpcoesColeta(seletores);

assert.deepEqual(opcoesColetaNormal, opcoesTeste);
assert.equal(opcoesColetaNormal.paginacao?.tipo, "proximaPagina");
assert.equal(opcoesColetaNormal.paginacao?.seletorProximaPagina, "#listingPagination a.nextLink");
assert.equal(opcoesColetaNormal.paginacao?.maxPaginas, 3);

const htmlTresPaginas = Array.from(
	{ length: 30 },
	(_, indice) => `<article class="produto"><a href="/produto-${indice}"><img src="https://loja.test/imagem-${indice}.jpg"><span class="titulo">Produto ${indice}</span><span class="preco">R$ ${indice + 1},00</span></a></article>`,
).join("");
const itens = new AnalisadorSite().analisar(
	htmlTresPaginas,
	"https://loja.test/lista",
	"loja",
	"categoria",
	seletores,
);
assert.equal(itens.length, 30);

console.log("Teste de paridade das opções de coleta concluído");
