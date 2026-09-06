export class ClienteHttp {
  constructor(
    private readonly tempoLimiteMs: number,
    private readonly agenteUsuario: string,
  ) {}

  async obterHtml(url: string): Promise<string> {
    const controlador = new AbortController();

    // Interrompe a requisição caso ultrapasse o tempo configurado.
    const temporizador = setTimeout(
      () => controlador.abort(),
      this.tempoLimiteMs,
    );

    try {
      const resposta = await fetch(url, {
        signal: controlador.signal,
        headers: {
          "user-agent": this.agenteUsuario,
          accept: "text/html,application/xhtml+xml",
        },
      });

      if (!resposta.ok) {
        throw new Error(
          `Falha ao carregar a página. HTTP ${resposta.status} ${resposta.statusText}`,
        );
      }

      return await resposta.text();
    } finally {
      // Evita manter o temporizador ativo após o fim da requisição.
      clearTimeout(temporizador);
    }
  }
}
