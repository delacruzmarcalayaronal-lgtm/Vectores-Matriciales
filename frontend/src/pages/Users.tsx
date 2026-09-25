import { useState } from 'react';
import { Plus, Search, Eye, Edit, Trash2, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, Badge, Avatar } from '../components/ui/Table';
import { useUsers } from '../hooks/useApi';
import { ROLE_LABELS, ROLE_ICONS } from '../lib/permissions';
import type { User } from '../types';

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
  const pageSize = 10;

  const { data: users = [], isLoading } = useUsers('1');

  const filteredUsers = users.filter(u =>
    (u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.dni || '').includes(search)) &&
    (roleFilter === 'all' || u.role === roleFilter)
  );

  const total = filteredUsers.length;
  const totalPages = Math.ceil(total / pageSize);
  const pageUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Usuarios</h1>
          <p className="text-secondary mt-1">Gestión de usuarios y permisos del sistema</p>
        </div>
        <Button leftIcon={<Plus className="w-4 h-4" />}>Nuevo Usuario</Button>
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
                render: () => (
                  <div className="flex items-center gap-1">
                    <button className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-gray-100" aria-label="Ver"><Eye className="w-4 h-4" /></button>
                    <button className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-gray-100" aria-label="Editar"><Edit className="w-4 h-4" /></button>
                    <button className="p-2 rounded-lg text-secondary hover:text-danger hover:bg-gray-100" aria-label="Eliminar"><Trash2 className="w-4 h-4" /></button>
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

      <p className="text-xs text-secondary flex items-center gap-1.5">
        <UserPlus className="w-4 h-4" />
        Los usuarios aparecen aquí a medida que se registran en la plataforma.
      </p>
    </div>
  );
}
