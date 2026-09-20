import { configuracaoAplicacao } from "../config/aplicacao.config.js";
import type { TelegramConfig } from "../configuracoes/servico-configuracao-scraping.js";

interface ProdutoAlerta {
	titulo: string;
	preco: number;
	media: number;
	url?: string;
}

export class ServicoNotificacaoTelegram {
	async notificarProdutos(configuracao: TelegramConfig, produtos: ProdutoAlerta[]): Promise<void> {
		const token = configuracao.habilitado ? configuracaoAplicacao.telegram.botToken : "";
		if (!token || !configuracao.chatId || !produtos.length) return;
		for (const produto of produtos) await this.enviarMensagem(token, configuracao.chatId, this.formatarMensagem(configuracao, produto), configuracao.formato.previewLink);
	}

	async testarProduto(configuracao: TelegramConfig, produto: ProdutoAlerta): Promise<void> {
		const token = configuracaoAplicacao.telegram.botToken;
		if (!token) throw new Error("Configure TELEGRAM_BOT_TOKEN antes de testar");
		if (!configuracao.chatId) throw new Error("Informe o chat ID do Telegram antes de testar");
		await this.enviarMensagem(token, configuracao.chatId, this.formatarMensagem(configuracao, produto, "Teste de envio do Telegram"), configuracao.formato.previewLink);
	}

	private formatarMensagem(configuracao: TelegramConfig, produto: ProdutoAlerta, prefixoTeste?: string): string {
		const percentualAbaixoMedia = produto.media > 0
			? ((produto.media - produto.preco) / produto.media) * 100
			: 0;
		const valores: Record<string, string> = {
			titulo: produto.titulo,
			preco: `R$ ${produto.preco.toFixed(2).replace(".", ",")}`,
			media: `R$ ${produto.media.toFixed(2).replace(".", ",")}`,
			percentual: `${percentualAbaixoMedia.toFixed(2).replace(".", ",")}% abaixo da média`,
			url: this.normalizarUrl(produto.url),
		};
		let template = configuracao.formato.templateHtml;
		if (!template || template.includes("**")) {
			template = template.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
		}
		template = template.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
		template = prefixoTeste ? `<b>${this.escaparHtml(prefixoTeste)}</b>\n${template}` : template;
		const mensagem = template.replace(/{{\s*(titulo|preco|media|percentual|url)\s*}}/g, (_match, chave: string) => this.escaparHtml(valores[chave] ?? ""));
		return mensagem.length > configuracao.formato.maxCaracteres ? `${mensagem.slice(0, Math.max(0, configuracao.formato.maxCaracteres - 1))}…` : mensagem;
	}

	private escaparHtml(valor: string): string {
		return valor.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
	}

	private normalizarUrl(url: string | undefined): string {
		if (!url) return "";
		return url.replace(/\d+:\d+$/, "");
	}

	private async enviarMensagem(token: string, chatId: string, mensagem: string, previewLink: boolean): Promise<void> {
		const resposta = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ chat_id: chatId, text: mensagem, parse_mode: "HTML", disable_web_page_preview: !previewLink }),
		});
		if (!resposta.ok) throw new Error(`Telegram recusou a mensagem (HTTP ${resposta.status})`);
		const dados = await resposta.json() as { ok?: boolean; description?: string };
		if (!dados.ok) throw new Error(dados.description ?? "Telegram recusou a mensagem");
	}
}
