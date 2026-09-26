import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, CreditCard, Download, LogOut, Printer, Save, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Avatar, Modal } from '../components/ui/Table';
import { Carnet, type CarnetData } from '../components/profile/Carnet';
import { useAuth } from '../contexts/useAuth';
import { ROLE_LABELS, ROLE_ICONS } from '../lib/permissions';
import type { Role } from '../types';

const compressImage = (file: File, maxSide = 192): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer la imagen'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen válida'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo procesar la imagen'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

export function Profile() {
  const { user, updateProfile, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const carnetRef = useRef<HTMLCanvasElement>(null);

  const [name, setName] = useState(user?.name ?? '');
  const [role, setRole] = useState<Role>(user?.role ?? 'operator');
  const [avatar, setAvatar] = useState<string | undefined>(user?.avatar);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [showCarnet, setShowCarnet] = useState(false);
  const [verifiedAt, setVerifiedAt] = useState(() => new Date());

  if (!user) return null;

  const roleOptions = Object.entries(ROLE_LABELS).map(([value, label]) => ({
    value,
    label: `${ROLE_ICONS[value as Role]} ${label}`,
  }));

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Selecciona un archivo de imagen (JPG o PNG)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar 5 MB');
      return;
    }
    try {
      setAvatar(await compressImage(file));
      setError('');
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la imagen');
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();

    if (trimmedName.length < 2) {
      setError('El nombre debe tener al menos 2 caracteres');
      return;
    }

    try {
      await updateProfile({ name: trimmedName, role, avatar });
      setError('');
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar los cambios');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const carnetData: CarnetData = {
    name: name.trim() || user.name,
    dni: user.dni || '—',
    role,
    photo: avatar,
    verifiedAt,
  };

  const openCarnet = () => {
    setVerifiedAt(new Date());
    setShowCarnet(true);
  };

  const downloadCarnet = () => {
    const canvas = carnetRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `carnet-${(user.dni || 'matrixflow').replace(/\s+/g, '')}.png`;
    link.click();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text">Mi perfil</h1>
          <p className="text-secondary mt-1">Actualiza tu información personal</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate(-1)}
        >
          Volver
        </Button>
      </div>

      <Card>
        <CardContent className="py-6 space-y-5">
          <div className="flex flex-col items-center gap-2">
            <div className="relative">
              <Avatar name={name || user.name} src={avatar} size="xl" className="ring-2 ring-primary/30" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-white hover:bg-primary/90 transition-colors shadow"
                aria-label="Cambiar foto"
                title="Cambiar foto"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <div className="flex items-center gap-3 text-xs">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-primary hover:underline">
                Subir foto
              </button>
              {avatar && (
                <button type="button" onClick={() => setAvatar(undefined)} className="text-secondary hover:text-danger">
                  Quitar foto
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Nombre completo" value={name} onChange={e => { setName(e.target.value); setSaved(false); }} placeholder="Tu nombre" />
            <Select
              label="Rol"
              value={role}
              onChange={e => { setRole(e.target.value as Role); setSaved(false); }}
              options={roleOptions}
              disabled={user.role !== 'admin'}
              title={user.role !== 'admin' ? 'Solo un administrador puede cambiar el rol' : undefined}
            />
            <Input label="DNI" value={user.dni || '—'} readOnly disabled className="font-mono" />
          </div>

          {error && (
            <p className="text-sm text-danger bg-danger/5 border border-danger/20 rounded-lg px-3 py-2">{error}</p>
          )}
          {saved && (
            <p className="text-sm text-success bg-success/5 border border-success/20 rounded-lg px-3 py-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Cambios guardados en tu cuenta
            </p>
          )}

          <p className="text-xs text-secondary">
            Tu foto se recorta a 192 px y se guarda en tu cuenta: la verás desde cualquier dispositivo.
          </p>
        </CardContent>

        <div className="px-6 py-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
          <Button variant="danger" size="sm" leftIcon={<LogOut className="w-4 h-4" />} onClick={handleLogout}>
            Cerrar sesión
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" leftIcon={<CreditCard className="w-4 h-4" />} onClick={openCarnet}>
              Generar carnet
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>Cancelar</Button>
            <Button size="sm" leftIcon={<Save className="w-4 h-4" />} onClick={handleSave}>
              Guardar cambios
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        isOpen={showCarnet}
        onClose={() => setShowCarnet(false)}
        title="Carnet de identificación"
        description="Credencial con tu foto, DNI y verificación de identidad"
        size="xl"
      >
        <div className="space-y-4">
          <div id="carnet-print" className="bg-white">
            <Carnet data={carnetData} canvasRef={carnetRef} />
          </div>
          <p className="text-xs text-secondary">
            Se genera en tu navegador con tu foto de perfil. Puedes imprimirlo o guardarlo como PNG.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Printer className="w-4 h-4" />}
              onClick={() => window.print()}
            >
              Imprimir
            </Button>
            <Button size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={downloadCarnet}>
              Guardar PNG
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
