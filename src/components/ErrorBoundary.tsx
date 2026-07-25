import { Component, ErrorInfo, ReactNode } from 'react';
import { Html } from '@react-three/drei';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Html center>
          <div style={{ color: 'red', background: 'rgba(0,0,0,0.8)', padding: '10px', borderRadius: '5px' }}>
            {this.props.fallbackMessage || 'Feature unavailable'}
          </div>
        </Html>
      );
    }

    return this.props.children;
  }
}
