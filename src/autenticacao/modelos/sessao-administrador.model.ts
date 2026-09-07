import { Schema, model } from "mongoose";

const esquemaSessaoAdministrador = new Schema(
	{
		administradorId: { type: Schema.Types.ObjectId, ref: "Administrador", required: true, index: true },
		tokenHash: { type: String, required: true, unique: true, index: true },
		tokenCsrfHash: { type: String, required: true },
		expiraEm: { type: Date, required: true },
		criadaEm: { type: Date, required: true },
	},
	{ versionKey: false },
);

esquemaSessaoAdministrador.index({ expiraEm: 1 }, { expireAfterSeconds: 0 });

export const ModeloSessaoAdministrador = model("SessaoAdministrador", esquemaSessaoAdministrador);
