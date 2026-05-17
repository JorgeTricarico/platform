import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { logError } from '../lib/errorLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Reporte automático al backend (no bloqueante)
    logError(error, 'error', {
      type: 'react.boundary',
      componentStack: info.componentStack ?? '',
    });
    console.error('[ErrorBoundary] Error al cargar componente:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-6 text-center">
          <h2 className="text-xl font-semibold text-foreground">
            Algo salió mal
          </h2>
          <p className="text-base text-muted-foreground max-w-md">
            Tu trabajo está a salvo. Recargá la página para continuar. Si el problema persiste, avisanos.
          </p>
          <Button onClick={() => window.location.reload()}>
            Recargar
          </Button>
          {import.meta.env.DEV && this.state.error && (
            <pre className="text-xs text-destructive max-w-2xl overflow-auto p-4 bg-destructive/10 rounded text-left">
              {this.state.error.message}
              {'\n'}
              {this.state.error.stack}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
