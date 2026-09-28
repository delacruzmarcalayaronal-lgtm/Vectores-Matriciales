import { useEffect, useRef, useState } from 'react';
import {
  Save,
  Bell,
  Shield,
  Palette,
  Database,
  Globe,
  Key,
  Upload,
  Download
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Tabs, TabPanel } from '../components/ui/Table';
import {
  type ThemeMode, getStoredTheme, setThemePreference, THEME_OPTIONS
} from '../lib/theme';
import { useNotice } from '../hooks/useNotice';
import { useAuth } from '../contexts/useAuth';
import {
  companiesApi,
  salesApi,
  productsApi,
  vectorsApi,
  matricesApi,
  operationsApi,
  branchesApi,
  categoriesApi,
  inventoryApi
} from '../services/api';
import { downloadFile, toCSV, parseCSV, jsonOf } from '../lib/exportUtils';
import { readBgMotion, writeBgMotion, type BgMotionConfig, type BgDensity } from '../lib/bgMotion';

const COMPANY_ID = '1';

const readPrefs = (key: string): Record<string, unknown> => {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
};

const writePrefs = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const dateStamp = () => new Date().toISOString().slice(0, 10);

const THEME_CARDS: Record<ThemeMode, { label: string; bg: string; surface: string; text: string; border: string; half?: boolean }> = {
  light: { label: 'Light', bg: '#FFFFFF', surface: '#F1F5F9', text: '#0F172A', border: '#E2E8F0' },
  dark: { label: 'Dark', bg: '#0F172A', surface: '#334155', text: '#F1F5F9', border: '#334155' },
  system: { label: 'System', bg: '#FFFFFF', surface: '#F1F5F9', text: '#0F172A', border: '#E2E8F0', half: true },
  midnight: { label: 'Medianoche', bg: '#03060E', surface: '#1E293B', text: '#E2E8F0', border: '#1E293B' },
  ocean: { label: 'Océano', bg: '#041019', surface: '#14425C', text: '#E0F2FE', border: '#14425C' },
  matrix: { label: 'Matrix', bg: '#030803', surface: '#1B3A21', text: '#DCFCE7', border: '#1B3A21' },
};

