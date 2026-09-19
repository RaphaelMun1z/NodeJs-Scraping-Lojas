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
		private readonly notificarTelegram?: (desde: Date) => Promise<void>,
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

		const coletasPorFonte = new Map<string, FonteProdutos[]>();
		for (const fonte of fontes) coletasPorFonte.set(fonte.nome, [...(coletasPorFonte.get(fonte.nome) ?? []), fonte]);
		await Promise.all([...coletasPorFonte.values()].map(async (coletasDaFonte) => {
		for (const fonte of coletasDaFonte) {
			const execucaoId = this.eventosScraping ? await this.eventosScraping.iniciarExecucao(fonte.nome, rodadaId, fonte.categoria) : undefined;
			if (this.eventosScraping && !execucaoId) {
				logger.warn({ fonte: fonte.nome }, "Coleta ignorada porque a fonte já está em execução");
				continue;
			}
			try {
				if (execucaoId) await this.eventosScraping!.registrarLog(execucaoId, fonte.nome, "info", `Coleta de ${fonte.categoria} iniciada`);
				if (execucaoId) await this.eventosScraping!.registrarLog(execucaoId, fonte.nome, "info", "Início da etapa: Coleta");
				const inicioFonte = Date.now();
				let itens: Awaited<ReturnType<FonteProdutos["coletar"]>>;
				try { itens = await fonte.coletar(); } finally { if (execucaoId) await this.eventosScraping!.registrarLog(execucaoId, fonte.nome, "info", "Fim da etapa: Coleta"); }
				const diagnostico = fonte.obterDiagnosticoColeta?.();
				tempoTotalBuscas += Date.now() - inicioFonte;
				totalItens += itens.length;
				if (execucaoId) await this.eventosScraping!.atualizarMetricas(execucaoId, { produtosEncontrados: itens.length });
				if (execucaoId && diagnostico) await this.eventosScraping!.registrarLog(
					execucaoId,
					fonte.nome,
					"info",
					`Paginação: ${diagnostico.paginasProcessadas} página(s) processada(s) (${diagnostico.produtosPorPagina.join(", ")} cards por página)`,
				);

				let metricas = {
					brutos: itens.length,
					unicos: itens.length,
					persistidos: 0,
					novos: 0,
					atualizados: 0,
					inativados: 0,
				};
				if (execucaoId && !this.salvarColeta) await this.eventosScraping!.registrarLog(
					execucaoId,
					fonte.nome,
					"aviso",
					"Persistência de produtos está desativada para esta execução",
				);
				if (this.salvarColeta) metricas = await this.repositorioItem.sincronizarFonte(fonte.nome, fonte.categoria, itens);
				if (execucaoId) {
					await this.eventosScraping!.atualizarMetricas(execucaoId, {
						produtosUnicos: metricas.unicos,
						produtosPersistidos: metricas.persistidos,
						produtosNovos: metricas.novos,
						produtosAtualizados: metricas.atualizados,
						produtosInativados: metricas.inativados,
					});
					await this.eventosScraping!.registrarLog(
						execucaoId,
						fonte.nome,
						"info",
						`Coleta: ${metricas.brutos} parseados, ${metricas.unicos} únicos, ${metricas.persistidos} persistidos, ${metricas.novos} novos e ${metricas.atualizados} atualizados`,
					);
				}
				let produtosIndexados = 0;
				if (this.salvarColeta && this.servicoMatchingCatalogo && itens.length > 0) {
					if (execucaoId) await this.eventosScraping!.registrarLog(execucaoId, fonte.nome, "info", "Matching e indexação em andamento");
					if (execucaoId) await this.eventosScraping!.atualizarProgresso(execucaoId, { coleta: 100, embeddings: 0, indexacao: 0 });
					await this.indexarComRetentativas(itens, fonte.nome, execucaoId);
					produtosIndexados = itens.length;
					if (execucaoId) await this.eventosScraping!.atualizarMetricas(execucaoId, { produtosIndexados });
					logger.info({ fonte: fonte.nome, categoria: fonte.categoria }, "Matching e indexação concluídos");
				}
				if (execucaoId) {
					await this.eventosScraping!.concluirExecucao(execucaoId, {
						produtosEncontrados: itens.length,
						produtosUnicos: metricas.unicos,
						produtosPersistidos: metricas.persistidos,
						produtosIndexados,
						produtosNovos: metricas.novos,
						produtosAtualizados: metricas.atualizados,
						produtosInativados: metricas.inativados,
					});
				}
				logger.info({ fonte: fonte.nome, categoria: fonte.categoria, produtos: itens.length, salvo: this.salvarColeta }, "Produtos encontrados na coleta");
			} catch (erro) {
				if (execucaoId) await this.eventosScraping!.registrarErro(execucaoId, fonte.nome, erro);
				logger.error({ fonte: fonte.nome, erro: erro instanceof Error ? { nome: erro.name, mensagem: erro.message, pilha: erro.stack } : erro }, "Erro na coleta da fonte");
			}
		}
		}));

		logger.info({ produtos: totalItens, duracaoMs: Date.now() - inicio, tempoTotalBuscasMs: tempoTotalBuscas }, "Coleta concluída");
		try { await this.notificarTelegram?.(new Date(inicio)); } catch (erro) {
			logger.error({ erro }, "Falha ao enviar ofertas para o Telegram");
		}
		return totalItens;
	}

	private async indexarComRetentativas(itens: Parameters<ServicoMatchingCatalogoProdutos["processarProdutosColetados"]>[0], fonte: string, execucaoId?: string): Promise<void> {
		for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
			try {
			await this.servicoMatchingCatalogo!.processarProdutosColetados(itens, async (progresso) => { if (execucaoId) await this.eventosScraping!.atualizarProgresso(execucaoId, progresso); }, async (etapa, estado) => { if (execucaoId) await this.eventosScraping!.registrarLog(execucaoId, fonte, "info", `${estado === "inicio" ? "Início" : "Fim"} da etapa: ${etapa === "embeddings" ? "Embeddings" : "Indexação"}`); });
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
