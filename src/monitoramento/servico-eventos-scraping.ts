import { EventEmitter } from "node:events";
import { ModeloExecucaoScraping } from "./modelos/execucao-scraping.model.js";
import { ModeloEventoLogScraping } from "./modelos/evento-log-scraping.model.js";
import { ModeloItemBanco } from "../banco/modelos/item-banco.model.js";

export type NivelLogScraping = "info" | "sucesso" | "aviso" | "erro";

export interface EventoScraping {
	tipo: "execucao" | "log";
	dados: Record<string, unknown>;
}

export interface MetricasScraping {
	produtosEncontrados?: number;
	produtosNovos?: number;
	produtosAtualizados?: number;
	produtosInativados?: number;
}

export interface ConsultaExecucoesScraping {
	pagina: number;
	limite: number;
	fonte?: string;
	dataInicio?: Date;
	dataFim?: Date;
}

export class ServicoEventosScraping {
	private readonly emissor = new EventEmitter();

	constructor(
		private readonly retencaoExecucoes = Number(process.env.SCRAPING_RETENCAO_EXECUCOES ?? 100),
		private readonly retencaoLogs = Number(process.env.SCRAPING_RETENCAO_LOGS ?? 2000),
		private readonly obterFontesAtivas?: () => Promise<string[]>,
	) {}

	async prepararRetencao(): Promise<void> {
		const execucoesEmAndamento = await ModeloExecucaoScraping.find({ status: "executando" }).select("_id iniciadoEm fonte").lean().exec();
		const finalizadoEm = new Date();
		for (const execucao of execucoesEmAndamento) {
			await ModeloExecucaoScraping.findByIdAndUpdate(execucao._id, {
				$set: {
					status: "erro",
					finalizadoEm,
					duracaoMs: finalizadoEm.getTime() - new Date(execucao.iniciadoEm).getTime(),
					erro: "Execução interrompida antes de ser finalizada",
				},
			}).exec();
		}

		const execucoes = await ModeloExecucaoScraping.find().sort({ iniciadoEm: -1 }).select("_id").skip(this.retencaoExecucoes).lean().exec();
		if (execucoes.length > 0) {
			const ids = execucoes.map((item) => item._id);
			await ModeloEventoLogScraping.deleteMany({ execucaoId: { $in: ids } }).exec();
			await ModeloExecucaoScraping.deleteMany({ _id: { $in: ids } }).exec();
		}
		const logs = await ModeloEventoLogScraping.find().sort({ criadoEm: -1 }).select("_id").skip(this.retencaoLogs).lean().exec();
		if (logs.length > 0) await ModeloEventoLogScraping.deleteMany({ _id: { $in: logs.map((item) => item._id) } }).exec();
	}

	async iniciarExecucao(fonte: string, rodadaId: string): Promise<string | undefined> {
		try {
			const execucao = await ModeloExecucaoScraping.create({ fonte, rodadaId, status: "executando", iniciadoEm: new Date() });
			this.emitir("execucao", execucao.toObject());
			await this.registrarLog(execucao.id, fonte, "info", "Scraping iniciado");
			return execucao.id;
		} catch (erro) {
			if ((erro as { code?: number }).code === 11000) {
				// Outra instância já está coletando esta fonte.
				return undefined;
			}
			throw erro;
		}
	}

	async registrarLog(execucaoId: string, fonte: string, nivel: NivelLogScraping, mensagem: string): Promise<void> {
		const evento = await ModeloEventoLogScraping.create({ execucaoId, fonte, nivel, mensagem, criadoEm: new Date() });
		await ModeloExecucaoScraping.findByIdAndUpdate(execucaoId, { $set: { ultimaMensagem: mensagem } }).exec();
		this.emitir("log", evento.toObject());
	}

	async atualizarMetricas(execucaoId: string, metricas: MetricasScraping): Promise<void> {
		const execucao = await ModeloExecucaoScraping.findByIdAndUpdate(execucaoId, { $set: metricas }, { returnDocument: "after" }).lean().exec();
		if (execucao) this.emitir("execucao", execucao);
	}

	async concluirExecucao(execucaoId: string, metricas: MetricasScraping = {}): Promise<void> {
		const finalizadoEm = new Date();
		const execucao = await ModeloExecucaoScraping.findByIdAndUpdate(execucaoId, { $set: { ...metricas, status: "concluido", finalizadoEm }, $setOnInsert: { iniciadoEm: finalizadoEm } }, { returnDocument: "after" }).lean().exec();
		if (!execucao) return;
		await ModeloExecucaoScraping.findByIdAndUpdate(execucaoId, { $set: { duracaoMs: finalizadoEm.getTime() - new Date(execucao.iniciadoEm).getTime() } }).exec();
		await this.registrarLog(execucaoId, execucao.fonte, "sucesso", "Scraping concluído");
		this.emitir("execucao", { ...execucao, status: "concluido", finalizadoEm, duracaoMs: finalizadoEm.getTime() - new Date(execucao.iniciadoEm).getTime() });
	}

