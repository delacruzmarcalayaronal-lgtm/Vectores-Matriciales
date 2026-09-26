import { useState } from 'react';
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
  type ThemeMode, getStoredTheme, getStoredPrimary, setThemePreference, setPrimaryColor, THEME_OPTIONS
} from '../lib/theme';
import { useNotice } from '../hooks/useNotice';

const THEME_CARDS: Record<ThemeMode, { label: string; bg: string; surface: string; text: string; border: string; half?: boolean }> = {
  light: { label: 'Light', bg: '#FFFFFF', surface: '#F1F5F9', text: '#0F172A', border: '#E2E8F0' },
  dark: { label: 'Dark', bg: '#0F172A', surface: '#334155', text: '#F1F5F9', border: '#334155' },
  system: { label: 'System', bg: '#FFFFFF', surface: '#F1F5F9', text: '#0F172A', border: '#E2E8F0', half: true },
  midnight: { label: 'Medianoche', bg: '#03060E', surface: '#1E293B', text: '#E2E8F0', border: '#1E293B' },
  ocean: { label: 'Océano', bg: '#041019', surface: '#14425C', text: '#E0F2FE', border: '#14425C' },
  matrix: { label: 'Matrix', bg: '#030803', surface: '#1B3A21', text: '#DCFCE7', border: '#1B3A21' },
};

const TECH_COLORS = [
  { hex: '#2563EB', name: 'Blue' },
  { hex: '#3B82F6', name: 'Azure' },
  { hex: '#0EA5E9', name: 'Sky' },
  { hex: '#06B6D4', name: 'Cyan' },
  { hex: '#14B8A6', name: 'Teal' },
  { hex: '#22C55E', name: 'Green' },
  { hex: '#4ADE80', name: 'Neon' },
  { hex: '#84CC16', name: 'Lime' },
  { hex: '#EAB308', name: 'Yellow' },
  { hex: '#F59E0B', name: 'Amber' },
  { hex: '#F97316', name: 'Orange' },
  { hex: '#EF4444', name: 'Red' },
  { hex: '#F43F5E', name: 'Rose' },
  { hex: '#EC4899', name: 'Pink' },
  { hex: '#D946EF', name: 'Fuchsia' },
  { hex: '#A855F7', name: 'Purple' },
  { hex: '#8B5CF6', name: 'Violet' },
  { hex: '#6366F1', name: 'Indigo' },
];

