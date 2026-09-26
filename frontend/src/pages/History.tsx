import { useState } from 'react';
import { Search, Eye, Calculator, Minus, Plus, Divide, RotateCcw, Layers, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, Badge, Modal } from '../components/ui/Table';
import { useOperations } from '../hooks/useApi';
import { useNotice } from '../hooks/useNotice';
import { operationsApi } from '../services/api';
import { downloadFile, toCSV } from '../lib/exportUtils';
import type { Operation, OperationType } from '../types';

const typeIcons: Record<OperationType, React.ReactNode> = {
  vector_add: <Plus className="w-4 h-4" />,
  vector_subtract: <Minus className="w-4 h-4" />,
  vector_scalar_multiply: <Calculator className="w-4 h-4" />,
  vector_dot_product: <Divide className="w-4 h-4" />,
  matrix_add: <Plus className="w-4 h-4" />,
  matrix_subtract: <Minus className="w-4 h-4" />,
  matrix_multiply: <Calculator className="w-4 h-4" />,
  matrix_transpose: <RotateCcw className="w-4 h-4" />,
  matrix_scalar_multiply: <Calculator className="w-4 h-4" />,
  linear_combination: <Layers className="w-4 h-4" />,
};

const typeLabels: Record<OperationType, string> = {
  vector_add: 'Suma Vectores',
  vector_subtract: 'Resta Vectores',
  vector_scalar_multiply: 'Escalar × Vector',
  vector_dot_product: 'Producto Escalar',
  matrix_add: 'Suma Matrices',
  matrix_subtract: 'Resta Matrices',
  matrix_multiply: 'Mult. Matrices',
  matrix_transpose: 'Transposición',
  matrix_scalar_multiply: 'Escalar × Matriz',
  linear_combination: 'Comb. Lineal',
};

