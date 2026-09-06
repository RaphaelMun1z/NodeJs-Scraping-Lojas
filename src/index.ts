import { AgendadorColeta } from "./agendadores/agendador-coleta.js";
import { ServidorApi } from "./api/servidor-api.js";
import { AnalisadorSite } from "./analisadores/analisador-site.js";
import { ConexaoBanco } from "./banco/conexao-banco.js";
import { RepositorioItem } from "./banco/repositorios/repositorio-item.js";
import { ClienteHttp } from "./clientes/cliente-http.js";
import { ColetorFonteSite } from "./fontes/coletor-fonte-site.js";
import { seletoresPorFonte } from "./config/fontes.js";
import { configuracaoAplicacao } from "./config/aplicacao.config.js";
import { logger } from "./config/logger.js";
import { ServicoColeta } from "./servicos/servico-coleta.js";

async function iniciarAplicacao(): Promise<void> {
	// Centraliza a composição das dependências compartilhadas pela aplicação.
	const conexaoBanco = new ConexaoBanco();
	await conexaoBanco.conectar(configuracaoAplicacao.banco.uri);

	const clienteHttp = new ClienteHttp(
		configuracaoAplicacao.coleta.tempoLimiteMs,
		configuracaoAplicacao.coleta.agenteUsuario,
	);

	const repositorioItem = new RepositorioItem();
	const fontes = configuracaoAplicacao.coleta.fontesAtivas.map((nome) => {
		const url = nome === "kabum"
			? configuracaoAplicacao.coleta.url
			: configuracaoAplicacao.coleta.urls[nome];

		if (!url) throw new Error(`URL não configurada para a fonte ${nome}`);

		return new ColetorFonteSite(
			nome,
			url,
			clienteHttp,
			new AnalisadorSite(),
			seletoresPorFonte[nome],
		);
	});
	const servicoColeta = new ServicoColeta(
		fontes,
		repositorioItem,
		configuracaoAplicacao.coleta.salvarColeta,
	);

	const agendador = new AgendadorColeta(
		servicoColeta,
		configuracaoAplicacao.agendamento.expressao,
		configuracaoAplicacao.agendamento.fusoHorario,
	);

	const servidorApi = new ServidorApi(repositorioItem, conexaoBanco);

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
		await conexaoBanco.desconectar();
	};

	process.once("SIGINT", () => void encerrar());
	process.once("SIGTERM", () => void encerrar());
}

iniciarAplicacao().catch((erro) => {
	logger.fatal({ erro }, "Falha ao iniciar a aplicação");
	process.exit(1);
});
