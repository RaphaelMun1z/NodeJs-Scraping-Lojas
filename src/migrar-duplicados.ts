import "dotenv/config";
import mongoose from "mongoose";
import { configuracaoAplicacao } from "./config/aplicacao.config.js";
import { ModeloHistoricoPreco } from "./banco/modelos/historico-preco.model.js";
import { ModeloItemBanco } from "./banco/modelos/item-banco.model.js";
import { gerarChaveItem } from "./utilitarios/chave-item.js";

type ItemExistente = {
	_id: mongoose.Types.ObjectId;
	chave: string;
	fonte: string;
	titulo: string;
	url?: string;
	ativo?: boolean;
	ultimaColetaEm: Date;
};

async function executar(): Promise<void> {
	await mongoose.connect(configuracaoAplicacao.banco.uri);
	const itens = (await ModeloItemBanco.find()
		.select("_id chave fonte titulo url ativo ultimaColetaEm")
		.lean()
		.exec()) as unknown as ItemExistente[];

	const grupos = new Map<string, ItemExistente[]>();
	for (const item of itens) {
		const chaveCanonica = gerarChaveItem({
			fonte: item.fonte,
			titulo: item.titulo,
			url: item.url,
		});
		const grupo = grupos.get(chaveCanonica) ?? [];
		grupo.push(item);
		grupos.set(chaveCanonica, grupo);
	}

	let removidos = 0;
	for (const grupo of grupos.values()) {
		if (grupo.length < 2) continue;

		grupo.sort((a, b) => {
			if (a.ativo !== b.ativo) return a.ativo ? -1 : 1;
			return new Date(b.ultimaColetaEm).getTime() - new Date(a.ultimaColetaEm).getTime();
		});
		const [mantido, ...duplicados] = grupo;
		if (!mantido) continue;

		const chavesDuplicadas = duplicados.map((item) => item.chave);
		await ModeloHistoricoPreco.updateMany(
			{ chaveProduto: { $in: chavesDuplicadas } },
			{ $set: { chaveProduto: mantido.chave } },
		).exec();
		await ModeloItemBanco.deleteMany({
			_id: { $in: duplicados.map((item) => item._id) },
		}).exec();
		removidos += duplicados.length;
	}

	console.log(`Duplicados removidos: ${removidos}`);
	await mongoose.disconnect();
}

executar().catch(async (erro) => {
	console.error(erro);
	await mongoose.disconnect();
	process.exitCode = 1;
});