	async registrarErro(execucaoId: string, fonte: string, erro: unknown): Promise<void> {
		const mensagem = erro instanceof Error ? erro.message : "Erro desconhecido na coleta";
		const finalizadoEm = new Date();
		const execucao = await ModeloExecucaoScraping.findByIdAndUpdate(execucaoId, { $set: { status: "erro", erro: mensagem, finalizadoEm } }, { returnDocument: "after" }).lean().exec();
		const duracaoMs = execucao ? finalizadoEm.getTime() - new Date(execucao.iniciadoEm).getTime() : undefined;
		if (duracaoMs !== undefined) await ModeloExecucaoScraping.findByIdAndUpdate(execucaoId, { $set: { duracaoMs } }).exec();
		await this.registrarLog(execucaoId, fonte, "erro", mensagem);
		if (execucao) this.emitir("execucao", { ...execucao, duracaoMs });
	}

	async obterStatus(): Promise<Record<string, unknown>[]> {
		const fontesAtivas = this.obterFontesAtivas ? await this.obterFontesAtivas() : undefined;
		const filtro = fontesAtivas ? { fonte: { $in: fontesAtivas } } : {};
		const execucoes = await ModeloExecucaoScraping.find(filtro).sort({ iniciadoEm: -1 }).limit(100).lean().exec();
		const maisRecentes = new Map<string, Record<string, unknown>>();
		for (const execucao of execucoes) {
			if (!maisRecentes.has(execucao.fonte)) maisRecentes.set(execucao.fonte, execucao as Record<string, unknown>);
		}
		return [...maisRecentes.values()];
	}

	async obterResumo(): Promise<{ ultimaAtualizacao?: Date; produtosSalvos: number; produtosAtivos: number; duracaoMediaMs?: number }> {
		const fontesAtivas = this.obterFontesAtivas ? await this.obterFontesAtivas() : undefined;
		const filtroFontes = fontesAtivas ? { fonte: { $in: fontesAtivas } } : {};
		const [ultimaExecucao, produtosSalvos, produtosAtivos, duracao] = await Promise.all([
			ModeloExecucaoScraping.findOne({ ...filtroFontes, finalizadoEm: { $exists: true } }).sort({ finalizadoEm: -1 }).select("finalizadoEm").lean().exec(),
			ModeloItemBanco.countDocuments(filtroFontes).exec(),
			ModeloItemBanco.countDocuments({ ...filtroFontes, $or: [{ ativo: true }, { ativo: { $exists: false } }] }).exec(),
			ModeloExecucaoScraping.aggregate([
				{ $match: { ...filtroFontes, status: "concluido", rodadaId: { $exists: true, $ne: "" }, duracaoMs: { $exists: true, $gt: 0 } } },
				{ $group: { _id: "$rodadaId", totalRodadaMs: { $sum: "$duracaoMs" } } },
				{ $group: { _id: null, mediaRodadasMs: { $avg: "$totalRodadaMs" } } },
			]).exec(),
		]);
		return { ultimaAtualizacao: ultimaExecucao?.finalizadoEm ?? undefined, produtosSalvos, produtosAtivos, duracaoMediaMs: duracao[0]?.mediaRodadasMs };
	}

	async listarExecucoes(consulta: ConsultaExecucoesScraping): Promise<{ itens: Record<string, unknown>[]; total: number }> {
		const filtro: Record<string, unknown> = {};
		const fontesAtivas = this.obterFontesAtivas ? await this.obterFontesAtivas() : undefined;
		if (fontesAtivas) filtro.fonte = consulta.fonte ? (fontesAtivas.includes(consulta.fonte) ? consulta.fonte : { $in: [] }) : { $in: fontesAtivas };
		else if (consulta.fonte) filtro.fonte = consulta.fonte;
		if (consulta.dataInicio || consulta.dataFim) filtro.iniciadoEm = { ...(consulta.dataInicio ? { $gte: consulta.dataInicio } : {}), ...(consulta.dataFim ? { $lte: consulta.dataFim } : {}) };
		const deslocamento = (consulta.pagina - 1) * consulta.limite;
		const [itens, total] = await Promise.all([
			ModeloExecucaoScraping.find(filtro).sort({ iniciadoEm: -1 }).skip(deslocamento).limit(consulta.limite).lean().exec(),
			ModeloExecucaoScraping.countDocuments(filtro).exec(),
		]);
		return { itens: itens as unknown as Record<string, unknown>[], total };
	}

	async buscarExecucao(id: string): Promise<Record<string, unknown> | null> {
		return ModeloExecucaoScraping.findById(id).lean().exec() as unknown as Promise<Record<string, unknown> | null>;
	}

	async listarLogs(id: string, nivel?: NivelLogScraping): Promise<Record<string, unknown>[]> {
		return ModeloEventoLogScraping.find({ execucaoId: id, ...(nivel ? { nivel } : {}) }).sort({ criadoEm: 1 }).limit(500).lean().exec() as unknown as Promise<Record<string, unknown>[]>;
	}

	assinar(ouvinte: (evento: EventoScraping) => void): () => void {
		this.emissor.on("evento", ouvinte);
		return () => this.emissor.off("evento", ouvinte);
	}

	private emitir(tipo: EventoScraping["tipo"], dados: Record<string, unknown>): void {
		this.emissor.emit("evento", { tipo, dados });
	}
}
