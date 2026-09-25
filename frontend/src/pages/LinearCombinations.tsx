import { useState } from 'react';
import { Plus, Calculator, SlidersHorizontal, Target, Copy, Download } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { useVectors, useExecuteOperation } from '../hooks/useApi';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { linearComboSchema, type LinearComboForm } from '../schemas';

export function LinearCombinations() {
  const [search, _setSearch] = useState('');
  const [selectedVectors, setSelectedVectors] = useState<string[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [_isModalOpen, setIsModalOpen] = useState(false);
  const [viewingResult, setViewingResult] = useState<any>(null);

  const { data: vectors } = useVectors('1');
  const executeOperation = useExecuteOperation('1');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LinearComboForm>({
    resolver: zodResolver(linearComboSchema) as Resolver<LinearComboForm>,
  });

  const filteredVectors = (vectors || []).filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleVectorSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedVectors([...selectedVectors, id]);
      setWeights(prev => ({ ...prev, [id]: 1 }));
    } else {
      setSelectedVectors(selectedVectors.filter(v => v !== id));
      setWeights(prev => { const n = { ...prev }; delete n[id]; return n; });
    }
    setValue('vectorIds', selectedVectors);
    setValue('weights', weights);
  };

  const handleWeightChange = (id: string, value: string) => {
    const num = parseFloat(value) || 0;
    setWeights(prev => ({ ...prev, [id]: num }));
    setValue('weights', { ...weights, [id]: num });
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const onSubmit = async (data: LinearComboForm) => {
    try {
      const result = await executeOperation.mutateAsync({
        type: 'linear_combination',
        name: data.name,
        description: data.description,
        inputVectorIds: data.vectorIds,
        inputMatrixIds: [],
        parameters: { weights: data.weights },
      });
      setViewingResult(result);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error executing linear combination:', error);
    }
  };

  const getResultVector = (): number[] | null => {
    if (!viewingResult || !vectors) return null;
    const selectedVecs = selectedVectors.map(id => vectors.find(v => v.id === id));
    if (selectedVecs.some(v => !v)) return null;
    
    const dim = selectedVecs[0]!.dimension;
    const result = new Array(dim).fill(0);
    
    selectedVecs.forEach((vec, _i) => {
      const weight = weights[vec!.id] || 0;
      vec!.values.forEach((val, j) => {
        result[j] += weight * val;
      });
    });
    
    return result;
  };

  const resultVector = getResultVector();

  const copyResult = () => {
    if (resultVector) {
      navigator.clipboard.writeText(resultVector.join(', '));
    }
  };

  const downloadResult = () => {
    if (resultVector) {
      const content = `Combinación Lineal\nVectores: ${selectedVectors.map(id => vectors?.find(v => v.id === id)?.name).join(', ')}\nPesos: ${Object.entries(weights).map(([id, w]) => `${vectors?.find(v => v.id === id)?.name}: ${w}`).join(', ')}\nResultado: [${resultVector.join(', ')}]`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'combinacion_lineal.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Combinaciones Lineales</h1>
          <p className="text-secondary mt-1">Indicadores ponderados: Σ(αᵢ × vᵢ) para análisis empresarial</p>
        </div>
        <Button onClick={openModal} leftIcon={<Plus className="w-4 h-4" />}>
          Nueva Combinación
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5" />
              Configuración
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit(onSubmit)}>
              <Input label="Nombre" {...register('name')} error={errors.name?.message} placeholder="Indicador Ventas Ponderado" />
              <Input label="Descripción" {...register('description')} placeholder="Combinación ponderada de ventas por sucursal" />
              
              <div>
                <label className="block text-sm font-medium text-text mb-2">Vectores ({selectedVectors.length} seleccionados)</label>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {filteredVectors.map(v => (
                    <label key={v.id} className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedVectors.includes(v.id)}
                        onChange={e => handleVectorSelect(v.id, e.target.checked)}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{v.name}</p>
                        <p className="text-xs text-secondary">[{v.values.slice(0, 5).join(', ')}{v.values.length > 5 ? '...' : ''}]</p>
                      </div>
                    </label>
                  ))}
                  {vectors?.length === 0 && <p className="text-sm text-secondary">No hay vectores disponibles</p>}
                </div>
              </div>

              {selectedVectors.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-text mb-2">Pesos (αᵢ)</label>
                  <div className="space-y-2">
                    {selectedVectors.map(id => {
                      const vec = vectors?.find(v => v.id === id);
                      return vec ? (
                        <div key={id} className="flex items-center gap-2">
                          <span className="w-40 font-medium truncate">{vec.name}</span>
                          <Input
                            type="number"
                            step="0.1"
                            value={weights[id] || 1}
                            onChange={e => handleWeightChange(id, e.target.value)}
                            placeholder="1.0"
                          />
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-border">
                <Button type="submit" className="w-full" loading={isSubmitting || executeOperation.isPending} leftIcon={<Calculator className="w-4 h-4" />}>
                  Calcular Combinación Lineal
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Resultado de la Combinación Lineal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {resultVector ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 font-medium">Combinación calculada exitosamente</p>
                  <p className="text-sm text-green-600 mt-1">
                    Dimensión: {resultVector.length} | Vectores: {selectedVectors.length}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary mb-2">Vector Resultante</label>
                  <div className="font-mono text-sm bg-gray-50 p-4 rounded-lg max-h-60 overflow-auto">
                    [{resultVector.map((v, i) => (
                      <span key={i} className="block">{i}: {v.toFixed(4)}</span>
                    ))}]
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={copyResult} leftIcon={<Copy className="w-4 h-4" />}>Copiar</Button>
                  <Button variant="outline" onClick={downloadResult} leftIcon={<Download className="w-4 h-4" />}>Descargar</Button>
                </div>

                {selectedVectors.length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <h4 className="font-medium text-text mb-3">Detalle del Cálculo</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-secondary border-b border-border">
                            <th className="pb-2">Índice</th>
                            {selectedVectors.map((id, _i) => {
                              const vec = vectors?.find(v => v.id === id);
                              const weight = weights[id] || 0;
                              return <th key={id} className="pb-2 px-2">{vec?.name} (×{weight})</th>;
                            })}
                            <th className="pb-2">Resultado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resultVector.map((_, idx) => (
                            <tr key={idx} className="border-b border-border/50">
                              <td className="py-2 font-mono text-secondary">{idx}</td>
                              {selectedVectors.map((id, _i) => {
                                const vec = vectors?.find(v => v.id === id);
                                const weight = weights[id] || 0;
                                const val = vec?.values[idx] || 0;
                                return <td key={id} className="py-2 px-2 font-mono">{val} × {weight} = {(val * weight).toFixed(4)}</td>;
                              })}
                              <td className="py-2 px-2 font-mono font-medium text-primary">{resultVector[idx].toFixed(4)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setViewingResult(null)}>Cerrar</Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-secondary">
                <Calculator className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">No hay resultado aún</p>
                <p className="mt-1">Configura una combinación lineal y haz clic en "Calcular"</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}