import { Schema, model } from "mongoose";

const esquemaItemBanco = new Schema(
	{
		fonte: { type: String, required: true, index: true },
		chave: { type: String, required: true, unique: true, index: true },
		grupoProdutoId: { type: String, index: true },
		categoriaOriginal: { type: String, index: true },
		categoriaNormalizada: { type: String, index: true },
		tipoProduto: { type: String, index: true },
	confiancaCategoria: { type: Number, min: 0, max: 1 },
	categoria: { type: String, index: true },
	subcategoria: { type: String, index: true },
	classificacaoVersao: { type: Number, index: true },
		classificacaoProcessada: { type: Boolean, default: false, index: true },
		titulo: { type: String, required: true, trim: true, index: true },
		preco: { type: Number, min: 0 },
		precoAntigo: { type: Number, min: 0 },
		ativo: { type: Boolean, default: true, index: true },
		novaNaUltimaColeta: { type: Boolean, default: false, index: true },
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
