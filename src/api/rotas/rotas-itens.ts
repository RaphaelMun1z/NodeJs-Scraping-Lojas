import { Router } from "express";
import type { ControladorItem } from "../controladores/controlador-item.js";

export function criarRotasItens(controladorItem: ControladorItem): Router {
	const roteador = Router();

	roteador.get("/", controladorItem.listar);
	roteador.get("/:id/historico", controladorItem.historico);
	roteador.get("/:id", controladorItem.buscarPorId);

	return roteador;
}
