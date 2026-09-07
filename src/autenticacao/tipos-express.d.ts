import type { AdministradorAutenticado } from "./servico-autenticacao.js";

declare global {
	namespace Express {
		interface Request {
			administrador?: AdministradorAutenticado;
			tokenCsrfHash?: string;
		}
	}
}

export {};
