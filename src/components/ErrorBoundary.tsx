import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 bg-red-50 text-red-900 border border-red-200 rounded-lg m-4">
          <h2 className="text-xl font-bold mb-4">Something went wrong.</h2>
          <details className="whitespace-pre-wrap bg-white p-4 rounded text-sm overflow-auto">
            <summary className="cursor-pointer font-medium mb-2">View Error Details</summary>
            <div className="text-red-600 font-mono mb-4">{this.state.error?.toString()}</div>
            <div className="text-slate-600 font-mono text-xs">{this.state.errorInfo?.componentStack}</div>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
