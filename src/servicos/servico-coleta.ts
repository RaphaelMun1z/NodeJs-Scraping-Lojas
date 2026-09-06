import type { ColetorBase } from "../coletores/coletor-base.js";
import { logger } from "../config/logger.js";
import type { ItemColetado } from "../modelos/item-coletado.model.js";
import type { RepositorioItem } from "../banco/repositorios/repositorio-item.js";

export class ServicoColeta {
  private execucaoAtual?: Promise<number>;

  constructor(
    private readonly coletor: ColetorBase<ItemColetado>,
    private readonly repositorioItem: RepositorioItem,
  ) {}

  executar(): Promise<number> {
    // Reutiliza a execução atual para impedir duas coletas simultâneas.
    if (this.execucaoAtual) return this.execucaoAtual;

    this.execucaoAtual = this.executarColeta().finally(() => {
      this.execucaoAtual = undefined;
    });

    return this.execucaoAtual;
  }

  private async executarColeta(): Promise<number> {
    const inicio = Date.now();
    logger.info("Iniciando coleta");

    const itens = await this.coletor.coletar();
    await this.repositorioItem.salvarMuitos(itens);

    logger.info(
      { total: itens.length, duracaoMs: Date.now() - inicio },
      "Coleta concluída e persistida",
    );

    return itens.length;
  }
}
