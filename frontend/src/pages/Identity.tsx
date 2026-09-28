import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  Contrast,
  Focus,
  Gauge,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  Sun,
  Upload,
  UserCheck,
  XCircle,
  ArrowRight,
  ZoomIn,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Table';
import { useAuth } from '../contexts/useAuth';
import { ROLE_LABELS, ROLE_ICONS } from '../lib/permissions';
import { authApi } from '../services/api';
import {
  buildDescriptor,
  clampThreshold,
  detectFace,
  drawFaceOverlay,
  GEOM_POINTS,
  MAX_THRESHOLD,
  MIN_THRESHOLD,
  type FaceHit,
  type FaceSource,
} from '../lib/face';

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    image.src = src;
  });

const toDataUrl = (source: CanvasImageSource, width: number, height: number): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(source, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.85);
};

interface Quality {
  mean: number;
  std: number;
  ok: boolean;
  label: string;
  hint: string;
}

const analyzeFrame = async (dataUrl: string): Promise<Quality | null> => {
  try {
    const image = await loadImage(dataUrl);
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, 64, 64);
    const { data } = ctx.getImageData(0, 0, 64, 64);
    const values: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      values.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    }
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
    const std = Math.sqrt(variance);
    if (mean < 60) return { mean, std, ok: false, label: 'Muy oscura', hint: 'Sube el slider de iluminación y vuelve a capturar.' };
    if (mean > 200) return { mean, std, ok: false, label: 'Muy clara', hint: 'Baja el slider de iluminación y vuelve a capturar.' };
    if (std < 15) return { mean, std, ok: false, label: 'Bajo contraste', hint: 'Sube el slider de contraste y vuelve a capturar.' };
    return { mean, std, ok: true, label: 'Buena', hint: '' };
  } catch {
    return null;
  }
};

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  icon?: React.ReactNode;
  onChange: (value: number) => void;
}

const Slider = ({ label, value, min, max, suffix, icon, onChange }: SliderProps) => (
  <div>
    <div className="flex items-center justify-between text-xs mb-1.5">
      <span className="text-secondary inline-flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="font-medium text-text tabular-nums">
        {value}
        {suffix}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={event => onChange(Number(event.target.value))}
      className="w-full h-1.5 accent-primary cursor-pointer"
      aria-label={label}
    />
  </div>
);

const errorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: { message?: string; detail?: string } } }).response?.data;
    return data?.message || data?.detail || fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

