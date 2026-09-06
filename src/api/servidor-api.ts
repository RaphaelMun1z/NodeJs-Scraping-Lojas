import express, { type Express } from "express";
import type { Server } from "node:http";
import type { ConexaoBanco } from "../banco/conexao-banco.js";
import type { RepositorioItem } from "../banco/repositorios/repositorio-item.js";
import { logger } from "../config/logger.js";
import { ControladorItem } from "./controladores/controlador-item.js";
import { tratadorErros } from "./middlewares/tratador-erros.js";
import { criarRotasItens } from "./rotas/rotas-itens.js";

export class ServidorApi {
	private readonly aplicacao: Express;
	private servidor?: Server;

	constructor(
		private readonly repositorioItem: RepositorioItem,
		private readonly conexaoBanco: ConexaoBanco,
	) {
		this.aplicacao = express();
		this.configurar();
	}

	iniciar(porta: number): void {
		this.servidor = this.aplicacao.listen(porta, () => {
			logger.info({ porta }, "API REST iniciada");
		});
	}

	async parar(): Promise<void> {
		if (!this.servidor) return;

		await new Promise<void>((resolver, rejeitar) => {
			this.servidor?.close((erro) =>
				erro ? rejeitar(erro) : resolver(),
			);
		});
	}

	private configurar(): void {
		const controladorItem = new ControladorItem(this.repositorioItem);

		this.aplicacao.disable("x-powered-by");
		this.aplicacao.use(express.json({ limit: "100kb" }));

		this.aplicacao.get("/api/saude", (_requisicao, resposta) => {
			const bancoConectado = this.conexaoBanco.estaConectado();
			resposta
				.status(bancoConectado ? 200 : 503)
				.json({ bancoConectado });
		});

		this.aplicacao.use("/api/itens", criarRotasItens(controladorItem));
		this.aplicacao.use(tratadorErros);
	}
}
