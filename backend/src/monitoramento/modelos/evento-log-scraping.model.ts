import { Schema, model } from "mongoose";

const esquemaEvento = new Schema(
	{
		execucaoId: { type: Schema.Types.ObjectId, ref: "ExecucaoScraping", required: true, index: true },
		fonte: { type: String, required: true, index: true },
		nivel: { type: String, enum: ["info", "sucesso", "aviso", "erro"], required: true, index: true },
		mensagem: { type: String, required: true },
		criadoEm: { type: Date, required: true, index: true },
	},
	{ versionKey: false },
);

export const ModeloEventoLogScraping = model("EventoLogScraping", esquemaEvento);
