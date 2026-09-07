const STOPWORDS = new Set(["de", "da", "do", "com", "para", "e", "o", "a", "em", "no", "na"]);

export function normalizarTituloProduto(titulo: string): string {
	// Remove diferenças de caixa, acentuação, unidades e pontuação.
	return titulo
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/(\d)\s+(gb|tb|mb|ram|hz|v|w|pol|polegadas|\")/g, "$1$2")
		.replace(/[^a-z0-9.]+/g, " ")
		.replace(/\s+/g, " ")
		.trim();
}

export function obterTokensTitulo(titulo: string): Set<string> {
	return new Set(normalizarTituloProduto(titulo).split(" ").filter((token) => token && !STOPWORDS.has(token)));
}
