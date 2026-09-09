import type { SeletoresSite } from "../modelos/seletores-site.js";
import * as cheerio from "cheerio";
import type { Element as ElementDom } from "domhandler";

type RespostaOllama = { response?: string };
type ResultadoAnaliseSeletores = { seletores: SeletoresSite; confianca: Partial<Record<keyof SeletoresSite, number>>; observacoes: string[] };
type CampoSeletor = Exclude<keyof SeletoresSite, "paginaVirtualizada">;
const campos: CampoSeletor[] = ["item", "titulo", "preco", "precoAntigo", "imagem", "url", "carregarMais"];

export class AnalisadorSeletoresOllama {
	constructor(private readonly endpoint: string, private readonly modelo: string) {}

	async analisar(html: string): Promise<ResultadoAnaliseSeletores> {
		const htmlLimpo = html.trim();
		if (!htmlLimpo) throw new Error("Cole o HTML de pelo menos um card de produto.");
		const conteudo = `<!-- INSTRUCOES: selecione cada card repetido, nunca a grade nem somente um link. Valide item, titulo, preco atual e imagem em todos os cards. Prefira classes estaveis e deixe vazio o que nao puder ser identificado. O preco atual nao pode capturar parcelas ou preco antigo. -->\n${htmlLimpo}`;
		if (conteudo.length > 500_000) throw new Error("O HTML colado é muito grande. Cole apenas dois ou três cards de produto.");
		const fallback = this.analisarLocalmente(conteudo);
		const prompt = `Você é especialista em HTML e seletores CSS. Analise o fragmento HTML de cards de produtos abaixo e sugira seletores CSS estáveis para um scraper. Responda SOMENTE JSON válido, sem markdown, no formato {"seletores":{"item":"","titulo":"","preco":"","precoAntigo":"","imagem":"","url":"","carregarMais":""},"confianca":{"item":0,"titulo":0,"preco":0,"precoAntigo":0,"imagem":0,"url":0,"carregarMais":0},"observacoes":[]}. O campo item deve selecionar cada card completo, não a grade. Prefira classes sem hashes, atributos data-* estáveis e elementos semânticos. Não invente seletores: deixe vazio quando não existir. precoAntigo, url e carregarMais são opcionais. A confiança deve ser de 0 a 1. HTML:\n${conteudo}`;
		let resposta: Response;
		try {
			resposta = await fetch(this.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: this.modelo, prompt, stream: false, format: "json", keep_alive: 0, options: { temperature: 0, num_ctx: 4096, num_predict: 600 } }), signal: AbortSignal.timeout(Number(process.env.ANALISE_SELETORES_TIMEOUT_MS ?? 120_000)) });
		} catch {
			return fallback;
		}
		if (!resposta.ok) return fallback;
		const dados = (await resposta.json()) as RespostaOllama;
		if (!dados.response?.trim()) return fallback;
		let analise: ResultadoAnaliseSeletores;
		try { analise = this.normalizar(this.interpretar(dados.response)); } catch { return fallback; }
		return this.validarECompletar(conteudo, analise, fallback);
	}

	private validarECompletar(html: string, analise: ResultadoAnaliseSeletores, fallback: ResultadoAnaliseSeletores): ResultadoAnaliseSeletores {
		const $ = cheerio.load(html, null, false);
		const candidatoItem = this.itemValido($, analise.seletores.item, analise.seletores) ? analise.seletores.item : fallback.seletores.item;
		const raizes = candidatoItem ? $(candidatoItem).toArray() as ElementDom[] : [];
		const seletores = { ...fallback.seletores, item: candidatoItem };
		const confianca = { ...fallback.confianca, item: candidatoItem === analise.seletores.item ? analise.confianca.item : fallback.confianca.item };
		for (const campo of campos) {
			if (campo === "item") continue;
			const candidato = analise.seletores[campo];
			if (candidato && this.campoValido($, raizes, campo, candidato)) {
				seletores[campo] = candidato;
				confianca[campo] = analise.confianca[campo];
			} else if (seletores[campo] && !this.campoValido($, raizes, campo, seletores[campo])) {
				seletores[campo] = "";
				confianca[campo] = 0;
			}
		}
		const descartados = campos.filter((campo) => analise.seletores[campo] && seletores[campo] !== analise.seletores[campo]);
		const observacoes = [...analise.observacoes, ...fallback.observacoes];
		if (descartados.length) observacoes.push(`Seletores da IA rejeitados por nÃ£o encontrarem elementos vÃ¡lidos em todos os cards: ${descartados.join(", ")}.`);
		return { seletores, confianca, observacoes: [...new Set(observacoes)] };
	}

	private itemValido($: cheerio.CheerioAPI, seletor: string, seletores: SeletoresSite): boolean {
		if (!seletor) return false;
		try {
			const raizes = $(seletor).toArray();
			if (raizes.length < 2) return false;
			return raizes.every((raiz) => {
				const item = $(raiz);
				return Boolean(seletores.titulo && item.find(seletores.titulo).length && seletores.preco && item.find(seletores.preco).length && seletores.imagem && item.find(seletores.imagem).length);
			});
		} catch { return false; }
	}

	private campoValido($: cheerio.CheerioAPI, raizes: ElementDom[], campo: CampoSeletor, seletor: string): boolean {
		try {
			if (campo === "carregarMais") return $(seletor).length > 0;
			if (!raizes.length) return false;
			return raizes.every((raiz) => {
				const item = $(raiz);
				if (campo === "url") return item.is(seletor) || item.find(seletor).length > 0;
				if (campo === "preco" || campo === "precoAntigo") return item.find(seletor).length === 1;
				return item.find(seletor).length > 0;
			});
		} catch { return false; }
	}

	private analisarLocalmente(html: string): ResultadoAnaliseSeletores {
		const $ = cheerio.load(html, null, false);
		const elementos = $("*").toArray();
		const candidatos = elementos.map((elemento) => {
			const elementoHtml = elemento as ElementDom;
			if (!elementoHtml.tagName) return null;
			const tag = elementoHtml.tagName.toLowerCase();
			const classesBrutas = ($(elementoHtml).attr("class") ?? "").split(/\s+/).filter((item) => /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(item));
			const classes = classesBrutas.filter((item) => !/^(mui|css|jss)-/i.test(item) && !/[0-9a-f]{8,}/i.test(item));
			if (!classes.length) return null;
			const classesSemanticas = classes.filter((item) => /(product|produto|item|card)/i.test(item));
			const seletor = `${tag}.${(classesSemanticas.length ? classesSemanticas : classes).slice(0, 2).join(".")}`;
			const quantidade = $(seletor).length;
			if (quantidade < 2) return null;
			const texto = classesBrutas.join(" ").toLowerCase();
			// Links de produto identificam a URL, mas normalmente não contêm o
			// título e os preços. O card repetido deve ser priorizado como item.
			const pontuacao = (/(product|produto|item|card)/.test(texto) ? 40 : 0) + (tag === "li" ? 10 : 0) + Math.min(quantidade, 10) / 10;
			return { elemento: elementoHtml, seletor, quantidade, pontuacao };
		}).filter((item): item is { elemento: ElementDom; seletor: string; quantidade: number; pontuacao: number } => Boolean(item)).sort((a, b) => b.pontuacao - a.pontuacao || a.seletor.length - b.seletor.length);
		const item = (() => {
			const gruposProduto = $('[role="group"][aria-label^="Product card:"]');
			if (gruposProduto.length >= 2) return { elemento: gruposProduto.first().get(0) as ElementDom, seletor: '[role="group"][aria-label^="Product card:"]', quantidade: gruposProduto.length, pontuacao: 110 };
			const linksComDataCy = $('a[data-cy="list-product"]');
			const linkEhCard = linksComDataCy.length >= 2 && linksComDataCy.toArray().every((link) => {
				const elemento = $(link);
				return elemento.find("h1, h2, h3").length > 0 && elemento.find("img").length > 0 && elemento.find("[class*='price'], [class*='preco'], del, s").length > 0;
			});
			if (linkEhCard) return { elemento: linksComDataCy.first().get(0) as ElementDom, seletor: 'a[data-cy="list-product"]', quantidade: linksComDataCy.length, pontuacao: 100 };
			return candidatos[0] ?? (() => {
				const links = $('a[data-cy="list-product"], a[href*="/produto/"]');
				if (!links.length) return undefined;
				return { elemento: links.first().get(0) as ElementDom, seletor: 'a[data-cy="list-product"]', quantidade: links.length, pontuacao: 10 };
			})();
		})();
		const raizes = item ? $(item.seletor).toArray() : [];
		const raiz = item ? $(item.elemento) : $("*").first();
		const encontrar = (seletor: string): string => raizes.length > 1 && raizes.every((elemento) => $(elemento).find(seletor).length > 0) ? seletor : (raiz.find(seletor).first().length ? seletor : "");
		const titulo = ["span.line-clamp-2", "h1", "h2", "h3", "[class*='line-clamp']", "[class*='title']", "[class*='name']", "[class*='titulo']"].find((seletor) => encontrar(seletor)) ?? "";
		const preco = ["[class*='new-price']", "[class*='current-price']", "[class*='sale-price']", "div[class*='price_vista']", "div.flex.items-center > div > div > span.truncate", "div.flex.gap-4.items-center > span.text-base.font-semibold", "span.text-base.font-semibold", "[class*='price']", "[class*='preco']"].find((seletor) => encontrar(seletor)) ?? "";
		const precoAntigo = ["[class*='old-price']", "[class*='list-price']", "[class*='preco-antigo']", "[class*='strikeThrough']", "span.line-through", "del", "s"].find((seletor) => encontrar(seletor)) ?? "";
		const imagem = ["img[src]", "img"].find((seletor) => encontrar(seletor)) ?? "";
		const url = item?.seletor === 'a[data-cy="list-product"]' ? 'a[data-cy="list-product"]' : (item?.seletor.startsWith("a[") ? 'a[href*="/produto/"]' : (["a[data-cy='list-product']", "a[href*='/produto/']", "a[href]"].find((seletor) => encontrar(seletor)) ?? ""));
		const seletores = { item: item?.seletor ?? "", titulo, preco, precoAntigo, imagem, url, carregarMais: "" } as unknown as SeletoresSite;
		const confianca = Object.fromEntries(campos.map((campo) => [campo, seletores[campo] ? (campo === "item" ? 0.95 : 0.8) : 0])) as Partial<Record<keyof SeletoresSite, number>>;
		return { seletores, confianca, observacoes: item ? ["O card repetido foi identificado localmente; os seletores da IA foram complementados e validados com o HTML enviado."] : ["Não foi possível identificar elementos repetidos no HTML colado."] };
	}

	private interpretar(texto: string): Record<string, unknown> {
		const limpo = texto.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
		try { return JSON.parse(limpo) as Record<string, unknown>; } catch {
			const inicio = limpo.indexOf("{"), fim = limpo.lastIndexOf("}");
			if (inicio < 0 || fim <= inicio) throw new Error("A resposta da IA não contém JSON válido.");
			try { return JSON.parse(limpo.slice(inicio, fim + 1)) as Record<string, unknown>; } catch { throw new Error("A resposta da IA não contém JSON válido."); }
		}
	}

	private normalizar(valor: Record<string, unknown>): ResultadoAnaliseSeletores {
		const informados = valor.seletores && typeof valor.seletores === "object" ? valor.seletores as Record<string, unknown> : {};
		const confiancas = valor.confianca && typeof valor.confianca === "object" ? valor.confianca as Record<string, unknown> : {};
		const seletores = Object.fromEntries(campos.map((campo) => [campo, typeof informados[campo] === "string" ? informados[campo].trim().slice(0, 500) : ""])) as unknown as SeletoresSite;
		const confianca = Object.fromEntries(campos.map((campo) => { const numero = Number(confiancas[campo]); return [campo, Number.isFinite(numero) ? Math.max(0, Math.min(1, numero)) : 0]; })) as Partial<Record<keyof SeletoresSite, number>>;
		const observacoes = Array.isArray(valor.observacoes) ? valor.observacoes.filter((item): item is string => typeof item === "string").slice(0, 5) : [];
		return { seletores, confianca, observacoes };
	}
}
