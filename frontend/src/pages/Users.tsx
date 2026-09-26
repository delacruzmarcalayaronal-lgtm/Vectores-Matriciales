import { useState } from 'react';
import { Plus, Search, Eye, Edit, Trash2, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, Badge, Avatar, Modal } from '../components/ui/Table';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from '../hooks/useApi';
import { ROLE_LABELS, ROLE_ICONS } from '../lib/permissions';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { User } from '../types';
import { userCreateSchema, userUpdateSchema, type UserCreateForm, type UserUpdateForm } from '../schemas';

const ROLE_BADGES: Record<User['role'], 'primary' | 'warning' | 'info' | 'success'> = {
  admin: 'primary',
  manager: 'warning',
  analyst: 'info',
  operator: 'success',
};

export function Users() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const pageSize = 10;

  const { data: users = [], isLoading, refetch } = useUsers('1');
  const createUser = useCreateUser('1');
  const updateUser = useUpdateUser('1');
  const deleteUser = useDeleteUser('1');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserCreateForm | UserUpdateForm>({
    resolver: zodResolver(
      editingUser ? userUpdateSchema : userCreateSchema
    ) as Resolver<UserCreateForm | UserUpdateForm>,
  });

  const filteredUsers = users.filter(u =>
    (u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.dni || '').includes(search)) &&
    (roleFilter === 'all' || u.role === roleFilter)
  );

  const total = filteredUsers.length;
  const totalPages = Math.ceil(total / pageSize);
  const pageUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openCreateModal = () => {
    setEditingUser(null);
    reset({ name: '', email: '', dni: '', role: 'operator', password: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    reset({ name: user.name, email: user.email, dni: user.dni || '', role: user.role, password: '' });
    setIsModalOpen(true);
  };

  const onSubmit = async (data: UserCreateForm | UserUpdateForm) => {
    try {
      if (editingUser) {
        const { password, ...rest } = data as UserUpdateForm;
        await updateUser.mutateAsync({
          id: editingUser.id,
          data: { ...rest, email: rest.email || undefined, ...(password ? { password } : {}) },
        });
      } else {
        await createUser.mutateAsync(data as UserCreateForm);
      }
      setIsModalOpen(false);
      refetch();
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const confirmDelete = async () => {
    if (deletingUser) {
      try {
        await deleteUser.mutateAsync(deletingUser.id);
        setDeletingUser(null);
        refetch();
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Usuarios</h1>
          <p className="text-secondary mt-1">Gestión de usuarios y permisos del sistema</p>
        </div>
        <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>Nuevo Usuario</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4">
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
              <input
                type="text"
                placeholder="Buscar por nombre, correo o DNI..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <Select
              value={roleFilter}
              onChange={e => { setRoleFilter(e.target.value); setCurrentPage(1); }}
              options={[
                { value: 'all', label: 'Todos los roles' },
                { value: 'admin', label: ROLE_LABELS.admin },
                { value: 'manager', label: ROLE_LABELS.manager },
                { value: 'analyst', label: ROLE_LABELS.analyst },
                { value: 'operator', label: ROLE_LABELS.operator },
              ]}
              className="w-full sm:w-56"
            />
          </div>

          <Table
            data={pageUsers}
            columns={[
              {
                key: 'name',
                header: 'Usuario',
                render: (row) => (
                  <div className="flex items-center gap-3">
                    <Avatar name={row.name} size="sm" />
                    <div>
                      <p className="font-medium text-text">{row.name}</p>
                      <p className="text-xs text-secondary">{row.email}</p>
                    </div>
                  </div>
                ),
              },
              { key: 'dni', header: 'DNI', render: (row) => <span className="font-mono">{row.dni || '—'}</span> },
              {
                key: 'role',
                header: 'Rol',
                render: (row) => (
                  <Badge variant={ROLE_BADGES[row.role]}>
                    {ROLE_ICONS[row.role]} {ROLE_LABELS[row.role]}
                  </Badge>
                ),
              },
              { key: 'createdAt', header: 'Registro', render: (row) => new Date(row.createdAt).toLocaleDateString('es-PE') },
              {
                key: 'actions',
                header: 'Acciones',
                render: (row) => (
                  <div className="flex items-center gap-1">
                    <button onClick={() => setViewingUser(row)} className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-gray-100" aria-label="Ver"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => openEditModal(row)} className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-gray-100" aria-label="Editar"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => setDeletingUser(row)} className="p-2 rounded-lg text-secondary hover:text-danger hover:bg-gray-100" aria-label="Eliminar"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ),
              },
            ]}
            keyExtractor={row => row.id}
            isLoading={isLoading}
            emptyMessage="No se encontraron usuarios"
          />

          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-border flex items-center justify-between">
              <p className="text-sm text-secondary">
                Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, total)} de {total} usuarios
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
        title={editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Nombre completo" {...register('name')} error={errors.name?.message} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Email" type="email" {...register('email')} error={errors.email?.message} />
            <Input label="DNI" {...register('dni')} error={errors.dni?.message} placeholder="12345678" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Rol"
              {...register('role')}
              options={[
                { value: 'admin', label: ROLE_LABELS.admin },
                { value: 'manager', label: ROLE_LABELS.manager },
                { value: 'analyst', label: ROLE_LABELS.analyst },
                { value: 'operator', label: ROLE_LABELS.operator },
              ]}
              error={errors.role?.message}
            />
            <Input
              label={editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña'}
              type="password"
              autoComplete="new-password"
              {...register('password')}
              error={errors.password?.message}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting || createUser.isPending || updateUser.isPending}>
              {editingUser ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!viewingUser}
        onClose={() => setViewingUser(null)}
        title="Detalle del Usuario"
      >
        {viewingUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={viewingUser.name} size="lg" />
              <div>
                <p className="text-lg font-semibold text-text">{viewingUser.name}</p>
                <p className="text-sm text-secondary">{viewingUser.email}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-secondary">DNI</dt>
                <dd className="font-mono text-text">{viewingUser.dni || '—'}</dd>
              </div>
              <div>
                <dt className="text-secondary">Rol</dt>
                <dd><Badge variant={ROLE_BADGES[viewingUser.role]}>{ROLE_ICONS[viewingUser.role]} {ROLE_LABELS[viewingUser.role]}</Badge></dd>
              </div>
              <div>
                <dt className="text-secondary">Registro</dt>
                <dd className="text-text">{new Date(viewingUser.createdAt).toLocaleString('es-PE')}</dd>
              </div>
              <div>
                <dt className="text-secondary">Última actualización</dt>
                <dd className="text-text">{new Date(viewingUser.updatedAt).toLocaleString('es-PE')}</dd>
              </div>
            </dl>
            <div className="flex justify-end pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setViewingUser(null)}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        title="Eliminar Usuario"
        description={`¿Estás seguro de eliminar "${deletingUser?.name}"? Esta acción no se puede deshacer.`}
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setDeletingUser(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDelete} loading={deleteUser.isPending}>
            Eliminar
          </Button>
        </div>
      </Modal>

      <p className="text-xs text-secondary flex items-center gap-1.5">
        <UserPlus className="w-4 h-4" />
        Los usuarios aparecen aquí a medida que se registran en la plataforma.
      </p>
    </div>
  );
}
