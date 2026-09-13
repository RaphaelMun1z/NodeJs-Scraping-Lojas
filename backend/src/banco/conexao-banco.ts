import mongoose from "mongoose";
import { logger } from "../config/logger.js";

export class ConexaoBanco {
	async conectar(uri: string): Promise<void> {
		await mongoose.connect(uri);
		logger.info("Conexão com MongoDB estabelecida");
	}

	async desconectar(): Promise<void> {
		await mongoose.disconnect();
		logger.info("Conexão com MongoDB encerrada");
	}

	estaConectado(): boolean {
		return mongoose.connection.readyState === 1;
	}
}
