import { z } from 'zod';

const roleEnum = z.enum(['admin', 'manager', 'analyst', 'operator', 'consulta'], {
  errorMap: () => ({ message: 'Rol inválido' }),
});

export const userSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  dni: z.string().min(7, 'El DNI debe tener al menos 7 dígitos').max(10, 'Máximo 10 dígitos'),
  role: roleEnum,
});

export const userCreateSchema = userSchema.extend({
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export const userUpdateSchema = userSchema.extend({
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .optional()
    .or(z.literal('')),
});

export type UserForm = z.infer<typeof userSchema>;
export type UserCreateForm = z.infer<typeof userCreateSchema>;
export type UserUpdateForm = z.infer<typeof userUpdateSchema>;
