import { clsx } from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { healthApi } from '../../services/api';

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

export function OnlineStatus({ className }: { className?: string }) {
  const { data } = useQuery({
    queryKey: ['health-status'],
    queryFn: (USE_MOCK ? async () => ({ online: true }) : healthApi.check),
    refetchInterval: 15000,
    retry: 1,
  });
  const online = data?.online ?? navigator.onLine;

  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm text-secondary',
        className
      )}
      title={online ? 'Conectado al servidor MatrixFlow' : 'Sin conexión al servidor'}
    >
      <span
        className={clsx(
          'w-2 h-2 rounded-full',
          online ? 'bg-success animate-pulse' : 'bg-danger'
        )}
      />
      {online ? 'En línea' : 'Sin conexión'}
    </div>
  );
}
