import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  MapPin, RefreshCcw, Search, Users, Activity, Clock, WifiOff, Filter, RotateCcw, Shield,
} from 'lucide-react';
import {
  useLatestLocations,
  useMapHtml,
  useWorkerHistoryMap,
  useWorkersList,
} from '../hooks/useApi';
import { locationsApi } from '../services/locationApi';
import type { TrackingStatus } from '../services/locationApi';

type StatusFilter = 'all' | TrackingStatus;

const STATUS_LABEL: Record<TrackingStatus, string> = {
  active: 'Activo',
  idle: 'Inactivo',
  offline: 'Sin señal',
};

const STATUS_BADGE: Record<TrackingStatus, string> = {
  active: 'bg-success/10 text-success',
  idle: 'bg-warning/10 text-warning',
  offline: 'bg-danger/10 text-danger',
};

const STATUS_DOT: Record<TrackingStatus, string> = {
  active: 'bg-success',
  idle: 'bg-warning',
  offline: 'bg-danger',
};

const formatAgo = (minutes: number): string => {
  if (minutes < 1) return 'hace instantes';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `hace ${hours} h ${minutes % 60 ? `${minutes % 60} min` : ''}`.trim();
};

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  tone?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-border">
      <div className={clsx('p-2.5 rounded-xl', tone ?? 'bg-primary/10 text-primary')}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-xl font-semibold text-text">{value}</div>
        <div className="text-xs text-secondary">{label}</div>
      </div>
    </div>
  );
}

