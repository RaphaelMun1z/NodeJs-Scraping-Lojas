import { normalizarTituloProduto } from "./normalizador-titulo.js";

export interface AtributosProduto {
	numeros: Set<string>;
	armazenamento: Set<string>;
	ram: Set<string>;
	polegadas: Set<string>;
	ano: Set<string>;
	variantes: Set<string>;
	modelos: Set<string>;
	marcas: Set<string>;
	tipos: Set<string>;
	formas: Set<string>;
	resolucoes: Set<string>;
	identificadores: Set<string>;
}

const VARIANTES = new Set(["pro", "max", "ultra", "plus", "fe", "se", "lite", "mini", "slim", "digital", "leitor", "oled"]);
const MARCAS = new Set(["asus", "acer", "apple", "samsung", "lenovo", "corsair", "msi", "intel", "amd", "nvidia", "lg", "philips", "sony", "motorola", "xiaomi", "logitech", "kingston", "western", "seagate", "pichau", "kabum"]);
const TIPOS = new Set(["monitor", "notebook", "laptop", "smartphone", "celular", "tablet", "fonte", "suporte", "mesa", "parede", "teclado", "mouse", "headset", "placa", "video", "processador", "memoria", "ssd", "hd", "televisao", "tv", "console", "cadeira"]);
const FORMAS = new Set(["mesa", "parede", "teto", "embutir", "portatil"]);
const RESOLUCOES = new Set(["hd", "fhd", "fullhd", "qhd", "2k", "uhd", "4k", "8k", "wqhd"]);

export function extrairAtributosProduto(titulo: string): AtributosProduto {
	// Extrai capacidades, modelos, telas, anos e variantes do título.
	const texto = normalizarTituloProduto(titulo);
	const tokens = texto.split(" ");
	const armazenamento = new Set<string>();
	const ram = new Set<string>();
	const polegadas = new Set<string>();
	const ano = new Set<string>();
	const numeros = new Set<string>();
	const variantes = new Set(tokens.filter((token) => VARIANTES.has(token)));
	const marcas = new Set(tokens.filter((token) => MARCAS.has(token)));
	const tipos = new Set(tokens.filter((token) => TIPOS.has(token)));
	const formas = new Set(tokens.filter((token) => FORMAS.has(token)));
	const resolucoes = new Set(tokens.filter((token) => RESOLUCOES.has(token)));
	const identificadores = new Set<string>();
	// Captura códigos de modelo e part number, que diferenciam variantes visualmente parecidas.
	for (const token of tokens) {
		if (token.length >= 5 && /[a-z]/.test(token) && /\d/.test(token) && !["ddr4", "ddr5", "fullhd", "smartphone"].includes(token)) identificadores.add(token);
	}
	for (const codigo of titulo.toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)+/g) ?? []) {
		if (/[a-z]/.test(codigo) && /\d/.test(codigo)) identificadores.add(codigo);
	}
	for (const token of tokens) {
		const capacidade = token.match(/^(\d+(?:\.\d+)?)(gb|tb|mb)$/);
		if (capacidade) armazenamento.add(`${capacidade[1]}${capacidade[2]}`);
		const ramEncontrada = token.match(/^(\d+)(gb|tb)ram$/) ?? token.match(/^(\d+)(gb|tb)$/);
		if (ramEncontrada && /ram/.test(texto)) ram.add(`${ramEncontrada[1]}${ramEncontrada[2]}`);
		const tamanhoTela = token.match(/^(\d+(?:\.\d+)?)(?:pol|polegadas)$/);
		if (tamanhoTela?.[1]) polegadas.add(tamanhoTela[1]);
		if (/^(19|20)\d{2}$/.test(token)) ano.add(token);
		if (/^\d+(?:\.\d+)?$/.test(token)) numeros.add(token);
	}
	// Aspas são removidas na normalização, por isso a medida é lida no título original.
	for (const medida of titulo.match(/(\d+(?:[.,]\d+)?)\s*(?:["”]|pol\b|polegadas\b)/gi) ?? []) polegadas.add(medida.replace(",", ".").match(/\d+(?:\.\d+)?/)?.[0] ?? medida);
	const modelos = new Set(tokens.filter((token) => /[a-z]/.test(token) && /\d/.test(token)));
	for (let indice = 1; indice < tokens.length; indice += 1) {
		const anterior = tokens[indice - 1];
		const atual = tokens[indice];
		if (anterior && atual && /[a-z]/.test(anterior) && /\d/.test(atual)) modelos.add(`${anterior}${atual}`);
	}
	return { numeros, armazenamento, ram, polegadas, ano, variantes, modelos, marcas, tipos, formas, resolucoes, identificadores };
}

export function possuiConflitoDeAtributos(esquerda: AtributosProduto, direita: AtributosProduto): boolean {
	// Rejeita candidatos com capacidades, modelos ou variantes incompatíveis.
	for (const [atributosEsquerda, atributosDireita] of [[esquerda.armazenamento, direita.armazenamento], [esquerda.ram, direita.ram], [esquerda.polegadas, direita.polegadas], [esquerda.ano, direita.ano], [esquerda.variantes, direita.variantes], [esquerda.modelos, direita.modelos], [esquerda.marcas, direita.marcas], [esquerda.tipos, direita.tipos], [esquerda.formas, direita.formas], [esquerda.resolucoes, direita.resolucoes], [esquerda.identificadores, direita.identificadores]] as const) {
		if (atributosEsquerda.size && atributosDireita.size && ![...atributosEsquerda].some((valor) => atributosDireita.has(valor))) return true;
	}
	if (esquerda.variantes.size !== direita.variantes.size || [...esquerda.variantes].some((valor) => !direita.variantes.has(valor))) return true;
	return false;
}
