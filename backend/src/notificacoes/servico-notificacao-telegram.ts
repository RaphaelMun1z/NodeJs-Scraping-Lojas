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
		const mensagens = produtos.map((produto) => [
			`🔥 ${produto.titulo}`,
			`Preço: R$ ${produto.preco.toFixed(2).replace(".", ",")}`,
			`Média: R$ ${produto.media.toFixed(2).replace(".", ",")}`,
			`${configuracao.percentualAbaixoMedia}% abaixo da média`,
			produto.url ?? "",
		].filter(Boolean).join("\n"));
		for (const mensagem of mensagens) {
			const resposta = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ chat_id: configuracao.chatId, text: mensagem }),
			});
			if (!resposta.ok) throw new Error(`Telegram recusou a mensagem (HTTP ${resposta.status})`);
			const dados = await resposta.json() as { ok?: boolean; description?: string };
			if (!dados.ok) throw new Error(dados.description ?? "Telegram recusou a mensagem");
		}
	}
}
