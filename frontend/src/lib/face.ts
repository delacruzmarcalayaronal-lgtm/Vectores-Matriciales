import type { FaceLandmarker } from '@mediapipe/tasks-vision';

type VisionFileset = Awaited<
  ReturnType<typeof import('@mediapipe/tasks-vision').FilesetResolver.forVisionTasks>
>;

export const GEOM_POINTS = 400;
export const EMBED_DIM = 1024;
export const VECTOR_DIM = EMBED_DIM;

export const MIN_THRESHOLD = 30;
export const MAX_THRESHOLD = 85;
export const DEFAULT_THRESHOLD = 60;

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export type FaceSource = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;

export interface FacePoint {
  x: number;
  y: number;
  z: number;
}

export interface FaceHit {
  landmarks: FacePoint[];
  box: { x: number; y: number; width: number; height: number };
}

let filesetPromise: Promise<VisionFileset> | null = null;
let videoLandmarkerPromise: Promise<FaceLandmarker> | null = null;
let imageLandmarkerPromise: Promise<FaceLandmarker> | null = null;
let lastVideoTs = 0;

async function getFileset() {
  if (!filesetPromise) {
    filesetPromise = (async () => {
      const { FilesetResolver } = await import('@mediapipe/tasks-vision');
      return FilesetResolver.forVisionTasks(WASM_BASE);
    })();
  }
  return filesetPromise;
}

async function createLandmarker(runningMode: 'VIDEO' | 'IMAGE'): Promise<FaceLandmarker> {
  const { FaceLandmarker } = await import('@mediapipe/tasks-vision');
  const fileset = await getFileset();
  const options = (delegate: 'GPU' | 'CPU') => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode,
    numFaces: 1,
  });
  try {
    return await FaceLandmarker.createFromOptions(fileset, options('GPU'));
  } catch {
    return await FaceLandmarker.createFromOptions(fileset, options('CPU'));
  }
}

export function getLandmarker(runningMode: 'VIDEO' | 'IMAGE' = 'VIDEO'): Promise<FaceLandmarker> {
  const cache = runningMode === 'VIDEO' ? videoLandmarkerPromise : imageLandmarkerPromise;
  if (cache) return cache;
  const promise = createLandmarker(runningMode).catch(error => {
    if (runningMode === 'VIDEO') videoLandmarkerPromise = null;
    else imageLandmarkerPromise = null;
    throw error;
  });
  if (runningMode === 'VIDEO') videoLandmarkerPromise = promise;
  else imageLandmarkerPromise = promise;
  return promise;
}

export async function detectFace(source: FaceSource): Promise<FaceHit | null> {
  let result;
  if (source instanceof HTMLVideoElement) {
    const landmarker = await getLandmarker('VIDEO');
    const now = performance.now();
    lastVideoTs = now > lastVideoTs ? now : lastVideoTs + 1;
    result = landmarker.detectForVideo(source, lastVideoTs);
  } else {
    const landmarker = await getLandmarker('IMAGE');
    result = landmarker.detect(source);
  }
  const faces = result.faceLandmarks;
  if (!faces || faces.length === 0) return null;
  const landmarks = faces[0];
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const point of landmarks) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }
  return {
    landmarks,
    box: {
      x: minX,
      y: minY,
      width: Math.max(0.01, maxX - minX),
      height: Math.max(0.01, maxY - minY),
    },
  };
}

const round5 = (value: number) => Math.round(value * 1e5) / 1e5;

/* ---------------------------------------------------------------------------
   Identidad facial: embedding ArcFace (@vladmandic/human, modelo faceres
   1024-d). A diferencia de la geometría/apariencia previa, el embedding es
   invariante al encuadre, la resolución y el fondo: mide quién es la persona,
   no cómo se ve la foto. La plantilla y la sonda se comparan con coseno.
   --------------------------------------------------------------------------- */

