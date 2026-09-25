import { z } from 'zod';

export const productSchema = z.object({
  sku: z.string().min(2, 'El SKU debe tener al menos 2 caracteres').max(20, 'Máximo 20 caracteres'),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Seleccione una categoría'),
  unitPrice: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  costPrice: z.number().min(0, 'El costo debe ser mayor o igual a 0'),
  stock: z.number().int().min(0, 'El stock debe ser un número entero positivo').default(0),
  minStock: z.number().int().min(0, 'El stock mínimo debe ser un número entero positivo').default(5),
  unit: z.string().min(1, 'La unidad es requerida').default('unidad'),
  isActive: z.boolean().default(true),
});

export type ProductForm = z.infer<typeof productSchema>;
