import { z } from 'zod';

export const vectorSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  dimension: z.number().int().min(1, 'La dimensión debe ser al menos 1').max(100, 'Máximo 100 dimensiones'),
  values: z.array(z.number()).min(1, 'Debe ingresar al menos un valor'),
  source: z.enum(['manual', 'sales', 'inventory', 'targets']).default('manual'),
});

export type VectorForm = z.infer<typeof vectorSchema>;
