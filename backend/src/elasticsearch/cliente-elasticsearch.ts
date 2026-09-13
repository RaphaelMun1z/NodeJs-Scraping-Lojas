import { Client } from "@elastic/elasticsearch";
import { configuracaoMatching } from "../matching/configuracao-matching.js";

export function criarClienteElasticsearch(): Client {
	return new Client({
		node: configuracaoMatching.url,
		...(configuracaoMatching.chaveApi ? { auth: { apiKey: configuracaoMatching.chaveApi } } : {}),
	});
}
