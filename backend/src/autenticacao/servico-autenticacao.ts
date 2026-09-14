import argon2 from "argon2";
import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { ModeloAdministrador } from "./modelos/administrador.model.js";
import { ModeloSessaoAdministrador } from "./modelos/sessao-administrador.model.js";

const NOME_COOKIE_SESSAO = "sessao-administrador";
const NOME_COOKIE_CSRF = "csrf-token";
const HORAS_SESSAO_PADRAO = 7 * 24;

export interface AdministradorAutenticado {
	id: string;
	email: string;
	papel: "administrador";
	mfaAtivo: boolean;
}

function gerarHash(valor: string): string {
	return createHash("sha256").update(valor).digest("hex");
}

function lerCookies(requisicao: Request): Record<string, string> {
	return Object.fromEntries((requisicao.headers.cookie ?? "").split(";").filter(Boolean).map((item) => {
		const [nome, ...valor] = item.trim().split("=");
		return [nome, decodeURIComponent(valor.join("="))];
	}));
}

function lerToken(requisicao: Request): string | undefined {
	const autorizacao = requisicao.headers.authorization;
	if (autorizacao?.startsWith("Bearer ")) return autorizacao.slice("Bearer ".length).trim() || undefined;
	return undefined;
}

export class ServicoAutenticacao {
	private readonly tentativas = new Map<string, { quantidade: number; bloqueadoAte: number }>();
	private readonly duracaoSessaoMs: number;

	constructor(private readonly cookieSeguro = process.env.AUTENTICACAO_COOKIE_SECURE === "true") {
		const horas = Number(process.env.AUTENTICACAO_SESSAO_HORAS ?? HORAS_SESSAO_PADRAO);
		this.duracaoSessaoMs = Number.isFinite(horas) && horas >= 1
			? Math.floor(horas * 60 * 60 * 1000)
			: HORAS_SESSAO_PADRAO * 60 * 60 * 1000;
	}

	async autenticar(email: string, senha: string, codigoTotp?: string): Promise<{ administrador: AdministradorAutenticado; token: string; tokenCsrf: string } | null> {
		const chave = email.trim().toLowerCase();
		const bloqueio = this.tentativas.get(chave);
		if (bloqueio && bloqueio.bloqueadoAte > Date.now()) return null;
		const administrador = await ModeloAdministrador.findOne({ email: chave }).exec();
		const senhaValida = administrador ? await argon2.verify(administrador.senhaHash, senha) : false;
		const codigoValido = !administrador?.mfaAtivo || Boolean(codigoTotp && (await verify({ secret: administrador.segredoTotp!, token: codigoTotp })).valid);
		if (!administrador || !senhaValida || !codigoValido) {
			const atual = this.tentativas.get(chave) ?? { quantidade: 0, bloqueadoAte: 0 };
			atual.quantidade += 1;
			if (atual.quantidade >= 5) { atual.bloqueadoAte = Date.now() + 15 * 60 * 1000; atual.quantidade = 0; }
			this.tentativas.set(chave, atual);
			return null;
		}
		this.tentativas.delete(chave);
		const token = randomBytes(32).toString("base64url");
		const tokenCsrf = randomBytes(32).toString("base64url");
		await ModeloSessaoAdministrador.create({ administradorId: administrador._id, tokenHash: gerarHash(token), tokenCsrfHash: gerarHash(tokenCsrf), expiraEm: new Date(Date.now() + this.duracaoSessaoMs), criadaEm: new Date() });
		return { administrador: this.resumoAdministrador(administrador), token, tokenCsrf };
	}

	async verificarMfaNecessario(email: string, senha: string): Promise<boolean | null> {
		const chave = email.trim().toLowerCase();
		const bloqueio = this.tentativas.get(chave);
		if (bloqueio && bloqueio.bloqueadoAte > Date.now()) return null;
		const administrador = await ModeloAdministrador.findOne({ email: chave }).exec();
		if (!administrador || !(await argon2.verify(administrador.senhaHash, senha))) {
			const atual = this.tentativas.get(chave) ?? { quantidade: 0, bloqueadoAte: 0 };
			atual.quantidade += 1;
			if (atual.quantidade >= 5) { atual.bloqueadoAte = Date.now() + 15 * 60 * 1000; atual.quantidade = 0; }
			this.tentativas.set(chave, atual);
			return null;
		}
		this.tentativas.delete(chave);
		return administrador.mfaAtivo;
	}

	async validarSenhaAdministrador(id: string, senha: string): Promise<boolean> {
		if (!senha) return false;
		const administrador = await ModeloAdministrador.findById(id).select("senhaHash").lean().exec();
		return Boolean(administrador && await argon2.verify(administrador.senhaHash, senha));
	}

	async encerrar(token: string | undefined): Promise<void> {
		if (token) await ModeloSessaoAdministrador.deleteOne({ tokenHash: gerarHash(token) }).exec();
	}

