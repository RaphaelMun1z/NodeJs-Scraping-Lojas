import { Schema, model } from "mongoose";

const esquemaHistoricoPreco = new Schema(
	{
		chaveProduto: { type: String, required: true, index: true },
		grupoProdutoId: { type: String, required: true, index: true },
		fonte: { type: String, required: true, index: true },
		preco: { type: Number, required: true, min: 0 },
		precoAntigo: { type: Number, min: 0 },
		coletadoEm: { type: Date, required: true, index: true },
	},
	{ versionKey: false },
);

export const ModeloHistoricoPreco = model(
	"HistoricoPreco",
	esquemaHistoricoPreco,
);
