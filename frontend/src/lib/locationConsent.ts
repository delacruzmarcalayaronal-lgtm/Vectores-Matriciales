export type ConsentStatus = 'accepted' | 'denied';

const CONSENT_KEY = 'locationConsent';
const CONSENT_DATE_KEY = 'locationConsentDate';
export const LOCATION_CONSENT_EVENT = 'location-consent-changed';

/** La decisión vive solo en sessionStorage: al cerrar la pestaña/sesión se olvida. */
export function readConsent(): ConsentStatus | null {
  const value = sessionStorage.getItem(CONSENT_KEY);
  return value === 'accepted' || value === 'denied' ? value : null;
}

export function hasConsent(): boolean {
  return readConsent() !== null;
}

export function writeConsent(status: ConsentStatus): void {
  sessionStorage.setItem(CONSENT_KEY, status);
  sessionStorage.setItem(CONSENT_DATE_KEY, new Date().toISOString());
  notifyConsentChanged();
}

export function clearConsent(): void {
  sessionStorage.removeItem(CONSENT_KEY);
  sessionStorage.removeItem(CONSENT_DATE_KEY);
}

export function notifyConsentChanged(): void {
  window.dispatchEvent(new Event(LOCATION_CONSENT_EVENT));
}
