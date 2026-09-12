import { z } from "zod";

export const esquemaItemColetado = z.object({
	fonte: z.string().min(1),
	categoria: z.string().trim().min(1),
	titulo: z.string().min(1),
	preco: z.number().nonnegative().optional(),
	precoAntigo: z.number().nonnegative().optional(),
	imagemUrl: z.string().url().optional(),
	url: z.string().optional(),
});

export type ItemColetado = z.infer<typeof esquemaItemColetado>;
