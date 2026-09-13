import { chromium, type Browser, type Page } from "playwright";
import type { TipoPaginacao } from "../modelos/seletores-site.js";
import { logger } from "../config/logger.js";

export interface ConfiguracaoPaginacao {
  tipo?: TipoPaginacao;
  seletorProximaPagina?: string;
  maxPaginas?: number;
  parametroPagina?: string;
  urlPaginacaoTemplate?: string;
}
export interface DiagnosticoPaginacao {
  tipo: TipoPaginacao;
  paginasProcessadas: number;
  urlsVisitadas: string[];
  motivoParada:
    | "sem-paginacao"
    | "limite-maximo"
    | "sem-proxima-pagina"
    | "pagina-sem-itens"
    | "pagina-repetida"
    | "navegacao-sem-alteracao";
}
export interface ResultadoHtmlPaginado {
  html: string;
  paginacao: DiagnosticoPaginacao;
	produtosPorPagina: number[];
  previewImagem?: string;
}
export interface OpcoesHtml {
  seletorItens?: string;
  seletorAguardar?: string;
  seletorCarregarMais?: string;
  paginacao?: ConfiguracaoPaginacao;
  navegadorVisivel?: boolean;
  capturarPreview?: boolean;
  progresso?: (evento: Omit<EventoProgresso, "execucaoId">) => void;
}
export interface EventoProgresso {
  execucaoId: string;
  etapa: string;
  mensagem: string;
  paginaAtual?: number;
  maxPaginas?: number;
  produtosPagina?: number;
  produtosTotal?: number;
  tempoDecorridoMs: number;
}

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
    this.inicializacaoNavegador ??= chromium.launch({
      headless: process.env.NAVEGADOR_VISIVEL !== "true",
    });
    this.navegador = await this.inicializacaoNavegador;
    return this.navegador;
  }
  private async obterNavegadorParaExecucao(
    navegadorVisivel?: boolean,
  ): Promise<{ navegador: Browser; exclusivo: boolean }> {
    if (navegadorVisivel === undefined)
      return { navegador: await this.obterNavegador(), exclusivo: false };
    try {
      return {
        navegador: await chromium.launch({
          headless: !navegadorVisivel,
          ...(navegadorVisivel ? { slowMo: 350 } : {}),
        }),
        exclusivo: true,
      };
    } catch {
      throw new Error(
        "Não foi possível abrir o navegador visível neste ambiente.",
      );
    }
  }

  async obterHtml(url: string, opcoes?: OpcoesHtml): Promise<string> {
    return (await this.obterHtmlComDiagnostico(url, opcoes)).html;
  }

  async obterHtmlComDiagnostico(
    urlInicial: string,
    opcoes: OpcoesHtml = {},
  ): Promise<ResultadoHtmlPaginado> {
    const configuracao = this.normalizarPaginacao(opcoes.paginacao);
		logger.info(
			{ url: urlInicial, paginacao: configuracao },
			"Paginação recebida pelo cliente HTTP",
		);
    const { navegador, exclusivo } = await this.obterNavegadorParaExecucao(
      opcoes.navegadorVisivel,
    );
    let contexto: Awaited<ReturnType<Browser["newContext"]>> | undefined;
    const htmls: string[] = [];
		const produtosPorPagina: number[] = [];
    const urlsVisitadas: string[] = [];
    const assinaturas = new Set<string>();
    let previewImagem: string | undefined;
    let produtosTotal = 0;
    const emitir = (
      evento: Omit<EventoProgresso, "execucaoId" | "tempoDecorridoMs">,
    ) =>
      opcoes.progresso?.({ ...evento, tempoDecorridoMs: Date.now() - inicio });
    const inicio = Date.now();
    emitir({
      etapa: "iniciando",
      mensagem: "Iniciando teste de seletores",
      maxPaginas: configuracao.maxPaginas,
    });
    let motivoParada: DiagnosticoPaginacao["motivoParada"] =
      configuracao.tipo === "nenhuma" ? "sem-paginacao" : "limite-maximo";

    try {
      contexto = await navegador.newContext({ userAgent: this.agenteUsuario });
      const pagina = await contexto.newPage();
      if (opcoes.capturarPreview)
        await pagina.setViewportSize({ width: 1440, height: 900 });
      for (
        let numeroPagina = 1;
        numeroPagina <= configuracao.maxPaginas;
        numeroPagina += 1
      ) {
        if (configuracao.tipo === "url" || numeroPagina === 1) {
          const url =
            configuracao.tipo === "url"
              ? this.montarUrlPaginada(urlInicial, numeroPagina, configuracao)
              : urlInicial;
          if (urlsVisitadas.includes(url)) {
            motivoParada = "pagina-repetida";
            break;
          }
          emitir({
            etapa: "abrindoPagina",
            mensagem:
              numeroPagina === 1
                ? "Carregando página inicial..."
                : `Abrindo página ${numeroPagina}...`,
            paginaAtual: numeroPagina,
            maxPaginas: configuracao.maxPaginas,
          });
          await this.navegar(
            pagina,
            url,
            opcoes.seletorAguardar,
            opcoes.navegadorVisivel,
          );
          emitir({
            etapa: "paginaCarregada",
            mensagem: `Página ${numeroPagina} carregada`,
            paginaAtual: numeroPagina,
            maxPaginas: configuracao.maxPaginas,
          });
          if (opcoes.capturarPreview && !previewImagem) {
            const captura = await pagina.screenshot({
              type: "jpeg",
              quality: 70,
              fullPage: false,
            });
            previewImagem = `data:image/jpeg;base64,${captura.toString("base64")}`;
          }
        }
        const assinaturaAntes = await this.assinaturaPagina(
          pagina,
          opcoes.seletorAguardar,
        );
        if (assinaturas.has(assinaturaAntes)) {
          motivoParada = "pagina-repetida";
          break;
        }
        assinaturas.add(assinaturaAntes);
        urlsVisitadas.push(pagina.url());
        if (opcoes.seletorCarregarMais)
          emitir({
            etapa: "executandoCarregarMais",
            mensagem: "Executando carregar mais...",
            paginaAtual: numeroPagina,
            maxPaginas: configuracao.maxPaginas,
          });
        await this.carregarMais(
          pagina,
          opcoes.seletorCarregarMais,
          opcoes.seletorAguardar,
          opcoes.navegadorVisivel,
        );
        const possuiItens =
          !opcoes.seletorAguardar ||
          (await pagina.locator(opcoes.seletorAguardar).count()) > 0;
        emitir({
          etapa: "extraindoProdutos",
          mensagem: `Extraindo produtos da página ${numeroPagina}...`,
          paginaAtual: numeroPagina,
          maxPaginas: configuracao.maxPaginas,
        });
        htmls.push(
          await this.extrairHtml(
            pagina,
            opcoes.seletorItens,
            opcoes.navegadorVisivel,
          ),
        );
        if (!possuiItens) {
          motivoParada = "pagina-sem-itens";
          break;
        }
        const produtosPagina = opcoes.seletorAguardar
          ? await pagina.locator(opcoes.seletorAguardar).count()
          : undefined;
		produtosPorPagina.push(produtosPagina ?? 0);
        if (produtosPagina !== undefined) produtosTotal += produtosPagina;
        emitir({
          etapa: "paginaProcessada",
          mensagem: `Página ${numeroPagina} processada`,
          paginaAtual: numeroPagina,
          maxPaginas: configuracao.maxPaginas,
          produtosPagina,
          produtosTotal,
        });
        if (configuracao.tipo === "nenhuma") break;
        if (numeroPagina === configuracao.maxPaginas) {
          motivoParada = "limite-maximo";
          break;
        }
        if (configuracao.tipo === "url") continue;
        emitir({
          etapa: "procurandoProximaPagina",
          mensagem: "Procurando próxima página...",
          paginaAtual: numeroPagina,
          maxPaginas: configuracao.maxPaginas,
        });
        emitir({
          etapa: "navegandoProximaPagina",
          mensagem: `Navegando para a página ${numeroPagina + 1}...`,
          paginaAtual: numeroPagina + 1,
          maxPaginas: configuracao.maxPaginas,
        });
        const navegou = await this.irParaProximaPagina(
          pagina,
          configuracao.seletorProximaPagina,
          opcoes.seletorAguardar,
          urlsVisitadas,
          opcoes.navegadorVisivel,
        );
        if (navegou) continue;
        motivoParada =
          (await pagina.locator(configuracao.seletorProximaPagina).count()) ===
          0
            ? "sem-proxima-pagina"
            : "navegacao-sem-alteracao";
        break;
      }
      return {
        html: htmls.join("\n"),
        paginacao: {
          tipo: configuracao.tipo,
          paginasProcessadas: htmls.length,
          urlsVisitadas,
          motivoParada,
        },
			produtosPorPagina,
        previewImagem,
      };
    } finally {
      await contexto?.close();
      if (exclusivo) await navegador.close();
    }
  }

  async obterCaptura(
    url: string,
    seletorAguardar?: string,
    navegadorVisivel?: boolean,
  ): Promise<string> {
    const { navegador, exclusivo } =
      await this.obterNavegadorParaExecucao(navegadorVisivel);
    let contexto: Awaited<ReturnType<Browser["newContext"]>> | undefined;
    try {
      contexto = await navegador.newContext({ userAgent: this.agenteUsuario });
      const pagina = await contexto.newPage();
      await pagina.setViewportSize({ width: 1440, height: 900 });
      await this.navegar(pagina, url, seletorAguardar);
      const captura = await pagina.screenshot({
        type: "jpeg",
        quality: 70,
        fullPage: false,
      });
      return `data:image/jpeg;base64,${captura.toString("base64")}`;
    } finally {
      await contexto?.close();
      if (exclusivo) await navegador.close();
    }
  }

  private normalizarPaginacao(
    configuracao: ConfiguracaoPaginacao | undefined,
  ): Required<ConfiguracaoPaginacao> {
    return {
      tipo: configuracao?.tipo ?? "nenhuma",
      seletorProximaPagina: configuracao?.seletorProximaPagina?.trim() ?? "",
      maxPaginas: Math.min(100, Math.max(1, configuracao?.maxPaginas ?? 10)),
      parametroPagina: configuracao?.parametroPagina?.trim() ?? "page",
      urlPaginacaoTemplate: configuracao?.urlPaginacaoTemplate?.trim() ?? "",
    };
  }
  private montarUrlPaginada(
    urlInicial: string,
    numeroPagina: number,
    configuracao: Required<ConfiguracaoPaginacao>,
  ): string {
    if (configuracao.urlPaginacaoTemplate)
      return configuracao.urlPaginacaoTemplate.replaceAll(
        "{pagina}",
        String(numeroPagina),
      );
    const url = new URL(urlInicial);
    url.searchParams.set(configuracao.parametroPagina, String(numeroPagina));
    return url.toString();
  }
  private async navegar(
    pagina: Page,
    url: string,
    seletorAguardar?: string,
    navegadorVisivel = false,
  ): Promise<void> {
    await pagina.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: this.tempoLimiteMs,
    });
    try {
      await pagina.waitForLoadState("networkidle", {
        timeout: this.tempoLimiteMs,
      });
    } catch {
      /* páginas com conexões persistentes */
    }
    const pausaMs = Number(process.env.NAVEGADOR_PAUSA_MS ?? 3_000);
    if (pausaMs > 0) await pagina.waitForTimeout(pausaMs);
    await this.aguardarVisualizacao(pagina, navegadorVisivel);
    if (!seletorAguardar) return;
    try {
      await pagina
        .locator(seletorAguardar)
        .first()
        .waitFor({
          state: "attached",
          timeout: Number(
            process.env.NAVEGADOR_ESPERA_VERIFICACAO_MS ?? 60_000,
          ),
        });
    } catch {
      /* o coletor identifica páginas de bloqueio ou sem itens */
    }
  }
  private async carregarMais(
    pagina: Page,
    seletorCarregarMais?: string,
    seletorAguardar?: string,
    navegadorVisivel = false,
  ): Promise<void> {
    if (!seletorCarregarMais) return;
    let tentativasSemNovosItens = 0;
    for (
      let tentativa = 0;
      tentativa < 100 && tentativasSemNovosItens < 3;
      tentativa += 1
    ) {
      const botao = pagina
        .locator(seletorCarregarMais)
        .filter({ hasText: /VER MAIS PRODUTOS/i })
        .first();
      if ((await botao.count()) === 0 || !(await botao.isVisible())) break;
      const seletorContagem = seletorAguardar ?? ".products-grid .product-item";
      const quantidadeAntes = await pagina.locator(seletorContagem).count();
      await this.aguardarVisualizacao(pagina, navegadorVisivel);
      await botao.click({ force: true, timeout: 5_000 });
      await pagina.waitForTimeout(900);
      await this.aguardarVisualizacao(pagina, navegadorVisivel);
      const quantidadeDepois = await pagina.locator(seletorContagem).count();
      tentativasSemNovosItens =
        quantidadeDepois <= quantidadeAntes ? tentativasSemNovosItens + 1 : 0;
    }
  }
  private async irParaProximaPagina(
    pagina: Page,
    seletor: string,
    seletorItens: string | undefined,
    urlsVisitadas: string[],
    navegadorVisivel = false,
  ): Promise<boolean> {
    if (!seletor) return false;
    const botao = pagina.locator(seletor).first();
    if ((await botao.count()) === 0 || !(await botao.isVisible())) return false;
    const desabilitado =
      (await botao.getAttribute("aria-disabled")) === "true" ||
      /\bdisabled\b/i.test((await botao.getAttribute("class")) ?? "");
    if (desabilitado) return false;
    const href = await botao.getAttribute("href");
    if (href && href !== "#") {
      const proximaUrl = new URL(href, pagina.url()).toString();
      if (urlsVisitadas.includes(proximaUrl)) return false;
      await this.aguardarVisualizacao(pagina, navegadorVisivel);
      await this.navegar(pagina, proximaUrl, seletorItens, navegadorVisivel);
      return true;
    }
    const assinaturaAntes = await this.assinaturaPagina(pagina, seletorItens);
    await this.aguardarVisualizacao(pagina, navegadorVisivel);
    await botao.click({ force: true, timeout: 5_000 });
    try {
      await pagina.waitForFunction(
        ({ assinatura, seletor }) => {
          const itens = seletor
            ? [...document.querySelectorAll(seletor)]
                .slice(0, 8)
                .map(
                  (item) =>
                    `${item.querySelector("a[href]")?.getAttribute("href") ?? ""}|${item.textContent?.trim().slice(0, 120) ?? ""}`,
                )
                .join("\n")
            : "";
          return `${location.href}\n${itens}` !== assinatura;
        },
        { assinatura: assinaturaAntes, seletor: seletorItens },
        { timeout: this.tempoLimiteMs },
      );
    } catch {
      return false;
    }
    await pagina.waitForTimeout(350);
    await this.aguardarVisualizacao(pagina, navegadorVisivel);
    return true;
  }
  private async assinaturaPagina(
    pagina: Page,
    seletorItens?: string,
  ): Promise<string> {
    return pagina.evaluate((seletor) => {
      const itens = seletor
        ? [...document.querySelectorAll(seletor)]
            .slice(0, 8)
            .map(
              (item) =>
                `${item.querySelector("a[href]")?.getAttribute("href") ?? ""}|${item.textContent?.trim().slice(0, 120) ?? ""}`,
            )
            .join("\n")
        : (document.body.textContent?.trim().slice(0, 1_000) ?? "");
      return `${location.href}\n${itens}`;
    }, seletorItens);
  }
  private async extrairHtml(
    pagina: Page,
    seletorItens?: string,
    navegadorVisivel = false,
  ): Promise<string> {
    if (!seletorItens) return pagina.content();
    await this.aguardarVisualizacao(pagina, navegadorVisivel);
    return pagina.evaluate(async (seletor) => {
      const itens = new Map<string, string>();
      let tentativasSemNovosItens = 0;
      const capturar = () =>
        document.querySelectorAll(seletor).forEach((elemento, indice) => {
          const chave =
            elemento.getAttribute("data-asin") ||
            elemento.querySelector("a[href]")?.getAttribute("href") ||
            `${indice}:${elemento.textContent}`;
          itens.set(chave, elemento.outerHTML);
        });
      for (
        let rolagem = 0;
        rolagem < 60 && tentativasSemNovosItens < 4;
        rolagem += 1
      ) {
        capturar();
        const quantidadeAntes = itens.size;
        window.scrollBy(0, Math.max(window.innerHeight * 0.8, 600));
        await new Promise((resolver) => setTimeout(resolver, 900));
        capturar();
        tentativasSemNovosItens =
          itens.size === quantidadeAntes ? tentativasSemNovosItens + 1 : 0;
      }
      return `<div>${[...itens.values()].join("")}</div>`;
    }, seletorItens);
  }
  private async aguardarVisualizacao(
    pagina: Page,
    navegadorVisivel: boolean,
  ): Promise<void> {
    if (navegadorVisivel) await pagina.waitForTimeout(700);
  }
}
