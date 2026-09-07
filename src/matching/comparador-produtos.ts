import { extrairAtributosProduto, possuiConflitoDeAtributos } from "./extrator-atributos.js";
import { obterTokensTitulo } from "./normalizador-titulo.js";
import type { ProdutoCandidato } from "../elasticsearch/repositorio-indice-produtos.js";

export interface AvaliacaoMatch {
	candidato: ProdutoCandidato;
	conflitoDeAtributo: boolean;
	similaridadeVetorial: number;
	similaridadeTextual: number;
	sobreposicaoTokens: number;
	scoreFinal: number;
}


export function avaliarCandidato(titulo: string, candidato: ProdutoCandidato, pesos: { vetor: number; texto: number; tokens: number }): AvaliacaoMatch {
	const tokens = obterTokensTitulo(titulo);
	const tokensCandidato = obterTokensTitulo(candidato.titulo);
	const intersecao = [...tokens].filter((token) => tokensCandidato.has(token)).length;
	const uniao = new Set([...tokens, ...tokensCandidato]).size;
	const sobreposicaoTokens = uniao ? intersecao / uniao : 0;
	const conflitoDeAtributo = possuiConflitoDeAtributos(extrairAtributosProduto(titulo), extrairAtributosProduto(candidato.titulo));
	// Combina os scores textual, vetorial e de tokens.
	const scoreFinal = conflitoDeAtributo ? 0 : candidato.scoreVetor * pesos.vetor + candidato.scoreTexto * pesos.texto + sobreposicaoTokens * pesos.tokens;
	return { candidato, conflitoDeAtributo, similaridadeVetorial: candidato.scoreVetor, similaridadeTextual: candidato.scoreTexto, sobreposicaoTokens, scoreFinal };
}

export function escolherMelhorMatch(avaliacoes: AvaliacaoMatch[], limiteMinimo: number): AvaliacaoMatch | null {
	// Mantém apenas os candidatos sem conflito e acima do limite mínimo.
	return avaliacoes.filter((item) => !item.conflitoDeAtributo).sort((a, b) => b.scoreFinal - a.scoreFinal).find((item) => item.scoreFinal >= limiteMinimo) ?? null;
}
