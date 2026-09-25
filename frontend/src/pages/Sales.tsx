import { useState } from 'react';
import { Plus, Search, Eye, Edit, Trash2, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, Badge } from '../components/ui/Table';
import { useSales, useBranches } from '../hooks/useApi';

export function Sales() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data: branches } = useBranches('1');
  const { data: salesData, isLoading } = useSales('1', {
    page: currentPage,
    pageSize,
  });

  const sales = salesData?.data || [];
  const total = salesData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const filteredSales = sales.filter(s =>
    s.saleNumber.toLowerCase().includes(search.toLowerCase()) &&
    (statusFilter === 'all' || s.status === statusFilter)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Ventas</h1>
          <p className="text-secondary mt-1">Registro y consulta de transacciones de venta</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />}>Filtros</Button>
          <Button leftIcon={<Plus className="w-4 h-4" />}>Nueva Venta</Button>
        </div>
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
              { key: 'date', header: 'Fecha', render: (row) => new Date(row.date).toLocaleString('es-PE') },
              { key: 'branchId', header: 'Sucursal', render: (row) => branches?.find(b => b.id === row.branchId)?.name || row.branchId },
              { key: 'subtotal', header: 'Subtotal', render: (row) => `S/ ${row.subtotal.toLocaleString()}` },
              { key: 'tax', header: 'IGV', render: (row) => `S/ ${row.tax.toLocaleString()}` },
              { key: 'total', header: 'Total', render: (row) => <span className="font-medium">S/ {row.total.toLocaleString()}</span> },
              { key: 'status', header: 'Estado', render: (row) => (
                <Badge variant={row.status === 'confirmed' ? 'success' : row.status === 'draft' ? 'warning' : 'danger'}>
                  {row.status === 'confirmed' ? 'Confirmada' : row.status === 'draft' ? 'Borrador' : 'Cancelada'}
                </Badge>
              )},
              { key: 'actions', header: 'Acciones', render: (_row) => (
                <div className="flex items-center gap-1">
                  <button className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-gray-100" aria-label="Ver"><Eye className="w-4 h-4" /></button>
                  <button className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-gray-100" aria-label="Editar"><Edit className="w-4 h-4" /></button>
                  <button className="p-2 rounded-lg text-secondary hover:text-danger hover:bg-gray-100" aria-label="Eliminar"><Trash2 className="w-4 h-4" /></button>
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
    </div>
  );
}