import { randomUUID } from "node:crypto";
import { RepositorioItem } from "../banco/repositorios/repositorio-item.js";
import type { FonteProdutos } from "../fontes/fonte-produtos.js";
import { logger } from "../config/logger.js";
import type { ServicoMatchingCatalogoProdutos } from "../matching/servico-matching-catalogo-produtos.js";
import type { ServicoEventosScraping } from "../monitoramento/servico-eventos-scraping.js";

export class ServicoColeta {
	private execucaoAtual?: Promise<number>;

	constructor(
		private readonly fontes: FonteProdutos[],
		private readonly repositorioItem: RepositorioItem,
		private readonly salvarColeta: boolean,
		private readonly servicoMatchingCatalogo?: ServicoMatchingCatalogoProdutos,
		private readonly eventosScraping?: ServicoEventosScraping,
		private readonly obterFontesAtivas?: () => Promise<string[]>,
		private readonly obterFontesConfiguradas?: () => Promise<FonteProdutos[]>,
	) {}

	executar(): Promise<number> {
		// Compartilha a promessa atual para impedir coletas concorrentes.
		if (this.execucaoAtual) return this.execucaoAtual;
		this.execucaoAtual = this.executarColeta().finally(() => { this.execucaoAtual = undefined; });
		return this.execucaoAtual;
	}

	private async executarColeta(): Promise<number> {
		const inicio = Date.now();
		logger.info("Iniciando busca de produtos");
		let totalItens = 0;
		let tempoTotalBuscas = 0;
		const rodadaId = randomUUID();

		if (this.salvarColeta) await this.repositorioItem.iniciarRodadaColeta();
		const fontesDisponiveis = this.obterFontesConfiguradas ? await this.obterFontesConfiguradas() : this.fontes;
		const nomesFontesAtivas = this.obterFontesAtivas ? new Set(await this.obterFontesAtivas()) : undefined;
		const fontes = fontesDisponiveis.filter((item) => !nomesFontesAtivas || nomesFontesAtivas.has(item.nome));

		await Promise.all(fontes.map(async (fonte) => {
			const execucaoId = this.eventosScraping ? await this.eventosScraping.iniciarExecucao(fonte.nome, rodadaId) : undefined;
			if (this.eventosScraping && !execucaoId) {
				logger.warn({ fonte: fonte.nome }, "Coleta ignorada porque a fonte já está em execução");
				return;
			}
			try {
				if (execucaoId) await this.eventosScraping!.registrarLog(execucaoId, fonte.nome, "info", "Página da fonte carregada");
				if (execucaoId) await this.eventosScraping!.registrarLog(execucaoId, fonte.nome, "info", "Início da etapa: Coleta");
				const inicioFonte = Date.now();
				let itens: Awaited<ReturnType<FonteProdutos["coletar"]>>;
				try { itens = await fonte.coletar(); } finally { if (execucaoId) await this.eventosScraping!.registrarLog(execucaoId, fonte.nome, "info", "Fim da etapa: Coleta"); }
				tempoTotalBuscas += Date.now() - inicioFonte;
				totalItens += itens.length;
				if (execucaoId) await this.eventosScraping!.atualizarMetricas(execucaoId, { produtosEncontrados: itens.length });

				let metricas = { novos: 0, atualizados: 0, inativados: 0 };
				if (this.salvarColeta) metricas = await this.repositorioItem.sincronizarFonte(fonte.nome, itens);
				if (execucaoId) {
					await this.eventosScraping!.atualizarMetricas(execucaoId, { produtosNovos: metricas.novos, produtosAtualizados: metricas.atualizados, produtosInativados: metricas.inativados });
				}
				if (this.salvarColeta && this.servicoMatchingCatalogo && itens.length > 0) {
					if (execucaoId) await this.eventosScraping!.registrarLog(execucaoId, fonte.nome, "info", "Classificação e indexação em andamento");
					if (execucaoId) await this.eventosScraping!.atualizarProgresso(execucaoId, { coleta: 100, classificacao: 0, embeddings: 0, indexacao: 0 });
					await this.indexarComRetentativas(itens, fonte.nome, execucaoId);
					logger.info({ fonte: fonte.nome }, "Classificação e indexação concluídas");
				}
				if (execucaoId) {
					await this.eventosScraping!.concluirExecucao(execucaoId, { produtosEncontrados: itens.length, produtosNovos: metricas.novos, produtosAtualizados: metricas.atualizados, produtosInativados: metricas.inativados });
				}
				logger.info({ fonte: fonte.nome, produtos: itens.length, salvo: this.salvarColeta }, "Produtos encontrados na fonte");
			} catch (erro) {
				if (execucaoId) await this.eventosScraping!.registrarErro(execucaoId, fonte.nome, erro);
				logger.error({ fonte: fonte.nome, erro: erro instanceof Error ? { nome: erro.name, mensagem: erro.message, pilha: erro.stack } : erro }, "Erro na coleta da fonte");
			}
		}));

		logger.info({ produtos: totalItens, duracaoMs: Date.now() - inicio, tempoTotalBuscasMs: tempoTotalBuscas }, "Coleta concluída");
		return totalItens;
	}

	private async indexarComRetentativas(itens: Parameters<ServicoMatchingCatalogoProdutos["processarProdutosColetados"]>[0], fonte: string, execucaoId?: string): Promise<void> {
		for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
			try {
			await this.servicoMatchingCatalogo!.processarProdutosColetados(itens, async (progresso) => { if (execucaoId) await this.eventosScraping!.atualizarProgresso(execucaoId, progresso); }, async (etapa, estado) => { if (execucaoId) await this.eventosScraping!.registrarLog(execucaoId, fonte, "info", `${estado === "inicio" ? "Início" : "Fim"} da etapa: ${etapa === "classificacao" ? "Classificação" : etapa === "embeddings" ? "Embeddings" : "Indexação"}`); });
				return;
			} catch (erro) {
				if (tentativa === 3) {
					logger.error({ fonte, tentativa, erro }, "Não foi possível indexar os produtos no Elasticsearch");
					throw erro;
				}
				await new Promise((resolver) => setTimeout(resolver, tentativa * 2000));
			}
		}
	}
}