export function AdminMap() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
  const [view, setView] = useState<'live' | 'geofence'>('live');

  const latest = useLatestLocations();
  const liveMap = useMapHtml({ enabled: view === 'live' && !selectedWorker });
  const historyMap = useWorkerHistoryMap(selectedWorker);
  const workers = useWorkersList();

  const geofenceMap = useQuery({
    queryKey: ['locations', 'map', 'geofence'],
    queryFn: () => locationsApi.getGeofenceMapHtml(),
    enabled: view === 'geofence' && !selectedWorker,
    refetchInterval: 60000,
  });

  const rows = latest.data ?? [];
  const stats = {
    total: rows.length,
    active: rows.filter((r) => r.status === 'active').length,
    idle: rows.filter((r) => r.status === 'idle').length,
    offline: rows.filter((r) => r.status === 'offline').length,
  };

  const nameOf = (workerId: string) =>
    workers.data?.find((w) => w.id === workerId)?.name ?? '';

  const filtered = rows.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (search) {
      const needle = search.toLowerCase();
      if (!r.workerName.toLowerCase().includes(needle) && !r.employeeCode.includes(needle)) {
        return false;
      }
    }
    return true;
  });

  const iframeHtml = selectedWorker
    ? historyMap.data
    : view === 'live'
      ? liveMap.data
      : geofenceMap.data;

  const mapLoading = selectedWorker
    ? historyMap.isLoading
    : view === 'live'
      ? liveMap.isLoading
      : geofenceMap.isLoading;

  const mapError = selectedWorker
    ? historyMap.isError
    : view === 'live'
      ? liveMap.isError
      : geofenceMap.isError;

  const reload = () => {
    void latest.refetch();
    if (selectedWorker) void historyMap.refetch();
    else if (view === 'live') void liveMap.refetch();
    else void geofenceMap.refetch();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Mapa de Ubicaciones</h1>
          <p className="text-sm text-secondary">
            Rastreo de trabajadores en tiempo real · actualización cada 60 s
          </p>
        </div>
        <button
          onClick={reload}
          disabled={latest.isFetching}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-primary text-white hover:bg-primary-hover disabled:opacity-60 transition-colors"
        >
          <RefreshCcw className={clsx('w-4 h-4', latest.isFetching && 'animate-spin')} />
          Recargar
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Trabajadores" value={stats.total} />
        <StatCard icon={Activity} label="Activos" value={stats.active} tone="bg-success/10 text-success" />
        <StatCard icon={Clock} label="Inactivos" value={stats.idle} tone="bg-warning/10 text-warning" />
        <StatCard icon={WifiOff} label="Sin señal" value={stats.offline} tone="bg-danger/10 text-danger" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2 text-sm font-medium text-text">
              <MapPin className="w-4 h-4 text-primary" />
              {selectedWorker
                ? `Historial · ${nameOf(selectedWorker) || 'trabajador'}`
                : view === 'live'
                  ? 'Mapa en vivo'
                  : 'Geofence (500 m)'}
            </div>
            <div className="flex items-center gap-2">
              {selectedWorker && (
                <button
                  onClick={() => setSelectedWorker(null)}
                  className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border border-border text-secondary hover:bg-surface-hover transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Volver
                </button>
              )}
              {!selectedWorker && (
                <div className="flex rounded-lg border border-border overflow-hidden text-xs">
                  <button
                    onClick={() => setView('live')}
                    className={clsx(
                      'px-2.5 py-1 transition-colors',
                      view === 'live' ? 'bg-primary text-white' : 'text-secondary hover:bg-surface-hover'
                    )}
                  >
                    En vivo
                  </button>
                  <button
                    onClick={() => setView('geofence')}
                    className={clsx(
                      'px-2.5 py-1 transition-colors border-l border-border',
                      view === 'geofence' ? 'bg-primary text-white' : 'text-secondary hover:bg-surface-hover'
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" />
                      Geofence
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="relative h-[520px] bg-surface-hover">
            {mapError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-secondary gap-2">
                <WifiOff className="w-6 h-6 text-danger" />
                No se pudo cargar el mapa
                <button onClick={reload} className="text-primary underline text-xs">
                  Reintentar
                </button>
              </div>
            )}
            {!mapError && mapLoading && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-secondary">
                Cargando mapa…
              </div>
            )}
            {!mapError && iframeHtml && (
              <iframe
                title="Mapa de trabajadores"
                srcDoc={iframeHtml}
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin"
              />
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-text">Trabajadores</span>
              <span className="text-xs text-secondary">{filtered.length} de {stats.total}</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o DNI…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-bg focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-secondary" />
              <div className="flex gap-1 flex-wrap">
                {(['all', 'active', 'idle', 'offline'] as StatusFilter[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={clsx(
                      'px-2.5 py-1 text-xs rounded-lg border transition-colors',
                      statusFilter === s
                        ? 'bg-primary text-white border-primary'
                        : 'border-border text-secondary hover:bg-surface-hover'
                    )}
                  >
                    {s === 'all' ? 'Todos' : STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-border max-h-[430px]">
            {latest.isLoading && (
              <div className="p-4 text-sm text-secondary">Cargando trabajadores…</div>
            )}
            {!latest.isLoading && filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-secondary">
                Sin trabajadores con estado {statusFilter === 'all' ? '' : STATUS_LABEL[statusFilter as TrackingStatus]}
              </div>
            )}
            {filtered.map((row) => (
              <button
                key={row.workerId}
                onClick={() => setSelectedWorker(row.workerId)}
                className={clsx(
                  'w-full text-left px-4 py-3 hover:bg-surface-hover transition-colors',
                  selectedWorker === row.workerId && 'bg-primary/5'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-text truncate">
                      {row.workerName || row.employeeCode}
                    </div>
                    <div className="text-xs text-secondary">
                      DNI {row.employeeCode} · {formatAgo(row.minutesAgo)}
                    </div>
                  </div>
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1.5 px-2 py-0.5 text-xs rounded-full shrink-0',
                      STATUS_BADGE[row.status]
                    )}
                  >
                    <span className={clsx('w-1.5 h-1.5 rounded-full', STATUS_DOT[row.status])} />
                    {STATUS_LABEL[row.status]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
