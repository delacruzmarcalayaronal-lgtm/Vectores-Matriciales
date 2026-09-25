import { useEffect, type RefObject } from 'react';
import { ROLE_LABELS, ROLE_ICONS } from '../../lib/permissions';
import type { Role } from '../../types';

export interface CarnetData {
  name: string;
  dni: string;
  role: Role;
  photo?: string;
  verifiedAt: Date;
}

const W = 1064;
const H = 672;
const SANS = '"Segoe UI", system-ui, -apple-system, sans-serif';
const MONO = 'Consolas, "Courier New", monospace';

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
};

const withSpacing = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: CanvasTextAlign = 'left') => {
  const chars = [...text];
  const total = chars.reduce((sum, ch) => sum + ctx.measureText(ch).width + spacing, 0) - spacing;
  let cursor = align === 'right' ? x - total : align === 'center' ? x - total / 2 : x;
  const prevAlign = ctx.textAlign;
  ctx.textAlign = 'left';
  for (const ch of chars) {
    ctx.fillText(ch, cursor, y);
    cursor += ctx.measureText(ch).width + spacing;
  }
  ctx.textAlign = prevAlign;
  return total;
};

const fitText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxSize: number, minSize: number, weight: string, family: string) => {
  let size = maxSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > minSize && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
};

const fitTextSpaced = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxSize: number, minSize: number, weight: string, family: string, spacing: number) => {
  let size = maxSize;
  const widthAt = (s: number) => {
    ctx.font = `${weight} ${s}px ${family}`;
    return [...text].reduce((sum, ch) => sum + ctx.measureText(ch).width + spacing, 0) - spacing;
  };
  while (size > minSize && widthAt(size) > maxWidth) size -= 1;
  return size;
};

const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'MF';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const formatVerified = (date: Date) => {
  try {
    const fecha = new Intl.DateTimeFormat('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
    const hora = new Intl.DateTimeFormat('es-PE', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }).format(date);
    return `${fecha} · ${hora}`;
  } catch {
    return date.toLocaleString();
  }
};

const drawPhoto = (ctx: CanvasRenderingContext2D, data: CarnetData, x: number, y: number, w: number, h: number, image?: HTMLImageElement) => {
  ctx.save();
  roundRect(ctx, x, y, w, h, 18);
  ctx.clip();
  if (image && image.complete && image.naturalWidth > 0) {
    const scale = Math.max(w / image.naturalWidth, h / image.naturalHeight);
    const dw = image.naturalWidth * scale;
    const dh = image.naturalHeight * scale;
    ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  } else {
    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, '#2563EB');
    gradient.addColorStop(1, '#06B6D4');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 92px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initialsOf(data.name), x + w / 2, y + h / 2 + 4);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
  ctx.restore();
  ctx.save();
  roundRect(ctx, x, y, w, h, 18);
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
};

const drawBarcode = (ctx: CanvasRenderingContext2D, dni: string, x: number, y: number, w: number, h: number) => {
  const digits = (dni || '00000000').replace(/\D/g, '') || '00000000';
  let cursor = x;
  let index = 0;
  ctx.fillStyle = '#0F172A';
  while (cursor < x + w) {
    const digit = Number(digits[index % digits.length]);
    const barWidth = 2 + ((digit + index) % 4) * 2;
    const gap = 2 + ((digit + index * 3) % 3) * 2;
    if (cursor + barWidth <= x + w) ctx.fillRect(cursor, y, barWidth, h);
    cursor += barWidth + gap;
    index += 1;
  }
};

