import { useState } from 'react';
import { Plus, Search, Edit, Trash2, Copy, Download, Eye } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, Badge, Modal } from '../components/ui/Table';
import { useVectors, useCreateVector, useUpdateVector, useDeleteVector } from '../hooks/useApi';
import { useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Vector } from '../types';
import { vectorSchema, type VectorForm } from '../schemas';
import { useNotice } from '../hooks/useNotice';

export function Vectors() {
  const [search, setSearch] = useState('');
  const [editingVector, setEditingVector] = useState<Vector | null>(null);
  const [deletingVector, setDeletingVector] = useState<Vector | null>(null);
  const [viewingVector, setViewingVector] = useState<Vector | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [valuesInput, setValuesInput] = useState('');
  const { show, notice } = useNotice();

  const { data: vectors, isLoading, refetch } = useVectors('1');
  const createVector = useCreateVector('1');
  const updateVector = useUpdateVector();
  const deleteVector = useDeleteVector();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<VectorForm>({
    resolver: zodResolver(vectorSchema) as Resolver<VectorForm>,
  });

  const watchedDimension = useWatch({ control, name: 'dimension' });

  const filteredVectors = vectors?.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.description?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const parseValues = (input: string): number[] => {
    return input.split(/[\s,;]+/).filter(v => v.trim()).map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
  };

  const formatValues = (values: number[]): string => {
    return values.join(', ');
  };

  const openCreateModal = () => {
    setEditingVector(null);
    setValuesInput('');
    reset({ name: '', description: '', dimension: 5, values: [], source: 'manual' });
    setIsModalOpen(true);
  };

  const openEditModal = (vector: Vector) => {
    setEditingVector(vector);
    setValuesInput(formatValues(vector.values));
    reset({
      name: vector.name,
      description: vector.description,
      dimension: vector.dimension,
      values: vector.values,
      source: vector.source,
    });
    setIsModalOpen(true);
  };

  const openViewModal = (vector: Vector) => {
    setViewingVector(vector);
  };

  const onSubmit = async (data: VectorForm) => {
    try {
      const values = parseValues(valuesInput);
      if (values.length !== data.dimension) {
        alert(`La dimensión (${data.dimension}) no coincide con el número de valores ingresados (${values.length})`);
        return;
      }
      const payload = { ...data, values };
      if (editingVector) {
        await updateVector.mutateAsync({ id: editingVector.id, data: payload });
      } else {
        await createVector.mutateAsync(payload);
      }
      setIsModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Error saving vector:', error);
    }
  };

  const confirmDelete = async () => {
    if (deletingVector) {
      try {
        await deleteVector.mutateAsync(deletingVector.id);
        setDeletingVector(null);
        refetch();
      } catch (error) {
        console.error('Error deleting vector:', error);
      }
    }
  };

  const copyToClipboard = async (values: number[]) => {
    try {
      await navigator.clipboard.writeText(values.join(', '));
      show('Copiado al portapapeles');
    } catch {
      show('No se pudo copiar al portapapeles');
    }
  };

  const downloadVector = (vector: Vector) => {
    const content = `Vector: ${vector.name}\nDimensión: ${vector.dimension}\nValores: ${vector.values.join(', ')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${vector.name.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Vectores</h1>
          <p className="text-secondary mt-1">Gestión de vectores para análisis matemático empresarial</p>
        </div>
        <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
          Nuevo Vector
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
              <input
                type="text"
                placeholder="Buscar vector..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <Table
            data={filteredVectors}
            columns={[
              { key: 'name', header: 'Nombre' },
              { key: 'description', header: 'Descripción', render: (row) => row.description || '-' },
              { key: 'dimension', header: 'Dimensión', render: (row) => <span className="font-mono">{row.dimension}</span> },
              { key: 'source', header: 'Origen', render: (row) => (
                <Badge variant={
                  row.source === 'manual' ? 'default' :
                  row.source === 'sales' ? 'primary' :
                  row.source === 'inventory' ? 'info' : 'warning'
                }>
                  {row.source}
                </Badge>
              )},
              { key: 'values', header: 'Valores', render: (row) => (
                <span className="font-mono text-xs max-w-[200px] truncate block">
                  [${row.values.slice(0, 10).join(', ')}${row.values.length > 10 ? '...' : ''}]
                </span>
              )},
              { key: 'actions', header: 'Acciones', render: (row) => (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openViewModal(row)}
                    className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-gray-100 transition-colors"
                    aria-label="Ver detalles"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(row)}
                    className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-gray-100 transition-colors"
                    aria-label="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => copyToClipboard(row.values)}
                    className="p-2 rounded-lg text-secondary hover:text-accent hover:bg-gray-100 transition-colors"
                    aria-label="Copiar valores"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => downloadVector(row)}
                    className="p-2 rounded-lg text-secondary hover:text-accent hover:bg-gray-100 transition-colors"
                    aria-label="Descargar"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setDeletingVector(row); }}
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
            emptyMessage="No se encontraron vectores"
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVector ? 'Editar Vector' : 'Nuevo Vector'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nombre" {...register('name')} error={errors.name?.message} placeholder="Nombre del vector" />
            <Input label="Dimensión" type="number" {...register('dimension', { valueAsNumber: true })} error={errors.dimension?.message} />
          </div>
          <Input label="Descripción" {...register('description')} />
          <Select
            label="Origen"
            {...register('source')}
            options={[
              { value: 'manual', label: 'Manual' },
              { value: 'sales', label: 'Ventas' },
              { value: 'inventory', label: 'Inventario' },
              { value: 'targets', label: 'Metas' },
            ]}
          />
          <Textarea
            label="Valores (separados por comas, espacios o punto y coma)"
            placeholder="Ej: 45, 30, 80, 60, 90"
            value={valuesInput}
            onChange={e => setValuesInput(e.target.value)}
            rows={3}
            helperText={`${parseValues(valuesInput).length} valores ingresados`}
            error={valuesInput && parseValues(valuesInput).length !== watchedDimension ? `Se esperan ${watchedDimension} valores` : undefined}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting || createVector.isPending || updateVector.isPending}>
              {editingVector ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!viewingVector}
        onClose={() => setViewingVector(null)}
        title={`Vector: ${viewingVector?.name}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-secondary">Dimensión:</span> <span className="font-mono ml-2">{viewingVector?.dimension}</span></div>
            <div><span className="text-secondary">Origen:</span> <span className="ml-2">{viewingVector?.source}</span></div>
            <div className="col-span-2"><span className="text-secondary">Descripción:</span> <p className="mt-1">{viewingVector?.description || 'Sin descripción'}</p></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Valores</label>
            <div className="font-mono text-sm bg-gray-50 p-4 rounded-lg max-h-60 overflow-auto">
              [{viewingVector?.values.map((v, i) => (
                <span key={i} className="block">{i}: {v}</span>
              ))}]
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button
              onClick={() => copyToClipboard(viewingVector!.values)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" /> Copiar
            </button>
            <button
              onClick={() => downloadVector(viewingVector!)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" /> Descargar
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!deletingVector}
        onClose={() => setDeletingVector(null)}
        title="Eliminar Vector"
        description={`¿Estás seguro de eliminar "${deletingVector?.name}"? Esta acción no se puede deshacer.`}
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setDeletingVector(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={deleteVector.isPending}>
            Eliminar
          </Button>
        </div>
      </Modal>
      {notice}
    </div>
  );
}