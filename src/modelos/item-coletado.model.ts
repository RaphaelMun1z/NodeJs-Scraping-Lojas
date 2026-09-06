import { z } from "zod";

export const esquemaItemColetado = z.object({
  titulo: z.string().min(1),
  preco: z.number().nonnegative().optional(),
  imagemUrl: z.string().url().optional(),
  url: z.string().optional(),
});

export type ItemColetado = z.infer<typeof esquemaItemColetado>;