export function Settings() {
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getStoredTheme());
  const [primaryColor, setPrimaryState] = useState<string>(() => getStoredPrimary());
  const { show, notice } = useNotice();

  const handleTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    setThemePreference(mode);
  };

  const handlePrimary = (color: string) => {
    setPrimaryState(color);
    setPrimaryColor(color);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: <Globe className="w-4 h-4" /> },
    { id: 'appearance', label: 'Apariencia', icon: <Palette className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notificaciones', icon: <Bell className="w-4 h-4" /> },
    { id: 'security', label: 'Seguridad', icon: <Shield className="w-4 h-4" /> },
    { id: 'data', label: 'Datos', icon: <Database className="w-4 h-4" /> },
    { id: 'api', label: 'API', icon: <Key className="w-4 h-4" /> },
  ];

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 1000));
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Configuración</h1>
        <p className="text-secondary mt-1">Parámetros y preferencias del sistema</p>
      </div>

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      <TabPanel id="general" activeTab={activeTab}>
        <Card>
          <CardHeader>
            <CardTitle>Configuración General</CardTitle>
            <CardDescription>Información básica de la empresa y preferencias del sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Nombre de la Empresa" placeholder="Sin configurar" />
              <Input label="RUC" placeholder="Sin configurar" />
            </div>
            <Input label="Dirección" placeholder="Sin configurar" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input label="Ciudad" placeholder="Sin configurar" />
              <Input label="País" placeholder="Sin configurar" />
              <Input label="Teléfono" placeholder="Sin configurar" />
            </div>
            <Input label="Email Corporativo" type="email" placeholder="Sin configurar" />
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

      <TabPanel id="appearance" activeTab={activeTab}>
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
            <div>
              <label className="block text-sm font-medium text-text mb-3">Color Primario</label>
              <div className="flex flex-wrap items-center gap-3">
                {TECH_COLORS.map(({ hex, name }) => (
                  <label key={hex} className="relative cursor-pointer" title={name}>
                    <input
                      type="radio"
                      name="primaryColor"
                      value={hex}
                      checked={primaryColor === hex}
                      onChange={() => handlePrimary(hex)}
                      className="sr-only peer"
                    />
                    <div
                      className="w-10 h-10 rounded-full border-2 border-white/30 transition-transform peer-checked:scale-110 peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-primary"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="block text-[10px] text-secondary mt-1 text-center">{name}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-secondary mt-3">El cambio se aplica de inmediato y queda guardado en este navegador.</p>
            </div>
            <div className="flex justify-end pt-4 border-t border-border">
              <Button onClick={handleSave} loading={saving} leftIcon={<Save className="w-4 h-4" />}>Guardar Cambios</Button>
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel id="notifications" activeTab={activeTab}>
        <Card>
          <CardHeader>
            <CardTitle>Notificaciones</CardTitle>
            <CardDescription>Configura cómo y cuándo recibir alertas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { id: 'email_alerts', label: 'Alertas por Email', desc: 'Recibir notificaciones importantes por correo electrónico' },
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
                  <input type="checkbox" defaultChecked={['email_alerts', 'stock_alerts', 'target_alerts'].includes(item.id)} className="sr-only peer" />
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

      <TabPanel id="security" activeTab={activeTab}>
        <Card>
          <CardHeader>
            <CardTitle>Seguridad</CardTitle>
            <CardDescription>Configuración de autenticación y acceso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Tiempo de Sesión (minutos)" type="number" defaultValue="480" />
              <Input label="Intentos de Login Máximos" type="number" defaultValue="5" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Duración Token Acceso (min)" type="number" defaultValue="60" />
              <Input label="Duración Token Refresh (días)" type="number" defaultValue="30" />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="font-medium text-text">Autenticación de Dos Factores (2FA)</p>
                  <p className="text-sm text-secondary">Requerir 2FA para todos los administradores</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div>
                  <p className="font-medium text-text">Bloqueo por Inactividad</p>
                  <p className="text-sm text-secondary">Cerrar sesión automáticamente tras inactividad</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
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

      <TabPanel id="data" activeTab={activeTab}>
        <Card>
          <CardHeader>
            <CardTitle>Gestión de Datos</CardTitle>
            <CardDescription>Respaldos, importación y exportación de información</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-medium text-text mb-4">Respaldos Automáticos</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Select
                  label="Frecuencia"
                  defaultValue="daily"
                  options={[
                    { value: 'hourly', label: 'Cada hora' },
                    { value: 'daily', label: 'Diario' },
                    { value: 'weekly', label: 'Semanal' },
                  ]}
                />
                <Input label="Hora" type="time" defaultValue="02:00" />
                <Input label="Retención (días)" type="number" defaultValue="30" />
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <h4 className="font-medium text-text mb-4">Exportar Datos</h4>
              <div className="flex flex-wrap gap-4">
                <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => show('La exportación de datos estará disponible en una versión futura.')}>Exportar Ventas (CSV)</Button>
                <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => show('La exportación de datos estará disponible en una versión futura.')}>Exportar Inventario (CSV)</Button>
                <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => show('La exportación de datos estará disponible en una versión futura.')}>Exportar Vectores (JSON)</Button>
                <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => show('La exportación de datos estará disponible en una versión futura.')}>Exportar Matrices (JSON)</Button>
                <Button variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => show('La exportación de datos estará disponible en una versión futura.')}>Exportar Historial (CSV)</Button>
              </div>
            </div>
            <div className="pt-4 border-t border-border">
              <h4 className="font-medium text-text mb-4">Importar Datos</h4>
              <div className="flex flex-wrap gap-4">
                <Button variant="outline" leftIcon={<Upload className="w-4 h-4" />} onClick={() => show('La importación de datos estará disponible en una versión futura.')}>Importar Productos</Button>
                <Button variant="outline" leftIcon={<Upload className="w-4 h-4" />} onClick={() => show('La importación de datos estará disponible en una versión futura.')}>Importar Ventas</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel id="api" activeTab={activeTab}>
        <Card>
          <CardHeader>
            <CardTitle>Configuración API</CardTitle>
            <CardDescription>Endpoints, claves y límites de tasa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Input label="URL Base API" defaultValue="http://localhost:8000/api/v1" />
            <Input label="Clave API" type="password" defaultValue="••••••••••••••••" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Input label="Límite Requests/min" type="number" defaultValue="100" />
              <Input label="Timeout (segundos)" type="number" defaultValue="30" />
              <Input label="Reintentos" type="number" defaultValue="3" />
            </div>
            <div className="flex justify-end pt-4 border-t border-border">
              <Button onClick={handleSave} loading={saving} leftIcon={<Save className="w-4 h-4" />}>Guardar Cambios</Button>
            </div>
          </CardContent>
        </Card>
      </TabPanel>
      {notice}
    </div>
  );
}