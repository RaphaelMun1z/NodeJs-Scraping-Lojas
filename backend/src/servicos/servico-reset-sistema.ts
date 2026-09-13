import mongoose from "mongoose";
import { ModeloAdministrador } from "../autenticacao/modelos/administrador.model.js";
import type { RepositorioIndiceProdutos } from "../elasticsearch/repositorio-indice-produtos.js";

export class ServicoResetSistema {
	private emExecucao = false;

	constructor(private readonly repositorioIndice?: RepositorioIndiceProdutos) {}

	async executar(): Promise<{ colecoes: number; indexados: number }> {
		if (this.emExecucao) throw new Error("Já existe um reset do sistema em andamento");
		const banco = mongoose.connection.db;
		if (!banco) throw new Error("Banco de dados não está conectado");
		this.emExecucao = true;
		try {
			const colecaoAdministrador = ModeloAdministrador.collection.name;
			const colecoes = await banco.listCollections().toArray();
			let colecoesLimpas = 0;
			for (const colecao of colecoes) {
				if (colecao.name === colecaoAdministrador) continue;
				await banco.collection(colecao.name).deleteMany({});
				colecoesLimpas += 1;
			}
			const indexados = await (this.repositorioIndice?.limparProdutos() ?? Promise.resolve(0));
			return { colecoes: colecoesLimpas, indexados };
		} finally {
			this.emExecucao = false;
		}
	}
}
