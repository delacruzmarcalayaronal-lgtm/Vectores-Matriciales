import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { MapPin, Clock, ShieldCheck, XCircle } from 'lucide-react';
import { locationsApi } from '../services/locationApi';

const CONSENT_KEY = 'locationConsent';
const CONSENT_DATE_KEY = 'locationConsentDate';

interface LocationConsentModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDeny: () => void;
}

export function LocationConsentModal({ isOpen, onAccept, onDeny }: LocationConsentModalProps) {
  const decide = async (status: 'accepted' | 'denied') => {
    localStorage.setItem(CONSENT_KEY, status);
    localStorage.setItem(CONSENT_DATE_KEY, new Date().toISOString());
    window.dispatchEvent(new Event('location-consent-changed'));
    try {
      await locationsApi.sendConsent(status);
    } catch {
      // el backend puede estar offline; el estado local permite reintentar después
    }
    if (status === 'accepted') onAccept();
    else onDeny();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => undefined}
      title="Ubicación en Tiempo Real"
      size="lg"
      showCloseButton={false}
      dismissible={false}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <p className="text-sm text-secondary leading-relaxed">
            Para el control operativo, MatrixFlow puede registrar tu ubicación durante tu
            jornada laboral. El tratamiento de tus datos personales se realiza conforme a la
            Ley N° 29733 - Ley de Protección de Datos Personales (Perú) y su reglamento.
            Tu consentimiento es libre, informado, revocable y quedará registrado con fecha
            y hora.
          </p>
        </div>

        <ul className="space-y-2 text-sm text-text">
          <li className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            Se registrará cada 60 segundos
          </li>
          <li className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            Solo durante tu horario laboral
          </li>
          <li className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-primary shrink-0" />
            Puedes revocarlo cuando quieras
          </li>
        </ul>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={() => void decide('denied')}>
            Rechazar
          </Button>
          <Button onClick={() => void decide('accepted')}>Aceptar</Button>
        </div>
      </div>
    </Modal>
  );
}
