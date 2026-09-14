import cron, { type ScheduledTask } from "node-cron";
import { logger } from "../config/logger.js";
import type { ServicoColeta } from "../servicos/servico-coleta.js";

export class AgendadorColeta {
	private tarefas: ScheduledTask[] = [];

	constructor(
		private readonly servicoColeta: ServicoColeta,
		private horarios: string[],
		private fusoHorario: string,
	) {}

	iniciar(): void {
		this.parar();
		this.tarefas = this.horarios.map((horario) => {
			const [hora, minuto] = horario.split(":");
			const expressao = `${minuto} ${hora} * * *`;
			if (!cron.validate(expressao)) throw new Error(`Horário de coleta inválido: ${horario}`);
			return cron.schedule(expressao, async () => {
				try { await this.servicoColeta.executar(); }
				catch (erro) { logger.error({ erro }, "Erro na coleta agendada"); }
			}, { timezone: this.fusoHorario, noOverlap: true, name: `coleta-html-${horario}` });
		});
		logger.info({ horarios: this.horarios, fusoHorario: this.fusoHorario }, "Agendamento de coleta iniciado");
	}

	atualizar(horarios: string[], fusoHorario: string): void {
		this.horarios = [...horarios];
		this.fusoHorario = fusoHorario;
		this.iniciar();
	}

	parar(): void {
		for (const tarefa of this.tarefas) tarefa.stop();
		this.tarefas = [];
	}

	obterProximaExecucao(): Date | null {
		const proximas = this.tarefas
			.map((tarefa) => tarefa.getNextRun())
			.filter((data): data is Date => data instanceof Date);
		return proximas.sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
	}
}