type HumanFace = { embedding?: ArrayLike<number> };
type HumanInstance = {
  load(): Promise<unknown>;
  detect(input: FaceSource): Promise<{ face?: HumanFace[] }>;
};
type HumanCtor = new (config: Record<string, unknown>) => HumanInstance;

const HUMAN_SCRIPT = '/models/human/human.js';
const HUMAN_BASE = '/models/human/';

let humanPromise: Promise<HumanInstance | null> | null = null;

function loadHumanScript(): Promise<void> {
  const scope = window as unknown as { Human?: unknown };
  if (scope.Human) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-human-engine]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('motor humano no cargó')));
      return;
    }
    const script = document.createElement('script');
    script.src = HUMAN_SCRIPT;
    script.dataset.humanEngine = 'true';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('motor humano no cargó'));
    document.head.appendChild(script);
  });
}

export function getEmbedder(): Promise<HumanInstance | null> {
  if (!humanPromise) {
    humanPromise = (async () => {
      try {
        await loadHumanScript();
        const scope = window as unknown as { Human?: HumanCtor | { Human: HumanCtor } };
        const raw = scope.Human;
        const Human = (typeof raw === 'function' ? raw : raw ? raw.Human : undefined) as
          | HumanCtor
          | undefined;
        if (!Human) return null;
        const human = new Human({
          modelBasePath: HUMAN_BASE,
          debug: false,
          async: true,
          warmup: false,
          face: {
            enabled: true,
            detector: { enabled: true, modelPath: 'blazeface.json' },
            mesh: { enabled: false },
            iris: { enabled: false },
            attention: { enabled: false },
            emotion: { enabled: false },
            liveness: { enabled: false },
            antispoof: { enabled: false },
            description: { enabled: true },
          },
          hand: { enabled: false },
          body: { enabled: false },
          gesture: { enabled: false },
        });
        await human.load();
        return human;
      } catch {
        return null;
      }
    })().catch(() => null);
  }
  return humanPromise;
}

function normalize(values: number[]): number[] | null {
  let sum = 0;
  for (const value of values) sum += value * value;
  if (sum <= 1e-12) return null;
  const inv = 1 / Math.sqrt(sum);
  return values.map(value => round5(value * inv));
}

/* Descriptor de identidad (embedding 1024-d normalizado). Devuelve null si
   el motor no está disponible o la imagen no contiene un rostro. */
export async function embeddingFrom(source: FaceSource): Promise<number[] | null> {
  const human = await getEmbedder();
  if (!human) return null;
  try {
    const result = await human.detect(source);
    const face = result.face && result.face[0];
    const embedding = face && face.embedding;
    if (!embedding || embedding.length !== EMBED_DIM) return null;
    const values: number[] = [];
    for (let i = 0; i < EMBED_DIM; i += 1) values.push(Number(embedding[i]));
    return normalize(values);
  } catch {
    return null;
  }
}

export function faceScore(stored: number[], probe: number[]): number {
  if (!Array.isArray(stored) || !Array.isArray(probe)) return 0;
  if (stored.length !== EMBED_DIM || probe.length !== EMBED_DIM) return 0;
  const a = normalize(stored);
  const b = normalize(probe);
  if (!a || !b) return 0;
  let dot = 0;
  for (let i = 0; i < EMBED_DIM; i += 1) dot += a[i] * b[i];
  return Math.max(0, Math.min(1, dot));
}

export function clampThreshold(value?: number | null, fallback?: number | null): number {
  let result = value ?? fallback ?? DEFAULT_THRESHOLD;
  if (!Number.isFinite(result)) result = DEFAULT_THRESHOLD;
  return Math.max(MIN_THRESHOLD, Math.min(MAX_THRESHOLD, Math.round(result)));
}

/*Índices del mesh (MediaPipe FaceLandmarker, 478 puntos) que dibujan la
  estructura facial: ojos, nariz, boca y pupilas. */
