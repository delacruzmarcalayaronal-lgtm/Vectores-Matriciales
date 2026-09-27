import { useState, useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Calculator, IdCard, Loader2, ShieldCheck, AlertCircle, UserPlus, LogIn, Grid3x3, BarChart3, Lock, ScanFace } from 'lucide-react';
import { FaceScanner, type FaceScanResult } from '../components/auth/FaceScanner';
import { SmokeField } from '../components/auth/SmokeField';
import { useAuth } from '../contexts/useAuth';
import { DEMO_USERS } from '../services/mockApi';
import { ROLE_LABELS, ROLE_ICONS } from '../lib/permissions';
import { readBgMotion, BG_MOTION_EVENT } from '../lib/bgMotion';

type AuthMode = 'login' | 'register';
type LoginMethod = 'dni' | 'face';

export function Login() {
  const navigate = useNavigate();
  const { login, loginWithFace, register, isAuthenticated, isLoading: authLoading } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [method, setMethod] = useState<LoginMethod>('dni');
  const [dni, setDni] = useState('');
  const [name, setName] = useState('');
  const [faceScan, setFaceScan] = useState<FaceScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bgMotion, setBgMotion] = useState(readBgMotion);

  useEffect(() => {
    const onChange = () => setBgMotion(readBgMotion());
    window.addEventListener(BG_MOTION_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(BG_MOTION_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  const dniValid = /^\d{8}$/.test(dni);
  const nameValid = mode === 'login' || name.trim().length >= 3;
  const showScanner = mode === 'register' || method === 'face';
  const dniRequired = mode === 'register' || method === 'dni';
  const dniOk = dniRequired ? dniValid : dni === '' || dniValid;
  const faceOk = !showScanner || !!faceScan;
  const canSubmit = dniOk && nameValid && faceOk && !isLoading;

  if (!authLoading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setFaceScan(null);
  };

  const switchMethod = (next: LoginMethod) => {
    if (method === next) return;
    setMethod(next);
    setError(null);
    setFaceScan(null);
  };

  const handleDniChange = (value: string) => {
    setDni(value.replace(/\D/g, '').slice(0, 8));
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!dniOk) {
      setError('El DNI debe tener exactamente 8 dígitos');
      return;
    }
    if (!nameValid) {
      setError('Ingresa tu nombre completo');
      return;
    }
    if (!faceOk) {
      setError('Debes validar tu identidad con el escáner facial');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'register') {
        await register(name.trim(), dni, faceScan?.vector ?? null, faceScan?.points ?? null);
      } else if (method === 'dni') {
        await login(dni);
      } else {
        await loginWithFace(dni || undefined, faceScan?.vector ?? undefined);
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la operación');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg relative overflow-hidden flex">
      {bgMotion.enabled && (
        <SmokeField density={bgMotion.density} speed={bgMotion.speed} interactive={bgMotion.interactive} />
      )}
      <div className="hidden lg:flex w-1/2 relative z-10 overflow-hidden flex-col justify-between p-10">

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-text font-bold text-lg leading-tight">MatrixFlow Enterprise</p>
            <p className="text-secondary text-xs">Análisis de ventas e inventario con álgebra lineal</p>
          </div>
        </div>

        <div className="relative space-y-6">
          <h1 className="text-3xl font-bold text-text leading-snug">
            Tu empresa, tus datos,<br />
            <span className="text-accent">matemática aplicada</span>
          </h1>
          <div className="space-y-4">
            {[
              { icon: BarChart3, text: 'Dashboard ejecutivo con ventas, metas y rotación de inventario' },
              { icon: Grid3x3, text: 'Vectores y matrices construidos desde tu información real' },
              { icon: ShieldCheck, text: 'Acceso seguro con DNI y verificación facial' },
            ].map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-4 h-4 text-accent" />
                </div>
                <p className="text-secondary text-sm pt-1.5">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-secondary/70 text-xs">MatrixFlow Enterprise v1.0 • Plan Maestro de Desarrollo</p>
      </div>

      <div className="relative z-10 w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary mb-3">
              <Calculator className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-xl font-bold text-text">MatrixFlow Enterprise</h1>
          </div>

          <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="flex border-b border-border">
              {([
                { id: 'login' as AuthMode, label: 'Iniciar sesión', icon: LogIn },
                { id: 'register' as AuthMode, label: 'Registro', icon: UserPlus },
              ]).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => switchMode(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors ${
                    mode === tab.id
                      ? 'border-primary text-primary bg-primary/5'
                      : 'border-transparent text-secondary hover:text-text'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-text">
                  {mode === 'register'
                    ? 'Crear cuenta'
                    : method === 'dni'
                      ? 'Acceso con DNI'
                      : 'Acceso con reconocimiento facial'}
                </h2>
                <p className="text-sm text-secondary mt-1">
                  {mode === 'register'
                    ? 'Registra tu nombre, DNI y rostro'
                    : method === 'dni'
                      ? 'Ingresa tu número de DNI para entrar'
                      : 'Escanea tu rostro para entrar'}
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 flex items-start gap-2 text-danger text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {mode === 'login' && (
                <div>
                  <span className="block text-sm font-medium text-text mb-1.5">
                    ¿Cómo quieres entrar?
                  </span>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-lg">
                    {([
                      { id: 'dni' as LoginMethod, label: 'Con DNI', icon: IdCard },
                      { id: 'face' as LoginMethod, label: 'Con mi rostro', icon: ScanFace },
                    ]).map(option => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => switchMethod(option.id)}
                        className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-colors ${
                          method === option.id
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-secondary hover:text-text'
                        }`}
                      >
                        <option.icon className="w-4 h-4" />
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-text mb-1.5">
                    Nombre completo
                  </label>
                <div className="relative">
                  <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={e => { setName(e.target.value); setError(null); }}
                      placeholder="María Torres"
                      autoComplete="name"
                      className="w-full pl-3 pr-3 h-11 rounded-lg border border-border bg-white px-3 text-sm text-text placeholder:text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="dni" className="block text-sm font-medium text-text mb-1.5">
                  Número de DNI{!dniRequired && ' (opcional)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary">
                    <IdCard className="w-5 h-5" />
                  </span>
                  <input
                    id="dni"
                    type="text"
                    inputMode="numeric"
                    value={dni}
                    onChange={e => handleDniChange(e.target.value)}
                    placeholder="12345678"
                    autoComplete="off"
                    maxLength={8}
                    className={`w-full h-11 rounded-lg border bg-white pl-10 pr-16 text-sm font-mono tracking-widest text-text placeholder:text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                      dni.length > 0 && !dniValid ? 'border-danger' : 'border-border focus:border-primary'
                    }`}
                  />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${
                    dniValid ? 'text-success' : 'text-secondary'
                  }`}>
                    {dni.length}/8
                  </span>
                </div>
                {dni.length > 0 && !dniValid && (
                  <p className="text-xs text-danger mt-1">Debe contener 8 dígitos</p>
                )}
                {!dniRequired && dni === '' && (
                  <p className="text-xs text-secondary mt-1">Opcional: te identifica si tienes más de una cuenta</p>
                )}
              </div>

              {showScanner && (
                <div>
                  <label className="block text-sm font-medium text-text mb-1.5">
                    {mode === 'register' ? 'Verificación facial' : 'Escaneo facial'}
                  </label>
                  <FaceScanner
                    disabled={dniRequired && !dniValid}
                    onVerified={result => { setFaceScan(result); setError(null); }}
                    onReset={() => setFaceScan(null)}
                  />
                  {dniRequired && !dniValid && (
                    <p className="text-xs text-secondary mt-1.5">
                      Ingresa tu DNI para habilitar el escáner facial
                    </p>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full h-11 inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verificando…
                  </>
                ) : mode === 'register' ? (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Crear cuenta y entrar
                  </>
                ) : method === 'dni' ? (
                  <>
                    <LogIn className="w-4 h-4" />
                    Entrar con DNI
                  </>
                ) : (
                  <>
                    <ScanFace className="w-4 h-4" />
                    Entrar con mi rostro
                  </>
                )}
              </button>

              {mode === 'login' ? (
                <div className="p-3 rounded-lg bg-gray-50 border border-border space-y-2">
                  <p className="text-xs font-medium text-secondary flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Cuentas de prueba (clic para rellenar)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {DEMO_USERS.map(account => (
                      <button
                        key={account.dni}
                        type="button"
                        onClick={() => handleDniChange(account.dni)}
                        className="text-left px-2 py-1.5 rounded-md border border-border bg-white hover:border-primary/50 hover:bg-primary/5 transition-colors"
                      >
                        <span className="block text-[11px] text-secondary truncate">
                          {ROLE_ICONS[account.role]} {ROLE_LABELS[account.role]}
                        </span>
                        <span className="block text-xs font-mono font-medium text-text">{account.dni}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 border border-border">
                  <Lock className="w-4 h-4 text-secondary flex-shrink-0" />
                  <p className="text-xs text-secondary">
                    Crea tu cuenta con cualquier DNI de 8 dígitos
                  </p>
                </div>
              )}
            </form>
          </div>

          <p className="text-center text-xs text-secondary mt-6">
            MatrixFlow Enterprise v1.0 • Sistema de Análisis Matricial Empresarial
          </p>
        </div>
      </div>
    </div>
  );
}
