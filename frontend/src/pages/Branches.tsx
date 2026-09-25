import { useState } from 'react';
import { Plus, Search, Edit, Trash2, MapPin, Phone, Mail } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, Badge, Modal } from '../components/ui/Table';
import { useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch } from '../hooks/useApi';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Branch } from '../types';
import { branchSchema, type BranchForm } from '../schemas';

export function Branches() {
  const [search, setSearch] = useState('');
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: branches, isLoading, refetch } = useBranches('1');
  const createBranch = useCreateBranch('1');
  const updateBranch = useUpdateBranch();
  const deleteBranch = useDeleteBranch();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BranchForm>({
    resolver: zodResolver(branchSchema) as Resolver<BranchForm>,
  });

  const filteredBranches = branches?.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.code.toLowerCase().includes(search.toLowerCase()) ||
    b.city.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const openCreateModal = () => {
    setEditingBranch(null);
    reset({ name: '', code: '', address: '', city: '', country: 'Perú', phone: '', email: '', isActive: true });
    setIsModalOpen(true);
  };

  const openEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    reset({
      name: branch.name,
      code: branch.code,
      address: branch.address,
      city: branch.city,
      country: branch.country,
      phone: branch.phone,
      email: branch.email,
      isActive: branch.isActive,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: BranchForm) => {
    try {
      if (editingBranch) {
        await updateBranch.mutateAsync({ id: editingBranch.id, data });
      } else {
        await createBranch.mutateAsync(data);
      }
      setIsModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Error saving branch:', error);
    }
  };

  const confirmDelete = async () => {
    if (deletingBranch) {
      try {
        await deleteBranch.mutateAsync(deletingBranch.id);
        setDeletingBranch(null);
        refetch();
      } catch (error) {
        console.error('Error deleting branch:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Sucursales</h1>
          <p className="text-secondary mt-1">Gestión de sedes y puntos de venta</p>
        </div>
        <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
          Nueva Sucursal
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
              <input
                type="text"
                placeholder="Buscar sucursal..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          <Table
            data={filteredBranches}
            columns={[
              { key: 'code', header: 'Código', render: (row) => <span className="font-mono font-medium">{row.code}</span> },
              { key: 'name', header: 'Nombre' },
              { key: 'city', header: 'Ciudad', render: (row) => (
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{row.city}</span>
              )},
              { key: 'address', header: 'Dirección' },
              { key: 'phone', header: 'Teléfono', render: (row) => (
                <span className="flex items-center gap-1"><Phone className="w-4 h-4" />{row.phone || '-'}</span>
              )},
              { key: 'email', header: 'Email', render: (row) => (
                <span className="flex items-center gap-1"><Mail className="w-4 h-4" />{row.email || '-'}</span>
              )},
              { key: 'isActive', header: 'Estado', render: (row) => (
                <Badge variant={row.isActive ? 'success' : 'danger'}>
                  {row.isActive ? 'Activa' : 'Inactiva'}
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
                    onClick={() => { setDeletingBranch(row); }}
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
            emptyMessage="No se encontraron sucursales"
          />
        </CardContent>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nombre" {...register('name')} error={errors.name?.message} />
            <Input label="Código" {...register('code')} error={errors.code?.message} placeholder="LIM01" />
          </div>
          <Input label="Dirección" {...register('address')} error={errors.address?.message} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Ciudad" {...register('city')} error={errors.city?.message} />
            <Input label="País" {...register('country')} error={errors.country?.message} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Teléfono" type="tel" {...register('phone')} error={errors.phone?.message} />
            <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              {...register('isActive')}
              className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-text">Sucursal activa</label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting || createBranch.isPending || updateBranch.isPending}>
              {editingBranch ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!deletingBranch}
        onClose={() => setDeletingBranch(null)}
        title="Eliminar Sucursal"
        description={`¿Estás seguro de eliminar "${deletingBranch?.name}"? Esta acción no se puede deshacer.`}
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setDeletingBranch(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={deleteBranch.isPending}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </div>
  );
}