const LEFT_EYE = [246, 161, 160, 159, 158, 157, 173, 133, 155, 154, 153, 145, 144, 163, 7, 33];
const RIGHT_EYE = [466, 388, 387, 386, 385, 384, 398, 382, 381, 380, 374, 373, 390, 249, 263, 362];
const NOSE_LINE = [168, 6, 197, 195, 5, 4, 1];
const NOSE_BASE = [64, 48, 1, 305, 438];
const LEFT_IRIS = [468, 469, 470, 471, 472];
const RIGHT_IRIS = [473, 474, 475, 476, 477];
/* Cejas (recorrido cerrado: borde inferior externo→interno y superior
   interno→externo; índices verificados con un frame real del mesh). */
const LEFT_BROW = [46, 53, 52, 65, 55, 107, 66, 105, 63, 70];
const RIGHT_BROW = [276, 283, 282, 295, 285, 336, 296, 334, 293, 300];

/* Rotación de cabeza (yaw) aproximada: desplazamiento horizontal de la punta
   de la nariz respecto al centro de los ojos, normalizado por la distancia
   interpupilar. ±FRONTAL_GIRO_LIMIT ≈ ±20° todavía considerado "de frente". */
export const FRONTAL_GIRO_LIMIT = 0.22;

export function estimateGiro(landmarks: FacePoint[]): number {
  const left = landmarks[33];
  const right = landmarks[263];
  const nose = landmarks[1];
  if (!left || !right || !nose) return 0;
  const dist = Math.hypot(right.x - left.x, right.y - left.y);
  if (dist < 1e-4) return 0;
  return (nose.x - (left.x + right.x) / 2) / dist;
}

/* Paleta del overlay: un solo color para TODOS los puntos del mesh (malla,
   nariz, ojos, cejas y labios incluidos) más un recuadro de detección estilo
   OpenCV/MediaPipe alrededor del rostro. */
const MESH_COLOR = '#22D3EE';
const BOX_COLOR = '#22C55E';