export function Identity() {
  const { user, refreshUser } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const liveHitRef = useRef<FaceHit | null>(null);
  const smoothLiveRef = useRef<FaceHit['box'] | null>(null);
  const autoLastRef = useRef(0);
  const autoBusyRef = useRef(false);
  const liveStateRef = useRef({ faceRegistered: false, manual: false, threshold: 50 });

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [probeSource, setProbeSource] = useState<string | undefined>(undefined);
  const [sample, setSample] = useState<string | null>(null);
  const [descriptor, setDescriptor] = useState<number[] | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);
  const [scanMsg, setScanMsg] = useState('');
  const [captureMsg, setCaptureMsg] = useState('');
  const [saveMsg, setSaveMsg] = useState('');
  const [result, setResult] = useState<{ ok: boolean; score: number; threshold: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [threshold, setThreshold] = useState(() => clampThreshold(user?.faceThreshold));
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [zoom, setZoom] = useState(100);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [autoMsg, setAutoMsg] = useState('');

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCameraOn(false);
    liveHitRef.current = null;
    smoothLiveRef.current = null;
    setFaceDetected(false);
  }, []);

  useEffect(() => {
    liveStateRef.current = {
      faceRegistered: !!user?.faceRegistered,
      manual: !!sample || !!descriptor,
      threshold,
    };
  });

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const startCamera = async () => {
    setRequesting(true);
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setCameraError('Cámara no disponible (sin permiso o sin dispositivo). Usa una foto.');
      setCameraOn(false);
    } finally {
      setRequesting(false);
    }
  };

  const safeDetect = async (source: FaceSource): Promise<FaceHit | null> => {
    try {
      return await detectFace(source);
    } catch {
      setCaptureMsg('No se pudo cargar el motor de reconocimiento (requiere conexión la primera vez).');
      return null;
    }
  };

  const renderFrame = (source: CanvasImageSource, width: number, height: number): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 360;
    canvas.height = 360;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    const zoomFactor = zoom / 100;
    const side = Math.min(width, height) / zoomFactor;
    const sx = (width - side) / 2;
    const sy = (height - side) / 2;
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(0, 0, 360, 360);
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
    ctx.drawImage(source, sx, sy, side, side, 0, 0, 360, 360);
    ctx.filter = 'none';
    return canvas.toDataURL('image/jpeg', 0.85);
  };

  const renderProbe = async (): Promise<string> => {
    const video = videoRef.current;
    if (cameraOn && video && video.videoWidth > 0) {
      return renderFrame(video, video.videoWidth, video.videoHeight);
    }
    if (probeSource) {
      const image = await loadImage(probeSource);
      return renderFrame(image, image.width, image.height);
    }
    return '';
  };

  // Detección en vivo: 400 puntos de profundidad sobre el video
  useEffect(() => {
    if (!cameraOn) return;
    const id = window.setInterval(() => {
      void (async () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return;
        const hit = await safeDetect(video);
        liveHitRef.current = hit;
        setFaceDetected(!!hit);
        let smoothBox: FaceHit['box'] | undefined;
        if (hit) {
          const prev = smoothLiveRef.current;
          smoothBox = prev
            ? {
                x: prev.x + (hit.box.x - prev.x) * 0.5,
                y: prev.y + (hit.box.y - prev.y) * 0.5,
                width: prev.width + (hit.box.width - prev.width) * 0.5,
                height: prev.height + (hit.box.height - prev.height) * 0.5,
              }
            : hit.box;
          smoothLiveRef.current = smoothBox;
        } else {
          smoothLiveRef.current = null;
        }
        const overlay = overlayRef.current;
        if (overlay) {
          if (video.videoWidth && overlay.width !== video.videoWidth) {
            overlay.width = video.videoWidth;
            overlay.height = video.videoHeight;
          }
          drawFaceOverlay(overlay, hit, { smoothBox });
        }
        if (!hit) {
          setScanMsg('Buscando el rostro… coloca tu rostro frente a la cámara');
        } else if (hit.box.width < 0.12) {
          setScanMsg('Acércate un poco a la cámara');
        } else if (Math.abs(hit.box.x + hit.box.width / 2 - 0.5) > 0.25) {
          setScanMsg('Centra tu rostro frente a la cámara');
        } else {
          const state = liveStateRef.current;
          const autoActive = state.faceRegistered && !state.manual;
          setScanMsg(
            autoActive
              ? `${hit.landmarks.length} puntos · ojos, nariz y boca detectados · identificándote automáticamente…`
              : `${hit.landmarks.length} puntos · ojos, nariz y boca detectados · listo para capturar`,
          );
          if (autoActive && !autoBusyRef.current && Date.now() - autoLastRef.current >= 2500) {
            autoLastRef.current = Date.now();
            autoBusyRef.current = true;
            void (async () => {
              try {
                const vector = await buildDescriptor(hit, video);
                const response = await authApi.verifyFace({ vector, threshold: state.threshold });
                setResult({
                  ok: response.ok,
                  score: Math.round(response.score * 1000) / 1000,
                  threshold: response.threshold,
                });
              } catch {
                // sin conexión o motor ocupado: se reintenta en el siguiente ciclo
              } finally {
                autoBusyRef.current = false;
              }
            })();
          }
        }
      })();
    }, 300);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn]);

  const captureSample = async () => {
    const video = videoRef.current;
    let source: FaceSource | null = null;
    if (cameraOn && video && video.videoWidth > 0) {
      source = video;
    } else if (probeSource) {
      try {
        source = await loadImage(probeSource);
      } catch {
        source = null;
      }
    }
    if (!source) {
      setCaptureMsg('Activa la cámara o sube una foto con un rostro para capturar.');
      return;
    }
    setCaptureMsg('');
    const hit = liveHitRef.current && source === video ? liveHitRef.current : await safeDetect(source);
    if (!hit) {
      setCaptureMsg('No se detectó rostro en la imagen. Corrige el encuadre e inténtalo de nuevo.');
      setSample(null);
      setDescriptor(null);
      return;
    }
    try {
      const vector = await buildDescriptor(hit, source);
      const frame = await renderProbe();
      setSample(frame || null);
      setDescriptor(vector);
      setResult(null);
      setSaveMsg('');
      const analyzed = await analyzeFrame(frame);
      if (analyzed) setQuality(analyzed);
    } catch {
      setCaptureMsg('No se pudo procesar la captura. Inténtalo de nuevo.');
    }
  };

  const autoFrame = async () => {
    setAutoMsg('');
    const video = videoRef.current;
    if (!cameraOn || !video || video.videoWidth === 0) {
      setAutoMsg('Activa la cámara para usar el auto-encuadre.');
      return;
    }
    const hit = await safeDetect(video);
    if (!hit) {
      setAutoMsg('No se detectó rostro: acércate a la cámara y mira al centro.');
      return;
    }
    const target = Math.min(200, Math.max(100, Math.round((0.45 / hit.box.width) * 100)));
    setZoom(target);
    setAutoMsg(`Encuadre ajustado automáticamente: zoom ${target}%.`);
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    const dataUrl = await new Promise<string>(resolve => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    const image = await loadImage(dataUrl);
    const side = 320;
    const scale = Math.min(1, side / Math.max(image.width, image.height));
    setProbeSource(toDataUrl(image, Math.round(image.width * scale), Math.round(image.height * scale)));
    setResult(null);
    setCaptureMsg('');
    setSample(null);
    setDescriptor(null);
  };

  const saveTemplate = async () => {
    if (!descriptor) return;
    setBusy(true);
    setSaveMsg('');
    try {
      await authApi.saveFace({ vector: descriptor, points: GEOM_POINTS, threshold });
      setSaveMsg(`Plantilla guardada con ${GEOM_POINTS} puntos de profundidad.`);
      setResult(null);
      await refreshUser();
    } catch (error) {
      setSaveMsg(errorMessage(error, 'No se pudo guardar la plantilla en el servidor.'));
    } finally {
      setBusy(false);
    }
  };

  const replaceTemplate = async () => {
    setBusy(true);
    setSaveMsg('');
    try {
      await authApi.deleteFace();
      setSample(null);
      setDescriptor(null);
      setResult(null);
      setSaveMsg('Plantilla facial eliminada.');
      await refreshUser();
    } catch (error) {
      setSaveMsg(errorMessage(error, 'No se pudo eliminar la plantilla.'));
    } finally {
      setBusy(false);
    }
  };

  const identify = async () => {
    if (!descriptor) return;
    setBusy(true);
    setSaveMsg('');
    try {
      const response = await authApi.verifyFace({ vector: descriptor, threshold });
      setResult({
        ok: response.ok,
        score: Math.round(response.score * 1000) / 1000,
        threshold: response.threshold,
      });
    } catch (error) {
      setSaveMsg(errorMessage(error, 'No se pudo verificar el rostro.'));
      setResult(null);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setSample(null);
    setDescriptor(null);
    setResult(null);
    setProbeSource(undefined);
    setQuality(null);
    setCaptureMsg('');
    setSaveMsg('');
  };

  const resetAdjusts = () => {
    setThreshold(clampThreshold(user?.faceThreshold));
    setBrightness(100);
    setContrast(100);
    setZoom(100);
    setAutoMsg('');
  };

  if (!user) return null;

  const hasTemplate = !!user.faceRegistered;
  const registeredAt = user.faceRegisteredAt || null;
  const chip = 'inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-border text-secondary text-xs sm:text-sm';

  const statusChip = (label: string, ok: boolean, okText: string, pendingText: string) => (
    <span className={`${chip} ${ok ? 'border-success/40 text-success' : 'border-warning/40 text-warning'}`}>
      {ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      {label}: {ok ? okText : pendingText}
    </span>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Identidad Facial</h1>
          <p className="text-secondary mt-1">Registra tu rostro con una sola captura y verifícalo con un botón</p>
        </div>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-border text-secondary hover:text-primary hover:border-primary/50 transition-all"
        >
          Volver al panel
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
        <span className={chip}>
          <ShieldCheck className="w-4 h-4 text-primary" />
          Solo tu cuenta
        </span>
        <span className={chip}>
          <Camera className="w-4 h-4 text-accent" />
          {cameraOn ? 'Cámara activa' : 'Cámara inactiva'}
        </span>
        <span className={chip}>
          <ScanFace className="w-4 h-4 text-success" />
          {hasTemplate ? `${user.facePoints ?? GEOM_POINTS} puntos registrados` : 'Plantilla pendiente'}
        </span>
        <span className={chip}>
          {now.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Módulo biométrico · Registro con 1 captura</CardTitle>
            <CardDescription>
              Una sola captura con {GEOM_POINTS} puntos de profundidad construye tu plantilla facial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {statusChip('Cámara', cameraOn, 'Activa', 'Inactiva')}
              {statusChip('Rostro', faceDetected || !!probeSource, faceDetected ? 'Detectado' : 'En foto', 'Pendiente')}
              {statusChip(
                'Calidad',
                quality ? quality.ok : !!sample,
                quality ? quality.label : sample ? 'Buena' : 'Sin captura',
                quality ? quality.label : 'Sin captura',
              )}
              {statusChip('Plantilla', hasTemplate, 'Registrada', 'Pendiente')}
            </div>

            {quality && (
              <p className="text-xs text-secondary bg-bg border border-border rounded-lg px-3 py-2">
                Brillo {Math.round(quality.mean)}/255 · Contraste {Math.round(quality.std)}
                {!quality.ok && quality.hint ? <span className="text-warning"> · {quality.hint}</span> : ' · Dentro de los rangos aceptables'}
              </p>
            )}

            <div className="relative rounded-xl overflow-hidden bg-sidebar aspect-square w-full max-w-[460px] mx-auto">
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                style={{
                  filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                  transform: `scale(${zoom / 100})`,
                }}
                className={`w-full h-full object-cover transition-[filter,transform] duration-200 ${cameraOn ? '' : 'hidden'}`}
              />
              <canvas
                ref={overlayRef}
                className={`absolute inset-0 w-full h-full pointer-events-none transition-transform duration-200 ${cameraOn ? '' : 'hidden'}`}
                style={{ transform: `scale(${zoom / 100})` }}
              />
              {!cameraOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
                  {probeSource || sample ? (
                    <img
                      src={probeSource || sample || ''}
                      alt="Fuente de rostro"
                      style={{
                        filter: `brightness(${brightness}%) contrast(${contrast}%)`,
                        transform: `scale(${zoom / 100})`,
                      }}
                      className="h-full w-full object-cover transition-[filter,transform] duration-200"
                    />
                  ) : (
                    <>
                      <ScanFace className="w-14 h-14 text-white/40" />
                      <p className="text-sm text-white/60 px-6 text-center">
                        {cameraError || 'Activa la cámara o usa una foto: basta con 1 captura'}
                      </p>
                    </>
                  )}
                </div>
              )}
              <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/50 text-white text-xs">
                <span className={`w-2 h-2 rounded-full ${cameraOn ? 'bg-success animate-pulse' : 'bg-warning'}`} />
                {cameraOn ? 'EN VIVO' : 'SIN CÁMARA'}
              </div>
              {cameraOn && scanMsg && (
                <div className="absolute bottom-3 left-3 right-3 px-2.5 py-1.5 rounded-md bg-black/50 text-white text-[11px] text-center">
                  {scanMsg}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-secondary mb-1.5">
                <span>Captura única (1 foto)</span>
                <span className="font-medium text-text">{sample ? 1 : 0}/1</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: sample ? '100%' : '0%' }}
                />
              </div>
            </div>

            {sample && (
              <div className="flex gap-2">
                <img
                  src={sample}
                  alt="Captura del rostro"
                  className="w-16 h-16 rounded-lg border border-border object-cover"
                />
                <div className="text-xs text-secondary self-center">
                  <p className="font-medium text-text">{GEOM_POINTS} puntos de profundidad</p>
                  <p>{descriptor ? `${descriptor.length} valores de descriptor` : 'Sin descriptor'}</p>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {!cameraOn ? (
                <Button size="sm" leftIcon={requesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} onClick={startCamera}>
                  {requesting ? 'Solicitando cámara…' : 'Activar cámara'}
                </Button>
              ) : (
                <Button size="sm" variant="outline" leftIcon={<CameraOff className="w-4 h-4" />} onClick={stopCamera}>
                  Apagar cámara
                </Button>
              )}
              <Button
                size="sm"
                leftIcon={<ScanFace className="w-4 h-4" />}
                onClick={captureSample}
              >
                Capturar rostro
              </Button>
              <Button size="sm" variant="outline" leftIcon={<Upload className="w-4 h-4" />} onClick={() => fileRef.current?.click()}>
                Subir foto
              </Button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              <Button
                size="sm"
                variant="outline"
                leftIcon={<CheckCircle2 className="w-4 h-4" />}
                onClick={saveTemplate}
                disabled={!descriptor || busy}
                loading={busy}
              >
                {hasTemplate ? 'Reemplazar plantilla facial' : 'Registrar plantilla facial'}
              </Button>
              <Button
                size="sm"
                leftIcon={<UserCheck className="w-4 h-4" />}
                onClick={identify}
                disabled={!descriptor || busy}
                loading={busy}
              >
                Identificar rostro
              </Button>
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<RefreshCw className="w-4 h-4" />}
                onClick={reset}
              >
                Reiniciar
              </Button>
              {hasTemplate && (
                <Button size="sm" variant="ghost" onClick={replaceTemplate} loading={busy}>
                  Borrar plantilla
                </Button>
              )}
            </div>

            {captureMsg && (
              <p className="text-xs text-warning bg-warning/5 border border-warning/20 rounded-lg px-3 py-2">{captureMsg}</p>
            )}
            {saveMsg && (
              <p className="text-xs text-secondary bg-bg border border-border rounded-lg px-3 py-2">{saveMsg}</p>
            )}
            {cameraError && (
              <p className="text-xs text-warning bg-warning/5 border border-warning/20 rounded-lg px-3 py-2">{cameraError}</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ajustes de verificación</CardTitle>
              <CardDescription>Umbral, iluminación, contraste y encuadre de la cámara</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-xs text-secondary">
                <span className="inline-flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-primary" />
                  Parámetros de captura
                </span>
                <button type="button" onClick={resetAdjusts} className="text-primary hover:underline">
                  Restablecer
                </button>
              </div>
              <Slider
                label="Umbral de confianza"
                value={threshold}
                min={MIN_THRESHOLD}
                max={MAX_THRESHOLD}
                suffix="%"
                icon={<Gauge className="w-3.5 h-3.5 text-primary" />}
                onChange={setThreshold}
              />
              <Slider
                label="Iluminación"
                value={brightness}
                min={50}
                max={150}
                suffix="%"
                icon={<Sun className="w-3.5 h-3.5 text-warning" />}
                onChange={setBrightness}
              />
              <Slider
                label="Contraste"
                value={contrast}
                min={50}
                max={150}
                suffix="%"
                icon={<Contrast className="w-3.5 h-3.5 text-accent" />}
                onChange={setContrast}
              />
              <Slider
                label="Zoom de encuadre"
                value={zoom}
                min={100}
                max={200}
                suffix="%"
                icon={<ZoomIn className="w-3.5 h-3.5 text-success" />}
                onChange={setZoom}
              />
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                leftIcon={<Focus className="w-4 h-4" />}
                onClick={autoFrame}
              >
                Auto-encuadre de cámara
              </Button>
              {autoMsg && (
                <p className="text-xs text-secondary bg-bg border border-border rounded-lg px-3 py-2">{autoMsg}</p>
              )}
              <p className="text-xs text-secondary">
                Rango permitido {MIN_THRESHOLD}–{MAX_THRESHOLD}%. A mayor umbral, más exigente es la
                verificación; a menor umbral, más laxa. Ajusta iluminación y contraste hasta que la
                calidad marque <span className="text-success font-medium">Buena</span>.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Identidad detectada</CardTitle>
              <CardDescription>Perfil asociado a esta plantilla</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar name={user.name} src={user.avatar} size="lg" className="ring-2 ring-primary/20" />
                <div className="min-w-0">
                  <p className="font-semibold text-text truncate">{user.name}</p>
                  <p className="text-sm text-secondary truncate">
                    {ROLE_ICONS[user.role]} {ROLE_LABELS[user.role]}
                  </p>
                </div>
              </div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-secondary">DNI</dt>
                  <dd className="font-mono font-medium text-text">{user.dni}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-secondary">Rango</dt>
                  <dd className="font-medium text-text text-right">
                    {ROLE_ICONS[user.role]} {ROLE_LABELS[user.role]}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-secondary">Método</dt>
                  <dd className="font-medium text-text text-right">Reconocimiento facial · {GEOM_POINTS} puntos</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-secondary">Plantilla</dt>
                  <dd className={`font-medium ${hasTemplate ? 'text-success' : 'text-warning'}`}>
                    {hasTemplate ? `${user.facePoints ?? GEOM_POINTS} puntos` : 'Pendiente'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-secondary">Umbral guardado</dt>
                  <dd className="font-medium text-text text-right">
                    {clampThreshold(user.faceThreshold)}%
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-secondary">Registro</dt>
                  <dd className="font-medium text-text text-right">
                    {registeredAt
                      ? new Date(registeredAt).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })
                      : '—'}
                  </dd>
                </div>
              </dl>
              <Link
                to="/perfil"
                className="inline-flex w-full items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-border text-secondary hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                Ver mi perfil
                <ArrowRight className="w-4 h-4" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resultado de identificación</CardTitle>
              <CardDescription>Comparación de tu captura con la plantilla registrada</CardDescription>
            </CardHeader>
            <CardContent>
              {!result ? (
                <p className="text-sm text-secondary">
                  {descriptor
                    ? 'Presiona "Identificar rostro" para comparar tu captura con tu plantilla registrada.'
                    : 'Primero captura tu rostro (1 foto) para identificarte.'}
                </p>
              ) : result.ok ? (
                <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 p-3">
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text">Rostro coincidente: {user.name}</p>
                    <p className="text-xs text-secondary mt-0.5">
                      Confianza {Math.round(result.score * 100)}% · Umbral {result.threshold}% ·{' '}
                      {GEOM_POINTS} puntos · Identidad verificada correctamente
                    </p>
                    <p className="text-xs text-secondary mt-0.5">
                      {ROLE_ICONS[user.role]} Rango verificado: {ROLE_LABELS[user.role]}
                    </p>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-success"
                        style={{ width: `${Math.min(100, Math.round(result.score * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 rounded-lg border border-danger/30 bg-danger/5 p-3">
                  <XCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text">Sin coincidencia</p>
                    <p className="text-xs text-secondary mt-0.5">
                      Confianza {Math.round(result.score * 100)}% · Umbral {result.threshold}% · Ajusta la
                      iluminación, el contraste o revisa el umbral e inténtalo de nuevo
                    </p>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-danger"
                        style={{ width: `${Math.min(100, Math.round(result.score * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
