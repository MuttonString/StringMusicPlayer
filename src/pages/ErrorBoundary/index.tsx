import type { ErrorInfo, ReactNode } from 'react';
import React, { Component } from 'react';
import ErrorBoundaryBase from './base';

interface Props {
  children: ReactNode;
  fallbackRender?: (error: Error, errorInfo: React.ErrorInfo) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorBoundaryBase
          error={this.state.error?.toString()}
          errorInfo={this.state.errorInfo?.componentStack}
        />
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
