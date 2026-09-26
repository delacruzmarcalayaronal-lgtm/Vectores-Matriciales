import { useEffect, useRef } from 'react';
import { type BgDensity, DEFAULT_BG_MOTION } from '../../lib/bgMotion';

const PALETTE: Array<[number, number, number]> = [
  [34, 211, 238],
  [99, 102, 241],
  [168, 85, 247],
  [56, 189, 248],
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: number;
  phase: number;
  speed: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  speed: number;
  size: number;
  tint: number;
}

interface Aurora {
  cx: number;
  cy: number;
  r: number;
  color: 0 | 1;
  phase: number;
  speed: number;
}

function parseCssColor(value: string, fallback: [number, number, number]): [number, number, number] {
  const v = value.trim();
  if (v.startsWith('#')) {
    const hex = v.slice(1);
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
      ];
    }
    if (hex.length === 6) {
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
      ];
    }
  }
  const m = v.match(/(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  return fallback;
}

function makeSprite(color: [number, number, number]): HTMLCanvasElement {
  const size = 64;
  const sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;
  const g = sprite.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},0.6)`);
  grad.addColorStop(0.45, `rgba(${color[0]},${color[1]},${color[2]},0.16)`);
  grad.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  return sprite;
}

const rgba = (c: [number, number, number], a: number) =>
  `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`;

export interface SmokeFieldProps {
  density?: BgDensity;
  speed?: number;
  interactive?: boolean;
}

const DENSITY_COUNTS: Record<BgDensity, { smoke: number; spark: number }> = {
  low: { smoke: 40, spark: 24 },
  medium: { smoke: 84, spark: 48 },
  high: { smoke: 140, spark: 80 },
};

export function SmokeField({
  density = DEFAULT_BG_MOTION.density,
  speed = DEFAULT_BG_MOTION.speed,
  interactive = DEFAULT_BG_MOTION.interactive,
}: SmokeFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const sprites = PALETTE.map(makeSprite);
    const smoke: Particle[] = [];
    const sparks: Spark[] = [];
    const auroras: Aurora[] = [];
    const mouse = { x: -9999, y: -9999, active: false, px: -9999, py: -9999 };
    let width = 0;
    let height = 0;
    let raf = 0;
    let time = 0;
    let placed = false;
    const themeColors = {
      primary: [37, 99, 235] as [number, number, number],
      accent: [6, 182, 212] as [number, number, number],
    };

    const refreshThemeColors = () => {
      const cs = getComputedStyle(document.documentElement);
      themeColors.primary = parseCssColor(cs.getPropertyValue('--color-primary'), [37, 99, 235]);
      themeColors.accent = parseCssColor(cs.getPropertyValue('--color-accent'), [6, 182, 212]);
    };
    refreshThemeColors();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const SMOKE_COUNT = DENSITY_COUNTS[density].smoke;
    const SPARK_COUNT = DENSITY_COUNTS[density].spark;

    const placeAll = () => {
      smoke.length = 0;
      sparks.length = 0;
      auroras.length = 0;
      for (let i = 0; i < SMOKE_COUNT; i++) {
        smoke.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: 0.35 + Math.random() * 0.35,
          vy: -0.05 - Math.random() * 0.25,
          r: 26 + Math.random() * 54,
          color: Math.floor(Math.random() * sprites.length),
          phase: Math.random() * Math.PI * 2,
          speed: 0.004 + Math.random() * 0.008,
        });
      }
      for (let i = 0; i < SPARK_COUNT; i++) {
        sparks.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: 0.2 + Math.random() * 0.4,
          vy: -0.1 - Math.random() * 0.3,
          phase: Math.random() * Math.PI * 2,
          speed: 0.02 + Math.random() * 0.05,
          size: 1.1 + Math.random() * 1.8,
          tint: Math.floor(Math.random() * 3) as 0 | 1 | 2,
        });
      }
      auroras.push(
        { cx: width * 0.24, cy: height * 0.32, r: Math.max(320, width * 0.3), color: 0, phase: 0.5, speed: 0.0035 },
        { cx: width * 0.72, cy: height * 0.6, r: Math.max(360, width * 0.34), color: 1, phase: 2.4, speed: 0.0028 },
        { cx: width * 0.5, cy: height * 0.9, r: Math.max(280, width * 0.26), color: 0, phase: 4.1, speed: 0.004 },
      );
      placed = true;
    };
    if (width > 0) placeAll();

    const burst = (x: number, y: number) => {
      for (let i = 0; i < 22; i++) {
        const angle = Math.random() * Math.PI * 2;
        const force = 1.2 + Math.random() * 2.4;
        smoke.push({
          x: x + (Math.random() - 0.5) * 30,
          y: y + (Math.random() - 0.5) * 30,
          vx: Math.cos(angle) * force,
          vy: Math.sin(angle) * force,
          r: 16 + Math.random() * 40,
          color: Math.floor(Math.random() * sprites.length),
          phase: Math.random() * Math.PI * 2,
          speed: 0.006 + Math.random() * 0.01,
        });
        if (i < 12) {
          sparks.push({
            x: x + (Math.random() - 0.5) * 40,
            y: y + (Math.random() - 0.5) * 40,
            vx: Math.cos(angle) * force * 1.3,
            vy: Math.sin(angle) * force * 1.3,
            phase: Math.random() * Math.PI * 2,
            speed: 0.03 + Math.random() * 0.06,
            size: 1.2 + Math.random() * 2,
            tint: Math.floor(Math.random() * 3) as 0 | 1 | 2,
          });
        }
      }
      if (smoke.length > SMOKE_COUNT + 120) smoke.splice(SMOKE_COUNT, smoke.length - SMOKE_COUNT - 120);
      if (sparks.length > SPARK_COUNT + 80) sparks.splice(SPARK_COUNT, sparks.length - SPARK_COUNT - 80);
    };

    const toLocal = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
        inside: clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom,
      };
    };

    const onMove = (e: MouseEvent) => {
      const pos = toLocal(e.clientX, e.clientY);
      mouse.px = mouse.x;
      mouse.py = mouse.y;
      mouse.x = pos.x;
      mouse.y = pos.y;
      mouse.active = pos.inside;
    };
    const onLeave = () => {
      mouse.active = false;
      mouse.x = -9999;
      mouse.y = -9999;
    };
    const BURST_EXCLUDE = 'button, a, input, select, textarea, label, [role="tab"], [role="button"], [role="switch"], [role="menuitem"], [role="dialog"], [role="status"]';
    const onClick = (e: MouseEvent) => {
      if (e.target instanceof Element && e.target.closest(BURST_EXCLUDE)) return;
      const pos = toLocal(e.clientX, e.clientY);
      if (pos.inside) burst(pos.x, pos.y);
    };
    const onResize = () => resize();

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseout', onLeave);
    window.addEventListener('click', onClick);
    window.addEventListener('resize', onResize);
    if (!interactive) {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
      window.removeEventListener('click', onClick);
      mouse.active = false;
    }

    let running = true;
    const onVisibility = () => {
      running = !document.hidden;
      if (running) raf = requestAnimationFrame(frame);
    };
    document.addEventListener('visibilitychange', onVisibility);

    const frame = () => {
      if (!running) return;
      raf = requestAnimationFrame(frame);
      if (width === 0) {
        resize();
        return;
      }
      if (!placed) placeAll();
      time += speed;
      if (time % 30 < speed) refreshThemeColors();

      const dark = document.documentElement.classList.contains('dark');
      const glowComp = dark ? 'lighter' : 'source-over';
      const tone = dark ? 1 : 0.7;

      ctx.clearRect(0, 0, width, height);

      // Auroras: brillos grandes que heredan el color primario/acento del tema
      ctx.globalCompositeOperation = glowComp;
      for (const a of auroras) {
        a.cx += Math.sin(time * a.speed + a.phase) * 0.35;
        a.cy += Math.cos(time * a.speed * 0.8 + a.phase) * 0.22;
        const col = a.color === 0 ? themeColors.primary : themeColors.accent;
        const pulse = 0.75 + 0.25 * Math.sin(time * a.speed * 2 + a.phase);
        const alpha = (dark ? 0.11 : 0.075) * pulse * tone;
        const grad = ctx.createRadialGradient(a.cx, a.cy, 0, a.cx, a.cy, a.r);
        grad.addColorStop(0, rgba(col, alpha));
        grad.addColorStop(1, rgba(col, 0));
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(a.cx, a.cy, a.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Humo
      const cursorSpeed = mouse.active
        ? Math.min(Math.hypot(mouse.x - mouse.px, mouse.y - mouse.py), 40)
        : 0;

      for (let i = smoke.length - 1; i >= 0; i--) {
        const p = smoke[i];

        const swayX = Math.sin(p.y * 0.008 + time * p.speed + p.phase);
        const swayY = Math.cos(p.x * 0.01 - time * p.speed * 0.8 + p.phase);
        p.vx += swayX * 0.012;
        p.vy += swayY * 0.01 - 0.004;

        let boost = 0;
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.hypot(dx, dy) || 1;
          const radius = 170;
          if (dist < radius) {
            const force = 1 - dist / radius;
            const push = 0.55 + force * (0.6 + cursorSpeed * 0.05);
            p.vx += (dx / dist) * push;
            p.vy += (dy / dist) * push;
            boost = force;
          }
        }

        p.vx = Math.max(-4, Math.min(4, p.vx * 0.965 + 0.012));
        p.vy = Math.max(-4, Math.min(4, p.vy * 0.965));
        p.x += p.vx;
        p.y += p.vy;

        if (p.x - p.r > width) p.x = -p.r;
        if (p.x + p.r < 0) p.x = width + p.r;
        if (p.y + p.r < 0) p.y = height + p.r;
        if (p.y - p.r > height) p.y = -p.r;

        const pulse = 0.5 + 0.5 * Math.sin(time * p.speed * 1.6 + p.phase);
        ctx.globalCompositeOperation = glowComp;
        const alpha = Math.min(0.85, 0.16 + pulse * 0.18 + boost * 0.45) * tone;
        ctx.globalAlpha = alpha;
        const size = p.r * 2 * (1 + boost * 0.35);
        ctx.drawImage(sprites[p.color], p.x - size / 2, p.y - size / 2, size, size);
      }

      // Destellos (brillo fino tipo chispas)
      for (const s of sparks) {
        const sway = Math.sin(time * s.speed * 0.5 + s.phase);
        s.x += s.vx + sway * 0.12;
        s.y += s.vy;
        if (s.x - 6 > width) s.x = -6;
        if (s.x + 6 < 0) s.x = width + 6;
        if (s.y + 6 < 0) s.y = height + 6;
        if (s.y - 6 > height) s.y = -6;

        const twinkle = Math.pow(0.5 + 0.5 * Math.sin(time * s.speed + s.phase), 8);
        const alpha = twinkle * (dark ? 0.95 : 0.6);
        if (alpha < 0.03) continue;

        let col: [number, number, number];
        if (s.tint === 1) col = themeColors.primary;
        else if (s.tint === 2) col = themeColors.accent;
        else col = dark ? [255, 255, 255] : themeColors.primary;

        ctx.globalCompositeOperation = glowComp;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = rgba(col, 1);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * (0.7 + twinkle * 0.8), 0, Math.PI * 2);
        ctx.fill();

        if (twinkle > 0.75) {
          ctx.globalAlpha = alpha * 0.5;
          ctx.beginPath();
          ctx.moveTo(s.x - s.size * 3, s.y);
          ctx.lineTo(s.x + s.size * 3, s.y);
          ctx.moveTo(s.x, s.y - s.size * 3);
          ctx.lineTo(s.x, s.y + s.size * 3);
          ctx.strokeStyle = rgba(col, 1);
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // Brillo bajo el cursor
      if (mouse.active) {
        ctx.globalCompositeOperation = glowComp;
        const col = themeColors.accent;
        const glow = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 160);
        glow.addColorStop(0, rgba(col, dark ? 0.16 : 0.12));
        glow.addColorStop(0.5, rgba(col, dark ? 0.06 : 0.045));
        glow.addColorStop(1, rgba(col, 0));
        ctx.globalAlpha = 1;
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 160, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    if (reduced) {
      resize();
      if (!placed) placeAll();
      refreshThemeColors();
      const dark = document.documentElement.classList.contains('dark');
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
      for (const p of smoke) {
        ctx.globalAlpha = 0.22;
        ctx.drawImage(sprites[p.color], p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
      }
      for (const a of auroras) {
        const col = a.color === 0 ? themeColors.primary : themeColors.accent;
        const grad = ctx.createRadialGradient(a.cx, a.cy, 0, a.cx, a.cy, a.r);
        grad.addColorStop(0, rgba(col, 0.09));
        grad.addColorStop(1, rgba(col, 0));
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(a.cx, a.cy, a.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    } else {
      raf = requestAnimationFrame(frame);
    }

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseout', onLeave);
      window.removeEventListener('click', onClick);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [density, speed, interactive]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full print:hidden" aria-hidden="true" />;
}
