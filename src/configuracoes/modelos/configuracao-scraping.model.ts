import { Schema, model } from "mongoose";

const esquemaFonte = new Schema(
	{
		fonte: { type: String, enum: ["kabum", "amazon", "terabyteshop"], required: true },
		nome: { type: String, required: true },
		url: { type: String, required: true },
		ativa: { type: Boolean, default: true },
	},
	{ _id: false },
);

const esquemaConfiguracaoScraping = new Schema(
	{
		chave: { type: String, unique: true, required: true, default: "principal" },
		fontes: { type: [esquemaFonte], required: true },
		atualizadaEm: { type: Date, required: true },
	},
	{ versionKey: false },
);

export const ModeloConfiguracaoScraping = model("ConfiguracaoScraping", esquemaConfiguracaoScraping);
