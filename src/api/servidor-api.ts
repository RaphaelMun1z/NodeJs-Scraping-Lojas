import express, { type Express } from "express";
import type { Server } from "node:http";
import type { ConexaoBanco } from "../banco/conexao-banco.js";
import type { RepositorioItem } from "../banco/repositorios/repositorio-item.js";
import { logger } from "../config/logger.js";
import { ControladorItem } from "./controladores/controlador-item.js";
import { tratadorErros } from "./middlewares/tratador-erros.js";
import { criarRotasItens } from "./rotas/rotas-itens.js";
import type { ServicoAutenticacao } from "../autenticacao/servico-autenticacao.js";
import type { ServicoConfiguracaoScraping } from "../configuracoes/servico-configuracao-scraping.js";
import { ControladorAutenticacao } from "./controladores/controlador-autenticacao.js";
import { ControladorConfiguracaoScraping } from "./controladores/controlador-configuracao-scraping.js";
import { criarRotasAutenticacao } from "./rotas/rotas-autenticacao.js";
import { criarRotasConfiguracaoScraping } from "./rotas/rotas-configuracao-scraping.js";
import { ControladorMonitoramentoScraping } from "./controladores/controlador-monitoramento-scraping.js";
import { criarRotasMonitoramentoScraping } from "./rotas/rotas-monitoramento-scraping.js";
import type { ServicoEventosScraping } from "../monitoramento/servico-eventos-scraping.js";
import type { ServicoBuscaManual } from "../servicos/servico-busca-manual.js";
import { ControladorBuscaManual } from "./controladores/controlador-busca-manual.js";
import { criarRotasBuscaManual } from "./rotas/rotas-busca-manual.js";
import type { RepositorioIndiceProdutos } from "../elasticsearch/repositorio-indice-produtos.js";

export class ServidorApi {
	private readonly aplicacao: Express;
	private servidor?: Server;

	constructor(
		private readonly repositorioItem: RepositorioItem,
		private readonly conexaoBanco: ConexaoBanco,
		private readonly autenticacao: ServicoAutenticacao,
		private readonly configuracaoScraping: ServicoConfiguracaoScraping,
		private readonly eventosScraping: ServicoEventosScraping,
		private readonly obterProximaExecucao: () => Date | null,
		private readonly servicoBuscaManual: ServicoBuscaManual,
		private readonly repositorioIndice?: RepositorioIndiceProdutos,
	) {
		this.aplicacao = express();
		this.configurar();
	}

	iniciar(porta: number): void {
		this.servidor = this.aplicacao.listen(porta, () => {
			logger.info({ porta }, "API REST iniciada");
		});
	}

	async parar(): Promise<void> {
		if (!this.servidor) return;

		await new Promise<void>((resolver, rejeitar) => {
			this.servidor?.close((erro) =>
				erro ? rejeitar(erro) : resolver(),
			);
		});
	}

	private configurar(): void {
		const controladorItem = new ControladorItem(this.repositorioItem, this.repositorioIndice);
		const controladorAutenticacao = new ControladorAutenticacao(this.autenticacao);
		const controladorConfiguracao = new ControladorConfiguracaoScraping(this.configuracaoScraping);
		const controladorMonitoramento = new ControladorMonitoramentoScraping(this.eventosScraping, this.obterProximaExecucao);
		const controladorBuscaManual = new ControladorBuscaManual(this.servicoBuscaManual);

		this.aplicacao.disable("x-powered-by");
		this.aplicacao.use(express.json({ limit: "100kb" }));

		this.aplicacao.get("/api/saude", (_requisicao, resposta) => {
			const bancoConectado = this.conexaoBanco.estaConectado();
			resposta
				.status(bancoConectado ? 200 : 503)
				.json({ bancoConectado });
		});

		this.aplicacao.use("/api/itens", criarRotasItens(controladorItem));
		this.aplicacao.use("/api/autenticacao", criarRotasAutenticacao(controladorAutenticacao, this.autenticacao));
		this.aplicacao.use("/api/admin/configuracoes/scraping", criarRotasConfiguracaoScraping(controladorConfiguracao, this.autenticacao));
		this.aplicacao.use("/api/admin/scraping", criarRotasMonitoramentoScraping(controladorMonitoramento, this.autenticacao));
		this.aplicacao.use("/api/admin/busca-manual", criarRotasBuscaManual(controladorBuscaManual, this.autenticacao));
		this.aplicacao.use(tratadorErros);
	}
}
