import { Map } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';

export function GeoMap() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Mapa de Ubicaciones</h1>
        <p className="text-secondary mt-1">Ubicación de personas por departamento y provincia</p>
      </div>

      <Card>
        <CardContent className="py-16 flex flex-col items-center text-center gap-3">
          <div className="p-4 rounded-2xl bg-primary/10 text-primary">
            <Map className="w-8 h-8" />
          </div>
          <p className="font-semibold text-text">El mapa se cargará desde una API</p>
          <p className="text-sm text-secondary max-w-md">
            Esta pantalla está pendiente de integrarse con el servicio de geolocalización.
            Hasta entonces no se muestra ningún dato.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
