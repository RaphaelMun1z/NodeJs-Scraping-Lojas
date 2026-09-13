import type { Request, Response } from "express";
import type { ServicoConfiguracaoScraping } from "../../configuracoes/servico-configuracao-scraping.js";
import type { ServicoLimpezaProdutos } from "../../servicos/servico-limpeza-produtos.js";
import type { ClienteHttp } from "../../clientes/cliente-http.js";
import { AnalisadorSite } from "../../analisadores/analisador-site.js";
import type { SeletoresSite } from "../../modelos/seletores-site.js";
import { criarOpcoesColeta } from "../../coleta/opcoes-coleta.js";
import { logger } from "../../config/logger.js";
import type { ServicoResetSistema } from "../../servicos/servico-reset-sistema.js";
import type { ServicoAutenticacao } from "../../autenticacao/servico-autenticacao.js";
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
  ) {}

  obter = async (_requisicao: Request, resposta: Response): Promise<void> => {
    resposta.json({ dados: await this.configuracao.obterOuCriarPadrao() });
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
    const { url, fonte, categoria, seletores, navegadorVisivel, execucaoId } =
      requisicao.body as {
        url?: string;
        fonte?: string;
        categoria?: string;
        seletores?: SeletoresSite;
        navegadorVisivel?: unknown;
        execucaoId?: unknown;
      };
    if (!url || !seletores || !fonte || !categoria) {
      resposta
        .status(400)
        .json({ erro: "Informe fonte, URL e todos os seletores obrigatórios" });
      return;
    }
    if (
      navegadorVisivel !== undefined &&
      typeof navegadorVisivel !== "boolean"
    ) {
      resposta
        .status(400)
        .json({ erro: "O campo navegadorVisivel deve ser booleano" });
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
        navegadorVisivel: navegadorVisivel === true,
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
