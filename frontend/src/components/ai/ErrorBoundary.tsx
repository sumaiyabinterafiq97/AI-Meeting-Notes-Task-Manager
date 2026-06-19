import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReset = (): void => {
    this.setState({ hasError: false });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center"
          role="alert"
        >
          <p className="font-medium">{this.props.fallbackTitle ?? 'Something went wrong'}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This section failed to load. Try again.
          </p>
          <Button type="button" variant="outline" size="sm" className="mt-3" onClick={this.handleReset}>
            Retry
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
