import { AgendadorColeta } from "./agendadores/agendador-coleta.js";
import { ServidorApi } from "./api/servidor-api.js";
import { AnalisadorSite } from "./analisadores/analisador-site.js";
import { ConexaoBanco } from "./banco/conexao-banco.js";
import { RepositorioItem } from "./banco/repositorios/repositorio-item.js";
import { ClienteHttp } from "./clientes/cliente-http.js";
import { ColetorFonteSite } from "./fontes/coletor-fonte-site.js";
import { configuracaoAplicacao } from "./config/aplicacao.config.js";
import { logger } from "./config/logger.js";
import { ServicoColeta } from "./servicos/servico-coleta.js";
import { ProvedorEmbeddingHttp } from "./embeddings/provedor-embedding-http.js";
import { criarClienteElasticsearch } from "./elasticsearch/cliente-elasticsearch.js";
import { RepositorioIndiceProdutos } from "./elasticsearch/repositorio-indice-produtos.js";
import { configuracaoMatching, validarConfiguracaoMatching } from "./matching/configuracao-matching.js";
import { ServicoMatchingProduto } from "./matching/servico-matching-produto.js";
import { ServicoMatchingCatalogoProdutos } from "./matching/servico-matching-catalogo-produtos.js";
import { ServicoAutenticacao } from "./autenticacao/servico-autenticacao.js";
import { ServicoConfiguracaoScraping } from "./configuracoes/servico-configuracao-scraping.js";
import { ServicoEventosScraping } from "./monitoramento/servico-eventos-scraping.js";
import { ServicoBuscaManual } from "./servicos/servico-busca-manual.js";
import { ProvedorClassificacaoOllama } from "./classificacao/provedor-classificacao-ollama.js";
import { ServicoLimpezaProdutos } from "./servicos/servico-limpeza-produtos.js";

async function iniciarAplicacao(): Promise<void> {
	// Centraliza a composição das dependências compartilhadas pela aplicação.
	const conexaoBanco = new ConexaoBanco();
	await conexaoBanco.conectar(configuracaoAplicacao.banco.uri);

	const clienteHttp = new ClienteHttp(
		configuracaoAplicacao.coleta.tempoLimiteMs,
		configuracaoAplicacao.coleta.agenteUsuario,
	);

	const repositorioItem = new RepositorioItem();
	await repositorioItem.garantirGruposIndividuais();
	await repositorioItem.removerHistoricoAntigo(configuracaoAplicacao.coleta.historicoRetencaoDias);
	const autenticacao = new ServicoAutenticacao();
	const configuracaoScraping = new ServicoConfiguracaoScraping();
	const eventosScraping = new ServicoEventosScraping(undefined, undefined, () => configuracaoScraping.obterFontesAtivas().then((fontes) => fontes.map((fonte) => fonte.fonte)));
	await eventosScraping.prepararRetencao();
	const configuracaoPersistida = await configuracaoScraping.obterOuCriarPadrao();
	let servicoMatchingCatalogo: ServicoMatchingCatalogoProdutos | undefined;
	let clienteElasticsearch: ReturnType<typeof criarClienteElasticsearch> | undefined;
	let repositorioIndiceProdutos: RepositorioIndiceProdutos | undefined;
	if (configuracaoMatching.habilitado) {
		validarConfiguracaoMatching();
		clienteElasticsearch = criarClienteElasticsearch();
		const indice = new RepositorioIndiceProdutos(clienteElasticsearch);
		repositorioIndiceProdutos = indice;
		await indice.garantirIndice();
		const embeddings = new ProvedorEmbeddingHttp(
			configuracaoMatching.embeddingUrl!,
			configuracaoMatching.embeddingModelo!,
			configuracaoMatching.embeddingApiKey,
		);
		servicoMatchingCatalogo = new ServicoMatchingCatalogoProdutos(
			indice,
			embeddings,
			new ServicoMatchingProduto(indice, embeddings),
			repositorioItem,
			configuracaoAplicacao.coleta.classificacao.habilitada ? new ProvedorClassificacaoOllama(configuracaoAplicacao.coleta.classificacao.url, configuracaoAplicacao.coleta.classificacao.modelo) : undefined,
		);
	}
	const criarFontesConfiguradas = (fontesConfiguradas: typeof configuracaoPersistida.fontes) => fontesConfiguradas.filter((configuracaoFonte) => Boolean(configuracaoFonte.url)).map((configuracaoFonte) => {
		const { fonte: nome, url } = configuracaoFonte;
		if (!url) throw new Error(`URL não configurada para a fonte ${nome}`);
		return new ColetorFonteSite(
			nome,
			url,
			clienteHttp,
			new AnalisadorSite(),
			configuracaoFonte.seletores,
			async () => {
				const atualizada = await configuracaoScraping.obterOuCriarPadrao();
				const fonteAtual = atualizada.fontes.find((fonte) => fonte.fonte === nome);
				return fonteAtual ? { url: fonteAtual.url, seletores: fonteAtual.seletores } : undefined;
			},
		);
	});
	const fontes = criarFontesConfiguradas(configuracaoPersistida.fontes);
	const obterFontesConfiguradas = async () => criarFontesConfiguradas((await configuracaoScraping.obterOuCriarPadrao()).fontes);
	const servicoColeta = new ServicoColeta(
		fontes,
		repositorioItem,
		configuracaoAplicacao.coleta.salvarColeta,
		servicoMatchingCatalogo,
		eventosScraping,
		() => configuracaoScraping.obterFontesAtivas().then((fontes) => fontes.map((fonte) => fonte.fonte)),
		obterFontesConfiguradas,
	);
	const servicoBuscaManual = new ServicoBuscaManual(
		fontes,
		() => configuracaoScraping.obterFontesAtivas().then((fontesAtivas) => fontesAtivas.map((fonte) => fonte.fonte)),
		obterFontesConfiguradas,
	);

	const agendador = new AgendadorColeta(
		servicoColeta,
		configuracaoAplicacao.agendamento.expressao,
		configuracaoAplicacao.agendamento.fusoHorario,
	);

	const limpezaProdutos = new ServicoLimpezaProdutos(repositorioItem, repositorioIndiceProdutos);
	const servidorApi = new ServidorApi(repositorioItem, conexaoBanco, autenticacao, configuracaoScraping, eventosScraping, () => agendador.obterProximaExecucao(), servicoBuscaManual, repositorioIndiceProdutos, servicoColeta, limpezaProdutos);

	servidorApi.iniciar(configuracaoAplicacao.api.porta);
	agendador.iniciar();

	if (configuracaoAplicacao.coleta.executarAoIniciar) {
		// A primeira coleta ocorre sem bloquear a inicialização da API.
		void servicoColeta.executar().catch((erro) => {
			logger.error({ erro }, "Erro na coleta inicial");
		});
	}

	let encerrando = false;

	const encerrar = async (): Promise<void> => {
		if (encerrando) return;
		encerrando = true;

		logger.info("Encerrando aplicação");
		agendador.parar();
		await servidorApi.parar();
		await clienteHttp.fechar();
		await clienteElasticsearch?.close();
		await conexaoBanco.desconectar();
	};

	process.once("SIGINT", () => void encerrar());
	process.once("SIGTERM", () => void encerrar());
}

iniciarAplicacao().catch((erro) => {
	logger.fatal({ erro }, "Falha ao iniciar a aplicação");
	process.exit(1);
});