	async encerrarRequisicao(requisicao: Request, resposta: Response): Promise<void> {
		const token = lerToken(requisicao);
		await this.encerrar(token);
		resposta.append("Set-Cookie", `${NOME_COOKIE_SESSAO}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${this.cookieSeguro ? "; Secure" : ""}`);
		resposta.append("Set-Cookie", `${NOME_COOKIE_CSRF}=; Path=/; SameSite=Strict; Max-Age=0${this.cookieSeguro ? "; Secure" : ""}`);
	}

	async obterAdministrador(requisicao: Request): Promise<{ administrador: AdministradorAutenticado; tokenCsrfHash: string; expiraEm: Date } | null> {
		const token = lerToken(requisicao);
		if (!token) return null;
		const sessao = await ModeloSessaoAdministrador.findOne({ tokenHash: gerarHash(token), expiraEm: { $gt: new Date() } }).populate("administradorId").exec();
		if (!sessao || !sessao.administradorId) return null;
		const administrador = sessao.administradorId as unknown as { _id: { toString(): string }; email: string; papel: "administrador"; mfaAtivo: boolean };
		return { administrador: { id: administrador._id.toString(), email: administrador.email, papel: administrador.papel, mfaAtivo: administrador.mfaAtivo }, tokenCsrfHash: sessao.tokenCsrfHash, expiraEm: sessao.expiraEm };
	}

	definirCookies(resposta: Response, tokenCsrf: string): void {
		resposta.append("Set-Cookie", `${NOME_COOKIE_CSRF}=${encodeURIComponent(tokenCsrf)}; Path=/; SameSite=Strict; Max-Age=${this.duracaoSessaoMs / 1000}${this.cookieSeguro ? "; Secure" : ""}`);
	}

	async iniciarMfa(administradorId: string): Promise<{ segredo: string; uri: string; qrCodeDataUrl: string }> {
		const administrador = await ModeloAdministrador.findById(administradorId).exec();
		if (!administrador) throw new Error("Administrador não encontrado");
		const segredo = generateSecret();
		administrador.segredoTotpPendente = segredo;
		await administrador.save();
		const uri = generateURI({ issuer: "Live Promo", label: administrador.email, secret: segredo });
		const qrCodeDataUrl = await QRCode.toDataURL(uri, { errorCorrectionLevel: "M", margin: 2, width: 240 });
		return { segredo, uri, qrCodeDataUrl };
	}

	async ativarMfa(administradorId: string, codigo: string): Promise<void> {
		const administrador = await ModeloAdministrador.findById(administradorId).exec();
		if (!administrador?.segredoTotpPendente) throw new Error("Não há configuração de MFA pendente");
		if (!(await verify({ secret: administrador.segredoTotpPendente, token: codigo })).valid) throw new Error("Código MFA inválido");
		administrador.segredoTotp = administrador.segredoTotpPendente;
		administrador.segredoTotpPendente = undefined;
		administrador.mfaAtivo = true;
		await administrador.save();
	}

	middlewareAdministrador() {
		return async (requisicao: Request, resposta: Response, proximo: NextFunction): Promise<void> => {
			const autenticado = await this.obterAdministrador(requisicao);
			if (autenticado) await this.renovarSessaoSeNecessario(requisicao, resposta, autenticado.expiraEm);
			if (!autenticado) { resposta.status(401).json({ erro: "Autenticação de administrador necessária" }); return; }
			requisicao.administrador = autenticado.administrador;
			requisicao.tokenCsrfHash = autenticado.tokenCsrfHash;
			proximo();
		};
	}

	middlewareCsrf() {
		return (requisicao: Request, resposta: Response, proximo: NextFunction): void => {
			const token = requisicao.headers["x-csrf-token"];
			const recebido = typeof token === "string" ? Buffer.from(gerarHash(token), "hex") : Buffer.alloc(0);
			const esperado = requisicao.tokenCsrfHash ? Buffer.from(requisicao.tokenCsrfHash, "hex") : Buffer.alloc(0);
			const valido = recebido.length === esperado.length && recebido.length > 0 && timingSafeEqual(recebido, esperado);
			if (!valido) { resposta.status(403).json({ erro: "Token CSRF inválido" }); return; }
			proximo();
		};
	}

	private async renovarSessaoSeNecessario(requisicao: Request, resposta: Response, expiraEm: Date): Promise<void> {
		if (expiraEm.getTime() - Date.now() > this.duracaoSessaoMs / 2) return;
		const token = lerToken(requisicao);
		const tokenCsrf = lerCookies(requisicao)[NOME_COOKIE_CSRF];
		if (!token || !tokenCsrf) return;
		await ModeloSessaoAdministrador.updateOne(
			{ tokenHash: gerarHash(token) },
			{ $set: { expiraEm: new Date(Date.now() + this.duracaoSessaoMs) } },
		).exec();
		this.definirCookies(resposta, tokenCsrf);
	}

	private resumoAdministrador(administrador: { _id: { toString(): string }; email: string; papel: "administrador"; mfaAtivo: boolean }): AdministradorAutenticado {
		return { id: administrador._id.toString(), email: administrador.email, papel: administrador.papel, mfaAtivo: administrador.mfaAtivo };
	}
}

export { NOME_COOKIE_SESSAO };
