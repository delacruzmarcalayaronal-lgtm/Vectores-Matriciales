import type { FaceLandmarker } from '@mediapipe/tasks-vision';

type VisionFileset = Awaited<
  ReturnType<typeof import('@mediapipe/tasks-vision').FilesetResolver.forVisionTasks>
>;

export const GEOM_POINTS = 400;
export const GEOM_DIM = GEOM_POINTS * 3;
export const APP_SIZE = 24;
export const APP_DIM = APP_SIZE * APP_SIZE;
export const VECTOR_DIM = GEOM_DIM + APP_DIM;

export const MIN_THRESHOLD = 30;
export const MAX_THRESHOLD = 70;
export const DEFAULT_THRESHOLD = 50;

const GEOM_WEIGHT = 0.15;
const APP_WEIGHT = 0.85;

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

function geometryVector(landmarks: FacePoint[]): number[] {
  const points = landmarks.slice(0, GEOM_POINTS);
  let cx = 0;
  let cy = 0;
  for (const point of points) {
    cx += point.x;
    cy += point.y;
  }
  cx /= points.length || 1;
  cy /= points.length || 1;
  const leftEye = points[33];
  const rightEye = points[263];
  let scale = 0.1;
  if (leftEye && rightEye) {
    const dx = leftEye.x - rightEye.x;
    const dy = leftEye.y - rightEye.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1e-4) scale = dist;
  }
  const out: number[] = [];
  for (let i = 0; i < GEOM_POINTS; i += 1) {
    const point = points[i];
    if (point) {
      out.push(round5((point.x - cx) / scale), round5((point.y - cy) / scale), round5(point.z / scale));
    } else {
      out.push(0, 0, 0);
    }
  }
  return out;
}

async function appearanceVector(hit: FaceHit, source: FaceSource): Promise<number[]> {
  const width = source instanceof HTMLVideoElement ? source.videoWidth : source.width;
  const height = source instanceof HTMLVideoElement ? source.videoHeight : source.height;
  const out: number[] = [];
  if (!width || !height) return new Array(APP_DIM).fill(0);
  const margin = 0.18;
  let x0 = hit.box.x - hit.box.width * margin;
  let y0 = hit.box.y - hit.box.height * margin;
  let size = Math.max(hit.box.width * (1 + margin * 2), hit.box.height * (1 + margin * 2));
  x0 = Math.max(0, Math.min(x0, 1 - size));
  y0 = Math.max(0, Math.min(y0, 1 - size));
  size = Math.min(size, 1);
  const canvas = document.createElement('canvas');
  canvas.width = APP_SIZE;
  canvas.height = APP_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new Array(APP_DIM).fill(0);
  ctx.drawImage(
    source,
    x0 * width,
    y0 * height,
    size * width,
    size * height,
    0,
    0,
    APP_SIZE,
    APP_SIZE,
  );
  const { data } = ctx.getImageData(0, 0, APP_SIZE, APP_SIZE);
  for (let i = 0; i < data.length; i += 4) {
    out.push(round5((0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255));
  }
  return out;
}

export async function buildDescriptor(hit: FaceHit, source: FaceSource): Promise<number[]> {
  const [geometry, appearance] = await Promise.all([
    Promise.resolve(geometryVector(hit.landmarks)),
    appearanceVector(hit, source),
  ]);
  return [...geometry, ...appearance];
}

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  if (n === 0 || n !== b.length) return 0;
  let meanA = 0;
  let meanB = 0;
  for (let i = 0; i < n; i += 1) {
    meanA += a[i];
    meanB += b[i];
  }
  meanA /= n;
  meanB /= n;
  let num = 0;
  let varA = 0;
  let varB = 0;
  for (let i = 0; i < n; i += 1) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    varA += da * da;
    varB += db * db;
  }
  if (varA <= 1e-12 || varB <= 1e-12) return 0;
  const corr = num / Math.sqrt(varA * varB);
  return Math.max(-1, Math.min(1, corr));
}

export function faceScore(stored: number[], probe: number[]): number {
  if (stored.length !== VECTOR_DIM || probe.length !== VECTOR_DIM) return 0;
  const geom = Math.max(0, pearson(stored.slice(0, GEOM_DIM), probe.slice(0, GEOM_DIM)));
  const app = Math.max(0, pearson(stored.slice(GEOM_DIM), probe.slice(GEOM_DIM)));
  return Math.max(0, Math.min(1, GEOM_WEIGHT * geom + APP_WEIGHT * app));
}

export function clampThreshold(value?: number | null, fallback?: number | null): number {
  let result = value ?? fallback ?? DEFAULT_THRESHOLD;
  if (!Number.isFinite(result)) result = DEFAULT_THRESHOLD;
  return Math.max(MIN_THRESHOLD, Math.min(MAX_THRESHOLD, Math.round(result)));
}

export function drawFaceOverlay(
  canvas: HTMLCanvasElement,
  hit: FaceHit | null,
  options: { stable?: boolean } = {},
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!hit) return;
  const color = options.stable ? '#22C55E' : '#06B6D4';
  const step = hit.landmarks.length > GEOM_POINTS ? hit.landmarks.length / GEOM_POINTS : 1;
  ctx.fillStyle = color;
  for (let i = 0; i < GEOM_POINTS; i += 1) {
    const point = hit.landmarks[Math.floor(i * step)];
    if (!point) continue;
    ctx.beginPath();
    ctx.arc(point.x * canvas.width, point.y * canvas.height, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  const box = hit.box;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(
    box.x * canvas.width,
    box.y * canvas.height,
    box.width * canvas.width,
    box.height * canvas.height,
  );
}
