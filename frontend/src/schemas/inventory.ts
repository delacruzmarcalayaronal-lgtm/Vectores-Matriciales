import { z } from 'zod';

export const movementSchema = z.object({
  branchId: z.string().min(1, 'Seleccione una sucursal'),
  productId: z.string().min(1, 'Seleccione un producto'),
  type: z.enum(['in', 'out', 'adjustment', 'transfer'], {
    errorMap: () => ({ message: 'Tipo de movimiento inválido' }),
  }),
  quantity: z
    .number({ invalid_type_error: 'Cantidad inválida' })
    .int('La cantidad debe ser un entero')
    .min(1, 'La cantidad mínima es 1'),
  reference: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().optional(),
});

export type MovementForm = z.infer<typeof movementSchema>;
