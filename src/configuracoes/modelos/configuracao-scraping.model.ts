import { Schema, model } from "mongoose";

const esquemaSeletores = new Schema(
	{
		item: { type: String, default: "" },
		titulo: { type: String, default: "" },
		preco: { type: String, default: "" },
		precoAntigo: { type: String, default: "" },
		imagem: { type: String, default: "" },
		url: { type: String, default: "" },
		paginaVirtualizada: { type: Boolean, default: false },
		carregarMais: { type: String, default: "" },
	},
	{ _id: false },
);

const esquemaFonte = new Schema(
	{
		fonte: { type: String, required: true },
		nome: { type: String, required: true },
		logo: { type: String, default: "" },
		ativa: { type: Boolean, default: false },
		categorias: {
			type: [new Schema(
				{
					id: { type: String, required: true },
					categoria: { type: String, required: true },
					url: { type: String, default: "" },
					ativa: { type: Boolean, default: false },
					seletores: { type: esquemaSeletores, required: true },
				},
				{ _id: false },
			)],
			default: [],
		},
		// Mantidos temporariamente para migrar configurações anteriores à v5.
		url: { type: String, required: false },
		seletores: { type: esquemaSeletores, required: false },
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