export function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState(isAdmin ? 'general' : 'appearance');
  const [saving, setSaving] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getStoredTheme());
  const [bgMotion, setBgMotion] = useState<BgMotionConfig>(() => readBgMotion());
  const { show, notice } = useNotice();

  const updateBgMotion = (patch: Partial<BgMotionConfig>) => {
    setBgMotion(prev => {
      const next = { ...prev, ...patch };
      writeBgMotion(next);
      return next;
    });
  };

  const [general, setGeneral] = useState({
    name: '',
    taxId: '',
    address: '',
    city: '',
    country: '',
    phone: '',
  });

  const [notif, setNotif] = useState<Record<string, boolean>>(() => ({
    bell_alerts: true,
    stock_alerts: true,
    target_alerts: true,
    operation_alerts: true,
    weekly_report: false,
    system_updates: false,
    ...readPrefs('mf_notifications'),
  }));

  const [security, setSecurity] = useState<Record<string, unknown>>(() => ({
    sessionMinutes: 480,
    maxLoginAttempts: 5,
    accessTokenMinutes: 60,
    refreshDays: 30,
    twoFactor: true,
    idleLock: false,
    ...readPrefs('mf_security'),
  }));

  const [apiPrefs, setApiPrefs] = useState<Record<string, unknown>>(() => ({
    limit: 100,
    timeout: 30,
    retries: 3,
    ...readPrefs('mf_api'),
  }));

  const productFileRef = useRef<HTMLInputElement>(null);
  const saleFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAdmin) return;
    companiesApi.get(COMPANY_ID)
      .then(c => setGeneral({
        name: c.name ?? '',
        taxId: c.taxId ?? '',
        address: c.address ?? '',
        city: c.city ?? '',
        country: c.country ?? '',
        phone: c.phone ?? '',
      }))
      .catch(err => console.error('Error loading company:', err));
  }, [isAdmin]);

  const setG = (key: keyof typeof general, value: string) =>
    setGeneral(prev => ({ ...prev, [key]: value }));

  const handleTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    setThemePreference(mode);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <Globe className="w-4 h-4" /> },
    { id: 'appearance', label: 'Apariencia', icon: <Palette className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notificaciones', icon: <Bell className="w-4 h-4" /> },
    { id: 'security', label: 'Seguridad', icon: <Shield className="w-4 h-4" /> },
    { id: 'data', label: 'Datos', icon: <Database className="w-4 h-4" /> },
    { id: 'api', label: 'API', icon: <Key className="w-4 h-4" /> },
  ];
  // Los trabajadores solo ven el configurador de temas (Apariencia)
  const visibleTabs = isAdmin ? tabs : tabs.filter(tab => tab.id === 'appearance');
  const effectiveTab = visibleTabs.some(tab => tab.id === activeTab)
    ? activeTab
    : isAdmin
      ? 'general'
      : 'appearance';

  const handleSave = async () => {
    setSaving(true);
    try {
      if (effectiveTab === 'general') {
        await companiesApi.update(COMPANY_ID, general);
        show('Datos de la empresa guardados en la base de datos.');
      } else if (effectiveTab === 'notifications') {
        writePrefs('mf_notifications', notif);
        show('Preferencias de notificaciones guardadas.');
      } else if (effectiveTab === 'security') {
        writePrefs('mf_security', security);
        show('Configuración de seguridad guardada.');
      } else if (effectiveTab === 'api') {
        writePrefs('mf_api', apiPrefs);
        show('Configuración de API guardada.');
      } else {
        writePrefs('mf_general_misc', { savedAt: new Date().toISOString() });
        show('Cambios guardados.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      show('No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const runExport = (key: string, fn: () => Promise<void>) => {
    setBusyKey(key);
    fn()
      .catch(error => {
        console.error('Export error:', error);
        show('Error al exportar. Verifica tu sesión e intenta de nuevo.');
      })
      .finally(() => setBusyKey(null));
  };

  const exportSales = () => runExport('exp-sales', async () => {
    const page = await salesApi.list(COMPANY_ID, { page: 1, pageSize: 10000 });
    const rows = page.data.map(s => ({
      numero: s.saleNumber,
      fecha: s.date,
      sucursal_id: s.branchId,
      estado: s.status,
      subtotal: s.subtotal,
      impuesto: s.tax,
      total: s.total,
      notas: s.notes ?? '',
      creado: s.createdAt,
    }));
    downloadFile(`ventas_${dateStamp()}.csv`, toCSV(rows), 'text/csv');
    show(`Ventas exportadas: ${rows.length} registros.`);
  });

  const exportInventory = () => runExport('exp-inventory', async () => {
    const [branches, products] = await Promise.all([
      branchesApi.list(COMPANY_ID),
      productsApi.list(COMPANY_ID),
    ]);
    const nameById = new Map(products.map(p => [p.id, p.name]));
    const rows: Array<Record<string, unknown>> = [];
    for (const branch of branches) {
      const stock = await inventoryApi.getStock(COMPANY_ID, branch.id);
      for (const [productId, qty] of Object.entries(stock)) {
        rows.push({
          sucursal: branch.name,
          producto: nameById.get(productId) ?? productId,
          producto_id: productId,
          stock: qty,
        });
      }
    }
    downloadFile(`inventario_${dateStamp()}.csv`, toCSV(rows), 'text/csv');
    show(`Inventario exportado: ${rows.length} filas.`);
  });

  const exportVectors = () => runExport('exp-vectors', async () => {
    const rows = await vectorsApi.list(COMPANY_ID);
    downloadFile(`vectores_${dateStamp()}.json`, jsonOf(rows), 'application/json');
    show(`Vectores exportados: ${rows.length}.`);
  });

  const exportMatrices = () => runExport('exp-matrices', async () => {
    const rows = await matricesApi.list(COMPANY_ID);
    downloadFile(`matrices_${dateStamp()}.json`, jsonOf(rows), 'application/json');
    show(`Matrices exportadas: ${rows.length}.`);
  });

  const exportHistory = () => runExport('exp-history', async () => {
    const page = await operationsApi.list(COMPANY_ID, { page: 1, pageSize: 10000 });
    const rows = page.data.map(op => ({
      tipo: op.type,
      nombre: op.name,
      descripcion: op.description ?? '',
      estado: op.status,
      tiempo_ms: op.executionTimeMs,
      vectores_entrada: op.inputVectors.join(' '),
      matrices_entrada: op.inputMatrices.join(' '),
      fecha: new Date(op.createdAt).toISOString(),
    }));
    downloadFile(`historial_${dateStamp()}.csv`, toCSV(rows), 'text/csv');
    show(`Historial exportado: ${rows.length} operaciones.`);
  });

  const exportBackup = () => runExport('exp-backup', async () => {
    const [company, branches, categories, products, sales, vectors, matrices, operations] = await Promise.all([
      companiesApi.get(COMPANY_ID),
      branchesApi.list(COMPANY_ID),
      categoriesApi.list(COMPANY_ID),
      productsApi.list(COMPANY_ID),
      salesApi.list(COMPANY_ID, { page: 1, pageSize: 10000 }),
      vectorsApi.list(COMPANY_ID),
      matricesApi.list(COMPANY_ID),
      operationsApi.list(COMPANY_ID, { page: 1, pageSize: 10000 }),
    ]);
    const backup = {
      exportedAt: new Date().toISOString(),
      company,
      branches,
      categories,
      products,
      sales: sales.data,
      vectors,
      matrices,
      operations: operations.data,
    };
    downloadFile(`respaldo_matrixflow_${dateStamp()}.json`, jsonOf(backup), 'application/json');
    show('Respaldo completo descargado (JSON).');
  });

  const exampleProducts = () => {
    const csv = [
      'sku,name,category,unitPrice,costPrice,stock,minStock,unit,description',
      'P001,Laptop HP EliteBook 840,Informatica,4500,3800,10,3,unidad,Portatil corporativo',
      'P002,Mouse Logitech M170,Accesorios,45,30,50,10,unidad,Mouse inalambrico',
      'P001,Monitor Samsung 24 FHD,Informatica,750,620,20,5,unidad,Monitor 24 pulgadas',
    ].join('\n');
    downloadFile('ejemplo_productos.csv', csv, 'text/csv');
    show('Ejemplo descargado: ejemplo_productos.csv. Edítalo y usa Importar Productos.');
  };

  const exampleSales = () => {
    const csv = [
      'branchId,productId,quantity,unitPrice,discount,status,notes',
      'Lima Centro,HP-EB840,1,4500,0,confirmed,Venta de ejemplo',
      'Arequipa,LOG-M170,2,45,5,confirmed,Con descuento',
      'Trujillo,SAM-M24,1,750,0,confirmed,Venta por nombre de producto',
    ].join('\n');
    downloadFile('ejemplo_ventas.csv', csv, 'text/csv');
    show('Ejemplo descargado: ejemplo_ventas.csv. Edítalo y usa Importar Ventas.');
  };

  const importProducts = (file: File) => {
    setBusyKey('imp-products');
    file.text()
      .then(async text => {
        const rows = parseCSV(text);
        if (rows.length === 0) {
          show('El CSV no tiene filas de datos. Columnas: sku,name,category,unitPrice,costPrice,stock,minStock,unit,description');
          return;
        }
        const categories = await categoriesApi.list(COMPANY_ID).catch(() => null);
        if (!categories) {
          show('No se pudo contactar la API al importar. Reintenta en unos segundos.');
          return;
        }
        const byName = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
        let ok = 0;
        const failed: string[] = [];
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          try {
            let categoryId = (r.categoryId || r.categoriaId || '').trim();
            if (!categoryId) {
              const catName = (r.category || r.categoria || 'Importados').trim();
              let id = byName.get(catName.toLowerCase());
              if (!id) {
                const created = await categoriesApi.create(COMPANY_ID, { name: catName });
                id = created.id;
                byName.set(catName.toLowerCase(), id);
              }
              categoryId = id;
            }
            await productsApi.create(COMPANY_ID, {
              sku: (r.sku || `IMP-${i + 1}`).slice(0, 20),
              name: (r.name || r.nombre || '').trim(),
              description: r.description || r.descripcion || '',
              categoryId,
              unitPrice: Number(r.unitPrice ?? r.precio ?? 0),
              costPrice: Number(r.costPrice ?? r.costo ?? 0),
              stock: Math.max(0, Math.trunc(Number(r.stock ?? 0))),
              minStock: Math.max(0, Math.trunc(Number(r.minStock ?? r.stockMinimo ?? 5))),
              unit: r.unit || r.unidad || 'unidad',
              isActive: String(r.activo ?? r.isActive ?? 'true').toLowerCase() !== 'false',
            });
            ok++;
          } catch {
            failed.push(String(i + 2));
          }
        }
        const failMsg = failed.length ? ` | fallaron filas ${failed.slice(0, 5).join(', ')}${failed.length > 5 ? '…' : ''}` : '';
        show(`Productos importados: ${ok} de ${rows.length}${failMsg}.`);
      })
      .catch(error => {
        console.error('Import products error:', error);
        show('No se pudo leer el archivo desde tu equipo.');
      })
      .finally(() => setBusyKey(null));
  };

  const importSales = (file: File) => {
    setBusyKey('imp-sales');
    file.text()
      .then(async text => {
        const rows = parseCSV(text);
        if (rows.length === 0) {
          show('El CSV no tiene filas de datos. Columnas: branchId|sucursal,productId|sku|producto,quantity,unitPrice,discount,status,notes');
          return;
        }
        const [branchesOrNull, productsOrNull] = await Promise.all([
          branchesApi.list(COMPANY_ID).catch(() => null),
          productsApi.list(COMPANY_ID).catch(() => null),
        ]);
        if (!branchesOrNull || !productsOrNull) {
          show('No se pudo contactar la API al importar. Reintenta en unos segundos.');
          return;
        }
        const branches = branchesOrNull;
        const products = productsOrNull;
        const branchById = new Map(branches.map(b => [b.id, b]));
        const branchByName = new Map(branches.map(b => [b.name.toLowerCase(), b]));
        const productById = new Map(products.map(p => [p.id, p]));
        const productBySku = new Map(products.map(p => [p.sku.toLowerCase(), p]));
        const productByName = new Map(products.map(p => [p.name.toLowerCase(), p]));
        let ok = 0;
        const failed: string[] = [];
        for (let i = 0; i < rows.length; i++) {
          const r = rows[i];
          try {
            const branchKey = String(r.branchId || r.sucursal || '').toLowerCase();
            const branch = branchById.get(String(r.branchId || '')) || branchByName.get(branchKey);
            if (!branch) throw new Error('sucursal no encontrada');
            const pKey = String(r.productId || r.producto || r.sku || '').toLowerCase();
            const product = productById.get(String(r.productId || '')) || productBySku.get(pKey) || productByName.get(pKey);
            if (!product) throw new Error('producto no encontrado');
            const quantity = Math.max(1, Math.trunc(Number(r.quantity ?? r.cantidad ?? 1)));
            const unitPrice = Number(r.unitPrice ?? r.precio ?? product.unitPrice);
            const discount = Math.max(0, Number(r.discount ?? r.descuento ?? 0));
            const status = String(r.status || 'confirmed');
            await salesApi.create(COMPANY_ID, {
              branchId: branch.id,
              status: (['draft', 'confirmed', 'cancelled'].includes(status) ? status : 'confirmed') as 'draft' | 'confirmed' | 'cancelled',
              notes: r.notes || r.notas || 'Importado CSV',
              details: [{ productId: product.id, quantity, unitPrice, discount }],
            } as unknown as Parameters<typeof salesApi.create>[1]);
            ok++;
          } catch {
            failed.push(String(i + 2));
          }
        }
        const failMsg = failed.length ? ` | fallaron filas ${failed.slice(0, 5).join(', ')}${failed.length > 5 ? '…' : ''}` : '';
        show(`Ventas importadas: ${ok} de ${rows.length}${failMsg}.`);
      })
      .catch(error => {
        console.error('Import sales error:', error);
        show('No se pudo leer el archivo desde tu equipo.');
      })
      .finally(() => setBusyKey(null));
  };

  return (
    <div className="space-y-6 relative">
      <div>
        <h1 className="text-2xl font-bold text-text">Configuración</h1>
        <p className="text-secondary mt-1">Parámetros y preferencias del sistema</p>
      </div>

      <Tabs tabs={visibleTabs} activeTab={effectiveTab} onChange={setActiveTab} />

      <TabPanel id="general" activeTab={effectiveTab}>
        <Card>
          <CardHeader>
            <CardTitle>Configuración General</CardTitle>
            <CardDescription>Información básica de la empresa y preferencias del sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Nombre de la Empresa" value={general.name} onChange={e => setG('name', e.target.value)} placeholder="Sin configurar" />
              <Input label="RUC" value={general.taxId} onChange={e => setG('taxId', e.target.value)} placeholder="Sin configurar" />
            </div>
            <Input label="Dirección" value={general.address} onChange={e => setG('address', e.target.value)} placeholder="Sin configurar" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input label="Ciudad" value={general.city} onChange={e => setG('city', e.target.value)} placeholder="Sin configurar" />
              <Input label="País" value={general.country} onChange={e => setG('country', e.target.value)} placeholder="Sin configurar" />
              <Input label="Teléfono" value={general.phone} onChange={e => setG('phone', e.target.value)} placeholder="Sin configurar" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Zona Horaria"
                defaultValue="America/Lima"
                options={[
                  { value: 'America/Lima', label: 'America/Lima (UTC-5)' },
                  { value: 'America/Bogota', label: 'America/Bogota (UTC-5)' },
                  { value: 'America/Mexico_City', label: 'America/Mexico_City (UTC-6)' },
                  { value: 'America/Argentina/Buenos_Aires', label: 'America/Argentina/Buenos_Aires (UTC-3)' },
                ]}
              />
              <Select
                label="Idioma"
                defaultValue="es"
                options={[
                  { value: 'es', label: 'Español' },
                  { value: 'en', label: 'English' },
                ]}
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="maintenance" className="w-4 h-4 rounded border-border text-primary focus:ring-primary" />
              <label htmlFor="maintenance" className="text-sm font-medium text-text">Modo mantenimiento</label>
            </div>
            <div className="flex justify-end pt-4 border-t border-border">
              <Button onClick={handleSave} loading={saving} leftIcon={<Save className="w-4 h-4" />}>
                Guardar Cambios
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel id="appearance" activeTab={effectiveTab}>
        <Card>
          <CardHeader>
            <CardTitle>Apariencia</CardTitle>
            <CardDescription>Personaliza la interfaz de MatrixFlow</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-text mb-3">Tema</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {THEME_OPTIONS.map(theme => {
                  const selected = themeMode === theme;
                  const preset = THEME_CARDS[theme];
                  return (
                    <label key={theme} className="relative cursor-pointer">
                      <input
                        type="radio"
                        name="theme"
                        value={theme}
                        checked={selected}
                        onChange={() => handleTheme(theme)}
                        className="sr-only peer"
                      />
                      <div
                        className="p-5 rounded-xl border-2 text-center transition-all"
                        style={{
                          backgroundColor: preset.bg,
                          borderColor: selected ? 'var(--color-primary)' : preset.border,
                          boxShadow: selected ? '0 0 0 3px color-mix(in srgb, var(--color-primary) 25%, transparent)' : 'none',
                        }}
                      >
                        <div
                          className="w-12 h-12 rounded-lg mx-auto mb-3"
                          style={{ backgroundColor: preset.surface, backgroundImage: preset.half ? 'linear-gradient(90deg, #F1F5F9 50%, #0F172A 50%)' : 'none' }}
                        />
                        <p className="font-medium text-sm" style={{ color: preset.text }}>
                          {preset.label}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <p className="text-xs text-secondary">El color de acento lo define el tema seleccionado: se aplica en botones, cabecera y enlaces.</p>
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-text">Fondo animado e interactivo</p>
                  <p className="text-sm text-secondary">Partículas de fondo en el login y en todas las páginas de la aplicación</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={bgMotion.enabled}
                    onChange={e => updateBgMotion({ enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              {bgMotion.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <Select
                    label="Densidad de partículas"
                    value={bgMotion.density}
                    onChange={e => updateBgMotion({ density: e.target.value as BgDensity })}
                    options={[
                      { value: 'low', label: 'Baja (más fluido)' },
                      { value: 'medium', label: 'Media (equilibrado)' },
                      { value: 'high', label: 'Alta (más partículas)' },
                    ]}
                  />
                  <Select
                    label="Velocidad de animación"
                    value={String(bgMotion.speed)}
                    onChange={e => updateBgMotion({ speed: Number(e.target.value) })}
                    options={[
                      { value: '0.5', label: 'Lenta' },
                      { value: '1', label: 'Normal' },
                      { value: '1.5', label: 'Rápida' },
                      { value: '2', label: 'Muy rápida' },
                    ]}
                  />
                  <div className="flex items-center justify-between gap-4 sm:col-span-2 py-3 border-t border-border">
                    <div>
                      <p className="font-medium text-text">Interacción con el mouse</p>
                      <p className="text-sm text-secondary">Las partículas reaccionan al cursor y rebotan al hacer clic en zonas vacías</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={bgMotion.interactive}
                        onChange={e => updateBgMotion({ interactive: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  <p className="text-xs text-secondary sm:col-span-2">
                    En dispositivos con poco rendimiento elige densidad baja o apaga el fondo.
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-4 border-t border-border">
              <Button onClick={handleSave} loading={saving} leftIcon={<Save className="w-4 h-4" />}>Guardar Cambios</Button>
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel id="notifications" activeTab={effectiveTab}>
        <Card>
          <CardHeader>
            <CardTitle>Notificaciones</CardTitle>
            <CardDescription>Configura cómo y cuándo recibir alertas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { id: 'bell_alerts', label: 'Alertas en la campana', desc: 'Mostrar notificaciones en el botón de campana del encabezado' },
              { id: 'stock_alerts', label: 'Alertas de Stock Bajo', desc: 'Notificar cuando productos alcancen stock mínimo' },
              { id: 'target_alerts', label: 'Alertas de Metas', desc: 'Avisar cuando el cumplimiento de metas sea bajo' },
              { id: 'operation_alerts', label: 'Resultados de Operaciones', desc: 'Notificar cuando operaciones matemáticas terminen' },
              { id: 'weekly_report', label: 'Reporte Semanal', desc: 'Recibir resumen semanal de indicadores cada lunes' },
              { id: 'system_updates', label: 'Actualizaciones del Sistema', desc: 'Informar sobre nuevas versiones y mantenimiento' },
            ].map(item => (
              <div key={item.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-text">{item.label}</p>
                  <p className="text-sm text-secondary">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(notif[item.id])}
                    onChange={e => setNotif(prev => ({ ...prev, [item.id]: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            ))}
            <div className="flex justify-end pt-4 border-t border-border">
              <Button onClick={handleSave} loading={saving} leftIcon={<Save className="w-4 h-4" />}>Guardar Cambios</Button>
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel id="security" activeTab={effectiveTab}>
        <Card>
          <CardHeader>
            <CardTitle>Seguridad</CardTitle>
            <CardDescription>Configuración de autenticación y acceso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Tiempo de Sesión (minutos)" type="number" value={String(security.sessionMinutes ?? 480)} onChange={e => setSecurity(prev => ({ ...prev, sessionMinutes: Number(e.target.value) }))} />
              <Input label="Intentos de Login Máximos" type="number" value={String(security.maxLoginAttempts ?? 5)} onChange={e => setSecurity(prev => ({ ...prev, maxLoginAttempts: Number(e.target.value) }))} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Duración Token Acceso (min)" type="number" value={String(security.accessTokenMinutes ?? 60)} onChange={e => setSecurity(prev => ({ ...prev, accessTokenMinutes: Number(e.target.value) }))} />
              <Input label="Duración Token Refresh (días)" type="number" value={String(security.refreshDays ?? 30)} onChange={e => setSecurity(prev => ({ ...prev, refreshDays: Number(e.target.value) }))} />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="font-medium text-text">Autenticación de Dos Factores (2FA)</p>
                  <p className="text-sm text-secondary">Requerir 2FA para todos los administradores</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(security.twoFactor)}
                    onChange={e => setSecurity(prev => ({ ...prev, twoFactor: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="font-medium text-text">Bloqueo por Inactividad</p>
                  <p className="text-sm text-secondary">Cerrar sesión automáticamente tras inactividad</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(security.idleLock)}
                    onChange={e => setSecurity(prev => ({ ...prev, idleLock: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-border">
              <Button onClick={handleSave} loading={saving} leftIcon={<Save className="w-4 h-4" />}>Guardar Cambios</Button>
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel id="data" activeTab={effectiveTab}>
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Datos</CardTitle>
            <CardDescription>Respaldos, importación y exportación de información</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium text-text mb-2">Respaldo Completo</h4>
              <p className="text-sm text-secondary mb-4">Descarga un snapshot JSON con empresa, sucursales, categorías, productos, ventas, vectores, matrices e historial.</p>
              <Button
                variant="outline"
                leftIcon={<Download className="w-4 h-4" />}
                loading={busyKey === 'exp-backup'}
                onClick={exportBackup}
              >
                Descargar Respaldo (JSON)
              </Button>
            </div>
            <div className="pt-4 border-t border-border">
              <h4 className="font-medium text-text mb-4">Exportar Datos</h4>
              <div className="flex flex-wrap gap-4">
                <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} loading={busyKey === 'exp-sales'} onClick={exportSales}>Exportar Ventas (CSV)</Button>
                <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} loading={busyKey === 'exp-inventory'} onClick={exportInventory}>Exportar Inventario (CSV)</Button>
                <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} loading={busyKey === 'exp-vectors'} onClick={exportVectors}>Exportar Vectores (JSON)</Button>
                <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} loading={busyKey === 'exp-matrices'} onClick={exportMatrices}>Exportar Matrices (JSON)</Button>
                <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} loading={busyKey === 'exp-history'} onClick={exportHistory}>Exportar Historial (CSV)</Button>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <h4 className="font-medium text-text mb-4">Importar Datos</h4>
              <div className="flex flex-wrap gap-4">
                <Button
                  variant="outline"
                  leftIcon={<Upload className="w-4 h-4" />}
                  loading={busyKey === 'imp-products'}
                  onClick={() => productFileRef.current?.click()}
                >
                  Importar Productos (CSV)
                </Button>
                <Button
                  variant="outline"
                  leftIcon={<Upload className="w-4 h-4" />}
                  loading={busyKey === 'imp-sales'}
                  onClick={() => saleFileRef.current?.click()}
                >
                  Importar Ventas (CSV)
                </Button>
              </div>
              <input
                ref={productFileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) importProducts(file);
                  e.target.value = '';
                }}
              />
              <input
                ref={saleFileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) importSales(file);
                  e.target.value = '';
                }}
              />
              <div className="mt-4 text-xs text-secondary space-y-1">
                <p><span className="font-medium text-text">Productos CSV:</span> sku,name,category,unitPrice,costPrice,stock,minStock,unit,description (category se crea si no existe; acepta nombres en español: nombre,precio,costo).</p>
                <p><span className="font-medium text-text">Ventas CSV:</span> branchId|sucursal,productId|sku|producto,quantity,unitPrice,discount,status,notes (sucursal y producto pueden ir por nombre o ID; una fila = una venta).</p>
              </div>
              <div className="flex flex-wrap gap-4 mt-4">
                <Button variant="ghost" leftIcon={<Download className="w-4 h-4" />} onClick={exampleProducts}>
                  Ejemplo Productos (CSV)
                </Button>
                <Button variant="ghost" leftIcon={<Download className="w-4 h-4" />} onClick={exampleSales}>
                  Ejemplo Ventas (CSV)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel id="api" activeTab={effectiveTab}>
        <Card>
          <CardHeader>
            <CardTitle>Configuración API</CardTitle>
            <CardDescription>Endpoints, claves y límites de tasa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Input label="URL Base API" value={String(import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1')} readOnly />
            <p className="text-xs text-secondary">La URL base la define la variable de entorno VITE_API_URL del despliegue (Vercel) y no puede cambiarse desde la interfaz.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input label="Límite Requests/min" type="number" value={String(apiPrefs.limit ?? 100)} onChange={e => setApiPrefs(prev => ({ ...prev, limit: Number(e.target.value) }))} />
              <Input label="Timeout (segundos)" type="number" value={String(apiPrefs.timeout ?? 30)} onChange={e => setApiPrefs(prev => ({ ...prev, timeout: Number(e.target.value) }))} />
              <Input label="Reintentos" type="number" value={String(apiPrefs.retries ?? 3)} onChange={e => setApiPrefs(prev => ({ ...prev, retries: Number(e.target.value) }))} />
            </div>
            <div className="flex justify-end pt-4 border-t border-border">
              <Button onClick={handleSave} loading={saving} leftIcon={<Save className="w-4 h-4" />}>Guardar Cambios</Button>
            </div>
          </CardContent>
        </Card>
      </TabPanel>
      <div
        data-testid="settings-watermark"
        aria-hidden="true"
        className="pointer-events-none select-none text-center pt-6 pb-2 text-[10px] font-medium uppercase tracking-[0.4em] text-text opacity-[0.12]"
      >
        MatrixFlow Enterprise
      </div>
      {notice}
    </div>
  );
}