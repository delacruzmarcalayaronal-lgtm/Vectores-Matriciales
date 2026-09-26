import { useEffect, useRef, useState } from 'react';
import { useGeolocation, type GeolocationPosition as TrackedPosition } from './useGeolocation';
import { locationsApi } from '../services/locationApi';

const INTERVAL_MS = 60_000;

interface UseLocationTrackingResult {
  isTracking: boolean;
  permission: string;
  lastSent: string | null;
  error: string | null;
  requestPermission: () => void;
  stopTracking: () => void;
}

/** Envía la ubicación al backend cada 60s mientras el consentimiento esté activo. */
export function useLocationTracking(enabled: boolean): UseLocationTrackingResult {
  const { permission, position, error, requestPermission, stopTracking } = useGeolocation();
  const [lastSent, setLastSent] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
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
      try {
        await locationsApi.sendLocation({
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy,
          speed: pos.speed ?? undefined,
          heading: pos.heading ?? undefined,
        });
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
    requestPermission,
    stopTracking,
  };
}
