import { z } from 'zod';

export const saleDetailSchema = z.object({
  productId: z.string().min(1, 'Seleccione un producto'),
  quantity: z.number({ invalid_type_error: 'Cantidad inválida' }).int('Cantidad debe ser entera').min(1, 'Cantidad mínima 1'),
  unitPrice: z.number({ invalid_type_error: 'Precio inválido' }).min(0, 'El precio debe ser mayor o igual a 0'),
  discount: z.number({ invalid_type_error: 'Descuento inválido' }).min(0, 'El descuento debe ser mayor o igual a 0').default(0),
});

export const saleSchema = z.object({
  branchId: z.string().min(1, 'Seleccione una sucursal'),
  status: z.enum(['draft', 'confirmed', 'cancelled']).default('confirmed'),
  notes: z.string().optional(),
  details: z.array(saleDetailSchema).min(1, 'Agregue al menos un producto'),
});

export type SaleForm = z.infer<typeof saleSchema>;
export type SaleDetailForm = z.infer<typeof saleDetailSchema>;