export function drawFaceOverlay(
  canvas: HTMLCanvasElement,
  hit: FaceHit | null,
  options: {
    stable?: boolean;
    smoothBox?: FaceHit['box'];
    video?: { width: number; height: number };
    cssWidth?: number;
    cssHeight?: number;
  } = {},
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const cssW = options.cssWidth && options.cssWidth > 0 ? options.cssWidth : canvas.width;
  const cssH = options.cssHeight && options.cssHeight > 0 ? options.cssHeight : canvas.height;
  const dpr = cssW > 0 ? canvas.width / cssW : 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!hit) return;

  const landmarks = hit.landmarks;

  /* Misma transformación que object-cover del <video>: escala uniforme
     (la mayor de cubrir el contenedor) con los offsets centrados, para que
     los puntos caigan exactamente sobre el rostro, sin estirarse. */
  const vw = options.video?.width || cssW;
  const vh = options.video?.height || cssH;
  const cover = Math.max(cssW / vw, cssH / vh);
  const offsetX = (cssW - vw * cover) / 2;
  const offsetY = (cssH - vh * cover) / 2;
  const px = (value: number) => offsetX + value * vw * cover;
  const py = (value: number) => offsetY + value * vh * cover;

  /* Escala facial: todo el grosor se deriva del tamaño visible del rostro
     (smoothBox) para que la malla "respire" con la distancia a la cámara. */
  const box = options.smoothBox ?? hit.box;
  const faceW = Math.max(32, box.width * vw * cover);
  const stable = !!options.stable;
  const glow = stable ? Math.max(4, faceW * 0.05) : 0;

  // Campo de puntos del mesh: un solo color, labios incluidos (478 puntos)
  let zMin = Infinity;
  let zMax = -Infinity;
  for (const point of landmarks) {
    if (point.z < zMin) zMin = point.z;
    if (point.z > zMax) zMax = point.z;
  }
  const zSpan = zMax - zMin || 1;
  const baseRadius = Math.max(0.5, Math.min(1.4, faceW * 0.005));
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = MESH_COLOR;
  if (stable) {
    ctx.shadowColor = MESH_COLOR;
    ctx.shadowBlur = glow;
  }
  for (let i = 0; i < landmarks.length; i += 1) {
    const point = landmarks[i];
    const t = (zMax - point.z) / zSpan;
    ctx.beginPath();
    ctx.arc(px(point.x), py(point.y), baseRadius * (0.7 + 0.55 * t), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Guía nasal: mismos puntos del mesh, un pelín más grandes
  ctx.save();
  ctx.fillStyle = MESH_COLOR;
  if (stable) {
    ctx.shadowColor = MESH_COLOR;
    ctx.shadowBlur = glow;
  }
  const noseRadius = Math.max(1.2, Math.min(2.6, faceW * 0.008));
  for (const index of [...NOSE_LINE, ...NOSE_BASE]) {
    const point = landmarks[index];
    if (!point) continue;
    ctx.beginPath();
    ctx.arc(px(point.x), py(point.y), noseRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Ojos: puntos del contorno + anillo de iris, mismo color que el resto
  ctx.save();
  ctx.fillStyle = MESH_COLOR;
  if (stable) {
    ctx.shadowColor = MESH_COLOR;
    ctx.shadowBlur = glow;
  }
  const eyeDot = Math.max(1, Math.min(2.2, faceW * 0.0065));
  for (const index of [...LEFT_EYE, ...RIGHT_EYE]) {
    const point = landmarks[index];
    if (!point) continue;
    ctx.beginPath();
    ctx.arc(px(point.x), py(point.y), eyeDot, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  const irisRadius = Math.max(0.9, Math.min(1.8, faceW * 0.005));
  const irisCenterRadius = Math.max(1, Math.min(2.2, faceW * 0.006));
  for (const set of [LEFT_IRIS, RIGHT_IRIS]) {
    let cx = 0;
    let cy = 0;
    let count = 0;
    for (const index of set) {
      const point = landmarks[index];
      if (!point) continue;
      ctx.beginPath();
      ctx.arc(px(point.x), py(point.y), irisRadius, 0, Math.PI * 2);
      ctx.fill();
      cx += point.x;
      cy += point.y;
      count += 1;
    }
    if (count) {
      ctx.beginPath();
      ctx.arc(cx / count, cy / count, irisCenterRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  // Cejas: puntos sobre el recorrido de la ceja, mismo color
  ctx.save();
  ctx.fillStyle = MESH_COLOR;
  if (stable) {
    ctx.shadowColor = MESH_COLOR;
    ctx.shadowBlur = glow;
  }
  const browDot = Math.max(1, Math.min(2.2, faceW * 0.0065));
  for (const index of [...LEFT_BROW, ...RIGHT_BROW]) {
    const point = landmarks[index];
    if (!point) continue;
    ctx.beginPath();
    ctx.arc(px(point.x), py(point.y), browDot, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Recuadro de detección estilo cv2.rectangle (esquinas + marco tenue)
  ctx.save();
  const bx = px(box.x);
  const by = py(box.y);
  const bw = box.width * vw * cover;
  const bh = box.height * vh * cover;
  const edge = Math.max(1.5, Math.min(3, faceW * 0.008));
  const bracket = Math.max(10, Math.min(34, faceW * 0.16));
  ctx.strokeStyle = BOX_COLOR;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.45;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.globalAlpha = 1;
  ctx.lineWidth = edge;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx, by + bracket);
  ctx.lineTo(bx, by);
  ctx.lineTo(bx + bracket, by);
  ctx.moveTo(bx + bw - bracket, by);
  ctx.lineTo(bx + bw, by);
  ctx.lineTo(bx + bw, by + bracket);
  ctx.moveTo(bx + bw, by + bh - bracket);
  ctx.lineTo(bx + bw, by + bh);
  ctx.lineTo(bx + bw - bracket, by + bh);
  ctx.moveTo(bx + bracket, by + bh);
  ctx.lineTo(bx, by + bh);
  ctx.lineTo(bx, by + bh - bracket);
  ctx.stroke();
  ctx.restore();
}
