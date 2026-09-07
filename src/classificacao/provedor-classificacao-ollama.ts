import { CATEGORIAS_PRODUTO, VERSAO_CLASSIFICACAO_PRODUTO, categoriaValida, formatarCategoria, type CategoriaProduto } from "./categorias-produto.js";
import type { ProvedorClassificacaoProduto, ResultadoClassificacaoProduto } from "./provedor-classificacao.js";

type RespostaOllama = { response?: string };

export class ProvedorClassificacaoOllama implements ProvedorClassificacaoProduto {
	constructor(private readonly endpoint: string, private readonly modelo: string) {}

	async classificarProduto(titulo: string): Promise<ResultadoClassificacaoProduto> {
		const categorias = Object.entries(CATEGORIAS_PRODUTO).map(([categoria, subcategorias]) => `${categoria}${subcategorias.length ? ` (${subcategorias.join(", ")})` : ""}`).join("; ");
		const prompt = `Classifique o produto abaixo usando exclusivamente uma categoria da lista. Não crie categorias novas. Escolha Outros quando não houver segurança. Responda somente um objeto JSON válido, sem markdown, com os campos categoria, subcategoria, tipoProduto, categoriaOriginal e confianca. categoria deve ser exatamente uma destas opções: ${categorias}. Use subcategoria somente quando ela estiver entre parênteses na opção escolhida. tipoProduto deve ser exatamente principal, acessorio, consumivel ou outro. confianca deve ser um número entre 0 e 1. Título: ${titulo}`;
		const resposta = await fetch(this.endpoint, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ model: this.modelo, prompt, stream: false, format: "json", options: { temperature: 0 } }),
			signal: AbortSignal.timeout(Number(process.env.REQUEST_TIMEOUT_MS ?? 30_000)),
		});
		if (!resposta.ok) throw new Error(`Erro no classificador de produtos: HTTP ${resposta.status}`);
		const dados = (await resposta.json()) as RespostaOllama;
		const texto = dados.response?.trim();
		if (!texto) throw new Error("O classificador não retornou uma resposta");

		const resultado = this.interpretarResposta(texto);
		const categoriaInformada = this.obterTexto(resultado.categoria);
		const categoria = this.encontrarCategoria(categoriaInformada) ?? "Outros";
		const subcategoriaInformada = this.obterTexto(resultado.subcategoria);
		const subcategoria = this.obterSubcategoria(categoria, subcategoriaInformada, titulo);
		const tipoProduto = this.normalizarTipo(resultado.tipoProduto ?? resultado.tipo_produto ?? resultado.tipo) ?? "outro";
		const confiancaInformada = Number(String(resultado.confianca ?? resultado.confidence ?? "").replace(",", "."));
		const confianca = Number.isFinite(confiancaInformada) ? Math.max(0, Math.min(1, confiancaInformada)) : 0;

		return {
			categoriaOriginal: this.obterTexto(resultado.categoriaOriginal) || categoria,
			categoriaNormalizada: formatarCategoria(categoria, subcategoria),
			categoria,
			subcategoria,
			tipoProduto,
			confianca: categoriaInformada && categoria !== categoriaInformada ? Math.min(confianca, 0.5) : confianca,
			versao: VERSAO_CLASSIFICACAO_PRODUTO,
		};
	}

	private interpretarResposta(texto: string): Record<string, unknown> {
		const limpo = texto.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
		try {
			return JSON.parse(limpo) as Record<string, unknown>;
		} catch {
			// Recupera o objeto quando o modelo acrescenta texto fora do JSON.
			const inicio = limpo.indexOf("{");
			const fim = limpo.lastIndexOf("}");
			if (inicio < 0 || fim <= inicio) throw new Error("Resposta de classificação inválida");
			return JSON.parse(limpo.slice(inicio, fim + 1)) as Record<string, unknown>;
		}
	}

	private encontrarCategoria(valor: string): CategoriaProduto | undefined {
		const normalizado = this.normalizarTexto(valor);
		return (Object.keys(CATEGORIAS_PRODUTO) as CategoriaProduto[]).find((categoria) => this.normalizarTexto(categoria) === normalizado);
	}

	private obterSubcategoria(categoria: CategoriaProduto, informada: string, titulo: string): string | undefined {
		if (categoriaValida(categoria, informada) && informada) return informada;
		const tituloNormalizado = this.normalizarTexto(titulo);
		const subcategoria = CATEGORIAS_PRODUTO[categoria].find((item) => tituloNormalizado.includes(this.normalizarTexto(item)));
		return subcategoria;
	}

	private normalizarTexto(valor: string): string {
		return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
	}

	private obterTexto(valor: unknown): string {
		return typeof valor === "string" ? valor.trim() : "";
	}

	private normalizarTipo(valor: unknown): ResultadoClassificacaoProduto["tipoProduto"] | undefined {
		if (typeof valor !== "string") return undefined;
		const tipo = this.normalizarTexto(valor);
		if (["principal", "produto", "produto principal"].includes(tipo)) return "principal";
		if (["acessorio", "acessorios"].includes(tipo)) return "acessorio";
		if (["consumivel", "consumiveis"].includes(tipo)) return "consumivel";
		if (["outro", "outros"].includes(tipo)) return "outro";
		return undefined;
	}
}
