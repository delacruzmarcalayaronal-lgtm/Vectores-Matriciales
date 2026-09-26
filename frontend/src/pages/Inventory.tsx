import { useState } from 'react';
import { Plus, Search, Eye, Box, ArrowUp, ArrowDown, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, Badge, Modal } from '../components/ui/Table';
import { useInventoryMovements, useBranches, useProducts, useCreateMovement } from '../hooks/useApi';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { InventoryMovement } from '../types';
import { movementSchema, type MovementForm } from '../schemas';

const TYPE_LABELS: Record<string, string> = {
  in: 'Entrada',
  out: 'Salida',
  adjustment: 'Ajuste',
  transfer: 'Transferencia',
};

const TYPE_VARIANTS: Record<string, 'success' | 'danger' | 'warning' | 'info'> = {
  in: 'success',
  out: 'danger',
  adjustment: 'warning',
  transfer: 'info',
};

export function Inventory() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingMovement, setViewingMovement] = useState<InventoryMovement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pageSize = 10;

  const { data: movements, isLoading, refetch } = useInventoryMovements('1');
  const { data: branches } = useBranches('1');
  const { data: products } = useProducts('1');
  const createMovement = useCreateMovement('1');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MovementForm>({
    resolver: zodResolver(movementSchema) as Resolver<MovementForm>,
  });

  const filteredMovements = (movements || []).filter(m =>
    (m.product?.name || m.productId).toLowerCase().includes(search.toLowerCase()) &&
    (typeFilter === 'all' || m.type === typeFilter)
  );

  const paginatedMovements = filteredMovements.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const totalPages = Math.ceil(filteredMovements.length / pageSize);

  const openCreateModal = () => {
    reset({
      branchId: branches?.[0]?.id || '',
      productId: '',
      type: 'in',
      quantity: 1,
      reference: '',
      notes: '',
      date: new Date().toISOString(),
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: MovementForm) => {
    try {
      await createMovement.mutateAsync({
        ...data,
        reference: data.reference || undefined,
        notes: data.notes || undefined,
        date: data.date || new Date().toISOString(),
      });
      setIsModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Error creating movement:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Inventario</h1>
          <p className="text-secondary mt-1">Control de existencias y movimientos de stock</p>
        </div>
        <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>Nuevo Movimiento</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary">Total Movimientos</p>
              <p className="text-2xl font-bold text-text">{movements?.length || 0}</p>
            </div>
            <Box className="w-10 h-10 text-primary" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary">Entradas</p>
              <p className="text-2xl font-bold text-success">{movements?.filter(m => m.type === 'in').length || 0}</p>
            </div>
            <ArrowUp className="w-10 h-10 text-success" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary">Salidas</p>
              <p className="text-2xl font-bold text-danger">{movements?.filter(m => m.type === 'out').length || 0}</p>
            </div>
            <ArrowDown className="w-10 h-10 text-danger" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-secondary">Ajustes</p>
              <p className="text-2xl font-bold text-warning">{movements?.filter(m => m.type === 'adjustment').length || 0}</p>
            </div>
            <Minus className="w-10 h-10 text-warning" />
          </div>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
              <input
                type="text"
                placeholder="Buscar por producto o referencia..."
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
                { value: 'in', label: 'Entradas' },
                { value: 'out', label: 'Salidas' },
                { value: 'adjustment', label: 'Ajustes' },
                { value: 'transfer', label: 'Transferencias' },
              ]}
              className="w-full sm:w-48"
            />
          </div>

          <Table
            data={paginatedMovements}
            columns={[
              { key: 'date', header: 'Fecha', render: (row) => new Date(row.date).toLocaleString('es-PE') },
              { key: 'product', header: 'Producto', render: (row) => row.product?.name || row.productId },
              { key: 'branch', header: 'Sucursal', render: (row) => row.branch?.name || row.branchId },
              { key: 'type', header: 'Tipo', render: (row) => (
                <Badge variant={TYPE_VARIANTS[row.type]}>
                  {TYPE_LABELS[row.type]}
                </Badge>
              )},
              { key: 'quantity', header: 'Cantidad', render: (row) => (
                <span className={`font-mono ${row.type === 'in' ? 'text-success' : row.type === 'out' ? 'text-danger' : ''}`}>
                  {row.type === 'in' ? '+' : row.type === 'out' ? '-' : ''}{row.quantity}
                </span>
              )},
              { key: 'reference', header: 'Referencia', render: (row) => row.reference },
              { key: 'notes', header: 'Notas', render: (row) => row.notes || '-' },
              { key: 'actions', header: 'Acciones', render: (row) => (
                <div className="flex items-center gap-1">
                  <button onClick={() => setViewingMovement(row)} className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-gray-100" aria-label="Ver"><Eye className="w-4 h-4" /></button>
                </div>
              )},
            ]}
            keyExtractor={row => row.id}
            isLoading={isLoading}
            emptyMessage="No se encontraron movimientos"
          />

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <p className="text-sm text-secondary">
                Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, filteredMovements.length)} de {filteredMovements.length} resultados
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
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nuevo Movimiento"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Sucursal"
              {...register('branchId')}
              options={[
                { value: '', label: 'Seleccione una sucursal' },
                ...(branches || []).map(b => ({ value: b.id, label: b.name })),
              ]}
              error={errors.branchId?.message}
            />
            <Select
              label="Tipo de movimiento"
              {...register('type')}
              options={[
                { value: 'in', label: 'Entrada' },
                { value: 'out', label: 'Salida' },
                { value: 'adjustment', label: 'Ajuste' },
                { value: 'transfer', label: 'Transferencia' },
              ]}
              error={errors.type?.message}
            />
          </div>
          <Select
            label="Producto"
            {...register('productId')}
            options={[
              { value: '', label: 'Seleccione un producto' },
              ...(products || []).map(p => ({ value: p.id, label: `${p.name} (${p.sku})` })),
            ]}
            error={errors.productId?.message}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Cantidad"
              type="number"
              min={1}
              {...register('quantity', { valueAsNumber: true })}
              error={errors.quantity?.message}
            />
            <Input label="Referencia" {...register('reference')} placeholder="OC-001, GR-042..." />
          </div>
          <Input label="Notas" {...register('notes')} />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting || createMovement.isPending}>
              Registrar
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!viewingMovement}
        onClose={() => setViewingMovement(null)}
        title="Detalle del Movimiento"
      >
        {viewingMovement && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-secondary">Fecha</dt>
                <dd className="text-text">{new Date(viewingMovement.date).toLocaleString('es-PE')}</dd>
              </div>
              <div>
                <dt className="text-secondary">Tipo</dt>
                <dd><Badge variant={TYPE_VARIANTS[viewingMovement.type]}>{TYPE_LABELS[viewingMovement.type]}</Badge></dd>
              </div>
              <div>
                <dt className="text-secondary">Producto</dt>
                <dd className="text-text">{viewingMovement.product?.name || viewingMovement.productId}</dd>
              </div>
              <div>
                <dt className="text-secondary">Sucursal</dt>
                <dd className="text-text">{viewingMovement.branch?.name || viewingMovement.branchId}</dd>
              </div>
              <div>
                <dt className="text-secondary">Cantidad</dt>
                <dd className="font-mono font-semibold text-text">{viewingMovement.quantity}</dd>
              </div>
              <div>
                <dt className="text-secondary">Referencia</dt>
                <dd className="text-text">{viewingMovement.reference || '—'}</dd>
              </div>
            </dl>
            {viewingMovement.notes && (
              <p className="text-sm text-secondary"><span className="font-medium text-text">Notas:</span> {viewingMovement.notes}</p>
            )}
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setViewingMovement(null)}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
