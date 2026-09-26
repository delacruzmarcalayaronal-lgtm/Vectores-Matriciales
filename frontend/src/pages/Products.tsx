import { useState } from 'react';
import { Plus, Search, Edit, Trash2, Tag, DollarSign, Box, FolderTree } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, Badge, Modal } from '../components/ui/Table';
import {
  useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
  useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory,
} from '../hooks/useApi';
import { useAuth } from '../contexts/useAuth';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Product, Category } from '../types';
import { productSchema, categorySchema, type ProductForm, type CategoryForm } from '../schemas';
import { formatCurrency } from '../utils/format';

export function Products() {
  const [search, setSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [isCategoryFormOpen, setIsCategoryFormOpen] = useState(false);

  const { user } = useAuth();
  const canManageCategories = user?.role === 'admin' || user?.role === 'manager';

  const { data: products, isLoading, refetch } = useProducts('1');
  const { data: categories } = useCategories('1');
  const createProduct = useCreateProduct('1');
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const createCategory = useCreateCategory('1');
  const updateCategory = useUpdateCategory('1');
  const deleteCategory = useDeleteCategory('1');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductForm>({
    resolver: zodResolver(productSchema) as Resolver<ProductForm>,
  });

  const {
    register: registerCategory,
    handleSubmit: handleSubmitCategory,
    reset: resetCategory,
    formState: { errors: categoryErrors, isSubmitting: isCategorySubmitting },
  } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema) as Resolver<CategoryForm>,
  });

  const filteredProducts = products?.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const openCreateCategoryForm = () => {
    setEditingCategory(null);
    resetCategory({ name: '', description: '' });
    setIsCategoryFormOpen(true);
  };

  const openEditCategoryForm = (category: Category) => {
    setEditingCategory(category);
    resetCategory({ name: category.name, description: category.description || '' });
    setIsCategoryFormOpen(true);
  };

  const onSubmitCategory = async (data: CategoryForm) => {
    try {
      if (editingCategory) {
        await updateCategory.mutateAsync({ id: editingCategory.id, data });
      } else {
        await createCategory.mutateAsync(data);
      }
      setIsCategoryFormOpen(false);
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const confirmDeleteCategory = async () => {
    if (deletingCategory) {
      try {
        await deleteCategory.mutateAsync(deletingCategory.id);
        setDeletingCategory(null);
      } catch (error) {
        console.error('Error deleting category:', error);
      }
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    reset({
      sku: '',
      name: '',
      description: '',
      categoryId: categories?.[0]?.id || '',
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
        <div className="flex items-center gap-2">
          <Button variant="outline" leftIcon={<FolderTree className="w-4 h-4" />} onClick={() => setIsCategoryModalOpen(true)}>
            Categorías
          </Button>
          <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
            Nuevo Producto
          </Button>
        </div>
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
                <span className="flex items-center gap-1"><Tag className="w-4 h-4" />{categories?.find(c => c.id === row.categoryId)?.name || row.categoryId}</span>
              )},
              { key: 'unitPrice', header: 'Precio Venta', render: (row) => (
                <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />{formatCurrency(row.unitPrice)}</span>
              )},
              { key: 'costPrice', header: 'Costo', render: (row) => formatCurrency(row.costPrice) },
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
              options={(categories || []).map(c => ({ value: c.id, label: c.name }))}
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

      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title="Gestión de Categorías"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex justify-end">
            {canManageCategories && (
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateCategoryForm}>
                Nueva Categoría
              </Button>
            )}
          </div>
          <Table
            data={categories || []}
            columns={[
              { key: 'name', header: 'Nombre' },
              { key: 'description', header: 'Descripción', render: (row) => row.description || '—' },
              ...(canManageCategories ? [{
                key: 'actions',
                header: 'Acciones',
                render: (row: Category) => (
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditCategoryForm(row)} className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-gray-100" aria-label="Editar"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => setDeletingCategory(row)} className="p-2 rounded-lg text-secondary hover:text-danger hover:bg-gray-100" aria-label="Eliminar"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ),
              }] : []),
            ]}
            keyExtractor={row => row.id}
            emptyMessage="No hay categorías registradas"
          />
        </div>
      </Modal>

      <Modal
        isOpen={isCategoryFormOpen}
        onClose={() => setIsCategoryFormOpen(false)}
        title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
      >
        <form onSubmit={handleSubmitCategory(onSubmitCategory)} className="space-y-4">
          <Input label="Nombre" {...registerCategory('name')} error={categoryErrors.name?.message} placeholder="Computadoras" />
          <Input label="Descripción" {...registerCategory('description')} error={categoryErrors.description?.message} />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsCategoryFormOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isCategorySubmitting || createCategory.isPending || updateCategory.isPending}>
              {editingCategory ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        title="Eliminar Categoría"
        description={`¿Estás seguro de eliminar "${deletingCategory?.name}"? Si tiene productos asociados no podrá eliminarse.`}
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setDeletingCategory(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDeleteCategory} loading={deleteCategory.isPending}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </div>
  );
}