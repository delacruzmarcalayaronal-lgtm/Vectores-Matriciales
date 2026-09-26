import { useState } from 'react';
import { Plus, Search, Eye, Edit, Trash2, ChevronLeft, ChevronRight, X, ShoppingCart } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, Badge, Modal } from '../components/ui/Table';
import { useSales, useBranches, useProducts, useCreateSale, useUpdateSale, useDeleteSale } from '../hooks/useApi';
import { useForm, useFieldArray, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Sale } from '../types';
import { saleSchema, type SaleForm } from '../schemas';
import { formatCurrency, formatDateTime } from '../utils/format';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
};

const STATUS_VARIANTS: Record<string, 'warning' | 'success' | 'danger'> = {
  draft: 'warning',
  confirmed: 'success',
  cancelled: 'danger',
};

export function Sales() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [deletingSale, setDeletingSale] = useState<Sale | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pageSize = 10;

  const { data: branches } = useBranches('1');
  const { data: products } = useProducts('1');
  const { data: salesData, isLoading, refetch } = useSales('1', {
    page: currentPage,
    pageSize,
  });
  const createSale = useCreateSale('1');
  const updateSale = useUpdateSale('1');
  const deleteSale = useDeleteSale('1');

  const sales = salesData?.data || [];
  const total = salesData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const filteredSales = sales.filter(s =>
    s.saleNumber.toLowerCase().includes(search.toLowerCase()) &&
    (statusFilter === 'all' || s.status === statusFilter)
  );

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SaleForm>({
    resolver: zodResolver(saleSchema) as Resolver<SaleForm>,
    defaultValues: { branchId: '', status: 'confirmed', notes: '', details: [] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'details' });

  const details = watch('details') || [];
  const subtotal = details.reduce((sum, d) => sum + (d.quantity || 0) * (d.unitPrice || 0) - (d.discount || 0), 0);
  const tax = Math.round(subtotal * 18) / 100;
  const grandTotal = subtotal + tax;

  const openCreateModal = () => {
    setEditingSale(null);
    reset({ branchId: branches?.[0]?.id || '', status: 'confirmed', notes: '', details: [{ productId: '', quantity: 1, unitPrice: 0, discount: 0 }] });
    setIsModalOpen(true);
  };

  const openEditModal = (sale: Sale) => {
    setEditingSale(sale);
    reset({
      branchId: sale.branchId,
      status: sale.status,
      notes: sale.notes || '',
      details: (sale.details || []).map(d => ({
        productId: d.productId,
        quantity: d.quantity,
        unitPrice: d.unitPrice,
        discount: d.discount,
      })),
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: SaleForm) => {
    try {
      const payload = {
        branchId: data.branchId,
        status: data.status,
        notes: data.notes || undefined,
        subtotal,
        tax,
        total: grandTotal,
        date: new Date().toISOString(),
        details: data.details.map(d => ({ ...d, subtotal: d.quantity * d.unitPrice - d.discount })),
      };
      if (editingSale) {
        await updateSale.mutateAsync({ id: editingSale.id, data: payload });
      } else {
        await createSale.mutateAsync(payload);
      }
      setIsModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Error saving sale:', error);
    }
  };

  const confirmDelete = async () => {
    if (deletingSale) {
      try {
        await deleteSale.mutateAsync(deletingSale.id);
        setDeletingSale(null);
        refetch();
      } catch (error) {
        console.error('Error deleting sale:', error);
      }
    }
  };

  const onProductChange = (index: number, productId: string) => {
    const product = products?.find(p => p.id === productId);
    setValue(`details.${index}.productId`, productId);
    if (product) setValue(`details.${index}.unitPrice`, product.unitPrice);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Ventas</h1>
          <p className="text-secondary mt-1">Registro y consulta de transacciones de venta</p>
        </div>
        <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>Nueva Venta</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
              <input
                type="text"
                placeholder="Buscar por número de venta..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'Todos los estados' },
                { value: 'confirmed', label: 'Confirmadas' },
                { value: 'draft', label: 'Borrador' },
                { value: 'cancelled', label: 'Canceladas' },
              ]}
              className="w-full sm:w-48"
            />
          </div>

          <Table
            data={filteredSales}
            columns={[
              { key: 'saleNumber', header: 'N° Venta', render: (row) => <span className="font-mono font-medium">{row.saleNumber}</span> },
              { key: 'date', header: 'Fecha', render: (row) => formatDateTime(row.date) },
              { key: 'branchId', header: 'Sucursal', render: (row) => branches?.find(b => b.id === row.branchId)?.name || row.branchId },
    { key: 'subtotal', header: 'Subtotal', render: (row) => formatCurrency(row.subtotal) },
    { key: 'tax', header: 'IGV', render: (row) => formatCurrency(row.tax) },
    { key: 'total', header: 'Total', render: (row) => <span className="font-medium">{formatCurrency(row.total)}</span> },
              { key: 'status', header: 'Estado', render: (row) => (
                <Badge variant={STATUS_VARIANTS[row.status]}>
                  {STATUS_LABELS[row.status]}
                </Badge>
              )},
              { key: 'actions', header: 'Acciones', render: (row) => (
                <div className="flex items-center gap-1">
                  <button onClick={() => setViewingSale(row)} className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-gray-100" aria-label="Ver"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => openEditModal(row)} className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-gray-100" aria-label="Editar"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => setDeletingSale(row)} className="p-2 rounded-lg text-secondary hover:text-danger hover:bg-gray-100" aria-label="Eliminar"><Trash2 className="w-4 h-4" /></button>
                </div>
              )},
            ]}
            keyExtractor={row => row.id}
            isLoading={isLoading}
            emptyMessage="No se encontraron ventas"
          />

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <p className="text-sm text-secondary">
                Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, total)} de {total} resultados
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
        title={editingSale ? `Editar Venta ${editingSale.saleNumber}` : 'Nueva Venta'}
        size="lg"
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
              label="Estado"
              {...register('status')}
              options={[
                { value: 'confirmed', label: 'Confirmada' },
                { value: 'draft', label: 'Borrador' },
                { value: 'cancelled', label: 'Cancelada' },
              ]}
              error={errors.status?.message}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-text">Productos</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => append({ productId: '', quantity: 1, unitPrice: 0, discount: 0 })}
              >
                Agregar
              </Button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-12 gap-2 items-start p-3 bg-background rounded-lg border border-border">
                <div className="col-span-12 md:col-span-5">
                  <Select
                    {...register(`details.${index}.productId`)}
                    onChange={e => onProductChange(index, e.target.value)}
                    options={[
                      { value: '', label: 'Seleccione un producto' },
                      ...(products || []).map(p => ({ value: p.id, label: `${p.name} (${p.sku})` })),
                    ]}
                    error={errors.details?.[index]?.productId?.message}
                    aria-label="Producto"
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Input
                    type="number"
                    min={1}
                    {...register(`details.${index}.quantity`, { valueAsNumber: true })}
                    error={errors.details?.[index]?.quantity?.message}
                    aria-label="Cantidad"
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    {...register(`details.${index}.unitPrice`, { valueAsNumber: true })}
                    error={errors.details?.[index]?.unitPrice?.message}
                    aria-label="Precio unitario"
                  />
                </div>
                <div className="col-span-3 md:col-span-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    {...register(`details.${index}.discount`, { valueAsNumber: true })}
                    error={errors.details?.[index]?.discount?.message}
                    aria-label="Descuento"
                  />
                </div>
                <div className="col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-2 rounded-lg text-secondary hover:text-danger hover:bg-gray-100"
                    aria-label="Quitar producto"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {typeof errors.details?.message === 'string' && (
              <p className="text-sm text-danger" role="alert">{errors.details.message}</p>
            )}
          </div>

          <Input label="Notas" {...register('notes')} />

          <div className="flex flex-col items-end gap-1 p-4 bg-background rounded-lg border border-border text-sm">
            <div className="flex gap-6">
              <span className="text-secondary">Subtotal</span>
              <span className="font-medium text-text">S/ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex gap-6">
              <span className="text-secondary">IGV (18%)</span>
              <span className="font-medium text-text">S/ {tax.toFixed(2)}</span>
            </div>
            <div className="flex gap-6 text-base">
              <span className="font-semibold text-text">Total</span>
              <span className="font-bold text-primary">S/ {grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" leftIcon={<ShoppingCart className="w-4 h-4" />} loading={isSubmitting || createSale.isPending || updateSale.isPending}>
              {editingSale ? 'Actualizar' : 'Registrar Venta'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!viewingSale}
        onClose={() => setViewingSale(null)}
        title={`Venta ${viewingSale?.saleNumber || ''}`}
        size="lg"
      >
        {viewingSale && (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <dt className="text-secondary">Fecha</dt>
                <dd className="text-text">{formatDateTime(viewingSale.date)}</dd>
              </div>
              <div>
                <dt className="text-secondary">Sucursal</dt>
                <dd className="text-text">{branches?.find(b => b.id === viewingSale.branchId)?.name || viewingSale.branchId}</dd>
              </div>
              <div>
                <dt className="text-secondary">Estado</dt>
                <dd><Badge variant={STATUS_VARIANTS[viewingSale.status]}>{STATUS_LABELS[viewingSale.status]}</Badge></dd>
              </div>
              <div>
                <dt className="text-secondary">Total</dt>
                <dd className="font-semibold text-text">{formatCurrency(viewingSale.total)}</dd>
              </div>
            </dl>

            {viewingSale.notes && (
              <p className="text-sm text-secondary"><span className="font-medium text-text">Notas:</span> {viewingSale.notes}</p>
            )}

            <Table
              data={viewingSale.details || []}
              columns={[
                { key: 'productId', header: 'Producto', render: (row) => row.product?.name || products?.find(p => p.id === row.productId)?.name || row.productId },
                { key: 'quantity', header: 'Cant.' },
                { key: 'unitPrice', header: 'Precio', render: (row) => `S/ ${row.unitPrice.toFixed(2)}` },
                { key: 'discount', header: 'Desc.', render: (row) => `S/ ${row.discount.toFixed(2)}` },
                { key: 'subtotal', header: 'Subtotal', render: (row) => <span className="font-medium">S/ {row.subtotal.toFixed(2)}</span> },
              ]}
              keyExtractor={row => row.id}
              emptyMessage="Sin detalles"
            />

            <div className="flex justify-end gap-6 pt-4 border-t border-border text-sm">
              <span className="text-secondary">Subtotal: <span className="font-medium text-text">S/ {viewingSale.subtotal.toFixed(2)}</span></span>
              <span className="text-secondary">IGV: <span className="font-medium text-text">S/ {viewingSale.tax.toFixed(2)}</span></span>
              <span className="font-semibold text-text">Total: <span className="text-primary">S/ {viewingSale.total.toFixed(2)}</span></span>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setViewingSale(null)}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!deletingSale}
        onClose={() => setDeletingSale(null)}
        title="Eliminar Venta"
        description={`¿Estás seguro de eliminar la venta "${deletingSale?.saleNumber}"? Esta acción no se puede deshacer.`}
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setDeletingSale(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={deleteSale.isPending}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </div>
  );
}
