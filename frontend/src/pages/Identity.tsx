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

const MAX_SAMPLES = 3;
const TEMPLATE_KEY = 'mf_face_template';
const REGISTERED_KEY = 'mf_face_registered_at';

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

const featureVector = async (dataUrl: string): Promise<number[] | null> => {
  try {
    const image = await loadImage(dataUrl);
    const size = 24;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    const vector: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
      vector.push((0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255);
    }
    return vector;
  } catch {
    return null;
  }
};

const similarity = async (a: string, b: string): Promise<number> => {
  const [va, vb] = await Promise.all([featureVector(a), featureVector(b)]);
  if (!va || !vb || va.length !== vb.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < va.length; i += 1) {
    dot += va[i] * vb[i];
    na += va[i] * va[i];
    nb += vb[i] * vb[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
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

export function Identity() {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [probeSource, setProbeSource] = useState<string | undefined>(undefined);
  const [samples, setSamples] = useState<string[]>([]);
  const [template, setTemplate] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TEMPLATE_KEY);
    } catch {
      return null;
    }
  });
  const [registeredAt, setRegisteredAt] = useState<string | null>(() => {
    try {
      return localStorage.getItem(REGISTERED_KEY);
    } catch {
      return null;
    }
  });
  const [result, setResult] = useState<{ ok: boolean; score: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [threshold, setThreshold] = useState(90);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [zoom, setZoom] = useState(100);
  const [quality, setQuality] = useState<Quality | null>(null);
  const [autoMsg, setAutoMsg] = useState('');

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

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
        video: { facingMode: 'user', width: 320, height: 240 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch {
      setCameraError('Cámara no disponible (sin permiso o sin dispositivo). Usa una foto o el modo demostración.');
      setCameraOn(false);
    } finally {
      setRequesting(false);
    }
  };

  const syntheticSample = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    const seed = [...(user?.dni || '00000000')].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
    const gradient = ctx.createLinearGradient(0, 0, 320, 240);
    gradient.addColorStop(0, `hsl(${seed % 360}, 65%, 32%)`);
    gradient.addColorStop(1, `hsl(${(seed + 60) % 360}, 70%, 68%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 320, 240);
    let rand = (seed * 9301 + 49297) % 233280;
    const nextRand = () => {
      rand = (rand * 9301 + 49297) % 233280;
      return rand / 233280;
    };
    for (let i = 0; i < 1200; i += 1) {
      ctx.fillStyle = `rgba(255,255,255,${(nextRand() * 0.14).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(nextRand() * 320, nextRand() * 240, nextRand() * 5 + 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = 'bold 72px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const parts = (user?.name || 'MF').trim().split(/\s+/);
    const initials = (parts[0]?.[0] || 'M') + (parts[1]?.[0] || 'F');
    ctx.fillText(initials.toUpperCase(), 160, 120);
    return canvas.toDataURL('image/jpeg', 0.85);
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
    const synthetic = syntheticSample();
    if (!synthetic) return '';
    const image = await loadImage(synthetic);
    return renderFrame(image, image.width, image.height);
  };

  const captureSample = async () => {
    if (samples.length >= MAX_SAMPLES) return;
    const frame = await renderProbe();
    if (!frame) return;
    setSamples(prev => [...prev, frame]);
    setResult(null);
    const analyzed = await analyzeFrame(frame);
    if (analyzed) setQuality(analyzed);
  };

  const autoFrame = async () => {
    setAutoMsg('');
    const video = videoRef.current;
    if (!cameraOn || !video || video.videoWidth === 0) {
      setAutoMsg('Activa la cámara para usar el auto-encuadre.');
      return;
    }
    type FaceDetectorLike = {
      detect(video: HTMLVideoElement): Promise<Array<{ boundingBox: { width: number } }>>;
    };
    const Ctor = (window as unknown as { FaceDetector?: new (options: unknown) => FaceDetectorLike }).FaceDetector;
    if (!Ctor) {
      setAutoMsg('Tu navegador no soporta auto-encuadre; ajusta el zoom manualmente.');
      return;
    }
    try {
      const detector = new Ctor({ maxDetectedFaces: 1, fastMode: true });
      const faces = await detector.detect(video);
      if (faces.length === 0) {
        setAutoMsg('No se detectó rostro: acércate a la cámara y mira al centro.');
        return;
      }
      const faceWidth = faces[0].boundingBox.width;
      const target = Math.min(200, Math.max(100, Math.round((0.45 * video.videoWidth) / faceWidth * 100)));
      setZoom(target);
      setAutoMsg(`Encuadre ajustado automáticamente: zoom ${target}%.`);
    } catch {
      setAutoMsg('No se pudo detectar el rostro. Ajusta el zoom manualmente.');
    }
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
  };

  const saveTemplate = () => {
    if (samples.length < MAX_SAMPLES) return;
    const templateData = samples[samples.length - 1];
    const stamp = new Date().toISOString();
    try {
      localStorage.setItem(TEMPLATE_KEY, templateData);
      localStorage.setItem(REGISTERED_KEY, stamp);
    } catch {
      // almacenamiento no disponible
    }
    setTemplate(templateData);
    setRegisteredAt(stamp);
    setResult(null);
  };

  const replaceTemplate = () => {
    setSamples([]);
    setResult(null);
    try {
      localStorage.removeItem(TEMPLATE_KEY);
      localStorage.removeItem(REGISTERED_KEY);
    } catch {
      // almacenamiento no disponible
    }
    setTemplate(null);
    setRegisteredAt(null);
  };

  const identify = async () => {
    if (!template) return;
    setBusy(true);
    const probe = await renderProbe();
    const score = probe ? await similarity(template, probe) : 0;
    setResult({ ok: score >= threshold / 100, score: Math.round(score * 1000) / 1000 });
    setBusy(false);
  };

  const reset = () => {
    setSamples([]);
    setResult(null);
    setProbeSource(undefined);
    setQuality(null);
  };

  const resetAdjusts = () => {
    setThreshold(90);
    setBrightness(100);
    setContrast(100);
    setZoom(100);
    setAutoMsg('');
  };

  if (!user) return null;

  const hasTemplate = !!template;
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
          <p className="text-secondary mt-1">Registra tu rostro y verifica quién eres con un solo botón</p>
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
          Plantilla {hasTemplate ? 'registrada' : 'pendiente'}
        </span>
        <span className={chip}>
          {now.toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit' })}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Módulo biométrico · Registro de plantilla</CardTitle>
            <CardDescription>Captura {MAX_SAMPLES} muestras de calidad para construir tu plantilla facial</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {statusChip('Cámara', cameraOn, 'Activa', 'Inactiva')}
              {statusChip('Rostro', cameraOn || !!probeSource, 'Detectado', 'Pendiente')}
              {statusChip(
                'Calidad',
                quality ? quality.ok : samples.length > 0,
                quality ? quality.label : 'Buena',
                quality ? quality.label : 'Sin muestras',
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
              {!cameraOn && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
                  {probeSource ? (
                    <img
                      src={probeSource}
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
                        {cameraError || 'Activa la cámara o usa una foto para capturar tus muestras'}
                      </p>
                    </>
                  )}
                </div>
              )}
              {cameraOn && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-2xl border-2 border-accent/80 animate-pulse" />
                </div>
              )}
              <div className="absolute top-3 left-3 flex items-center gap-2 px-2.5 py-1 rounded-md bg-black/50 text-white text-xs">
                <span className={`w-2 h-2 rounded-full ${cameraOn ? 'bg-success animate-pulse' : 'bg-warning'}`} />
                {cameraOn ? 'EN VIVO' : 'SIN CÁMARA'}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs text-secondary mb-1.5">
                <span>Muestras de calidad</span>
                <span className="font-medium text-text">{samples.length}/{MAX_SAMPLES}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(samples.length / MAX_SAMPLES) * 100}%` }}
                />
              </div>
            </div>

            {samples.length > 0 && (
              <div className="flex gap-2">
                {samples.map((sample, index) => (
                  <img
                    key={index}
                    src={sample}
                    alt={`Muestra ${index + 1}`}
                    className="w-16 h-16 rounded-lg border border-border object-cover"
                  />
                ))}
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
                disabled={samples.length >= MAX_SAMPLES}
              >
                Capturar muestra
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
                disabled={samples.length < MAX_SAMPLES}
              >
                {hasTemplate ? 'Reemplazar plantilla facial' : 'Registrar plantilla facial'}
              </Button>
              <Button
                size="sm"
                leftIcon={<UserCheck className="w-4 h-4" />}
                onClick={identify}
                disabled={!hasTemplate || busy}
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
                <Button size="sm" variant="ghost" onClick={replaceTemplate}>
                  Borrar plantilla
                </Button>
              )}
            </div>

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
                min={70}
                max={99}
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
                La identificación valida la coincidencia contra el umbral de {threshold}%. Ajusta iluminación y contraste
                hasta que la calidad marque <span className="text-success font-medium">Buena</span>.
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
                  <dt className="text-secondary">Método</dt>
                  <dd className="font-medium text-text text-right">Reconocimiento facial · 128D</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-secondary">Plantilla</dt>
                  <dd className={`font-medium ${hasTemplate ? 'text-success' : 'text-warning'}`}>
                    {hasTemplate ? 'Registrada' : 'Pendiente'}
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
              <CardDescription>Comparación de tu rostro con la plantilla</CardDescription>
            </CardHeader>
            <CardContent>
              {!result ? (
                <p className="text-sm text-secondary">
                  {hasTemplate
                    ? 'Presiona "Identificar rostro" para comparar la última muestra con tu plantilla registrada.'
                    : 'Primero registra tu plantilla facial con 3 muestras.'}
                </p>
              ) : result.ok ? (
                <div className="flex items-start gap-3 rounded-lg border border-success/30 bg-success/5 p-3">
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text">Rostro coincidente: {user.name}</p>
                    <p className="text-xs text-secondary mt-0.5">
                      Confianza {Math.round(result.score * 100)}% · Umbral {threshold}% · Identidad verificada
                      correctamente
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
                      Confianza {Math.round(result.score * 100)}% · Umbral {threshold}% · Ajusta la iluminación, el
                      contraste o baja el umbral e inténtalo de nuevo
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
