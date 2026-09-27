import { api } from './api';

export type TrackingStatus = 'active' | 'idle' | 'offline';

export interface LocationInput {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  batteryLevel?: number;
}

export interface LocationRecord {
  id: string;
  workerId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  isWithinGeofence: boolean;
  recordedAt: string;
}

export interface WorkerLastLocation {
  workerId: string;
  workerName: string;
  employeeCode: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  lastSeen: string;
  minutesAgo: number;
  status: TrackingStatus;
  address?: string | null;
  distanceKm?: number;
}

export interface WorkerItem {
  id: string;
  userId: string;
  employeeCode: string;
  name: string;
  position: string;
  department: string;
  isActive: boolean;
  trackingEnabled: boolean;
}

export interface ConsentRecord {
  id: string;
  workerId: string;
  consentStatus: 'accepted' | 'denied';
  consentedAt: string;
}

export const locationsApi = {
  sendLocation: (data: LocationInput): Promise<LocationRecord> =>
    api.post('/locations', data).then((r) => r.data),

  getLatestLocations: (): Promise<WorkerLastLocation[]> =>
    api.get('/locations/latest').then((r) => r.data),

  getWorkerHistory: (workerId: string, start?: string, end?: string): Promise<LocationRecord[]> =>
    api
      .get(`/locations/worker/${workerId}/history`, { params: { start, end } })
      .then((r) => r.data),

  getMapHtml: (): Promise<string> =>
    api.get('/locations/map', { responseType: 'text' }).then((r) => r.data),

  getWorkerHistoryMap: (workerId: string, date?: string): Promise<string> =>
    api
      .get(`/locations/map/history/${workerId}`, { params: { date }, responseType: 'text' })
      .then((r) => r.data),

  getGeofenceMapHtml: (lat?: number, lng?: number, radiusKm?: number): Promise<string> =>
    api
      .get('/locations/geofence-map', { params: { lat, lng, radius_km: radiusKm }, responseType: 'text' })
      .then((r) => r.data),

  getWorkersOutsideGeofence: (lat: number, lng: number, radius: number): Promise<WorkerLastLocation[]> =>
    api
      .get('/locations/outside-geofence', { params: { lat, lng, radius_km: radius } })
      .then((r) => r.data),

  sendConsent: (consentStatus: 'accepted' | 'denied'): Promise<ConsentRecord> =>
    api.post('/locations/consent', { consentStatus, consentVersion: 'v1' }).then((r) => r.data),

  listWorkers: (): Promise<WorkerItem[]> => api.get('/workers').then((r) => r.data),
};
