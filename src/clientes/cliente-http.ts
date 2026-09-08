import { chromium, type Browser } from "playwright";

export class ClienteHttp {
	private navegador?: Browser;
	private inicializacaoNavegador?: Promise<Browser>;
	constructor(
		private readonly tempoLimiteMs = Number(
			process.env.REQUEST_TIMEOUT_MS ?? 30_000,
		),
		private readonly agenteUsuario = process.env.USER_AGENT ??
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
	) {}

	async fechar(): Promise<void> {
		await this.navegador?.close();
		this.navegador = undefined;
		this.inicializacaoNavegador = undefined;
	}

	private async obterNavegador(): Promise<Browser> {
		if (this.navegador) return this.navegador;
		this.inicializacaoNavegador ??= chromium.launch({ headless: process.env.NAVEGADOR_VISIVEL !== "true" });
		this.navegador = await this.inicializacaoNavegador;
		return this.navegador;
	}

	async obterHtml(
		url: string,
		opcoes?: {
			seletorItens?: string;
			seletorAguardar?: string;
			seletorCarregarMais?: string;
		},
	): Promise<string> {
		return this.obterHtmlComNavegador(
			url,
			opcoes?.seletorItens,
			opcoes?.seletorAguardar,
			opcoes?.seletorCarregarMais,
		);
	}

	private async obterHtmlComNavegador(
		url: string,
		seletorItens?: string,
		seletorAguardar?: string,
		seletorCarregarMais?: string,
	): Promise<string> {
		const navegador = await this.obterNavegador();
		const contexto = await navegador.newContext({ userAgent: this.agenteUsuario });
		const pagina = await contexto.newPage();
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

			if (seletorAguardar) {
				const esperaVerificacaoMs = Number(
					process.env.NAVEGADOR_ESPERA_VERIFICACAO_MS ?? 60_000,
				);
				try {
					await pagina.locator(seletorAguardar).first().waitFor({
						state: "attached",
						timeout: esperaVerificacaoMs,
					});
				} catch {
					// A coleta seguirá para que o coletor rejeite a página de
					// verificação sem alterar os produtos existentes.
				}
			}

			if (seletorCarregarMais) {
				let tentativasSemNovosItens = 0;
				for (let tentativa = 0; tentativa < 100 && tentativasSemNovosItens < 3; tentativa += 1) {
					const botao = pagina
						.locator(seletorCarregarMais)
						.filter({ hasText: /VER MAIS PRODUTOS/i })
						.first();
					if (await botao.count() === 0 || !(await botao.isVisible())) break;

					const seletorContagem = seletorAguardar ?? ".products-grid .product-item";
					const quantidadeAntes = await pagina.locator(seletorContagem).count();
					await botao.click({ force: true, timeout: 5_000 });
					await pagina.waitForTimeout(900);
					const quantidadeDepois = await pagina.locator(seletorContagem).count();

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
			await contexto.close();
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
