import { createHash } from "node:crypto";
import type { ItemColetado } from "../modelos/item-coletado.model.js";

export function gerarChaveItem(item: ItemColetado): string {
  // A URL é priorizada por normalmente identificar o item de forma estável.
  const conteudo = item.url ?? `${item.titulo}|${item.descricao ?? ""}`;

  return createHash("sha256").update(conteudo).digest("hex");
}
