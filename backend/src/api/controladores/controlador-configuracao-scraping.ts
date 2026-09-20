import type { Request, Response } from "express";
import type { AgendamentoColeta, ServicoConfiguracaoScraping } from "../../configuracoes/servico-configuracao-scraping.js";
import type { ServicoLimpezaProdutos } from "../../servicos/servico-limpeza-produtos.js";
import type { ClienteHttp } from "../../clientes/cliente-http.js";
import { AnalisadorSite } from "../../analisadores/analisador-site.js";
import type { SeletoresSite } from "../../modelos/seletores-site.js";
import { criarOpcoesColeta } from "../../coleta/opcoes-coleta.js";
import { logger } from "../../config/logger.js";
import type { ServicoResetSistema } from "../../servicos/servico-reset-sistema.js";
import type { ServicoAutenticacao } from "../../autenticacao/servico-autenticacao.js";
import type { RepositorioItem } from "../../banco/repositorios/repositorio-item.js";
import { ServicoNotificacaoTelegram } from "../../notificacoes/servico-notificacao-telegram.js";
import type {
  EventoProgressoTeste,
  ServicoProgressoTesteSeletores,
} from "../servicos/servico-progresso-teste-seletores.js";

export class ControladorConfiguracaoScraping {
  constructor(
    private readonly configuracao: ServicoConfiguracaoScraping,
    private readonly limpezaProdutos: ServicoLimpezaProdutos,
    private readonly clienteHttp: ClienteHttp,
    private readonly analisador = new AnalisadorSite(),
    private readonly resetSistema?: ServicoResetSistema,
    private readonly autenticacao?: ServicoAutenticacao,
    private readonly progressoTeste?: ServicoProgressoTesteSeletores,
    private readonly aplicarAgendamento?: (agendamento: AgendamentoColeta) => void,
    private readonly repositorioItem?: RepositorioItem,
    private readonly notificacaoTelegram = new ServicoNotificacaoTelegram(),
  ) {}

  obter = async (_requisicao: Request, resposta: Response): Promise<void> => {
    resposta.json({ dados: await this.configuracao.obterOuCriarPadrao() });
  };

	obterAgendamento = async (_requisicao: Request, resposta: Response): Promise<void> => {
    const configuracao = await this.configuracao.obterOuCriarPadrao();
    resposta.json({ dados: configuracao.agendamento });
	};

	obterTelegram = async (_requisicao: Request, resposta: Response): Promise<void> => {
		const configuracao = await this.configuracao.obterOuCriarPadrao();
		resposta.json({ dados: configuracao.telegram });
	};

	atualizarTelegram = async (requisicao: Request, resposta: Response): Promise<void> => {
		resposta.json({ dados: await this.configuracao.atualizarTelegram(requisicao.body) });
	};

	testarTelegram = async (_requisicao: Request, resposta: Response): Promise<void> => {
		try {
			if (!this.repositorioItem) throw new Error("Repositório de produtos não configurado");
			const configuracao = await this.configuracao.obterOuCriarPadrao();
			const produto = await this.repositorioItem.consultarProdutoParaTesteTelegram();
			if (!produto) throw new Error("Não há produtos cadastrados para enviar como teste");
			await this.notificacaoTelegram.testarProduto(configuracao.telegram, produto);
			resposta.json({ mensagem: "Mensagem de teste enviada pelo Telegram." });
		} catch (erro) {
			const mensagem = erro instanceof Error ? erro.message : "Não foi possível configurar o teste do Telegram";
			if (/TELEGRAM_BOT_TOKEN|chat ID|produtos cadastrados|repositório/i.test(mensagem)) {
				resposta.status(400).json({ erro: mensagem });
				return;
			}
			throw erro;
		}
	};

  atualizarAgendamento = async (requisicao: Request, resposta: Response): Promise<void> => {
    const agendamento = await this.configuracao.atualizarAgendamento(requisicao.body);
    this.aplicarAgendamento?.(agendamento);
    resposta.json({ dados: agendamento });
  };

  progresso = (requisicao: Request, resposta: Response): void => {
    const execucaoId = String(requisicao.params.execucaoId ?? "");
    const remover =
      this.progressoTeste?.assinar(execucaoId, resposta) ?? (() => undefined);
    requisicao.on("close", remover);
  };

  atualizar = async (
    requisicao: Request,
    resposta: Response,
  ): Promise<void> => {
    resposta.json({
      dados: await this.configuracao.atualizar(requisicao.body),
    });
  };

  adicionar = async (
    requisicao: Request,
    resposta: Response,
  ): Promise<void> => {
    resposta
      .status(201)
      .json({ dados: await this.configuracao.adicionar(requisicao.body) });
  };

  remover = async (requisicao: Request, resposta: Response): Promise<void> => {
    const nomeFonte = String(requisicao.params.fonte ?? "");
    resposta.json({ dados: await this.configuracao.remover(nomeFonte) });
  };

