import { Router } from "express";
import type { ControladorItem } from "../controladores/controlador-item.js";

export function criarRotasItens(controladorItem: ControladorItem): Router {
	const roteador = Router();

	roteador.get("/", controladorItem.listar);
	roteador.get("/sugestoes", controladorItem.sugestoes);
	roteador.get("/novidades", controladorItem.novidades);
	roteador.get("/:id/historico", controladorItem.historico);
	roteador.get("/:id", controladorItem.buscarPorId);

	return roteador;
}
