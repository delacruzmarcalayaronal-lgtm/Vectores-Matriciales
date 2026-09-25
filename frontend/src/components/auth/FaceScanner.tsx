import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, RefreshCw, ScanFace, ShieldAlert } from 'lucide-react';

type ScanStatus = 'idle' | 'requesting' | 'scanning' | 'success' | 'denied';

interface FaceScannerProps {
  disabled?: boolean;
  onVerified: () => void;
  onReset?: () => void;
}

export function FaceScanner({ disabled = false, onVerified, onReset }: FaceScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  const [status, setStatus] = useState<ScanStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [fallbackMode, setFallbackMode] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
      clearTimer();
    };
  }, [stopCamera, clearTimer]);

  const runScan = (fallback: boolean) => {
    setFallbackMode(fallback);
    setStatus('scanning');
    setProgress(0);
    clearTimer();

    let value = 0;
    timerRef.current = window.setInterval(() => {
      value += 2 + Math.random() * 5;
      if (value >= 100) {
        clearTimer();
        setProgress(100);
        setStatus('success');
        stopCamera();
        onVerified();
      } else {
        setProgress(value);
      }
    }, 60);
  };

  const startCamera = async () => {
    if (disabled) return;
    setStatus('requesting');
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
      runScan(false);
    } catch {
      setStatus('denied');
    }
  };

  const reset = () => {
    clearTimer();
    stopCamera();
    setStatus('idle');
    setProgress(0);
    setFallbackMode(false);
    onReset?.();
  };

  const scanning = status === 'scanning';

  return (
    <div
      className={`rounded-xl border-2 border-dashed p-4 transition-colors ${
        status === 'success'
          ? 'border-success bg-success/5'
          : status === 'denied'
            ? 'border-warning bg-warning/5'
            : scanning
              ? 'border-primary bg-primary/5'
              : 'border-border bg-gray-50'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        {status === 'success' ? (
          <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
        ) : status === 'denied' ? (
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
            {status === 'scanning' && (fallbackMode ? 'Verificando rostro (demo)…' : 'Verificando rostro…')}
            {status === 'success' && 'Rostro verificado'}
            {status === 'denied' && 'Cámara no disponible'}
          </p>
          <p className="text-xs text-secondary">
            {status === 'idle' && 'Activa la cámara para validar tu identidad'}
            {status === 'requesting' && 'Permite el acceso en el navegador'}
            {status === 'scanning' && 'Mantén el rostro dentro del marco'}
            {status === 'success' && 'Identidad validada correctamente'}
            {status === 'denied' && 'Sin permiso o sin dispositivo: usa el modo demostración'}
          </p>
        </div>
      </div>

      <div className="relative rounded-lg overflow-hidden bg-sidebar w-full max-w-[360px] aspect-square mx-auto mb-3">
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          className={`w-full h-full object-cover ${!fallbackMode && (scanning || status === 'requesting') ? '' : 'hidden'}`}
        />
        {fallbackMode && scanning && (
          <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
            <ScanFace className="w-16 h-16 text-white/40" />
            <div
              className="absolute left-0 right-0 h-0.5 bg-accent shadow-[0_0_12px_2px_rgba(6,182,212,0.8)]"
              style={{ top: `${progress}%` }}
            />
          </div>
        )}
        {status !== 'scanning' && status !== 'requesting' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="w-10 h-10 text-white/30" />
          </div>
        )}
        {scanning && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-40 h-40 rounded-2xl border-2 border-accent/80 animate-pulse" />
          </div>
        )}
      </div>

      {scanning && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-secondary mb-1">
            <span>Analizando rasgos faciales</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
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
        {status === 'denied' && (
          <>
            <button
              type="button"
              onClick={() => runScan(true)}
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
