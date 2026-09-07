import cron, { type ScheduledTask } from "node-cron";
import { logger } from "../config/logger.js";
import type { ServicoColeta } from "../servicos/servico-coleta.js";

export class AgendadorColeta {
  private tarefa?: ScheduledTask;

  constructor(
    private readonly servicoColeta: ServicoColeta,
    private readonly expressao: string,
    private readonly fusoHorario: string,
  ) {}

  iniciar(): void {
    if (!cron.validate(this.expressao)) {
      throw new Error(`Expressão cron inválida: ${this.expressao}`);
    }

    this.tarefa = cron.schedule(
      this.expressao,
      async () => {
        try {
          await this.servicoColeta.executar();
        } catch (erro) {
          logger.error({ erro }, "Erro na coleta agendada");
        }
      },
      {
        timezone: this.fusoHorario,
        noOverlap: true,
        name: "coleta-html",
      },
    );

    logger.info(
      { expressao: this.expressao, fusoHorario: this.fusoHorario },
      "Agendamento de coleta iniciado",
    );
  }

  parar(): void {
    this.tarefa?.stop();
  }

  obterProximaExecucao(): Date | null {
    return this.tarefa?.getNextRun() ?? null;
  }
}
