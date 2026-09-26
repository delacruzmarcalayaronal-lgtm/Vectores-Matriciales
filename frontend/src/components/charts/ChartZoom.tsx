import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X, ZoomIn } from 'lucide-react';
import { Button } from '../ui/Button';

interface ChartZoomProps {
  title: string;
  children: ReactNode;
  className?: string;
}

/**
 * Envuelve un gráfico: al tocar/clickear se abre en pantalla completa
 * con opción de imprimir solo ese gráfico a página completa (PDF nítido).
 */
export function ChartZoom({ title, children, className }: ChartZoomProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.documentElement.classList.add('chart-zoom-active');
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.classList.remove('chart-zoom-active');
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open) {
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={`Ampliar gráfico: ${title}`}
        title="Toca para ampliar el gráfico"
        onClick={() => setOpen(true)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`group relative rounded-lg cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-primary/60 ${className || ''}`}
      >
        {children}
        <span className="pointer-events-none absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-70 transition-opacity group-hover:opacity-100 print:hidden">
          <ZoomIn className="h-4 w-4" />
        </span>
      </div>
    );
  }

  return createPortal(
    <div
      id="chart-zoom-print"
      className="fixed inset-0 z-[70] flex flex-col bg-black/85 p-3 sm:p-6"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label={`Gráfico ampliado: ${title}`}
    >
      <div
        className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="zoom-controls flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h3 className="truncate font-semibold text-text">{title}</h3>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => window.print()}
            >
              Imprimir
            </Button>
            <Button
              size="sm"
              variant="outline"
              leftIcon={<X className="w-4 h-4" />}
              onClick={() => setOpen(false)}
            >
              Cerrar
            </Button>
          </div>
        </div>
        <div className="zoom-chart min-h-0 flex-1 p-3 sm:p-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
