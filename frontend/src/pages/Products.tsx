import { useState } from 'react';
import { Plus, Search, Edit, Trash2, Tag, DollarSign, Box } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, Badge, Modal } from '../components/ui/Table';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '../hooks/useApi';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Product } from '../types';
import { productSchema, type ProductForm } from '../schemas';

const mockCategories = [
  { id: '1', name: 'Computadoras' },
  { id: '2', name: 'Monitores' },
  { id: '3', name: 'Accesorios' },
];

export function Products() {
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: products, isLoading, refetch } = useProducts('1');
  const createProduct = useCreateProduct('1');
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema) as Resolver<ProductForm>,
  });

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const openCreateModal = () => {
    setEditingProduct(null);
    reset({
      sku: '',
      name: '',
      description: '',
      categoryId: '1',
      unitPrice: 0,
      costPrice: 0,
      stock: 0,
      minStock: 5,
      unit: 'unidad',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    reset({
      sku: product.sku,
      name: product.name,
      description: product.description,
      categoryId: product.categoryId,
      unitPrice: product.unitPrice,
      costPrice: product.costPrice,
      stock: product.stock,
      minStock: product.minStock,
      unit: product.unit,
      isActive: product.isActive,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: ProductForm) => {
    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, data });
      } else {
        await createProduct.mutateAsync(data);
      }
      setIsModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const confirmDelete = async () => {
    if (deletingProduct) {
      try {
        await deleteProduct.mutateAsync(deletingProduct.id);
        setDeletingProduct(null);
        refetch();
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.stock <= 0) return { label: 'Sin stock', variant: 'danger' as const };
    if (product.stock <= product.minStock) return { label: 'Stock bajo', variant: 'warning' as const };
    return { label: 'Normal', variant: 'success' as const };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Productos</h1>
          <p className="text-secondary mt-1">Catálogo de productos y control de stock</p>
        </div>
        <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
          Nuevo Producto
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
              <input
                type="text"
                placeholder="Buscar producto por nombre o SKU..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <Table
            data={filteredProducts}
            columns={[
              { key: 'sku', header: 'SKU', render: (row) => <span className="font-mono font-medium">{row.sku}</span> },
              { key: 'name', header: 'Producto' },
              { key: 'categoryId', header: 'Categoría', render: (row) => (
                <span className="flex items-center gap-1"><Tag className="w-4 h-4" />{mockCategories.find(c => c.id === row.categoryId)?.name || row.categoryId}</span>
              )},
              { key: 'unitPrice', header: 'Precio Venta', render: (row) => (
                <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />S/ {row.unitPrice.toLocaleString()}</span>
              )},
              { key: 'costPrice', header: 'Costo', render: (row) => `S/ ${row.costPrice.toLocaleString()}` },
              { key: 'stock', header: 'Stock', render: (row) => (
                <span className="flex items-center gap-1"><Box className="w-4 h-4" />{row.stock}</span>
              )},
              { key: 'minStock', header: 'Stock Mín', render: (row) => row.minStock },
              { key: 'status', header: 'Estado', render: (row) => {
                const stockStatus = getStockStatus(row);
                return (
                  <Badge variant={stockStatus.variant}>
                    {stockStatus.label}
                  </Badge>
                );
              }},
              { key: 'isActive', header: 'Activo', render: (row) => (
                <Badge variant={row.isActive ? 'success' : 'default'}>
                  {row.isActive ? 'Sí' : 'No'}
                </Badge>
              )},
              { key: 'actions', header: 'Acciones', render: (row) => (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(row)}
                    className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-gray-100 transition-colors"
                    aria-label="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => { setDeletingProduct(row); }}
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
            emptyMessage="No se encontraron productos"
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="SKU" {...register('sku')} error={errors.sku?.message} placeholder="LAP001" />
            <Select
              label="Categoría"
              {...register('categoryId')}
              error={errors.categoryId?.message}
              options={mockCategories.map(c => ({ value: c.id, label: c.name }))}
            />
          </div>
           <Input label="Nombre" {...register('name')} error={errors.name?.message} placeholder='Nombre del producto' />
          <Input label="Descripción" {...register('description')} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Precio Venta (S/)" type="number" step="0.01" {...register('unitPrice', { valueAsNumber: true })} error={errors.unitPrice?.message} />
            <Input label="Costo (S/)" type="number" step="0.01" {...register('costPrice', { valueAsNumber: true })} error={errors.costPrice?.message} />
            <Input label="Unidad" {...register('unit')} error={errors.unit?.message} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Stock Actual" type="number" {...register('stock', { valueAsNumber: true })} error={errors.stock?.message} />
            <Input label="Stock Mínimo" type="number" {...register('minStock', { valueAsNumber: true })} error={errors.minStock?.message} />
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="isActive"
                {...register('isActive')}
                className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-text">Producto activo</label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting || createProduct.isPending || updateProduct.isPending}>
              {editingProduct ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!deletingProduct}
        onClose={() => setDeletingProduct(null)}
        title="Eliminar Producto"
        description={`¿Estás seguro de eliminar "${deletingProduct?.name}"? Esta acción no se puede deshacer.`}
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setDeletingProduct(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={deleteProduct.isPending}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </div>
  );
}