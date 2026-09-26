import { Building2, Package, ShoppingCart, FileText } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { StatCard, Tabs, TabPanel } from '../components/ui/Table';
import { useBranches, useDashboardStats, useCompany } from '../hooks/useApi';
import { useAuth } from '../contexts/useAuth';
import { type ModuleKey } from '../lib/permissions';
import { Branches } from './Branches';
import { Products } from './Products';

const TABS: Array<{ id: string; label: string; icon: React.ReactNode; module: ModuleKey }> = [
  { id: 'empresa', label: 'Empresa', icon: <Building2 className="w-4 h-4" />, module: 'empresa' },
  { id: 'sucursales', label: 'Sucursales', icon: <Building2 className="w-4 h-4" />, module: 'sucursales' },
  { id: 'productos', label: 'Productos', icon: <Package className="w-4 h-4" />, module: 'productos' },
];

export function Empresa() {
  const { data: stats } = useDashboardStats('1');
  const { data: branches } = useBranches('1');
  const { data: company } = useCompany('1');
  const { can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const visibleTabs = TABS.filter(tab => can(tab.module));
  const requested = searchParams.get('tab');
  const activeTab = visibleTabs.some(tab => tab.id === requested)
    ? requested!
    : (visibleTabs[0]?.id || 'empresa');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Empresa</h1>
        <p className="text-secondary mt-1">Información corporativa, sedes y catálogo de productos</p>
      </div>

      {visibleTabs.length > 1 && (
        <Tabs
          tabs={visibleTabs}
          activeTab={activeTab}
          onChange={(id) => setSearchParams({ tab: id }, { replace: true })}
        />
      )}

      <TabPanel id="empresa" activeTab={activeTab}>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Sucursales"
              value={branches?.length || 0}
              icon={<Building2 className="w-6 h-6" />}
              iconColor="primary"
            />
            <StatCard
              title="Productos"
              value={stats?.totalProducts || 0}
              icon={<Package className="w-6 h-6" />}
              iconColor="accent"
            />
            <StatCard
              title="Ventas Totales"
              value={stats?.totalSales?.toLocaleString() || '0'}
              icon={<ShoppingCart className="w-6 h-6" />}
              iconColor="success"
            />
            <StatCard
              title="Ingresos"
              value={`S/ ${(stats?.totalRevenue || 0).toLocaleString()}`}
              icon={<FileText className="w-6 h-6" />}
              iconColor="warning"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Información de la Empresa</CardTitle>
              <CardDescription>Datos fiscales y de contacto</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-secondary">Nombre Comercial</label>
                    <p className="text-text font-medium">{company?.name || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-secondary">Razón Social</label>
                    <p className="text-text font-medium">{company?.legalName || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-secondary">RUC</label>
                    <p className="text-text font-mono">{company?.taxId || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-secondary">Dirección</label>
                    <p className="text-text">{company?.address || '—'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-secondary">Teléfono</label>
                    <p className="text-text">{company?.phone || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-secondary">Ciudad / País</label>
                    <p className="text-text">{[company?.city, company?.country].filter(Boolean).join(' / ') || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-secondary block">Estado</label>
                    <span className="inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Activa</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabPanel>

      <TabPanel id="sucursales" activeTab={activeTab}>
        <Branches />
      </TabPanel>

      <TabPanel id="productos" activeTab={activeTab}>
        <Products />
      </TabPanel>
    </div>
  );
}
