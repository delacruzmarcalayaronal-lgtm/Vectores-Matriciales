import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Calendar,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Table, Badge, Modal } from '../components/ui/Table';
import {
  useSalesByBranch, useSalesByProduct, useTargetCompliance,
  useInventoryRotation, useOperationResults, useBranches, useProducts,
  useCreateTarget, useUpdateTarget, useDeleteTarget,
} from '../hooks/useApi';
import { useAuth } from '../contexts/useAuth';
import { useNotice } from '../hooks/useNotice';
import { innerPercentLabel, darkTooltipStyle, legendFormatter, metaComplianceTooltip } from '../lib/chartLabels';
import { ChartZoom } from '../components/charts/ChartZoom';
import { useForm, type Resolver } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { zodResolver } from '@hookform/resolvers/zod';
import { targetSchema, type TargetForm } from '../schemas';
import type { Target } from '../types';

const COLORS = ['#2563EB', '#06B6D4', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function Reports() {
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [editingTarget, setEditingTarget] = useState<Target | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<Target | null>(null);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [printAll, setPrintAll] = useState(false);

  const { user } = useAuth();
  const { show, notice } = useNotice();
  const canManageTargets = user?.role === 'admin' || user?.role === 'manager';

  const { data: salesByBranch } = useSalesByBranch('1', { startDate: dateRange.start, endDate: dateRange.end });
  const { data: salesByProduct } = useSalesByProduct('1', { startDate: dateRange.start, endDate: dateRange.end });
  const { data: targetCompliance } = useTargetCompliance('1', { startDate: dateRange.start, endDate: dateRange.end });
  const { data: inventoryRotation } = useInventoryRotation('1');
  const { data: operationResults } = useOperationResults('1');
  const { data: branches } = useBranches('1');
  const { data: products } = useProducts('1');
  const createTarget = useCreateTarget('1');
  const updateTarget = useUpdateTarget('1');
  const deleteTarget = useDeleteTarget('1');
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TargetForm>({
    resolver: zodResolver(targetSchema) as Resolver<TargetForm>,
  });

  const refreshTargets = async () => {
    await queryClient.invalidateQueries({ queryKey: ['targets'] });
    await queryClient.invalidateQueries({ queryKey: ['reports', 'target-compliance'] });
  };

  const handlePrint = () => {
    window.print();
  };

  const handlePrintAll = () => {
    setPrintAll(true);
  };

  useEffect(() => {
    if (!printAll) return;
    const onAfterPrint = () => setPrintAll(false);
    window.addEventListener('afterprint', onAfterPrint);
    const timer = window.setTimeout(() => window.print(), 500);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('afterprint', onAfterPrint);
    };
  }, [printAll]);

  const handleExportPdf = () => {
    const previousTitle = document.title;
    document.title = `Reportes_MatrixFlow_${new Date().toISOString().slice(0, 10)}`;
    show('Elige "Guardar como PDF" en el diálogo de impresión.');
    window.setTimeout(() => {
      window.print();
      document.title = previousTitle;
    }, 400);
  };

  const openCreateTargetModal = () => {
    setEditingTarget(null);
    reset({
      branchId: '',
      productId: '',
      period: new Date().toISOString().slice(0, 7),
      targetValue: 0,
      achievedValue: 0,
      type: 'revenue',
    });
    setIsTargetModalOpen(true);
  };

  const openEditTargetModal = (target: Target) => {
    setEditingTarget(target);
    reset({
      branchId: target.branchId || '',
      productId: target.productId || '',
      period: target.period,
      targetValue: target.targetValue,
      achievedValue: target.achievedValue,
      type: target.type,
    });
    setIsTargetModalOpen(true);
  };

  const onSubmitTarget = async (data: TargetForm) => {
    try {
      const payload = {
        branchId: data.branchId || undefined,
        productId: data.productId || undefined,
        period: data.period,
        targetValue: data.targetValue,
        achievedValue: data.achievedValue,
        type: data.type,
      };
      if (editingTarget) {
        await updateTarget.mutateAsync({ id: editingTarget.id, data: payload });
      } else {
        await createTarget.mutateAsync(payload);
      }
      setIsTargetModalOpen(false);
      await refreshTargets();
    } catch (error) {
      console.error('Error saving target:', error);
    }
  };

  const confirmDeleteTarget = async () => {
    if (deletingTarget) {
      try {
        await deleteTarget.mutateAsync(deletingTarget.id);
        setDeletingTarget(null);
        await refreshTargets();
      } catch (error) {
        console.error('Error deleting target:', error);
      }
    }
  };

  const tabs = [
    { id: 'overview', label: 'Resumen', icon: <BarChart className="w-4 h-4" /> },
    { id: 'sales', label: 'Ventas', icon: <BarChart className="w-4 h-4" /> },
    { id: 'targets', label: 'Metas', icon: <Calendar className="w-4 h-4" /> },
    { id: 'inventory', label: 'Inventario', icon: <BarChart className="w-4 h-4" /> },
    { id: 'operations', label: 'Operaciones', icon: <BarChart className="w-4 h-4" /> },
  ];

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab = tabs.some(tab => tab.id === requestedTab) ? requestedTab! : 'overview';
  const setActiveTab = (id: string) => setSearchParams({ tab: id }, { replace: true });

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
    <div className="space-y-6" id="report-print">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-text">Reportes y Análisis</h1>
          <p className="text-secondary mt-1">Indicadores ejecutivos y análisis de desempeño</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={handleExportPdf}
          >
            Exportar PDF
          </Button>
          <Button variant="outline" leftIcon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
            Imprimir
          </Button>
          <Button leftIcon={<Printer className="w-4 h-4" />} onClick={handlePrintAll}>
            Imprimir todo
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 print:hidden">
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

      <div className="border-b border-border print:hidden">
        <nav className="flex gap-1 overflow-x-auto snap-x no-scrollbar" role="tablist">
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`${tab.id}-panel`}
              id={`${tab.id}-tab`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-none whitespace-nowrap snap-start flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
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

      {(printAll || activeTab === 'overview') && (
        <section className="print-report-section">
          <h2 className="print-report-title">Resumen</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print-charts-grid">
          <Card className="print-chart-page">
            <CardHeader>
              <CardTitle>Ventas por Sucursal</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartZoom title="Ventas por Sucursal">
              <div className="h-[520px] report-chart">
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
              </ChartZoom>
            </CardContent>
          </Card>

          <Card className="print-chart-page">
            <CardHeader>
              <CardTitle>Top Productos</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartZoom title="Top Productos">
              <div className="h-[520px] report-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={productChartData} cx="50%" cy="50%" innerRadius={75} outerRadius={165} paddingAngle={2} dataKey="revenue" nameKey="name" label={innerPercentLabel} labelLine={false}>
                      {productChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [`S/ ${Number(value ?? 0).toLocaleString()}`, 'Ingresos']} contentStyle={darkTooltipStyle} />
                    <Legend formatter={legendFormatter} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              </ChartZoom>
            </CardContent>
          </Card>

          <Card className="print-chart-page">
            <CardHeader>
              <CardTitle>Cumplimiento de Metas</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartZoom title="Cumplimiento de Metas">
              <div className="h-[520px] report-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={complianceData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis type="number" tickFormatter={v => `${v}%`} stroke="#64748B" fontSize={12} domain={[0, 120]} />
                    <YAxis dataKey="name" type="category" width={100} stroke="#64748B" fontSize={12} />
                    <Tooltip content={metaComplianceTooltip} />
                    <Bar dataKey="compliance" name="Cumplimiento %" fill="#22C55E" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              </ChartZoom>
            </CardContent>
          </Card>

          <Card className="print-chart-page">
            <CardHeader>
              <CardTitle>Rotación de Inventario</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartZoom title="Rotación de Inventario">
              <div className="h-[520px] report-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rotationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={12} interval="preserveStartEnd" tickMargin={8} />
                    <YAxis yAxisId="left" stroke="#64748B" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" stroke="#64748B" fontSize={12} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="rotation" name="Rotación" stroke="#2563EB" strokeWidth={2} dot={{ r: 4 }} />
                    <Line yAxisId="right" type="monotone" dataKey="daysOfStock" name="Días Stock" stroke="#F59E0B" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              </ChartZoom>
            </CardContent>
          </Card>
        </div>
        </section>
      )}

      {(printAll || activeTab === 'sales') && (
        <section className="print-report-section">
          <h2 className="print-report-title">Ventas</h2>
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
        </section>
      )}

      {(printAll || activeTab === 'targets') && (
        <section className="print-report-section">
          <h2 className="print-report-title">Metas</h2>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Cumplimiento de Metas Detallado</CardTitle>
            {canManageTargets && (
              <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={openCreateTargetModal}>
                Nueva Meta
              </Button>
            )}
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
                ...(canManageTargets ? [{
                  key: 'actions',
                  header: 'Acciones',
                  render: (row: { target: Target }) => (
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditTargetModal(row.target)} className="p-2 rounded-lg text-secondary hover:text-primary hover:bg-gray-100" aria-label="Editar"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => setDeletingTarget(row.target)} className="p-2 rounded-lg text-secondary hover:text-danger hover:bg-gray-100" aria-label="Eliminar"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ),
                }] : []),
              ]}
              keyExtractor={row => row.target.id}
              emptyMessage="Sin metas configuradas"
            />
          </CardContent>
        </Card>
        </section>
      )}

      {(printAll || activeTab === 'inventory') && (
        <section className="print-report-section">
          <h2 className="print-report-title">Inventario</h2>
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
        </section>
      )}

      {(printAll || activeTab === 'operations') && (
        <section className="print-report-section">
          <h2 className="print-report-title">Operaciones</h2>
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
        </section>
      )}

      <Modal
        isOpen={isTargetModalOpen}
        onClose={() => setIsTargetModalOpen(false)}
        title={editingTarget ? 'Editar Meta' : 'Nueva Meta'}
      >
        <form onSubmit={handleSubmit(onSubmitTarget)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Alcance"
              {...register('branchId')}
              options={[
                { value: '', label: 'Toda la empresa' },
                ...(branches || []).map(b => ({ value: b.id, label: `Sucursal: ${b.name}` })),
              ]}
              error={errors.branchId?.message}
            />
            <Select
              label="Producto (opcional)"
              {...register('productId')}
              options={[
                { value: '', label: 'Sin producto específico' },
                ...(products || []).map(p => ({ value: p.id, label: p.name })),
              ]}
              error={errors.productId?.message}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Periodo" placeholder="2026-09" {...register('period')} error={errors.period?.message} />
            <Select
              label="Tipo"
              {...register('type')}
              options={[
                { value: 'revenue', label: 'Ingresos (S/)' },
                { value: 'sales', label: 'Ventas' },
                { value: 'units', label: 'Unidades' },
              ]}
              error={errors.type?.message}
            />
            <Input
              label="Valor objetivo"
              type="number"
              min={0}
              step="0.01"
              {...register('targetValue', { valueAsNumber: true })}
              error={errors.targetValue?.message}
            />
          </div>
          <Input
            label="Valor alcanzado"
            type="number"
            min={0}
            step="0.01"
            {...register('achievedValue', { valueAsNumber: true })}
            error={errors.achievedValue?.message}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsTargetModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting || createTarget.isPending || updateTarget.isPending}>
              {editingTarget ? 'Actualizar' : 'Crear'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={!!deletingTarget}
        onClose={() => setDeletingTarget(null)}
        title="Eliminar Meta"
        description={`¿Estás seguro de eliminar la meta del periodo "${deletingTarget?.period}"? Esta acción no se puede deshacer.`}
      >
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={() => setDeletingTarget(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirmDeleteTarget} loading={deleteTarget.isPending}>
            Eliminar
          </Button>
        </div>
      </Modal>

      {notice}
    </div>
  );
}