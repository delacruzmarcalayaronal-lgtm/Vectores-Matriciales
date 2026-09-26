import { z } from 'zod';

export const targetSchema = z.object({
  branchId: z.string().optional(),
  productId: z.string().optional(),
  period: z.string().min(1, 'El periodo es requerido (ej. 2026-09)'),
  targetValue: z
    .number({ invalid_type_error: 'Valor inválido' })
    .min(0, 'El valor debe ser mayor o igual a 0'),
  achievedValue: z
    .number({ invalid_type_error: 'Valor inválido' })
    .min(0, 'El valor debe ser mayor o igual a 0')
    .default(0),
  type: z.enum(['sales', 'units', 'revenue']).default('revenue'),
});

export type TargetForm = z.infer<typeof targetSchema>;
