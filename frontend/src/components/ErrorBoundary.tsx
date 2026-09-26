import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-bg text-text">
          <div className="max-w-md w-full rounded-xl border border-border bg-card p-6 space-y-4 text-center">
            <h1 className="text-xl font-bold">Algo salió mal</h1>
            <p className="text-sm text-secondary">
              La pantalla encontró un problema inesperado. Tu sesión sigue activa; puedes reintentar sin recargar.
            </p>
            <pre className="text-xs text-left bg-background p-3 rounded-lg overflow-auto max-h-40 text-secondary border border-border">
              {this.state.error.message}
            </pre>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                onClick={() => this.setState({ error: null })}
              >
                Reintentar
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-border hover:bg-background transition-colors"
                onClick={() => { window.location.href = '/'; }}
              >
                Ir al inicio
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
