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
		tipoPaginacao: { type: String, enum: ["nenhuma", "proximaPagina", "url"], default: "nenhuma" },
		seletorProximaPagina: { type: String, default: "" },
		maxPaginas: { type: Number, min: 1, max: 100, default: 10 },
		parametroPagina: { type: String, default: "page" },
		urlPaginacaoTemplate: { type: String, default: "" },
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
					icone: { type: String, default: "tag" },
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
		agendamento: {
			horarios: { type: [String], required: true, default: ["00:00", "12:00"] },
			fusoHorario: { type: String, required: true, default: "America/Sao_Paulo" },
		},
	telegram: {
			habilitado: { type: Boolean, default: false },
			chatId: { type: String, default: "" },
			percentualAbaixoMedia: { type: Number, min: 1, max: 99, default: 65 },
			formato: {
				templateHtml: { type: String, default: "<b>{{titulo}}</b>\\nPreço: {{preco}}\\nMédia: {{media}}\\n{{percentual}}\\n{{url}}" },
				campos: {
					type: [{ chave: { type: String, enum: ["titulo", "preco", "media", "percentual", "url"] }, habilitado: { type: Boolean, default: true }, rotulo: { type: String, default: "" } }],
					default: [
						{ chave: "titulo", habilitado: true, rotulo: "Produto" },
						{ chave: "preco", habilitado: true, rotulo: "Preço" },
						{ chave: "media", habilitado: true, rotulo: "Média" },
						{ chave: "percentual", habilitado: true, rotulo: "Desconto" },
						{ chave: "url", habilitado: true, rotulo: "Link" },
					],
				},
				separador: { type: String, default: "\\n" },
				prefixo: { type: String, default: "" },
				sufixo: { type: String, default: "" },
				modoTexto: { type: String, enum: ["plain", "HTML", "MarkdownV2"], default: "plain" },
				previewLink: { type: Boolean, default: true },
				maxCaracteres: { type: Number, min: 100, max: 4096, default: 4096 },
			},
		},
		atualizadaEm: { type: Date, required: true },
	},
	{ versionKey: false },
);

export const ModeloConfiguracaoScraping = model("ConfiguracaoScraping", esquemaConfiguracaoScraping);
