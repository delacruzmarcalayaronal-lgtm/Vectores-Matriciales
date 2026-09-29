import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ShoppingCart,
  DollarSign,
  Package,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Layers,
  Wifi,
  MapPin,
  Home,
  Boxes,
  Target,
  
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { StatCard, type StatCardProps, Avatar } from '../components/ui/Table';
import { Table, Badge, Tabs, TabPanel } from '../components/ui/Table';
import { useDashboardStats, useSalesByBranch, useSalesByProduct, useTargetCompliance, useInventoryRotation, useBranches, useProducts } from '../hooks/useApi';
import { useAuth } from '../contexts/useAuth';
import { MODULES, MODULE_COLOR_CLASSES } from '../lib/modules';
import { ROLE_LABELS, ROLE_ICONS, type ModuleKey } from '../lib/permissions';
import { readGeneral } from '../lib/systemPrefs';
import { innerPercentLabel, darkTooltipStyle, legendFormatter, metaComplianceTooltip } from '../lib/chartLabels';
import { ChartZoom } from '../components/charts/ChartZoom';
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

const COLORS = ['#2563EB', '#06B6D4', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats('1');
  const { data: salesByBranch } = useSalesByBranch('1');
  const { data: salesByProduct } = useSalesByProduct('1');
  const { data: targetCompliance } = useTargetCompliance('1');
  const { data: inventoryRotation } = useInventoryRotation('1');
  const { data: branches } = useBranches('1');
  const { data: products } = useProducts('1');
  const { user, can } = useAuth();

  const myModules = MODULES.filter(module => can(module.key));
  const showSales = can('ventas');
  const showInventory = can('inventario');
  const showTargets = can('reportes');
  const showProducts = can('productos');

  const allStatsCards: Array<{ module: ModuleKey; card: StatCardProps }> = [
    {
      module: 'ventas',
      card: {
        title: 'Total Ventas',
        value: stats?.totalSales?.toLocaleString() || '0',
        icon: <ShoppingCart className="w-6 h-6" />,
        iconColor: 'primary',
        change: '+12.5%',
        changeType: 'increase' as const,
      },
    },
    {
      module: 'ventas',
      card: {
        title: 'Ingresos Totales',
        value: `S/ ${(stats?.totalRevenue || 0).toLocaleString()}`,
        icon: <DollarSign className="w-6 h-6" />,
        iconColor: 'success',
        change: '+8.2%',
        changeType: 'increase' as const,
      },
    },
    {
      module: 'productos',
      card: {
        title: 'Productos Activos',
        value: stats?.totalProducts?.toString() || '0',
        icon: <Package className="w-6 h-6" />,
        iconColor: 'accent',
      },
    },
    {
      module: 'inventario',
      card: {
        title: 'Stock Bajo',
        value: stats?.lowStockProducts?.toString() || '0',
        icon: <AlertTriangle className="w-6 h-6" />,
        iconColor: stats && stats.lowStockProducts > 0 ? 'danger' : 'success',
        change: stats && stats.lowStockProducts > 0 ? 'Requiere atención' : 'Todo normal',
        changeType: stats && stats.lowStockProducts > 0 ? 'danger' : 'success',
      },
    },
  ];

  const statsCards = allStatsCards.filter(item => can(item.module)).map(item => item.card);

  const branchChartData = salesByBranch?.map((item, i) => ({
    name: item.branch.name,
    revenue: item.revenue,
    color: COLORS[i % COLORS.length],
  })) || [];

  const productChartData = salesByProduct?.map((item, i) => ({
    name: item.product.name,
    revenue: item.revenue,
    quantity: item.quantity,
    color: COLORS[i % COLORS.length],
  })) || [];

  const complianceData = targetCompliance?.map(item => ({
    name: item.target.productId
      ? products?.find(p => p.id === item.target.productId)?.name || 'Producto'
      : item.target.branchId
        ? branches?.find(b => b.id === item.target.branchId)?.name || 'Sucursal'
        : 'Empresa',
    compliance: Math.round(item.compliance),
    target: item.target.targetValue,
    achieved: item.target.achievedValue,
  })) || [];

  const rotationData = inventoryRotation?.slice(0, 8).map(item => ({
    name: item.product.name,
    rotation: Math.round(item.rotation * 10) / 10,
    daysOfStock: item.daysOfStock,
  })) || [];

  const hasCommercialKpis = showSales || showInventory || showTargets || showProducts;
  const [sessionTime] = useState(() => new Date());
  const timezone = readGeneral().timezone;
  const chipClass = 'inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-border text-secondary';

  const [searchParams, setSearchParams] = useSearchParams();
  const dashboardTabs = [
    { id: 'resumen', label: 'Resumen', icon: <Home className="w-4 h-4" /> },
    ...(showSales ? [{ id: 'ventas', label: 'Ventas', icon: <ShoppingCart className="w-4 h-4" /> }] : []),
    ...(showInventory ? [{ id: 'inventario', label: 'Inventario', icon: <Boxes className="w-4 h-4" /> }] : []),
    ...(showTargets ? [{ id: 'metas', label: 'Metas', icon: <Target className="w-4 h-4" /> }] : []),
  ];
  const requestedTab = searchParams.get('tab');
  const activeTab = dashboardTabs.some(tab => tab.id === requestedTab)
    ? requestedTab!
    : 'resumen';
  const handleChange = (id: string) => setSearchParams({ tab: id }, { replace: true });

  const emptyTab = (message: string) => (
    <Card>
      <CardContent className="py-8 text-center text-secondary text-sm">{message}</CardContent>
    </Card>
  );

  const sessionRow = (label: string, value: string) => (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-secondary flex-shrink-0">{label}</dt>
      <dd className="font-medium text-text text-right truncate">{value}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      <Tabs tabs={dashboardTabs} activeTab={activeTab} onChange={handleChange} />

      <TabPanel id="resumen" activeTab={activeTab}>
      <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
        <span className={chipClass}>
          <ShieldCheck className="w-4 h-4 text-primary" />
          {user?.role === 'admin' ? 'Solo administradores' : `Solo ${user?.role ? ROLE_LABELS[user.role] : ''}`}
        </span>
        <span className={chipClass}>
          <Layers className="w-4 h-4 text-accent" />
          {myModules.length} módulo{myModules.length === 1 ? '' : 's'}
        </span>
        <span className={chipClass}>
          <Wifi className="w-4 h-4 text-success" />
          En línea
        </span>
        <span className={chipClass}>
          <MapPin className="w-4 h-4 text-warning" />
          {timezone}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-gradient-to-r from-primary/10 via-accent/5 to-transparent border-primary/20">
          <CardContent className="py-6 h-full flex flex-col justify-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-primary flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-warning" />
                Dashboard
              </p>
              <h1 className="text-2xl sm:text-3xl font-bold text-text mt-1.5">
                Bienvenido, {user?.name || 'Usuario'}
              </h1>
              <p className="text-secondary mt-1">
                {user?.role && `${ROLE_ICONS[user.role]} ${ROLE_LABELS[user.role]} · `}
                Tienes {myModules.length} módulo{myModules.length === 1 ? '' : 's'} disponible{myModules.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="mt-4 flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-success/30 text-sm text-success self-start">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Datos en tiempo real
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
              Tu sesión
            </CardTitle>
            <CardDescription>Estado de tu identidad y acceso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar name={user?.name || 'Usuario'} src={user?.avatar} size="md" />
              <div className="min-w-0">
                <p className="font-semibold text-text truncate">{user?.name}</p>
                <p className="text-sm text-secondary truncate">
                  {user?.role && `${ROLE_ICONS[user.role]} ${ROLE_LABELS[user.role]}`}
                </p>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              {sessionRow('DNI', user?.dni || '—')}
              {sessionRow('Último acceso', sessionTime.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit', timeZone: timezone }))}
              {sessionRow('Zona horaria', timezone)}
            </dl>
            <Link
              to="/perfil"
              className="inline-flex w-full items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border text-secondary hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all"
            >
              Ver mi perfil
              <ArrowRight className="w-4 h-4" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tus módulos</CardTitle>
          <CardDescription>Selecciona un módulo para comenzar a trabajar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {myModules.map((module) => (
              <Link
                key={module.key}
                to={module.href}
                className="group h-28 p-4 flex flex-col justify-between text-left rounded-lg border border-border bg-white hover:border-primary/50 hover:bg-primary/5 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <module.icon className={`w-7 h-7 ${MODULE_COLOR_CLASSES[module.color]}`} />
                  <ArrowRight className="w-4 h-4 text-secondary opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all" />
                </div>
                <div>
                  <span className="font-medium text-text block">{module.label}</span>
                  <span className="text-xs text-secondary line-clamp-1">{module.description}</span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
            </Card>
          ))}
        </div>
      ) : statsCards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat, i) => (
            <StatCard key={i} {...stat} />
          ))}
        </div>
      )}

      {!hasCommercialKpis && (
        <Card>
          <CardContent className="py-8 text-center text-secondary text-sm">
            Tu rol no incluye indicadores comerciales. Usa tus módulos para trabajar.
          </CardContent>
        </Card>
      )}
      </div>
      </TabPanel>

      <TabPanel id="ventas" activeTab={activeTab}>
      {showSales ? (
      <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Ventas por Sucursal</CardTitle>
            <CardDescription>Ingresos generados por cada sede en el período actual</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartZoom title="Ventas por Sucursal">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis type="number" tickFormatter={v => `S/ ${(v/1000).toFixed(0)}k`} stroke="#64748B" fontSize={12} />
                  <YAxis dataKey="name" type="category" width={100} stroke="#64748B" fontSize={12} />
                  <Tooltip
                    formatter={(value) => [`S/ ${Number(value ?? 0).toLocaleString()}`, 'Ingresos']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" name="Ingresos" radius={[0, 4, 4, 0]}>
                    {branchChartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            </ChartZoom>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Productos por Ingresos</CardTitle>
            <CardDescription>Productos con mayor contribución a los ingresos</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartZoom title="Top Productos por Ingresos">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={115}
                    paddingAngle={2}
                    dataKey="revenue"
                    nameKey="name"
                    label={innerPercentLabel}
                    labelLine={false}
                  >
                    {productChartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`S/ ${Number(value ?? 0).toLocaleString()}`, 'Ingresos']}
                    contentStyle={darkTooltipStyle}
                  />
                  <Legend formatter={legendFormatter} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            </ChartZoom>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ventas Recientes</CardTitle>
          <CardDescription>Últimas transacciones registradas</CardDescription>
        </CardHeader>
        <CardContent>
          <Table
            data={stats?.recentSales || []}
            columns={[
              { key: 'saleNumber', header: 'N° Venta', render: (row) => <span className="font-mono">{row.saleNumber}</span> },
              { key: 'date', header: 'Fecha', render: (row) => new Date(row.date).toLocaleDateString('es-PE') },
              { key: 'branch', header: 'Sucursal', render: (row) => branches?.find(b => b.id === row.branchId)?.name || row.branchId },
              { key: 'total', header: 'Total', render: (row) => `S/ ${row.total.toLocaleString()}` },
              { key: 'status', header: 'Estado', render: (row) => (
                <Badge variant={row.status === 'confirmed' ? 'success' : row.status === 'draft' ? 'warning' : 'danger'}>
                  {row.status === 'confirmed' ? 'Confirmada' : row.status === 'draft' ? 'Borrador' : 'Cancelada'}
                </Badge>
              )},
            ]}
            keyExtractor={row => row.id}
            emptyMessage="No hay ventas recientes"
          />
        </CardContent>
      </Card>
      </div>
      ) : emptyTab('Tu rol no incluye acceso a las ventas.')}
      </TabPanel>

      <TabPanel id="inventario" activeTab={activeTab}>
      {showInventory ? (
      <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rotación de Inventario</CardTitle>
          <CardDescription>Días de stock y rotación por producto</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartZoom title="Rotación de Inventario">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rotationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={12} />
                <YAxis yAxisId="left" type="number" stroke="#64748B" fontSize={12} />
                <YAxis yAxisId="right" orientation="right" type="number" stroke="#64748B" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: '8px' }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="rotation"
                  name="Rotación (veces/año)"
                  stroke="#2563EB"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="daysOfStock"
                  name="Días de Stock"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          </ChartZoom>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos de Inventario</CardTitle>
          <CardDescription>Últimos ingresos y salidas de stock</CardDescription>
        </CardHeader>
        <CardContent>
          <Table
            data={stats?.recentMovements || []}
            columns={[
              { key: 'date', header: 'Fecha', render: (row) => new Date(row.date).toLocaleDateString('es-PE') },
              { key: 'product', header: 'Producto', render: (row) => row.product?.name || row.productId },
              { key: 'type', header: 'Tipo', render: (row) => (
                <Badge variant={row.type === 'in' ? 'success' : row.type === 'out' ? 'danger' : 'info'}>
                  {row.type === 'in' ? 'Entrada' : row.type === 'out' ? 'Salida' : row.type === 'transfer' ? 'Traslado' : 'Ajuste'}
                </Badge>
              )},
              { key: 'quantity', header: 'Cantidad', render: (row) => row.quantity },
              { key: 'reference', header: 'Referencia', render: (row) => row.reference },
            ]}
            keyExtractor={row => row.id}
            emptyMessage="No hay movimientos recientes"
          />
        </CardContent>
      </Card>
      </div>
      ) : emptyTab('Tu rol no incluye acceso al inventario.')}
      </TabPanel>

      <TabPanel id="metas" activeTab={activeTab}>
      {showTargets ? (
      <Card>
        <CardHeader>
          <CardTitle>Cumplimiento de Metas</CardTitle>
          <CardDescription>Porcentaje de cumplimiento de objetivos por sucursal/producto</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartZoom title="Cumplimiento de Metas">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complianceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis type="number" tickFormatter={v => `${v}%`} stroke="#64748B" fontSize={12} domain={[0, 120]} />
                <YAxis dataKey="name" type="category" width={120} stroke="#64748B" fontSize={12} />
                <Tooltip content={metaComplianceTooltip} />
                <Bar dataKey="compliance" name="Cumplimiento %" fill="#22C55E" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          </ChartZoom>
        </CardContent>
      </Card>
      ) : emptyTab('Tu rol no incluye acceso a las metas.')}
      </TabPanel>
    </div>
  );
}