import { chromium } from "playwright";

export class ClienteHttp {
	constructor(
		private readonly tempoLimiteMs = Number(process.env.REQUEST_TIMEOUT_MS ?? 30_000),
		private readonly agenteUsuario =
			process.env.USER_AGENT ??
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
	) {}

	async obterHtml(url: string): Promise<string> {
		// A loja monta os cards com JavaScript; o Chromium headless executa esse código
		// sem abrir uma janela quando NAVEGADOR_VISIVEL=false.
		return this.obterHtmlComNavegador(url);
	}

	private async obterHtmlComNavegador(url: string): Promise<string> {
		// Fecha o Chromium no finally para não acumular processos em coletas agendadas.
		const navegador = await chromium.launch({
			headless: process.env.NAVEGADOR_VISIVEL !== "true",
		});
		const pagina = await navegador.newPage({ userAgent: this.agenteUsuario });

		try {
			await pagina.goto(url, { waitUntil: "domcontentloaded", timeout: this.tempoLimiteMs });
			try {
				await pagina.waitForLoadState("networkidle", { timeout: this.tempoLimiteMs });
			} catch {
				// Algumas lojas mantêm requisições abertas continuamente.
			}

			const pausaMs = Number(process.env.NAVEGADOR_PAUSA_MS ?? 3_000);
			if (pausaMs > 0) await pagina.waitForTimeout(pausaMs);
			return await pagina.content();
		} finally {
			await navegador.close();
		}
	}

	private async obterHtmlPorHttp(url: string): Promise<string> {
		// O AbortController impede que uma loja indisponível deixe a coleta pendurada.
		const controlador = new AbortController();
		const timeout = setTimeout(() => controlador.abort(), this.tempoLimiteMs);

		try {
			const resposta = await fetch(url, {
				signal: controlador.signal,
				headers: {
					"User-Agent": this.agenteUsuario,
					Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
					"Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
				},
			});

			if (!resposta.ok) throw new Error(`Erro HTTP ${resposta.status} ao acessar ${url}`);
			return await resposta.text();
		} catch (erro) {
			if (erro instanceof DOMException && erro.name === "AbortError") {
				throw new Error(`Tempo limite de ${this.tempoLimiteMs}ms excedido ao acessar ${url}`);
			}
			throw erro;
		} finally {
			clearTimeout(timeout);
		}
	}
}
