import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  
} from 'recharts';
import {
  Download,
  Printer,
  Filter,
  Calendar
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Table, Badge } from '../components/ui/Table';
import {
  useSalesByBranch, useSalesByProduct, useTargetCompliance,
  useInventoryRotation, useOperationResults, useBranches, useProducts
} from '../hooks/useApi';

const COLORS = ['#2563EB', '#06B6D4', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function Reports() {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [activeTab, setActiveTab] = useState('overview');

  const { data: salesByBranch } = useSalesByBranch('1', { startDate: dateRange.start, endDate: dateRange.end });
  const { data: salesByProduct } = useSalesByProduct('1', { startDate: dateRange.start, endDate: dateRange.end });
  const { data: targetCompliance } = useTargetCompliance('1', { startDate: dateRange.start, endDate: dateRange.end });
  const { data: inventoryRotation } = useInventoryRotation('1');
  const { data: operationResults } = useOperationResults('1');
  const { data: branches } = useBranches('1');
  const { data: products } = useProducts('1');

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: <BarChart className="w-4 h-4" /> },
    { id: 'sales', label: 'Ventas', icon: <BarChart className="w-4 h-4" /> },
    { id: 'targets', label: 'Metas', icon: <Calendar className="w-4 h-4" /> },
    { id: 'inventory', label: 'Inventario', icon: <BarChart className="w-4 h-4" /> },
    { id: 'operations', label: 'Operaciones', icon: <BarChart className="w-4 h-4" /> },
  ];

  const branchChartData = salesByBranch?.map((item, i) => ({
    name: item.branch.name,
    revenue: item.revenue,
    quantity: item.quantity,
    color: COLORS[i % COLORS.length],
  })) || [];

  const productChartData = salesByProduct?.map((item, i) => ({
    name: item.product.name,
    revenue: item.revenue,
    quantity: item.quantity,
    color: COLORS[i % COLORS.length],
  })) || [];

  const complianceData = targetCompliance?.map(item => ({
    name: item.target.branchId
      ? branches?.find(b => b.id === item.target.branchId)?.name || 'Sucursal'
      : item.target.productId
        ? products?.find(p => p.id === item.target.productId)?.name || 'Producto'
        : 'Empresa',
    compliance: Math.round(item.compliance),
    target: item.target.targetValue,
    achieved: item.target.achievedValue,
  })) || [];

  const rotationData = inventoryRotation?.slice(0, 10).map(item => ({
    name: item.product.name,
    rotation: Math.round(item.rotation * 10) / 10,
    daysOfStock: item.daysOfStock,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Reportes y Análisis</h1>
          <p className="text-secondary mt-1">Indicadores ejecutivos y análisis de desempeño</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" leftIcon={<Filter className="w-4 h-4" />}>Filtros</Button>
          <Button variant="outline" leftIcon={<Download className="w-4 h-4" />}>Exportar PDF</Button>
          <Button variant="outline" leftIcon={<Printer className="w-4 h-4" />}>Imprimir</Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative max-w-md flex-1">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
          <input
            type="date"
            value={dateRange.start}
            onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div className="relative max-w-md flex-1">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
          <input
            type="date"
            value={dateRange.end}
            onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      <div className="border-b border-border">
        <nav className="flex gap-1" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              id={`${tab.id}-tab`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-secondary hover:text-text hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Ventas por Sucursal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={branchChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis type="number" tickFormatter={v => `S/ ${(v/1000).toFixed(0)}k`} stroke="#64748B" fontSize={12} />
                    <YAxis dataKey="name" type="category" width={100} stroke="#64748B" fontSize={12} />
                    <Tooltip formatter={(value) => [`S/ ${Number(value ?? 0).toLocaleString()}`, 'Ingresos']} contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }} />
                    <Bar dataKey="revenue" name="Ingresos" radius={[0, 4, 4, 0]}>
                      {branchChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Productos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={productChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="revenue" nameKey="name" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                      {productChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [`S/ ${Number(value ?? 0).toLocaleString()}`, 'Ingresos']} contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cumplimiento de Metas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={complianceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis type="number" tickFormatter={v => `${v}%`} stroke="#64748B" fontSize={12} domain={[0, 120]} />
                    <YAxis dataKey="name" type="category" width={100} stroke="#64748B" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }} />
                    <Bar dataKey="target" name="Meta" fill="#E2E8F0" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="achieved" name="Alcanzado" fill="#2563EB" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rotación de Inventario</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rotationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                    <YAxis yAxisId="left" stroke="#64748B" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" stroke="#64748B" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="rotation" name="Rotación" stroke="#2563EB" strokeWidth={2} dot={{ r: 4 }} />
                    <Line yAxisId="right" type="monotone" dataKey="daysOfStock" name="Días Stock" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'sales' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Ventas por Sucursal (Detalle)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table
                data={salesByBranch || []}
                columns={[
                  { key: 'branch', header: 'Sucursal', render: (row) => row.branch.name },
                  { key: 'revenue', header: 'Ingresos', render: (row) => `S/ ${row.revenue.toLocaleString()}` },
                  { key: 'quantity', header: 'Unidades', render: (row) => row.quantity.toLocaleString() },
                ]}
                keyExtractor={row => row.branch.id}
                emptyMessage="Sin datos"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ventas por Producto (Detalle)</CardTitle>
            </CardHeader>
            <CardContent>
              <Table
                data={salesByProduct || []}
                columns={[
                  { key: 'product', header: 'Producto', render: (row) => row.product.name },
                  { key: 'revenue', header: 'Ingresos', render: (row) => `S/ ${row.revenue.toLocaleString()}` },
                  { key: 'quantity', header: 'Unidades', render: (row) => row.quantity.toLocaleString() },
                ]}
                keyExtractor={row => row.product.id}
                emptyMessage="Sin datos"
              />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'targets' && (
        <Card>
          <CardHeader>
            <CardTitle>Cumplimiento de Metas Detallado</CardTitle>
          </CardHeader>
          <CardContent>
            <Table
              data={targetCompliance || []}
              columns={[
                { key: 'target', header: 'Meta', render: (row) => (
                  <div>
                    <p className="font-medium">{row.target.branchId
                      ? `Sucursal ${branches?.find(b => b.id === row.target.branchId)?.name || row.target.branchId}`
                      : row.target.productId
                        ? `Producto ${products?.find(p => p.id === row.target.productId)?.name || row.target.productId}`
                        : 'Meta empresa'}</p>
                    <p className="text-sm text-secondary">{row.target.type} - {row.target.period}</p>
                  </div>
                )},
                { key: 'targetValue', header: 'Objetivo', render: (row) => row.target.targetValue.toLocaleString() },
                { key: 'achievedValue', header: 'Alcanzado', render: (row) => row.target.achievedValue.toLocaleString() },
                { key: 'compliance', header: 'Cumplimiento', render: (row) => (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(row.compliance, 100)}%` }} />
                    </div>
                    <span className={`font-medium ${row.compliance >= 100 ? 'text-success' : row.compliance >= 70 ? 'text-warning' : 'text-danger'}`}>
                      {row.compliance.toFixed(1)}%
                    </span>
                  </div>
                )},
              ]}
              keyExtractor={row => row.target.id}
              emptyMessage="Sin metas configuradas"
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'inventory' && (
        <Card>
          <CardHeader>
            <CardTitle>Rotación de Inventario</CardTitle>
          </CardHeader>
          <CardContent>
            <Table
              data={inventoryRotation || []}
              columns={[
                { key: 'product', header: 'Producto', render: (row) => row.product.name },
                { key: 'rotation', header: 'Rotación (veces/año)', render: (row) => row.rotation.toFixed(1) },
                { key: 'daysOfStock', header: 'Días de Stock', render: (row) => row.daysOfStock },
                { key: 'status', header: 'Estado', render: (row) => (
                  <Badge variant={row.daysOfStock < 15 ? 'danger' : row.daysOfStock < 30 ? 'warning' : 'success'}>
                    {row.daysOfStock < 15 ? 'Crítico' : row.daysOfStock < 30 ? 'Bajo' : 'Normal'}
                  </Badge>
                )},
              ]}
              keyExtractor={row => row.product.id}
              emptyMessage="Sin datos de inventario"
            />
          </CardContent>
        </Card>
      )}

      {activeTab === 'operations' && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados de Operaciones Matemáticas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table
              data={operationResults || []}
              columns={[
                { key: 'type', header: 'Tipo' },
                { key: 'name', header: 'Nombre' },
                { key: 'status', header: 'Estado', render: (row) => (
                  <Badge variant={row.status === 'completed' ? 'success' : row.status === 'pending' ? 'warning' : 'danger'}>
                    {row.status}
                  </Badge>
                )},
                { key: 'executionTimeMs', header: 'Tiempo (ms)' },
                { key: 'createdAt', header: 'Fecha', render: (row) => new Date(row.createdAt).toLocaleString('es-PE') },
              ]}
              keyExtractor={row => row.id}
              emptyMessage="Sin operaciones ejecutadas"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}