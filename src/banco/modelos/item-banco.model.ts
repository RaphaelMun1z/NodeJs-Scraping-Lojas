import { Schema, model } from "mongoose";

const esquemaItemBanco = new Schema(
  {
    chave: { type: String, required: true, unique: true, index: true },
    titulo: { type: String, required: true, trim: true, index: true },
    descricao: { type: String, trim: true },
    url: { type: String, trim: true },
    primeiraColetaEm: { type: Date, required: true },
    ultimaColetaEm: { type: Date, required: true, index: true },
  },
  {
    versionKey: false,
  },
);

export const ModeloItemBanco = model("Item", esquemaItemBanco);
