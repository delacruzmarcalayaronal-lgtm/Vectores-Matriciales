import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, RefreshCw, ScanFace, ShieldAlert, Target } from 'lucide-react';
import { buildDescriptor, detectFace, drawFaceOverlay, GEOM_POINTS, type FaceHit } from '../../lib/face';

export interface FaceScanResult {
  vector: number[] | null;
  points: number;
}

type ScanStatus = 'idle' | 'requesting' | 'scanning' | 'success' | 'denied' | 'error';

interface FaceScannerProps {
  disabled?: boolean;
  onVerified: (result: FaceScanResult) => void;
  onReset?: () => void;
}

const STABLE_REQUIRED = 8;
const SCAN_TIMEOUT_MS = 40000;

export function FaceScanner({ disabled = false, onVerified, onReset }: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const demoTimerRef = useRef<number | null>(null);
  const hitRef = useRef<FaceHit | null>(null);
  const smoothBoxRef = useRef<FaceHit['box'] | null>(null);
  const stableRef = useRef(0);
  const startedRef = useRef(0);
  const busyRef = useRef(false);

  const [status, setStatus] = useState<ScanStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [hint, setHint] = useState('Activa la cámara para validar tu identidad');
  const [showDemo, setShowDemo] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (demoTimerRef.current) {
      window.clearTimeout(demoTimerRef.current);
      demoTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      clearTimers();
    };
  }, [stopCamera, clearTimers]);

  const finish = useCallback(
    async (hit: FaceHit, video: HTMLVideoElement) => {
      if (busyRef.current) return;
      busyRef.current = true;
      clearTimers();
      try {
        const vector = await buildDescriptor(hit, video);
        stopCamera();
        setStatus('success');
        setProgress(100);
        onVerified({ vector, points: GEOM_POINTS });
      } catch {
        setStatus('error');
        setHint('No se pudo procesar el rostro. Reintenta o usa el modo demostración.');
        setShowDemo(true);
        stopCamera();
      } finally {
        busyRef.current = false;
      }
    },
    [clearTimers, onVerified, stopCamera],
  );

  const scanLoop = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    timerRef.current = window.setInterval(() => {
      void (async () => {
        const current = videoRef.current;
        if (!current || current.readyState < 2) return;
        let hit: FaceHit | null = null;
        try {
          hit = await detectFace(current);
        } catch {
          setStatus('error');
          setHint('No se pudo cargar el motor de reconocimiento. Usa el modo demostración.');
          setShowDemo(true);
          stopCamera();
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return;
        }
        hitRef.current = hit;
        let smoothBox: FaceHit['box'] | undefined;
        if (hit) {
          const prev = smoothBoxRef.current;
          smoothBox = prev
            ? {
                x: prev.x + (hit.box.x - prev.x) * 0.5,
                y: prev.y + (hit.box.y - prev.y) * 0.5,
                width: prev.width + (hit.box.width - prev.width) * 0.5,
                height: prev.height + (hit.box.height - prev.height) * 0.5,
              }
            : hit.box;
          smoothBoxRef.current = smoothBox;
        } else {
          smoothBoxRef.current = null;
        }
        const overlay = overlayRef.current;
        if (overlay) {
          if (current.videoWidth && overlay.width !== current.videoWidth) {
            overlay.width = current.videoWidth;
            overlay.height = current.videoHeight;
          }
          drawFaceOverlay(overlay, hit, { stable: stableRef.current >= STABLE_REQUIRED, smoothBox });
        }
        if (!hit) {
          stableRef.current = Math.max(0, stableRef.current - 1);
          setHint('Buscando el rostro… coloca tu rostro frente a la cámara');
          setProgress((stableRef.current / STABLE_REQUIRED) * 100);
          return;
        }
        const box = hit.box;
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        const wellFramed =
          box.width >= 0.12 && box.width <= 0.95 && Math.abs(cx - 0.5) < 0.28 && Math.abs(cy - 0.5) < 0.28;
        if (wellFramed) {
          stableRef.current += 1;
        } else {
          stableRef.current = Math.max(0, stableRef.current - 1);
          setHint(box.width < 0.12 ? 'Acércate un poco a la cámara' : 'Centra tu rostro frente a la cámara');
        }
        setProgress((stableRef.current / STABLE_REQUIRED) * 100);
        if (stableRef.current >= STABLE_REQUIRED) {
          if (timerRef.current) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
          await finish(hit, current);
        } else if (Date.now() - startedRef.current > SCAN_TIMEOUT_MS) {
          setShowDemo(true);
          setHint('Todavía no se detecta un rostro nítido: mejora la iluminación o usa el modo demostración');
        }
      })();
    }, 280);
  }, [finish, stopCamera]);

  const startCamera = async () => {
    if (disabled) return;
    setStatus('requesting');
    setHint('Permite el acceso en el navegador');
    setShowDemo(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      stableRef.current = 0;
      smoothBoxRef.current = null;
      startedRef.current = Date.now();
      setStatus('scanning');
      setProgress(0);
      setHint('Buscando el rostro… coloca tu rostro frente a la cámara');
      scanLoop();
    } catch {
      setStatus('denied');
      setHint('Sin permiso o sin dispositivo: usa el modo demostración');
      setShowDemo(true);
    }
  };

  const captureNow = () => {
    const hit = hitRef.current;
    const video = videoRef.current;
    if (!hit || !video || status !== 'scanning') return;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    void finish(hit, video);
  };

  const runDemo = () => {
    clearTimers();
    stopCamera();
    setStatus('scanning');
    setProgress(0);
    setHint('Verificando rostro (demo)…');
    let value = 0;
    demoTimerRef.current = window.setInterval(() => {
      value += 6 + Math.random() * 6;
      if (value >= 100) {
        if (demoTimerRef.current) {
          window.clearInterval(demoTimerRef.current);
          demoTimerRef.current = null;
        }
        setProgress(100);
        setStatus('success');
        onVerified({ vector: null, points: 0 });
      } else {
        setProgress(value);
      }
    }, 70);
  };

  const reset = () => {
    clearTimers();
    stopCamera();
    stableRef.current = 0;
    hitRef.current = null;
    smoothBoxRef.current = null;
    setStatus('idle');
    setProgress(0);
    setHint('Activa la cámara para validar tu identidad');
    setShowDemo(false);
    onReset?.();
  };

  const scanning = status === 'scanning';
  const engineScan = scanning && !hint.startsWith('Verificando rostro (demo)');
  const progressLabel =
    status === 'success' ? 'Escaneo completo' : scanning ? 'Escaneando…' : 'Escanear';

  return (
    <div
      className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
        status === 'success'
          ? 'border-success bg-success/5'
          : status === 'denied' || status === 'error'
            ? 'border-warning bg-warning/5'
            : scanning
              ? 'border-primary bg-primary/5'
              : 'border-border bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        {status === 'success' ? (
          <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
        ) : status === 'denied' || status === 'error' ? (
          <ShieldAlert className="w-5 h-5 text-warning flex-shrink-0" />
        ) : status === 'requesting' ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
        ) : (
          <ScanFace className="w-5 h-5 text-secondary flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium text-text">
            {status === 'idle' && 'Escaneo facial'}
            {status === 'requesting' && 'Solicitando acceso a la cámara…'}
            {status === 'scanning' && (engineScan ? `Detección con ${GEOM_POINTS} puntos` : 'Verificando rostro (demo)…')}
            {status === 'success' && 'Rostro verificado'}
            {status === 'denied' && 'Cámara no disponible'}
            {status === 'error' && 'Motor de detección no disponible'}
          </p>
          <p className="text-xs text-secondary">{hint}</p>
        </div>
      </div>

      <div className="relative rounded-lg overflow-hidden bg-sidebar w-full max-w-[360px] aspect-square mx-auto mb-3">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className={`w-full h-full object-cover ${status === 'scanning' || status === 'requesting' ? '' : 'hidden'}`}
        />
        <canvas
          ref={overlayRef}
          className={`absolute inset-0 w-full h-full pointer-events-none ${engineScan ? '' : 'hidden'}`}
        />
        {status !== 'scanning' && status !== 'requesting' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="w-10 h-10 text-white/30" />
          </div>
        )}
        {scanning && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/50 text-white text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            {engineScan ? `${GEOM_POINTS} PUNTOS` : 'DEMO'}
          </div>
        )}
        {engineScan && <div className="scanline" aria-hidden="true" />}
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span
            className={`inline-flex items-center gap-1.5 font-medium ${
              scanning ? 'text-primary' : status === 'success' ? 'text-success' : 'text-secondary'
            }`}
          >
            {scanning && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
            {progressLabel}
          </span>
          <span className="text-secondary">{Math.round(progress)}%</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-100 ${status === 'success' ? 'bg-success' : 'bg-primary'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {status === 'idle' && (
          <button
            type="button"
            onClick={startCamera}
            disabled={disabled}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Camera className="w-4 h-4" />
            Activar cámara y escanear
          </button>
        )}
        {status === 'requesting' && (
          <span className="text-sm text-secondary">Esperando permiso de cámara…</span>
        )}
        {engineScan && (
          <button
            type="button"
            onClick={captureNow}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Target className="w-4 h-4" />
            Capturar ahora
          </button>
        )}
        {(status === 'denied' || status === 'error') && (
          <>
            <button
              type="button"
              onClick={runDemo}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <ScanFace className="w-4 h-4" />
              Verificar en modo demostración
            </button>
            <button
              type="button"
              onClick={startCamera}
              className="text-sm text-secondary hover:text-text underline"
            >
              Reintentar cámara
            </button>
          </>
        )}
        {showDemo && status === 'scanning' && (
          <button
            type="button"
            onClick={runDemo}
            className="text-sm text-secondary hover:text-text underline"
          >
            Continuar en modo demostración
          </button>
        )}
        {status === 'success' && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 text-sm text-secondary hover:text-text"
          >
            <RefreshCw className="w-4 h-4" />
            Repetir escaneo
          </button>
        )}
      </div>
    </div>
  );
}
