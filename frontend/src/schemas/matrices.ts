import { z } from 'zod';

export const matrixSchema = z
  .object({
    name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    description: z.string().optional(),
    rows: z.number().int().min(1, 'Debe tener al menos 1 fila').max(50, 'Máximo 50 filas'),
    cols: z.number().int().min(1, 'Debe tener al menos 1 columna').max(50, 'Máximo 50 columnas'),
    rowLabels: z.array(z.string()).optional(),
    colLabels: z.array(z.string()).optional(),
    values: z.array(z.array(z.number())).min(1, 'Debe ingresar valores'),
    source: z.enum(['manual', 'sales', 'inventory', 'targets']).default('manual'),
  })
  .superRefine((data, ctx) => {
    if (data.values.length !== data.rows) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['values'],
        message: `La matriz tiene ${data.values.length} filas de datos pero declara ${data.rows}`,
      });
    }
    data.values.forEach((row, i) => {
      if (row.length !== data.cols) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['values', i],
          message: `La fila ${i + 1} tiene ${row.length} columnas pero la matriz declara ${data.cols}`,
        });
      }
    });
    if (data.rowLabels && data.rowLabels.length !== data.rows) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rowLabels'],
        message: 'Las etiquetas de fila no coinciden con el número de filas',
      });
    }
    if (data.colLabels && data.colLabels.length !== data.cols) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['colLabels'],
        message: 'Las etiquetas de columna no coinciden con el número de columnas',
      });
    }
  });

export type MatrixForm = z.infer<typeof matrixSchema>;