export function History() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [viewingOperation, setViewingOperation] = useState<Operation | null>(null);
  const pageSize = 15;
  const { show, notice } = useNotice();

  const handleExport = async () => {
    setExporting(true);
    try {
      const page = await operationsApi.list('1', { page: 1, pageSize: 10000 });
      const rows = page.data.map(op => ({
        tipo: op.type,
        nombre: op.name,
        descripcion: op.description ?? '',
        estado: op.status,
        tiempo_ms: op.executionTimeMs,
        vectores_entrada: op.inputVectors.join(' '),
        matrices_entrada: op.inputMatrices.join(' '),
        fecha: new Date(op.createdAt).toISOString(),
      }));
      const filename = `historial_operaciones_${new Date().toISOString().slice(0, 10)}.csv`;
      downloadFile(filename, toCSV(rows), 'text/csv');
      show(`Historial exportado: ${rows.length} operaciones (${filename}).`);
    } catch (error) {
      console.error('Error exporting history:', error);
      show('No se pudo exportar el historial. Intenta nuevamente.');
    } finally {
      setExporting(false);
    }
  };

  const { data: operationsData, isLoading } = useOperations('1', {
    page: currentPage,
    pageSize,
  });

  const operations = operationsData?.data || [];
  const total = operationsData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const filteredOperations = operations.filter(op =>
    op.name.toLowerCase().includes(search.toLowerCase()) &&
    (typeFilter === 'all' || op.type === typeFilter) &&
    (statusFilter === 'all' || op.status === statusFilter)
  );

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
          <h1 className="text-2xl font-bold text-text">Historial de Operaciones</h1>
          <p className="text-secondary mt-1">Trazabilidad completa de cálculos ejecutados</p>
        </div>
        <Button
          variant="outline"
          leftIcon={<Download className="w-4 h-4" />}
          loading={exporting}
          onClick={handleExport}
        >
          Exportar
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
              <input
                type="text"
                placeholder="Buscar por nombre o tipo..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <Select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Todos los tipos' },
                ...Object.entries(typeLabels).map(([value, label]) => ({ value, label })),
              ]}
              className="w-full sm:w-52"
            />
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Todos los estados' },
                { value: 'completed', label: 'Completadas' },
                { value: 'pending', label: 'Pendientes' },
                { value: 'failed', label: 'Fallidas' },
              ]}
              className="w-full sm:w-40"
            />
          </div>

          <Table
            data={filteredOperations}
            columns={[
              { key: 'type', header: 'Tipo', render: (row) => (
                <span className="flex items-center gap-2">
                  <span className="p-1.5 rounded bg-primary/10 text-primary">{typeIcons[row.type]}</span>
                  <span className="font-mono text-sm">{typeLabels[row.type]}</span>
                </span>
              )},
              { key: 'name', header: 'Nombre' },
              { key: 'description', header: 'Descripción', render: (row) => row.description || '-' },
              { key: 'inputs', header: 'Entradas', render: (row) => (
                <div className="flex items-center gap-1 text-xs">
                  {row.inputVectors.length > 0 && <Badge variant="primary">{row.inputVectors.length} Vec</Badge>}
                  {row.inputMatrices.length > 0 && <Badge variant="accent">{row.inputMatrices.length} Mat</Badge>}
                </div>
              )},
              { key: 'status', header: 'Estado', render: (row) => getStatusBadge(row.status) },
              { key: 'executionTime', header: 'Tiempo', render: (row) => <span className="font-mono">{row.executionTimeMs} ms</span> },
              { key: 'createdAt', header: 'Fecha', render: (row) => new Date(row.createdAt).toLocaleString('es-PE') },
              { key: 'actions', header: 'Acciones', render: (row) => (
                <div className="flex items-center gap-1">
                  <button onClick={() => setViewingOperation(row)} className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-gray-100" aria-label="Ver detalle"><Eye className="w-4 h-4" /></button>
                </div>
              )},
            ]}
            keyExtractor={row => row.id}
            isLoading={isLoading}
            emptyMessage="No hay operaciones en el historial"
          />

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <p className="text-sm text-secondary">
                Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, total)} de {total} operaciones
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium">Página {currentPage} de {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Modal
        isOpen={!!viewingOperation}
        onClose={() => setViewingOperation(null)}
        title="Detalle de la Operación"
        description={viewingOperation ? `${typeLabels[viewingOperation.type] ?? viewingOperation.type} — ${viewingOperation.name}` : ''}
        size="lg"
      >
        {viewingOperation && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-secondary">Estado:</span> {getStatusBadge(viewingOperation.status)}</div>
              <div><span className="text-secondary">Tiempo:</span> <span className="font-mono">{viewingOperation.executionTimeMs} ms</span></div>
              <div><span className="text-secondary">Fecha:</span> {new Date(viewingOperation.createdAt).toLocaleString('es-PE')}</div>
              <div><span className="text-secondary">Descripción:</span> {viewingOperation.description || '—'}</div>
            </div>
            <div>
              <p className="text-sm font-medium text-text mb-2">Parámetros</p>
              <pre className="text-xs bg-gray-50 border border-border rounded-lg p-3 max-h-40 overflow-auto">
                {JSON.stringify(viewingOperation.parameters ?? {}, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-sm font-medium text-text mb-2">Salida</p>
              <pre className="text-xs bg-gray-50 border border-border rounded-lg p-3 max-h-40 overflow-auto">
                {JSON.stringify({
                  estado: viewingOperation.status,
                  error: viewingOperation.errorMessage ?? null,
                  vectorResultado: viewingOperation.resultVectorId ?? null,
                  matrizResultado: viewingOperation.resultMatrixId ?? null,
                }, null, 2)}
              </pre>
            </div>
            <div>
              <p className="text-sm font-medium text-text mb-2">Entradas</p>
              <pre className="text-xs bg-gray-50 border border-border rounded-lg p-3 max-h-40 overflow-auto">
                {JSON.stringify({ vectores: viewingOperation.inputVectors, matrices: viewingOperation.inputMatrices }, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
      {notice}
    </div>
  );
}