import { useCallback, useEffect, useRef, useState } from 'react';

export type GeolocationPermission = 'pending' | 'granted' | 'denied' | 'unsupported';

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed?: number | null;
  heading?: number | null;
}

interface UseGeolocationResult {
  permission: GeolocationPermission;
  position: GeolocationPosition | null;
  error: string | null;
  requestPermission: () => void;
  stopTracking: () => void;
}

const OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000,
};

const ERROR_MESSAGES: Record<number, string> = {
  1: 'Permiso de ubicación denegado por el navegador',
  2: 'Ubicación no disponible',
  3: 'Tiempo de espera agotado al obtener la ubicación',
};

/** Observa la posición GPS del navegador con watchPosition(). */
export function useGeolocation(): UseGeolocationResult {
  const supported = typeof navigator !== 'undefined' && 'geolocation' in navigator;
  const [permission, setPermission] = useState<GeolocationPermission>(
    () => (supported ? 'pending' : 'unsupported')
  );
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && supported) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, [supported]);

  const requestPermission = useCallback(() => {
    if (!supported) {
      setPermission('unsupported');
      setError('Tu navegador no soporta geolocalización');
      return;
    }
    if (watchIdRef.current !== null) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPermission('granted');
        setError(null);
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed,
          heading: pos.coords.heading,
        });
      },
      (err) => {
        setPermission(err.code === err.PERMISSION_DENIED ? 'denied' : 'pending');
        setError(ERROR_MESSAGES[err.code] ?? 'Error de geolocalización');
      },
      OPTIONS
    );
  }, [supported]);

  useEffect(() => stopTracking, [stopTracking]);

  return { permission, position, error, requestPermission, stopTracking };
}
