import { AgendadorColeta } from "./agendadores/agendador-coleta.js";
import { ServidorApi } from "./api/servidor-api.js";
import { AnalisadorSite } from "./analisadores/analisador-site.js";
import { ConexaoBanco } from "./banco/conexao-banco.js";
import { RepositorioItem } from "./banco/repositorios/repositorio-item.js";
import { ClienteHttp } from "./clientes/cliente-http.js";
import { ColetorSite } from "./coletores/coletor-site.js";
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
	const coletor = new ColetorSite(clienteHttp, new AnalisadorSite());
	const servicoColeta = new ServicoColeta(
		coletor,
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
