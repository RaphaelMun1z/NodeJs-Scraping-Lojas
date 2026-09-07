import { Schema, model } from "mongoose";

const esquemaAdministrador = new Schema(
	{
		email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
		senhaHash: { type: String, required: true },
		papel: { type: String, enum: ["administrador"], default: "administrador" },
		segredoTotp: { type: String },
		segredoTotpPendente: { type: String },
		mfaAtivo: { type: Boolean, default: false },
		criadoEm: { type: Date, required: true },
		atualizadoEm: { type: Date, required: true },
	},
	{ versionKey: false },
);

export const ModeloAdministrador = model("Administrador", esquemaAdministrador);
