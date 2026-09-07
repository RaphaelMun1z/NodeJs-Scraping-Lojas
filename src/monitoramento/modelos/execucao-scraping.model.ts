import { Schema, model } from "mongoose";

const esquemaExecucao = new Schema(
	{
		fonte: { type: String, required: true, index: true },
		rodadaId: { type: String, index: true },
		status: { type: String, enum: ["aguardando", "executando", "concluido", "erro"], required: true, index: true },
		iniciadoEm: { type: Date, required: true, index: true },
		finalizadoEm: Date,
		duracaoMs: Number,
		produtosEncontrados: { type: Number, default: 0 },
		produtosNovos: { type: Number, default: 0 },
		produtosAtualizados: { type: Number, default: 0 },
		produtosInativados: { type: Number, default: 0 },
		ultimaMensagem: String,
		erro: String,
	},
	{ versionKey: false },
);

// Impede duas execuções simultâneas para a mesma fonte, inclusive entre processos.
esquemaExecucao.index(
	{ fonte: 1, status: 1 },
	{ unique: true, partialFilterExpression: { status: "executando" } },
);

export const ModeloExecucaoScraping = model("ExecucaoScraping", esquemaExecucao);
