import assert from "node:assert/strict";
import { extrairAtributosProduto, possuiConflitoDeAtributos } from "./extrator-atributos.js";
import { avaliarCandidato } from "./comparador-produtos.js";
import { normalizarTituloProduto, obterTokensTitulo } from "./normalizador-titulo.js";

const criarCandidato = (titulo: string, scoreVetor = 0.9, scoreTexto = 0.9) => ({ id: titulo, fonte: "teste", titulo, tituloNormalizado: normalizarTituloProduto(titulo), ativo: true, chave: titulo, scoreVetor, scoreTexto, scoreClassificacao: 1 });

assert.equal(normalizarTituloProduto("Samsung Galaxy S24 256 GB Preto"), "samsung galaxy s24 256gb preto");
assert(obterTokensTitulo("Notebook gamer com RTX 4060").has("rtx"));

assert.equal(possuiConflitoDeAtributos(extrairAtributosProduto("Galaxy S24 128GB"), extrairAtributosProduto("Galaxy S24 256GB")), true);
assert.equal(possuiConflitoDeAtributos(extrairAtributosProduto("iPhone 15"), extrairAtributosProduto("iPhone 15 Pro")), true);
assert.equal(possuiConflitoDeAtributos(extrairAtributosProduto("RTX 4060"), extrairAtributosProduto("RTX 4070")), true);
assert.equal(possuiConflitoDeAtributos(extrairAtributosProduto("PS5 Slim Digital"), extrairAtributosProduto("PS5 Slim com leitor")), true);
assert.equal(possuiConflitoDeAtributos(extrairAtributosProduto("Monitor ASUS TUF 27\" QHD"), extrairAtributosProduto("Monitor ASUS TUF 25\" Full HD")), true);
assert.equal(possuiConflitoDeAtributos(extrairAtributosProduto("Suporte de Mesa Articulado"), extrairAtributosProduto("Suporte de Parede Articulado")), true);
assert.equal(possuiConflitoDeAtributos(extrairAtributosProduto("Fonte Corsair CX650"), extrairAtributosProduto("Fonte MSI MAG A650BN")), true);
assert.equal(possuiConflitoDeAtributos(
	extrairAtributosProduto("Headset Gamer Havit, Drivers 53mm, Microfone Plugável, 3.5mm, PC, PS4, XBOX ONE, Preto - HV-H2O02D"),
	extrairAtributosProduto("Headset Gamer Redragon Cragblade H541, Drivers de 53mm, 3.5mm, Preto"),
), true);

const equivalente = avaliarCandidato("Samsung Galaxy S24 256GB Preto", criarCandidato("Smartphone Samsung Galaxy S24 5G 256 GB Black"), { vetor: 0.45, texto: 0.3, tokens: 0.25 });
assert(equivalente.scoreFinal > 0.6);
const notebookEquivalente = avaliarCandidato("Notebook Lenovo LOQ 16GB 512GB RTX 4060", criarCandidato("Lenovo RTX 4060 LOQ Notebook 512GB SSD 16GB RAM"), { vetor: 0.45, texto: 0.3, tokens: 0.25 });
assert.equal(notebookEquivalente.conflitoDeAtributo, false);
const diferente = avaliarCandidato("iPhone 15 Pro", criarCandidato("iPhone 15 Pro Max"), { vetor: 0.45, texto: 0.3, tokens: 0.25 });
assert.equal(diferente.conflitoDeAtributo, true);
assert.equal(diferente.scoreFinal, 0);

console.log("Testes de matching concluídos");