const drawCarnet = async (canvas: HTMLCanvasElement, data: CarnetData): Promise<void> => {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, W, H);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Tarjeta
  ctx.save();
  roundRect(ctx, 0, 0, W, H, 28);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.clip();

  // Barra de acento inferior
  const accent = ctx.createLinearGradient(0, H - 16, W, H - 16);
  accent.addColorStop(0, '#2563EB');
  accent.addColorStop(1, '#06B6D4');
  ctx.fillStyle = accent;
  ctx.fillRect(0, H - 16, W, 16);

  // Encabezado
  ctx.fillStyle = '#2563EB';
  roundRect(ctx, 40, 34, 56, 56, 14);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      roundRect(ctx, 52 + col * 18, 46 + row * 12, 12, 7, 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = '#0F172A';
  ctx.font = `bold 34px ${SANS}`;
  ctx.fillText('MatrixFlow', 112, 76);

  ctx.fillStyle = '#64748B';
  ctx.font = `600 20px ${SANS}`;
  withSpacing(ctx, 'CARNET DE IDENTIFICACIÓN', W - 40, 72, 4, 'right');

  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 118);
  ctx.lineTo(W - 40, 118);
  ctx.stroke();

  // Foto
  const photo = { x: 40, y: 152, w: 250, h: 330 };
  let image: HTMLImageElement | undefined;
  if (data.photo) {
    image = await new Promise<HTMLImageElement | undefined>(resolve => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(undefined);
      img.src = data.photo!;
    });
  }
  drawPhoto(ctx, data, photo.x, photo.y, photo.w, photo.h, image);

  // Píldora de rol
  const roleLabel = `${ROLE_ICONS[data.role]} ${ROLE_LABELS[data.role]}`;
  ctx.save();
  roundRect(ctx, 40, 502, 250, 52, 26);
  ctx.fillStyle = '#EFF6FF';
  ctx.fill();
  ctx.strokeStyle = '#BFDBFE';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#2563EB';
  const roleSize = fitText(ctx, roleLabel, 210, 22, 14, '600', SANS);
  ctx.font = `600 ${roleSize}px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText(roleLabel, 165, 535);
  ctx.textAlign = 'left';
  ctx.restore();

  // Columna derecha
  const rx = 330;
  const rw = W - 40 - rx;

  ctx.fillStyle = '#94A3B8';
  ctx.font = `700 20px ${SANS}`;
  withSpacing(ctx, 'NOMBRE COMPLETO', rx, 176, 6);

  const nameSize = fitText(ctx, data.name || '—', rw, 52, 28, 'bold', SANS);
  ctx.fillStyle = '#0F172A';
  ctx.font = `bold ${nameSize}px ${SANS}`;
  ctx.fillText(data.name || '—', rx, 236);

  // DNI con insignia
  const cx = rx + 18;
  const cy = 296;
  ctx.beginPath();
  ctx.arc(cx, cy, 19, 0, Math.PI * 2);
  ctx.fillStyle = '#2563EB';
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - 9, cy);
  ctx.lineTo(cx - 2, cy + 7);
  ctx.lineTo(cx + 10, cy - 8);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.fillStyle = '#0F172A';
  ctx.font = `bold 40px ${MONO}`;
  ctx.fillText(`DNI · ${data.dni || '—'}`, cx + 34, cy + 14);

  ctx.fillStyle = '#334155';
  const method = 'MÉTODO: RECONOCIMIENTO FACIAL · 128D · SERVER-SIDE';
  const methodSize = fitTextSpaced(ctx, method, rw, 24, 14, '600', MONO, 2);
  ctx.font = `600 ${methodSize}px ${MONO}`;
  withSpacing(ctx, method, rx, 372, 2);

  const verified = `VERIFICADO: ${formatVerified(data.verifiedAt)}`;
  const verifiedSize = fitTextSpaced(ctx, verified, rw, 24, 14, '600', MONO, 2);
  ctx.font = `600 ${verifiedSize}px ${MONO}`;
  withSpacing(ctx, verified, rx, 418, 2);

  // Estado en línea
  ctx.beginPath();
  ctx.arc(rx + 8, 462, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#22C55E';
  ctx.fill();
  ctx.fillStyle = '#16A34A';
  ctx.font = `600 22px ${SANS}`;
  ctx.fillText('IDENTIDAD VERIFICADA · EN LÍNEA', rx + 26, 470);

  // Código de barras
  drawBarcode(ctx, data.dni || '', W - 40 - 300, 512, 300, 76);
  ctx.fillStyle = '#94A3B8';
  ctx.font = `600 18px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText(`MF-${data.dni || '00000000'}`, W - 40 - 150, 616);
  ctx.textAlign = 'left';

  ctx.restore();

  // Borde exterior
  roundRect(ctx, 2, 2, W - 4, H - 4, 26);
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 4;
  ctx.stroke();
};

interface CarnetProps {
  data: CarnetData;
  canvasRef?: RefObject<HTMLCanvasElement | null>;
  id?: string;
}

export function Carnet({ data, canvasRef, id }: CarnetProps) {
  useEffect(() => {
    const canvas = canvasRef?.current;
    if (canvas) void drawCarnet(canvas, data);
  }, [canvasRef, data]);

  return (
    <canvas
      id={id}
      ref={canvasRef}
      width={W}
      height={H}
      className="w-full h-auto rounded-3xl border border-border bg-white shadow-lg"
      aria-label="Carnet de identificación"
    />
  );
}
