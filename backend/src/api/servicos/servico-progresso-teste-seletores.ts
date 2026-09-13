import type { Response } from "express";

export interface EventoProgressoTeste {
  execucaoId: string;
  etapa: string;
  mensagem: string;
  paginaAtual?: number;
  maxPaginas?: number;
  produtosPagina?: number;
  produtosTotal?: number;
  tempoDecorridoMs: number;
}

export class ServicoProgressoTesteSeletores {
  private readonly streams = new Map<string, Set<Response>>();
  private readonly expiracoes = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();

  criar(execucaoId: string): void {
    if (!this.streams.has(execucaoId)) this.streams.set(execucaoId, new Set());
    const expiracao = this.expiracoes.get(execucaoId);
    if (expiracao) clearTimeout(expiracao);
    this.expiracoes.delete(execucaoId);
  }

  assinar(execucaoId: string, resposta: Response): () => void {
    const assinantes = this.streams.get(execucaoId) ?? new Set<Response>();
    this.streams.set(execucaoId, assinantes);
    resposta.status(200).set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    resposta.flushHeaders();
    assinantes.add(resposta);
    resposta.write(": conectado\n\n");
    return () => assinantes.delete(resposta);
  }

  emitir(evento: EventoProgressoTeste): void {
    for (const resposta of this.streams.get(evento.execucaoId) ?? [])
      resposta.write(`event: progresso\ndata: ${JSON.stringify(evento)}\n\n`);
  }

  finalizar(execucaoId: string, evento: EventoProgressoTeste): void {
    for (const resposta of this.streams.get(execucaoId) ?? []) {
      resposta.write(`event: finalizado\ndata: ${JSON.stringify(evento)}\n\n`);
      resposta.end();
    }
    this.streams.delete(execucaoId);
    const expiracao = setTimeout(
      () => this.expiracoes.delete(execucaoId),
      60_000,
    );
    this.expiracoes.set(execucaoId, expiracao);
  }

  cancelar(execucaoId: string): void {
    for (const resposta of this.streams.get(execucaoId) ?? []) resposta.end();
    this.streams.delete(execucaoId);
    const expiracao = this.expiracoes.get(execucaoId);
    if (expiracao) clearTimeout(expiracao);
    this.expiracoes.delete(execucaoId);
  }
}
