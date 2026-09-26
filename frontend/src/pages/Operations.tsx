import { useState } from 'react';
import { Search, Calculator, Play, Eye, Trash2, GitGraph, Minus, Plus as PlusIcon, Divide, RotateCcw, Layers } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Table, Badge, Modal } from '../components/ui/Table';
import { useVectors, useMatrices, useOperations, useExecuteOperation, useDeleteOperation } from '../hooks/useApi';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Operation, OperationType } from '../types';
import { operationSchema, type OperationForm } from '../schemas';
import { operationTypes } from '../lib/operationTypes';

export function Operations() {
  const [search, setSearch] = useState('');
  const [selectedVectors, setSelectedVectors] = useState<string[]>([]);
  const [selectedMatrices, setSelectedMatrices] = useState<string[]>([]);
  const [scalarValue, setScalarValue] = useState('');
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [executing, setExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [viewingOperation, setViewingOperation] = useState<Operation | null>(null);
  const [deletingOperation, setDeletingOperation] = useState<Operation | null>(null);

  const { data: vectors } = useVectors('1');
  const { data: matrices } = useMatrices('1');
  const { data: operations, isLoading, refetch } = useOperations('1');
  const executeOperation = useExecuteOperation('1');
  const deleteOperation = useDeleteOperation('1');

  const confirmDeleteOperation = async () => {
    if (!deletingOperation) return;
    try {
      await deleteOperation.mutateAsync(deletingOperation.id);
      setDeletingOperation(null);
      refetch();
    } catch (error) {
      console.error('Error deleting operation:', error);
    }
  };

  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OperationForm>({
    resolver: zodResolver(operationSchema) as Resolver<OperationForm>,
    defaultValues: {
      type: 'vector_add',
      name: '',
      inputVectorIds: [],
      inputMatrixIds: [],
      parameters: {},
    },
  });

  const selectedType = useWatch({ control, name: 'type' }) ?? 'vector_add';
  const selectedTypeConfig = operationTypes.find(t => t.value === selectedType) ?? operationTypes[0];

  const handleTypeChange = () => {
    setSelectedVectors([]);
    setSelectedMatrices([]);
    setScalarValue('');
    setWeights({});
    setValue('inputVectorIds', []);
    setValue('inputMatrixIds', []);
    setValue('parameters', {});
  };

  const handleVectorSelect = (id: string, checked: boolean) => {
    const max = selectedTypeConfig.maxInputs;
    if (checked) {
      if (max && selectedVectors.length >= max) return;
      setSelectedVectors([...selectedVectors, id]);
    } else {
      setSelectedVectors(selectedVectors.filter(v => v !== id));
    }
    setValue('inputVectorIds', selectedVectors);
  };

  const handleMatrixSelect = (id: string, checked: boolean) => {
    const max = selectedTypeConfig.maxInputs;
    if (checked) {
      if (max && selectedMatrices.length >= max) return;
      setSelectedMatrices([...selectedMatrices, id]);
    } else {
      setSelectedMatrices(selectedMatrices.filter(m => m !== id));
    }
    setValue('inputMatrixIds', selectedMatrices);
  };

  const handleWeightChange = (vectorId: string, value: string) => {
    setWeights(prev => ({ ...prev, [vectorId]: value }));
    setValue('parameters', { ...getValues('parameters'), weights: { ...weights, [vectorId]: parseFloat(value) || 0 } });
  };

  const onExecute = async (data: OperationForm) => {
    setExecuting(true);
    try {
      const params = { ...data.parameters };
      if (selectedTypeConfig.inputs === 'vector-scalar' && scalarValue) {
        params.scalar = parseFloat(scalarValue);
      }
      if (selectedType === 'linear_combination') {
        params.weights = weights;
      }
      const result = await executeOperation.mutateAsync({
        ...data,
        parameters: params,
      });
      setLastResult(result);
      refetch();
    } catch (error) {
      console.error('Error executing operation:', error);
    } finally {
      setExecuting(false);
    }
  };

  const filteredOperations = operations?.data.filter(op =>
    op.name.toLowerCase().includes(search.toLowerCase()) ||
    op.type.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const getTypeIcon = (type: OperationType) => {
    switch (type) {
      case 'vector_add': return <PlusIcon className="w-4 h-4" />;
      case 'vector_subtract': return <Minus className="w-4 h-4" />;
      case 'vector_scalar_multiply': return <Calculator className="w-4 h-4" />;
      case 'vector_dot_product': return <Divide className="w-4 h-4" />;
      case 'matrix_add': return <PlusIcon className="w-4 h-4" />;
      case 'matrix_subtract': return <Minus className="w-4 h-4" />;
      case 'matrix_multiply': return <Calculator className="w-4 h-4" />;
      case 'matrix_transpose': return <RotateCcw className="w-4 h-4" />;
      case 'matrix_scalar_multiply': return <Calculator className="w-4 h-4" />;
      case 'linear_combination': return <Layers className="w-4 h-4" />;
      default: return <Calculator className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: Operation['status']) => {
    switch (status) {
      case 'completed': return <Badge variant="success">Completada</Badge>;
      case 'pending': return <Badge variant="warning">Pendiente</Badge>;
      case 'failed': return <Badge variant="danger">Fallida</Badge>;
      default: return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Operaciones Matemáticas</h1>
          <p className="text-secondary mt-1">Ejecuta operaciones de álgebra lineal sobre vectores y matrices</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Nueva Operación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit(onExecute)}>
              <Select
                label="Tipo de Operación"
                {...register('type', { onChange: handleTypeChange })}
                error={errors.type?.message}
                options={operationTypes.map(t => ({ value: t.value, label: t.label }))}
              />

              <Input label="Nombre" {...register('name')} error={errors.name?.message} placeholder="Ventas vs Metas Septiembre" />
              <Input label="Descripción" {...register('description')} placeholder="Diferencia entre ventas reales y metas" />

              {selectedTypeConfig.inputs === 'vectors' || selectedTypeConfig.inputs === 'both' || selectedTypeConfig.inputs === 'vector-scalar' ? (
                <div>
                  <label className="block text-sm font-medium text-text mb-2">Vectores ({selectedVectors.length}/{selectedTypeConfig.maxInputs || '∞'})</label>
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {vectors?.map(v => (
                      <label key={v.id} className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedVectors.includes(v.id)}
                          onChange={e => handleVectorSelect(v.id, e.target.checked)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                          disabled={!selectedVectors.includes(v.id) && !!selectedTypeConfig.maxInputs && selectedVectors.length >= selectedTypeConfig.maxInputs}
                        />
                        <span className="font-medium">{v.name}</span>
                        <span className="text-xs text-secondary ml-auto">[{v.values.slice(0, 3).join(', ')}{v.values.length > 3 ? '...' : ''}]</span>
                      </label>
                    ))}
                    {vectors?.length === 0 && <p className="text-sm text-secondary">No hay vectores disponibles</p>}
                  </div>
                </div>
              ) : null}

              {selectedTypeConfig.inputs === 'matrices' || selectedTypeConfig.inputs === 'both' ? (
                <div>
                  <label className="block text-sm font-medium text-text mb-2">Matrices ({selectedMatrices.length}/{selectedTypeConfig.maxInputs || '∞'})</label>
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {matrices?.map(m => (
                      <label key={m.id} className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedMatrices.includes(m.id)}
                          onChange={e => handleMatrixSelect(m.id, e.target.checked)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                          disabled={!selectedMatrices.includes(m.id) && !!selectedTypeConfig.maxInputs && selectedMatrices.length >= selectedTypeConfig.maxInputs}
                        />
                        <span className="font-medium">{m.name}</span>
                        <span className="text-xs text-secondary ml-auto">{m.rows}×{m.cols}</span>
                      </label>
                    ))}
                    {matrices?.length === 0 && <p className="text-sm text-secondary">No hay matrices disponibles</p>}
                  </div>
                </div>
              ) : null}

              {selectedTypeConfig.inputs === 'vector-scalar' && (
                <Input label="Valor Escalar" type="number" step="any" value={scalarValue} onChange={e => setScalarValue(e.target.value)} placeholder="2.5" />
              )}

              {selectedType === 'linear_combination' && selectedVectors.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-text mb-2">Pesos para Combinación Lineal</label>
                  <div className="space-y-2">
                    {selectedVectors.map(vId => {
                      const vector = vectors?.find(v => v.id === vId);
                      return vector ? (
                        <div key={vId} className="flex items-center gap-2">
                          <span className="w-40 font-medium">{vector.name}</span>
                          <Input
                            type="number"
                            step="any"
                            value={weights[vId] || ''}
                            onChange={e => handleWeightChange(vId, e.target.value)}
                            placeholder="Peso"
                          />
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="submit" loading={isSubmitting || executing} leftIcon={<Play className="w-4 h-4" />} className="w-full">
                  Ejecutar Operación
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <GitGraph className="w-5 h-5" />
                Historial de Operaciones
              </CardTitle>
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                <input
                  type="text"
                  placeholder="Buscar operación..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table
              data={filteredOperations}
              columns={[
                { key: 'type', header: 'Tipo', render: (row) => (
                  <span className="flex items-center gap-2">
                    {getTypeIcon(row.type)}
                    <span className="font-mono text-sm">{row.type}</span>
                  </span>
                )},
                { key: 'name', header: 'Nombre' },
                { key: 'description', header: 'Descripción', render: (row) => row.description || '-' },
                { key: 'inputs', header: 'Entradas', render: (row) => (
                  <div className="flex items-center gap-1 text-sm">
                    {row.inputVectors.length > 0 && <Badge variant="primary">{row.inputVectors.length} Vectores</Badge>}
                    {row.inputMatrices.length > 0 && <Badge variant="accent">{row.inputMatrices.length} Matrices</Badge>}
                  </div>
                )},
                { key: 'status', header: 'Estado', render: (row) => getStatusBadge(row.status) },
                { key: 'executionTime', header: 'Tiempo', render: (row) => `${row.executionTimeMs} ms` },
                { key: 'createdAt', header: 'Fecha', render: (row) => new Date(row.createdAt).toLocaleString('es-PE') },
                { key: 'actions', header: 'Acciones', render: (row) => (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setViewingOperation(row)}
                      className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-gray-100 transition-colors"
                      aria-label="Ver detalle"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingOperation(row)}
                      className="p-2 rounded-lg text-secondary hover:text-danger hover:bg-gray-100 transition-colors"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )},
              ]}
              keyExtractor={row => row.id}
              isLoading={isLoading}
              emptyMessage="No se han ejecutado operaciones"
            />
          </CardContent>
        </Card>
      </div>

      {lastResult && (
        <Modal
          isOpen={!!lastResult}
          onClose={() => setLastResult(null)}
          title="Resultado de la Operación"
          size="lg"
        >
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">Operación ejecutada exitosamente</p>
              <p className="text-sm text-green-600 mt-1">Tiempo de ejecución: {lastResult.executionTimeMs} ms</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLastResult(null)}>Cerrar</Button>
            </div>
          </div>
        </Modal>
      )}

      {viewingOperation && (
        <Modal
          isOpen={!!viewingOperation}
          onClose={() => setViewingOperation(null)}
          title="Detalle de la Operación"
          description={`${operationTypes.find(t => t.value === viewingOperation.type)?.label ?? viewingOperation.type} — ${viewingOperation.name}`}
          size="lg"
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><span className="text-secondary">Estado:</span> {getStatusBadge(viewingOperation.status)}</div>
              <div><span className="text-secondary">Tiempo:</span> <span className="font-mono">{viewingOperation.executionTimeMs} ms</span></div>
              <div><span className="text-secondary">Fecha:</span> {new Date(viewingOperation.createdAt).toLocaleString('es-PE')}</div>
              <div><span className="text-secondary">Descripción:</span> {viewingOperation.description || '—'}</div>
            </div>

            {viewingOperation.errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                {viewingOperation.errorMessage}
              </div>
            )}

            <div>
              <p className="font-medium mb-1">Parámetros</p>
              <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-auto max-h-40">{JSON.stringify(viewingOperation.parameters ?? {}, null, 2)}</pre>
            </div>

            <div>
              <p className="font-medium mb-1">Resultados</p>
              <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-auto max-h-32">{JSON.stringify({
                estado: viewingOperation.status,
                error: viewingOperation.errorMessage ?? null,
                vectorResultado: viewingOperation.resultVectorId ?? null,
                matrizResultado: viewingOperation.resultMatrixId ?? null,
              }, null, 2)}</pre>
            </div>

            <div>
              <p className="font-medium mb-1">Entradas</p>
              <pre className="bg-gray-50 p-3 rounded-lg text-xs overflow-auto max-h-40">{JSON.stringify({ vectores: viewingOperation.inputVectors, matrices: viewingOperation.inputMatrices }, null, 2)}</pre>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setViewingOperation(null)}>Cerrar</Button>
            </div>
          </div>
        </Modal>
      )}

      <Modal
        isOpen={!!deletingOperation}
        onClose={() => setDeletingOperation(null)}
        title="Eliminar Operación"
        description={`¿Estás seguro de eliminar la operación "${deletingOperation?.name}"? Esta acción no se puede deshacer.`}
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setDeletingOperation(null)}>Cancelar</Button>
          <Button variant="danger" onClick={confirmDeleteOperation} loading={deleteOperation.isPending}>Eliminar</Button>
        </div>
      </Modal>
    </div>
  );
}