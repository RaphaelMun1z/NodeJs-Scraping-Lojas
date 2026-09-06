import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { logger } from "../../config/logger.js";

export const tratadorErros: ErrorRequestHandler = (erro, _requisicao, resposta, _proximo) => {
  if (erro instanceof ZodError) {
    resposta.status(400).json({
      erro: "Parâmetros inválidos",
      detalhes: erro.issues,
    });
    return;
  }

  logger.error({ erro }, "Erro não tratado na API");
  resposta.status(500).json({ erro: "Erro interno do servidor" });
};
