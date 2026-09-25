import { z } from 'zod';

export const linearComboSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  vectorIds: z.array(z.string()).min(2, 'Seleccione al menos 2 vectores'),
  weights: z.record(z.number()).default({}),
});

export type LinearComboForm = z.infer<typeof linearComboSchema>;
