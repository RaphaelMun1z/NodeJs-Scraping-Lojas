import type { Request, Response } from "express";
import { isValidObjectId } from "mongoose";
import { z } from "zod";
import type { NivelLogScraping, ServicoEventosScraping } from "../../monitoramento/servico-eventos-scraping.js";
import type { ServicoColeta } from "../../servicos/servico-coleta.js";

export class ControladorMonitoramentoScraping {
	constructor(private readonly servicoEventos: ServicoEventosScraping, private readonly obterProximaExecucao: () => Date | null, private readonly servicoColeta: ServicoColeta) {}

	iniciarAgora = async (_requisicao: Request, resposta: Response): Promise<void> => {
		void this.servicoColeta.executar().catch(() => undefined);
		resposta.status(202).json({ mensagem: "Busca iniciada. Acompanhe o andamento nesta página." });
	};

	status = async (_requisicao: Request, resposta: Response): Promise<void> => {
		resposta.json({ dados: await this.servicoEventos.obterStatus(), resumo: { ...await this.servicoEventos.obterResumo(), proximaBusca: this.obterProximaExecucao() } });
	};

	listarExecucoes = async (requisicao: Request, resposta: Response): Promise<void> => {
		const pagina = z.coerce.number().int().positive().default(1).parse(requisicao.query.pagina);
		const limite = z.coerce.number().int().positive().max(100).default(50).parse(requisicao.query.limite);
		const fonte = requisicao.query.fonte ? z.string().trim().min(1).parse(requisicao.query.fonte) : undefined;
		const dataInicio = requisicao.query.dataInicio ? new Date(`${z.string().date().parse(requisicao.query.dataInicio)}T00:00:00`) : undefined;
		const dataFim = requisicao.query.dataFim ? new Date(`${z.string().date().parse(requisicao.query.dataFim)}T23:59:59.999`) : undefined;
		const resultado = await this.servicoEventos.listarExecucoes({ pagina, limite, fonte, dataInicio, dataFim });
		resposta.json({ dados: resultado.itens, paginacao: { pagina, limite, totalItens: resultado.total, totalPaginas: Math.ceil(resultado.total / limite) } });
	};

	buscarExecucao = async (requisicao: Request, resposta: Response): Promise<void> => {
		const id = requisicao.params.id;
		if (typeof id !== "string" || !isValidObjectId(id)) { resposta.status(400).json({ erro: "Identificador inválido" }); return; }
		const dados = await this.servicoEventos.buscarExecucao(id);
		if (!dados) { resposta.status(404).json({ erro: "Execução não encontrada" }); return; }
		resposta.json({ dados });
	};

	listarLogs = async (requisicao: Request, resposta: Response): Promise<void> => {
		const id = requisicao.params.id;
		if (typeof id !== "string" || !isValidObjectId(id)) { resposta.status(400).json({ erro: "Identificador inválido" }); return; }
		const nivel = requisicao.query.nivel ? z.enum(["info", "sucesso", "aviso", "erro"]).parse(requisicao.query.nivel) as NivelLogScraping : undefined;
		resposta.json({ dados: await this.servicoEventos.listarLogs(id, nivel) });
	};

	eventos = async (requisicao: Request, resposta: Response): Promise<void> => {
		resposta.setHeader("Content-Type", "text/event-stream");
		resposta.setHeader("Cache-Control", "no-cache");
		resposta.setHeader("Connection", "keep-alive");
		resposta.flushHeaders();
		resposta.write(`event: conectado\ndata: ${JSON.stringify({ criadoEm: new Date() })}\n\n`);
		const cancelar = this.servicoEventos.assinar((evento) => resposta.write(`event: ${evento.tipo}\ndata: ${JSON.stringify(evento.dados)}\n\n`));
		const manterConexao = setInterval(() => resposta.write(": keep-alive\n\n"), 20_000);
		requisicao.on("close", () => { clearInterval(manterConexao); cancelar(); });
	};
}