  limparProdutos = async (
    requisicao: Request,
    resposta: Response,
  ): Promise<void> => {
    if (requisicao.body?.confirmacao !== "reset") {
      resposta
        .status(400)
        .json({ erro: "Digite reset para confirmar a limpeza dos produtos" });
      return;
    }
    resposta.json({ dados: await this.limpezaProdutos.executar() });
  };

  resetTotal = async (
    requisicao: Request,
    resposta: Response,
  ): Promise<void> => {
    const senha =
      typeof requisicao.body?.senha === "string" ? requisicao.body.senha : "";
    const confirmacao = requisicao.body?.confirmacao;
    if (!this.resetSistema || !this.autenticacao) {
      resposta.status(503).json({ erro: "Reset total não está disponível" });
      return;
    }
    if (!senha) {
      resposta.status(400).json({ erro: "Informe a senha do administrador" });
      return;
    }
    if (confirmacao !== "RESETAR SISTEMA") {
      resposta
        .status(400)
        .json({ erro: "Digite RESETAR SISTEMA para confirmar o reset" });
      return;
    }
    if (
      !requisicao.administrador ||
      !(await this.autenticacao.validarSenhaAdministrador(
        requisicao.administrador.id,
        senha,
      ))
    ) {
      resposta.status(401).json({ erro: "Senha do administrador inválida" });
      return;
    }
    resposta.json({ dados: await this.resetSistema.executar() });
  };

  validarSenhaReset = async (
    requisicao: Request,
    resposta: Response,
  ): Promise<void> => {
    const senha =
      typeof requisicao.body?.senha === "string" ? requisicao.body.senha : "";
    if (!senha) {
      resposta.status(400).json({ erro: "Informe a senha do administrador" });
      return;
    }
    if (
      !requisicao.administrador ||
      !this.autenticacao ||
      !(await this.autenticacao.validarSenhaAdministrador(
        requisicao.administrador.id,
        senha,
      ))
    ) {
      resposta.status(401).json({ erro: "Senha do administrador inválida" });
      return;
    }
    resposta.status(204).send();
  };

  testarSeletores = async (
    requisicao: Request,
    resposta: Response,
  ): Promise<void> => {
    const { url, fonte, categoria, seletores, execucaoId } =
      requisicao.body as {
        url?: string;
        fonte?: string;
        categoria?: string;
        seletores?: SeletoresSite;
        execucaoId?: unknown;
      };
    if (!url || !seletores || !fonte || !categoria) {
      resposta
        .status(400)
        .json({ erro: "Informe fonte, URL e todos os seletores obrigatórios" });
      return;
    }
    const id =
      typeof execucaoId === "string" && execucaoId.length <= 100
        ? execucaoId
        : crypto.randomUUID();
    const inicio = Date.now();
    this.progressoTeste?.criar(id);
    const publicar = (
      evento: Omit<EventoProgressoTeste, "execucaoId" | "tempoDecorridoMs">,
    ) =>
      this.progressoTeste?.emitir({
        execucaoId: id,
        ...evento,
        tempoDecorridoMs: Date.now() - inicio,
      });
    publicar({ etapa: "iniciando", mensagem: "Iniciando teste de seletores" });
    try {
			const opcoesColeta = criarOpcoesColeta(seletores);
			logger.info(
				{ fonte, categoria, url, paginacao: opcoesColeta.paginacao },
				"Configuração resolvida para teste de seletores",
			);
      const resultado = await this.clienteHttp.obterHtmlComDiagnostico(url, {
			...opcoesColeta,
        // Esta variável vale somente para o teste de seletores. O scraping
        // normal usa sempre o navegador em segundo plano.
        navegadorVisivel: process.env.NAVEGADOR_VISIVEL === "true",
        progresso: (evento) => publicar(evento),
        capturarPreview: true,
      });
      const itens = this.analisador.analisar(
        resultado.html,
        url,
        fonte,
        categoria,
        seletores,
      );
      resposta.json({
        dados: {
          quantidadeProdutos: itens.length,
          produtos: itens.slice(0, 5),
          previewImagem: resultado.previewImagem,
          paginacao: resultado.paginacao,
        },
      });
      publicar({ etapa: "concluido", mensagem: "Teste concluído" });
      this.progressoTeste?.finalizar(id, {
        execucaoId: id,
        etapa: "concluido",
        mensagem: "Teste concluído",
        tempoDecorridoMs: Date.now() - inicio,
      });
    } catch (erro) {
      this.progressoTeste?.finalizar(id, {
        execucaoId: id,
        etapa: "erro",
        mensagem:
          erro instanceof Error ? erro.message : "Falha no teste de seletores",
        tempoDecorridoMs: Date.now() - inicio,
      });
      throw erro;
    }
  };
}
