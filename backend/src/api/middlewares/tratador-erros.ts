import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { logger } from "../../config/logger.js";

export const tratadorErros: ErrorRequestHandler = (
	erro,
	requisicao,
	resposta,
	_proximo,
) => {
	if (erro instanceof ZodError) {
		const campos = erro.issues.map((item) => ({
			campo: item.path.length > 0 ? item.path.join(".") : "corpo da requisição",
			mensagem: item.message,
		}));
		resposta.status(400).json({
			erro: `Não foi possível processar ${requisicao.method} ${requisicao.path}. Revise os campos informados.`,
			detalhes: campos,
		});
		return;
	}

	logger.error({ erro }, "Erro não tratado na API");
	const mensagem = erro instanceof Error ? erro.message.trim() : "Falha inesperada ao processar a solicitação";
	resposta.status(500).json({
		erro: mensagem || "Falha inesperada ao processar a solicitação",
		detalhes: [{ mensagem: "Consulte os logs do backend para obter o contexto técnico completo." }],
	});
};
