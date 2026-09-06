import { chromium } from "playwright";

export class ClienteHttp {
	constructor(
		private readonly tempoLimiteMs = Number(
			process.env.REQUEST_TIMEOUT_MS ?? 30_000,
		),
		private readonly agenteUsuario = process.env.USER_AGENT ??
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
	) {}

	async obterHtml(
		url: string,
		opcoes?: { seletorItens?: string; seletorCarregarMais?: string },
	): Promise<string> {
		return this.obterHtmlComNavegador(
			url,
			opcoes?.seletorItens,
			opcoes?.seletorCarregarMais,
		);
	}

	private async obterHtmlComNavegador(
		url: string,
		seletorItens?: string,
		seletorCarregarMais?: string,
	): Promise<string> {
		const navegador = await chromium.launch({
			headless: process.env.NAVEGADOR_VISIVEL !== "true",
		});
		const pagina = await navegador.newPage({ userAgent: this.agenteUsuario });

		try {
			await pagina.goto(url, {
				waitUntil: "domcontentloaded",
				timeout: this.tempoLimiteMs,
			});
			try {
				await pagina.waitForLoadState("networkidle", {
					timeout: this.tempoLimiteMs,
				});
			} catch {
				// Algumas lojas mantêm requisições abertas continuamente.
			}

			const pausaMs = Number(process.env.NAVEGADOR_PAUSA_MS ?? 3_000);
			if (pausaMs > 0) await pagina.waitForTimeout(pausaMs);

			if (seletorCarregarMais) {
				let tentativasSemNovosItens = 0;
				for (let tentativa = 0; tentativa < 100 && tentativasSemNovosItens < 3; tentativa += 1) {
					const botao = pagina
						.locator(seletorCarregarMais)
						.filter({ hasText: /VER MAIS PRODUTOS/i })
						.first();
					if (await botao.count() === 0 || !(await botao.isVisible())) break;

					const quantidadeAntes = await pagina.locator(".products-grid .product-item").count();
					await botao.click({ force: true, timeout: 5_000 });
					await pagina.waitForTimeout(900);
					const quantidadeDepois = await pagina.locator(".products-grid .product-item").count();

					if (quantidadeDepois <= quantidadeAntes) tentativasSemNovosItens += 1;
					else tentativasSemNovosItens = 0;
				}
			}

			if (seletorItens) {
				const scriptVirtualizacao = `
					async (seletor) => {
						const itens = new Map();
						let tentativasSemNovosItens = 0;

						function capturarItensVisiveis() {
							document.querySelectorAll(seletor).forEach((elemento, indice) => {
								const chave = elemento.getAttribute("data-asin") ||
									elemento.querySelector("a[href]")?.getAttribute("href") ||
									(indice + ":" + elemento.textContent);
								itens.set(chave, elemento.outerHTML);
							});
						}

						return new Promise((resolver) => {
							let rolagem = 0;

							function continuar() {
								capturarItensVisiveis();
								const quantidadeAntes = itens.size;
								window.scrollBy(0, Math.max(window.innerHeight * 0.8, 600));

								setTimeout(() => {
									capturarItensVisiveis();
									if (itens.size === quantidadeAntes) tentativasSemNovosItens += 1;
									else tentativasSemNovosItens = 0;
									rolagem += 1;

									if (rolagem < 60 && tentativasSemNovosItens < 4) {
										continuar();
										return;
									}

									resolver("<div>" + Array.from(itens.values()).join("") + "</div>");
								}, 900);
							}

							continuar();
						});
					}
				`;

				const scriptExecutavel =
					`(${scriptVirtualizacao})(${JSON.stringify(seletorItens)})`;
				return await pagina.evaluate(scriptExecutavel);
			}

			return await pagina.content();
		} finally {
			await navegador.close();
		}
	}

	private async obterHtmlPorHttp(url: string): Promise<string> {
		const controlador = new AbortController();
		const timeout = setTimeout(
			() => controlador.abort(),
			this.tempoLimiteMs,
		);

		try {
			const resposta = await fetch(url, {
				signal: controlador.signal,
				headers: {
					"User-Agent": this.agenteUsuario,
					Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
					"Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
				},
			});

			if (!resposta.ok) {
				throw new Error(`Erro HTTP ${resposta.status} ao acessar ${url}`);
			}
			return await resposta.text();
		} catch (erro) {
			if (erro instanceof DOMException && erro.name === "AbortError") {
				throw new Error(
					`Tempo limite de ${this.tempoLimiteMs}ms excedido ao acessar ${url}`,
				);
			}
			throw erro;
		} finally {
			clearTimeout(timeout);
		}
	}
}
