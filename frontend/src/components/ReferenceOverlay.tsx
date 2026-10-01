import { useEffect, useState } from 'react';

/* Referencia en pantalla: la tecla R abre/cierra la imagen de referencia
   (fuera de los inputs, para no interferir al escribir). */
export function ReferenceOverlay() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key !== 'r' && event.key !== 'R') return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable) return;
      }
      event.preventDefault();
      setOpen(value => !value);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  if (!open) return null;

  return (
    <div
      data-testid="reference-overlay"
      role="dialog"
      aria-label="Referencia"
      className="fixed inset-0 z-[100] flex cursor-pointer items-center justify-center bg-black/80 p-4"
      onClick={() => setOpen(false)}
    >
      <img
        src="/referencia.jpg"
        alt="Referencia"
        className="max-h-[90vh] max-w-[95vw] rounded-xl object-contain shadow-2xl"
      />
    </div>
  );
}
