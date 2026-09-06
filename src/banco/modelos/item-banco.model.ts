import { Schema, model } from "mongoose";

const esquemaItemBanco = new Schema(
	{
		fonte: { type: String, required: true, index: true },
		chave: { type: String, required: true, unique: true, index: true },
		titulo: { type: String, required: true, trim: true, index: true },
		preco: { type: Number, min: 0 },
		precoAntigo: { type: Number, min: 0 },
		ativo: { type: Boolean, default: true, index: true },
		imagemUrl: { type: String, trim: true },
		url: { type: String, trim: true },
		primeiraColetaEm: { type: Date, required: true },
		ultimaColetaEm: { type: Date, required: true, index: true },
	},
	{
		versionKey: false,
	},
);

export const ModeloItemBanco = model("Item", esquemaItemBanco);
