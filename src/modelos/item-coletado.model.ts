import { z } from "zod";

export const esquemaItemColetado = z.object({
  titulo: z.string().min(1),
  descricao: z.string().optional(),
  url: z.string().optional(),
});

export type ItemColetado = z.infer<typeof esquemaItemColetado>;
