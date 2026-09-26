import { useState, useCallback } from 'react';
import { Plus, Search, Edit, Trash2, Copy, Download, Eye, Minus, Plus as PlusIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, Badge, Modal } from '../components/ui/Table';
import { useMatrices, useCreateMatrix, useUpdateMatrix, useDeleteMatrix } from '../hooks/useApi';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Matrix } from '../types';
import { matrixSchema, type MatrixForm } from '../schemas';
import { useNotice } from '../hooks/useNotice';

export function Matrices() {
  const [search, setSearch] = useState('');
  const [editingMatrix, setEditingMatrix] = useState<Matrix | null>(null);
  const [deletingMatrix, setDeletingMatrix] = useState<Matrix | null>(null);
  const [viewingMatrix, setViewingMatrix] = useState<Matrix | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [gridRows, setGridRows] = useState(3);
  const [gridCols, setGridCols] = useState(3);
  const [gridValues, setGridValues] = useState<number[][]>([[]]);
  const [gridRowLabels, setGridRowLabels] = useState<string[]>([]);
  const [gridColLabels, setGridColLabels] = useState<string[]>([]);
  const { show, notice } = useNotice();

  const { data: matrices, isLoading, refetch } = useMatrices('1');
  const createMatrix = useCreateMatrix('1');
  const updateMatrix = useUpdateMatrix();
  const deleteMatrix = useDeleteMatrix();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<MatrixForm>({
    resolver: zodResolver(matrixSchema) as Resolver<MatrixForm>,
  });

  const initializeGrid = useCallback((rows: number, cols: number) => {
    const newValues = Array.from({ length: rows }, () => Array(cols).fill(0));
    const newRowLabels = Array.from({ length: rows }, (_, i) => `Fila ${i + 1}`);
    const newColLabels = Array.from({ length: cols }, (_, i) => `Col ${i + 1}`);
    setGridValues(newValues);
    setGridRowLabels(newRowLabels);
    setGridColLabels(newColLabels);
    setValue('values', newValues);
    setValue('rowLabels', newRowLabels);
    setValue('colLabels', newColLabels);
  }, [setValue]);

  const applyDims = (rows: number, cols: number) => {
    if (!Number.isInteger(rows) || !Number.isInteger(cols)) return;
    if (rows < 1 || cols < 1 || rows > 50 || cols > 50) return;
    setGridRows(rows);
    setGridCols(cols);
    initializeGrid(rows, cols);
  };

  const updateCellValue = (row: number, col: number, value: number) => {
    const newValues = [...gridValues];
    newValues[row] = [...newValues[row]];
    newValues[row][col] = value;
    setGridValues(newValues);
    setValue('values', newValues);
  };

  const updateRowLabel = (row: number, label: string) => {
    const newLabels = [...gridRowLabels];
    newLabels[row] = label;
    setGridRowLabels(newLabels);
    setValue('rowLabels', newLabels);
  };

  const updateColLabel = (col: number, label: string) => {
    const newLabels = [...gridColLabels];
    newLabels[col] = label;
    setGridColLabels(newLabels);
    setValue('colLabels', newLabels);
  };

  const addRow = () => {
    if (gridRows >= 50) return;
    const newRow = Array(gridCols).fill(0);
    setGridValues([...gridValues, newRow]);
    setGridRowLabels([...gridRowLabels, `Fila ${gridRows + 1}`]);
    setGridRows(gridRows + 1);
    setValue('rows', gridRows + 1);
  };

  const removeRow = () => {
    if (gridRows <= 1) return;
    setGridValues(gridValues.slice(0, -1));
    setGridRowLabels(gridRowLabels.slice(0, -1));
    setGridRows(gridRows - 1);
    setValue('rows', gridRows - 1);
  };

  const addCol = () => {
    if (gridCols >= 50) return;
    setGridValues(gridValues.map(row => [...row, 0]));
    setGridColLabels([...gridColLabels, `Col ${gridCols + 1}`]);
    setGridCols(gridCols + 1);
    setValue('cols', gridCols + 1);
  };

  const removeCol = () => {
    if (gridCols <= 1) return;
    setGridValues(gridValues.map(row => row.slice(0, -1)));
    setGridColLabels(gridColLabels.slice(0, -1));
    setGridCols(gridCols - 1);
    setValue('cols', gridCols - 1);
  };

  const filteredMatrices = matrices?.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.description?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const openCreateModal = () => {
    setEditingMatrix(null);
    reset({ name: '', description: '', rows: 3, cols: 3, rowLabels: [], colLabels: [], values: [[]], source: 'manual' });
    setGridRows(3);
    setGridCols(3);
    initializeGrid(3, 3);
    setIsModalOpen(true);
  };

  const openEditModal = (matrix: Matrix) => {
    setEditingMatrix(matrix);
    setGridRows(matrix.rows);
    setGridCols(matrix.cols);
    setGridValues(matrix.values);
    setGridRowLabels(matrix.rowLabels);
    setGridColLabels(matrix.colLabels);
    reset({
      name: matrix.name,
      description: matrix.description,
      rows: matrix.rows,
      cols: matrix.cols,
      rowLabels: matrix.rowLabels,
      colLabels: matrix.colLabels,
      values: matrix.values,
      source: matrix.source,
    });
    setIsModalOpen(true);
  };

  const openViewModal = (matrix: Matrix) => {
    setViewingMatrix(matrix);
  };

  const onSubmit = async (data: MatrixForm) => {
    try {
      if (editingMatrix) {
        await updateMatrix.mutateAsync({ id: editingMatrix.id, data });
      } else {
        await createMatrix.mutateAsync(data);
      }
      setIsModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Error saving matrix:', error);
    }
  };

  const confirmDelete = async () => {
    if (deletingMatrix) {
      try {
        await deleteMatrix.mutateAsync(deletingMatrix.id);
        setDeletingMatrix(null);
        refetch();
      } catch (error) {
        console.error('Error deleting matrix:', error);
      }
    }
  };

  const copyToClipboard = async (values: number[][]) => {
    const text = values.map(row => row.join('\t')).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      show('Copiado al portapapeles');
    } catch {
      show('No se pudo copiar al portapapeles');
    }
  };

  const downloadMatrix = (matrix: Matrix) => {
    let content = `Matriz: ${matrix.name}\nDimensiones: ${matrix.rows}x${matrix.cols}\n`;
    if (matrix.colLabels.length > 0) {
      content += '\t' + matrix.colLabels.join('\t') + '\n';
    }
    matrix.values.forEach((row, i) => {
      const rowLabel = matrix.rowLabels[i] || `Fila ${i + 1}`;
      content += `${rowLabel}\t${row.join('\t')}\n`;
    });
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${matrix.name.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderMatrixGrid = (matrix: Matrix, maxRows = 4, maxCols = 4) => {
    const displayRows = matrix.values.slice(0, maxRows);
    const _displayCols = matrix.cols > maxCols ? maxCols : matrix.cols;
    return (
      <div className="font-mono text-xs">
        <table className="border-collapse">
          <thead>
            {matrix.colLabels.length > 0 && (
              <tr>
                <th className="p-1 border border-border bg-gray-50"></th>
                {matrix.colLabels.slice(0, maxCols).map((label, i) => (
                  <th key={i} className="p-1 border border-border bg-gray-50 text-center">{label}</th>
                ))}
                {matrix.cols > maxCols && <th className="p-1 border border-border bg-gray-50 text-center">...</th>}
              </tr>
            )}
          </thead>
          <tbody>
            {displayRows.map((row, i) => (
              <tr key={i}>
                {matrix.rowLabels.length > 0 && (
                  <th className="p-1 border border-border bg-gray-50">{matrix.rowLabels[i]}</th>
                )}
                {row.slice(0, maxCols).map((val, j) => (
                  <td key={j} className="p-1 border border-border text-center">{val}</td>
                ))}
                {matrix.cols > maxCols && <td className="p-1 border border-border text-center text-secondary">...</td>}
              </tr>
            ))}
            {matrix.rows > maxRows && (
              <tr>
                {matrix.rowLabels.length > 0 && <th className="p-1 border border-border bg-gray-50">...</th>}
                {Array(maxCols).fill(0).map((_, j) => (
                  <td key={j} className="p-1 border border-border text-center text-secondary">...</td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Matrices</h1>
          <p className="text-secondary mt-1">Gestión de matrices para análisis multidimensional</p>
        </div>
        <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
          Nueva Matriz
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
              <input
                type="text"
                placeholder="Buscar matriz..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <Table
            data={filteredMatrices}
            columns={[
              { key: 'name', header: 'Nombre' },
              { key: 'description', header: 'Descripción', render: (row) => row.description || '-' },
              { key: 'dimensions', header: 'Dimensiones', render: (row) => <span className="font-mono">{row.rows} × {row.cols}</span> },
              { key: 'source', header: 'Origen', render: (row) => (
                <Badge variant={
                  row.source === 'manual' ? 'default' :
                  row.source === 'sales' ? 'primary' :
                  row.source === 'inventory' ? 'info' : 'warning'
                }>
                  {row.source}
                </Badge>
              )},
              { key: 'preview', header: 'Vista Previa', render: (row) => renderMatrixGrid(row) },
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
                    aria-label="Copiar"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => downloadMatrix(row)}
                    className="p-2 rounded-lg text-secondary hover:text-accent hover:bg-gray-100 transition-colors"
                    aria-label="Descargar"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setDeletingMatrix(row); }}
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
            emptyMessage="No se encontraron matrices"
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingMatrix ? 'Editar Matriz' : 'Nueva Matriz'}
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Nombre" {...register('name')} error={errors.name?.message} placeholder="Ventas por Sucursal/Producto" />
            <Input label="Filas" type="number" {...register('rows', { valueAsNumber: true, onChange: (e) => applyDims(Number(e.target.value), getValues('cols')) })} error={errors.rows?.message} />
            <Input label="Columnas" type="number" {...register('cols', { valueAsNumber: true, onChange: (e) => applyDims(getValues('rows'), Number(e.target.value)) })} error={errors.cols?.message} />
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

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-border flex items-center justify-between">
              <h4 className="font-medium text-text">Editor de Matriz</h4>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={addRow} leftIcon={<PlusIcon className="w-3 h-3" />}>Fila</Button>
                <Button variant="ghost" size="sm" onClick={removeRow} leftIcon={<Minus className="w-3 h-3" />}>Fila</Button>
                <Button variant="ghost" size="sm" onClick={addCol} leftIcon={<PlusIcon className="w-3 h-3" />}>Col</Button>
                <Button variant="ghost" size="sm" onClick={removeCol} leftIcon={<Minus className="w-3 h-3" />}>Col</Button>
              </div>
            </div>
            <div className="p-3 overflow-auto max-h-[400px]">
              <table className="border-collapse min-w-max">
                <thead>
                  <tr>
                    <th className="p-2 border border-border bg-gray-100 w-32"></th>
                    {gridColLabels.map((label, j) => (
                      <th key={j} className="p-2 border border-border bg-gray-100 min-w-[80px]">
                        <input
                          type="text"
                          value={label}
                          onChange={e => updateColLabel(j, e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-transparent bg-white rounded text-center focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gridValues.map((row, i) => (
                    <tr key={i}>
                      <th className="p-2 border border-border bg-gray-100 w-32">
                        <input
                          type="text"
                          value={gridRowLabels[i]}
                          onChange={e => updateRowLabel(i, e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-transparent bg-white rounded text-center focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </th>
                      {row.map((val, j) => (
                        <td key={j} className="p-1 border border-border">
                          <input
                            type="number"
                            step="any"
                            value={val}
                            onChange={e => updateCellValue(i, j, parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 text-sm border border-transparent bg-white rounded text-right focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting || createMatrix.isPending || updateMatrix.isPending}>
              {editingMatrix ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!viewingMatrix}
        onClose={() => setViewingMatrix(null)}
        title={`Matriz: ${viewingMatrix?.name}`}
        size="xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><span className="text-secondary">Dimensiones:</span> <span className="font-mono ml-2">{viewingMatrix?.rows} × {viewingMatrix?.cols}</span></div>
            <div><span className="text-secondary">Origen:</span> <span className="ml-2">{viewingMatrix?.source}</span></div>
            <div className="col-span-3"><span className="text-secondary">Descripción:</span> <p className="mt-1">{viewingMatrix?.description || 'Sin descripción'}</p></div>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Valores</label>
            <div className="overflow-auto max-h-[400px]">
              {viewingMatrix ? renderMatrixGrid(viewingMatrix, 50, 50) : null}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button
              onClick={() => copyToClipboard(viewingMatrix!.values)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Copy className="w-4 h-4" /> Copiar
            </button>
            <button
              onClick={() => downloadMatrix(viewingMatrix!)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-secondary hover:text-primary hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" /> Descargar
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!deletingMatrix}
        onClose={() => setDeletingMatrix(null)}
        title="Eliminar Matriz"
        description={`¿Estás seguro de eliminar "${deletingMatrix?.name}"? Esta acción no se puede deshacer.`}
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setDeletingMatrix(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={deleteMatrix.isPending}>
            Eliminar
          </Button>
        </div>
      </Modal>
      {notice}
    </div>
  );
}