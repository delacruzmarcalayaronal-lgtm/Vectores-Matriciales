import { z } from 'zod';
import type { OperationType } from '../types';
import { operationTypes } from '../lib/operationTypes';

export const operationSchema = z.object({
  type: z.enum(operationTypes.map(t => t.value) as [OperationType, ...OperationType[]]),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  inputVectorIds: z.array(z.string()).default([]),
  inputMatrixIds: z.array(z.string()).default([]),
  parameters: z.record(z.unknown()).default({}),
});

export type OperationForm = z.infer<typeof operationSchema>;
