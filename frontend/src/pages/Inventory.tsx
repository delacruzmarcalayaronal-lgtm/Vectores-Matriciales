import { useState } from 'react';
import { Plus, Search, Eye, Edit, Trash2, Box, ArrowUp, ArrowDown, Minus, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Table, Badge } from '../components/ui/Table';
import { useInventoryMovements } from '../hooks/useApi';

export function Inventory() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const { data: movements, isLoading } = useInventoryMovements('1');

  const filteredMovements = (movements || []).filter(m =>
    (m.product?.name || m.productId).toLowerCase().includes(search.toLowerCase()) &&
    (typeFilter === 'all' || m.type === typeFilter)
  );

  const paginatedMovements = filteredMovements.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const totalPages = Math.ceil(filteredMovements.length / pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Inventario</h1>
          <p className="text-secondary mt-1">Control de existencias y movimientos de stock</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />}>Filtros</Button>
          <Button leftIcon={<Plus className="w-4 h-4" />}>Nuevo Movimiento</Button>
        </div>
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
                <Badge variant={
                  row.type === 'in' ? 'success' :
                  row.type === 'out' ? 'danger' :
                  row.type === 'adjustment' ? 'warning' : 'info'
                }>
                  {row.type === 'in' ? 'Entrada' : row.type === 'out' ? 'Salida' : row.type === 'adjustment' ? 'Ajuste' : 'Transferencia'}
                </Badge>
              )},
              { key: 'quantity', header: 'Cantidad', render: (row) => (
                <span className={`font-mono ${row.type === 'in' ? 'text-success' : row.type === 'out' ? 'text-danger' : ''}`}>
                  {row.type === 'in' ? '+' : row.type === 'out' ? '-' : ''}{row.quantity}
                </span>
              )},
              { key: 'reference', header: 'Referencia', render: (row) => row.reference },
              { key: 'notes', header: 'Notas', render: (row) => row.notes || '-' },
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
    </div>
  );
}