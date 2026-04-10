import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

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
    console.error('[ErrorBoundary] Error al cargar componente:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            gap: '16px',
            color: 'var(--text-primary)',
            backgroundColor: 'var(--bg-color)',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '1rem', margin: 0 }}>
            Algo salió mal al cargar esta sección. Recargá la página.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--primary-color)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Recargar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
