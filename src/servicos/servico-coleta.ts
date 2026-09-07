import { RepositorioItem } from "../banco/repositorios/repositorio-item.js";
import type { FonteProdutos } from "../fontes/fonte-produtos.js";
import { logger } from "../config/logger.js";
import { randomUUID } from "node:crypto";
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
	) {}

	executar(): Promise<number> {
		// Compartilha a promessa atual para impedir coletas concorrentes.
		if (this.execucaoAtual) return this.execucaoAtual;

		this.execucaoAtual = this.executarColeta().finally(() => {
			this.execucaoAtual = undefined;
		});

		return this.execucaoAtual;
	}

	private async executarColeta(): Promise<number> {
		const inicio = Date.now();
		console.log("🔎 Iniciando busca de produtos...");

		let totalItens = 0;
		let tempoTotalBuscas = 0;
		const rodadaId = randomUUID();

		if (this.salvarColeta) await this.repositorioItem.iniciarRodadaColeta();

		const nomesFontesAtivas = this.obterFontesAtivas ? new Set(await this.obterFontesAtivas()) : undefined;
		await Promise.all(this.fontes.filter((item) => !nomesFontesAtivas || nomesFontesAtivas.has(item.nome)).map(async (fonte) => {
			const execucaoId = this.eventosScraping ? await this.eventosScraping.iniciarExecucao(fonte.nome, rodadaId) : undefined;
			if (this.eventosScraping && !execucaoId) {
				logger.warn({ fonte: fonte.nome }, "Coleta ignorada porque a fonte já está em execução");
				return 0;
			}
			try {
				if (execucaoId) await this.eventosScraping!.registrarLog(execucaoId, fonte.nome, "info", "Página da fonte carregada");
				const inicioFonte = Date.now();
				const itens = await fonte.coletar();
				tempoTotalBuscas += Date.now() - inicioFonte;
				totalItens += itens.length;
				if (execucaoId) await this.eventosScraping!.atualizarMetricas(execucaoId, { produtosEncontrados: itens.length });

				let metricas = { novos: 0, atualizados: 0, inativados: 0 };
				if (this.salvarColeta) {
					metricas = await this.repositorioItem.sincronizarFonte(
						fonte.nome,
						itens,
					);
				}
				if (execucaoId) {
					await this.eventosScraping!.atualizarMetricas(execucaoId, { produtosNovos: metricas.novos, produtosAtualizados: metricas.atualizados, produtosInativados: metricas.inativados });
					await this.eventosScraping!.concluirExecucao(execucaoId, { produtosEncontrados: itens.length, produtosNovos: metricas.novos, produtosAtualizados: metricas.atualizados, produtosInativados: metricas.inativados });
				}
				if (this.salvarColeta && this.servicoMatchingCatalogo && itens.length > 0) {
					// Indexa em segundo plano para não bloquear o salvamento no MongoDB.
					void this.indexarComRetentativas(itens, fonte.nome);
				}

				console.log(
					`${this.salvarColeta ? "💾" : "✅"} ${fonte.nome}: ${itens.length} produto(s) ${this.salvarColeta ? "encontrado(s) e salvo(s)" : "encontrado(s)"}.`,
				);
			} catch (erro) {
				if (execucaoId) await this.eventosScraping!.registrarErro(execucaoId, fonte.nome, erro);
				logger.error(
					{
						fonte: fonte.nome,
						erro: erro instanceof Error
							? { name: erro.name, message: erro.message, stack: erro.stack }
							: erro,
					},
					"Erro na coleta da fonte",
				);
			}
		}));

		console.log(`📦 Total da coleta: ${totalItens} produto(s).`);
		console.log(`⏱️ Tempo da busca: ${Date.now() - inicio}ms.`);
		console.log(`Tempo total das buscas: ${tempoTotalBuscas}ms.`);
		return totalItens;
	}

	private async indexarComRetentativas(itens: Parameters<ServicoMatchingCatalogoProdutos["processarProdutosColetados"]>[0], fonte: string): Promise<void> {
		for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
			try {
				await this.servicoMatchingCatalogo!.processarProdutosColetados(itens);
				return;
			} catch (erro) {
				if (tentativa === 3) {
					logger.error({ fonte, tentativa, erro }, "Não foi possível indexar os produtos no Elasticsearch");
					return;
				}
				await new Promise((resolver) => setTimeout(resolver, tentativa * 2000));
			}
		}
	}
}
