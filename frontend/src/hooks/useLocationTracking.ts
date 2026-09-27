import { useEffect, useRef, useState } from 'react';
import { useGeolocation, type GeolocationPosition as TrackedPosition } from './useGeolocation';
import { locationsApi } from '../services/locationApi';

const INTERVAL_MS = 60_000;
/** Precisión máxima aceptable (m): por encima es ubicación aproximada por IP. */
const MAX_ACCURACY_M = 1000;

interface UseLocationTrackingResult {
  isTracking: boolean;
  permission: string;
  lastSent: string | null;
  error: string | null;
  imprecise: boolean;
  requestPermission: () => void;
  stopTracking: () => void;
}

/** Envía la ubicación al backend cada 60s mientras el consentimiento esté activo. */
export function useLocationTracking(enabled: boolean): UseLocationTrackingResult {
  const { permission, position, error, requestPermission, stopTracking } = useGeolocation();
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [imprecise, setImprecise] = useState(false);
  const positionRef = useRef<TrackedPosition | null>(null);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    if (enabled) {
      requestPermission();
    } else {
      stopTracking();
    }
  }, [enabled, requestPermission, stopTracking]);

  useEffect(() => {
    if (!enabled || permission !== 'granted') return;

    const send = async () => {
      // Ahorro de batería: no enviar con la pestaña oculta
      if (document.visibilityState === 'hidden') return;
      const pos = positionRef.current;
      if (!pos) return;
      if (typeof pos.accuracy === 'number' && pos.accuracy > MAX_ACCURACY_M) {
        // Sin GPS fiable (p. ej. ubicación por IP): no registrar posiciones
        // que no corresponden a donde está el usuario.
        setImprecise(true);
        return;
      }
      try {
        await locationsApi.sendLocation({
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy,
          speed: pos.speed ?? undefined,
          heading: pos.heading ?? undefined,
        });
        setImprecise(false);
        setLastSent(new Date().toISOString());
        setSendError(null);
      } catch {
        setSendError('No se pudo enviar la ubicación (reintentando)');
      }
    };

    void send();
    const id = window.setInterval(send, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [enabled, permission]);

  const isTracking = enabled && permission === 'granted' && lastSent !== null;

  return {
    isTracking,
    permission,
    lastSent,
    error: sendError ?? error,
    imprecise,
    requestPermission,
    stopTracking,
  };
}
