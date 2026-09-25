import type { OperationType } from '../types';

export interface OperationTypeMeta {
  value: OperationType;
  label: string;
  description: string;
  inputs: 'vectors' | 'matrices' | 'both' | 'vector-scalar';
  minInputs: number;
  maxInputs?: number;
}

export const operationTypes: OperationTypeMeta[] = [
  { value: 'vector_add', label: 'Suma de Vectores', description: 'Suma elemento a elemento de dos o más vectores', inputs: 'vectors', minInputs: 2 },
  { value: 'vector_subtract', label: 'Resta de Vectores', description: 'Resta elemento a elemento (A - B)', inputs: 'vectors', minInputs: 2, maxInputs: 2 },
  { value: 'vector_scalar_multiply', label: 'Multiplicación por Escalar (Vector)', description: 'Multiplica cada componente del vector por un escalar', inputs: 'vector-scalar', minInputs: 1, maxInputs: 1 },
  { value: 'vector_dot_product', label: 'Producto Escalar (Vector)', description: 'Producto punto de dos vectores (resultado escalar)', inputs: 'vectors', minInputs: 2, maxInputs: 2 },
  { value: 'matrix_add', label: 'Suma de Matrices', description: 'Suma elemento a elemento de matrices de mismas dimensiones', inputs: 'matrices', minInputs: 2 },
  { value: 'matrix_subtract', label: 'Resta de Matrices', description: 'Resta elemento a elemento (A - B)', inputs: 'matrices', minInputs: 2, maxInputs: 2 },
  { value: 'matrix_multiply', label: 'Multiplicación de Matrices', description: 'Producto matricial A × B (columnas A = filas B)', inputs: 'matrices', minInputs: 2 },
  { value: 'matrix_transpose', label: 'Transposición de Matriz', description: 'Intercambia filas por columnas', inputs: 'matrices', minInputs: 1, maxInputs: 1 },
  { value: 'matrix_scalar_multiply', label: 'Multiplicación por Escalar (Matriz)', description: 'Multiplica cada elemento de la matriz por un escalar', inputs: 'vector-scalar', minInputs: 1, maxInputs: 1 },
  { value: 'linear_combination', label: 'Combinación Lineal', description: 'Combinación ponderada de vectores: Σ(αᵢ × vᵢ)', inputs: 'vectors', minInputs: 2 },
];
