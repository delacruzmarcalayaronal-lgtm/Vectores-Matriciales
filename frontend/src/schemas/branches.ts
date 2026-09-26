import { z } from 'zod';

export const branchSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  code: z.string().min(2, 'El código debe tener al menos 2 caracteres').max(10, 'Máximo 10 caracteres'),
  address: z.string().min(5, 'La dirección es requerida'),
  city: z.string().min(2, 'La ciudad es requerida'),
  country: z.string().min(2, 'El país es requerido'),
  phone: z.string().optional(),
  isActive: z.boolean().default(true),
});

export type BranchForm = z.infer<typeof branchSchema>;
