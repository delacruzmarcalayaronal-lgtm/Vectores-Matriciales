export const GENERAL_KEY = 'mf_general';
export const SECURITY_KEY = 'mf_security';
export const API_KEY = 'mf_api';
export const NOTIF_KEY = 'mf_notifications';
export const PREFS_EVENT = 'mf:prefs-change';

export const LOGIN_BLOCK_MS = 5 * 60000;

export interface GeneralPrefs {
  timezone: string;
  maintenance: boolean;
}

export interface SecurityPrefs {
  sessionMinutes: number;
  maxLoginAttempts: number;
  accessTokenMinutes: number;
  refreshDays: number;
  idleLock: boolean;
}

export interface ApiPrefs {
  limit: number;
  timeout: number;
  retries: number;
}

export interface LoginAttempts {
  count: number;
  until: number;
  lastAt: number;
}

const ATTEMPTS_KEY = 'mf_login_attempts';

const readJson = (key: string): Record<string, unknown> => {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
};

const clampNumber = (value: unknown, fallback: number, min: number, max: number) =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;

export function savePrefs(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // almacenamiento no disponible: la preferencia solo vivirá en memoria
  }
  window.dispatchEvent(new Event(PREFS_EVENT));
}

export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Lima';
  } catch {
    return 'America/Lima';
  }
}

const isValidTimezone = (tz: unknown): tz is string => {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export function readGeneral(): GeneralPrefs {
  const raw = readJson(GENERAL_KEY);
  return {
    timezone: isValidTimezone(raw.timezone) ? raw.timezone : browserTimezone(),
    maintenance: raw.maintenance === true,
  };
}

const BASE_TIMEZONES = [
  { value: 'America/Lima', label: 'America/Lima (UTC-5)' },
  { value: 'America/Bogota', label: 'America/Bogota (UTC-5)' },
  { value: 'America/Mexico_City', label: 'America/Mexico_City (UTC-6)' },
  { value: 'America/Argentina/Buenos_Aires', label: 'America/Argentina/Buenos_Aires (UTC-3)' },
];

export function timezoneOptions(current: string) {
  const values = new Set(BASE_TIMEZONES.map(tz => tz.value));
  const extra: Array<{ value: string; label: string }> = [];
  if (!values.has(current)) {
    extra.push({ value: current, label: `${current} (zona horaria actual)` });
    values.add(current);
  }
  const browserTz = browserTimezone();
  if (!values.has(browserTz)) {
    extra.push({ value: browserTz, label: `${browserTz} (navegador)` });
  }
  return [...BASE_TIMEZONES, ...extra];
}

export function readSecurity(): SecurityPrefs {
  const raw = readJson(SECURITY_KEY);
  return {
    sessionMinutes: clampNumber(raw.sessionMinutes, 480, 1, 7 * 24 * 60),
    maxLoginAttempts: clampNumber(raw.maxLoginAttempts, 5, 1, 20),
    accessTokenMinutes: clampNumber(raw.accessTokenMinutes, 60, 1, 43200),
    refreshDays: clampNumber(raw.refreshDays, 30, 1, 365),
    idleLock: raw.idleLock === true,
  };
}

export function readApiPrefs(): ApiPrefs {
  const raw = readJson(API_KEY);
  return {
    limit: clampNumber(raw.limit, 100, 1, 1000),
    timeout: clampNumber(raw.timeout, 30, 1, 300),
    retries: clampNumber(raw.retries, 3, 0, 5),
  };
}

export function readNotifPrefs(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(NOTIF_KEY) || '{}');
  } catch {
    return {};
  }
}

export function readLoginAttempts(): LoginAttempts {
  const raw = readJson(ATTEMPTS_KEY);
  return {
    count: clampNumber(raw.count, 0, 0, 999),
    until: typeof raw.until === 'number' && Number.isFinite(raw.until) ? raw.until : 0,
    lastAt: typeof raw.lastAt === 'number' && Number.isFinite(raw.lastAt) ? raw.lastAt : 0,
  };
}

export function registerFailedLogin(maxAttempts: number): LoginAttempts {
  const now = Date.now();
  const prev = readLoginAttempts();
  const expiredBlock = prev.until > 0 && prev.until <= now;
  const stale = now - prev.lastAt > LOGIN_BLOCK_MS;
  const count = (expiredBlock || stale ? 0 : prev.count) + 1;
  const next: LoginAttempts = {
    count,
    until: count >= Math.max(1, maxAttempts) ? now + LOGIN_BLOCK_MS : 0,
    lastAt: now,
  };
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(next));
  } catch {
    // almacenamiento no disponible: el bloqueo no persistirá entre recargas
  }
  return next;
}

export function clearLoginAttempts(): void {
  try {
    localStorage.removeItem(ATTEMPTS_KEY);
  } catch {
    // almacenamiento no disponible: nada que limpiar
  }
}
