import { z } from 'zod';

export const matrixSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  rows: z.number().int().min(1, 'Debe tener al menos 1 fila').max(50, 'Máximo 50 filas'),
  cols: z.number().int().min(1, 'Debe tener al menos 1 columna').max(50, 'Máximo 50 columnas'),
  rowLabels: z.array(z.string()).optional(),
  colLabels: z.array(z.string()).optional(),
  values: z.array(z.array(z.number())).min(1, 'Debe ingresar valores'),
  source: z.enum(['manual', 'sales', 'inventory', 'targets']).default('manual'),
});

export type MatrixForm = z.infer<typeof matrixSchema>;
