import "dotenv/config";
import { writeFile } from "node:fs/promises";

import { AnalisadorSite } from "./analisadores/analisador-site.js";
import { ClienteHttp } from "./clientes/cliente-http.js";
import { ColetorSite } from "./coletores/coletor-site.js";
import type { ItemColetado } from "./modelos/item-coletado.model.js";

function escaparCsv(valor: string | number | undefined): string {
	const texto = valor === undefined ? "" : String(valor);
	return `"${texto.replaceAll('"', '""')}"`;
}

function gerarCsv(itens: ItemColetado[]): string {
	const cabecalho = ["fonte", "titulo", "preco", "precoAntigo", "url", "imagemUrl"];
	const linhas = itens.map((item) =>
		[
			escaparCsv(item.fonte),
			escaparCsv(item.titulo),
			escaparCsv(item.preco),
			escaparCsv(item.precoAntigo),
			escaparCsv(item.url),
			escaparCsv(item.imagemUrl),
		].join(";"),
	);

	// BOM + ponto e vírgula facilitam a abertura no Excel em português.
	return `\uFEFF${cabecalho.join(";")}\n${linhas.join("\n")}\n`;
}

async function main(): Promise<void> {
	try {
		const clienteHttp = new ClienteHttp();
		const coletor = new ColetorSite(clienteHttp, new AnalisadorSite());
		const itens = await coletor.coletar();
		const arquivo = process.env.CSV_SAIDA ?? "produtos.csv";

		await writeFile(arquivo, gerarCsv(itens), "utf8");
		console.log(`✅ ${itens.length} produto(s) salvo(s) em ${arquivo}`);
	} catch (erro) {
		console.error("❌ Erro ao gerar o CSV:", erro);
		process.exitCode = 1;
	}
}

await main();
