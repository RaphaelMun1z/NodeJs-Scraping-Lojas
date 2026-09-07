import { createHash } from "node:crypto";
import type { ItemColetado } from "../modelos/item-coletado.model.js";

export function gerarChaveItem(item: ItemColetado): string {
	// Ignora parametros de rastreamento e fragmentos, que podem mudar entre
	// coletas sem representar um produto diferente.
	const identificador = item.url
		? normalizarUrlParaChave(item.url)
		: item.titulo.trim().replace(/\s+/g, " ").toLowerCase();
	const conteudo = `${item.fonte}:${identificador}`;

	return createHash("sha256").update(conteudo).digest("hex");
}

function normalizarUrlParaChave(valor: string): string {
	try {
		const url = new URL(valor);
		url.search = "";
		url.hash = "";
		url.pathname = url.pathname.replace(/\/+$/, "") || "/";

		return `${url.protocol}//${url.hostname.toLowerCase()}${url.pathname}`;
	} catch {
		// Mantem um fallback seguro para URLs relativas ou invalidas.
		return (valor.split(/[?#]/, 1)[0] ?? "")
			.replace(/\/+$/, "")
			.toLowerCase();
	}
}
