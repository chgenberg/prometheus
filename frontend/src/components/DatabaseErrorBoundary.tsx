'use client';

import React from 'react';
import { AlertTriangle, RefreshCw, Database } from 'lucide-react';

interface DatabaseErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{error: Error; retry: () => void}>;
}

interface DatabaseErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class DatabaseErrorBoundary extends React.Component<
  DatabaseErrorBoundaryProps,
  DatabaseErrorBoundaryState
> {
  constructor(props: DatabaseErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<DatabaseErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Database Error Boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });

    // Log to monitoring service if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.toString(),
        fatal: false
      });
    }
  }

  retry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} retry={this.retry} />;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-gradient-to-br from-gray-900/90 via-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-700/30 p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-500 blur-2xl opacity-60" />
                <div className="relative bg-gradient-to-br from-red-500/20 to-red-600/20 p-4 rounded-2xl border border-red-500/30">
                  <Database className="h-12 w-12 text-red-500" />
                </div>
              </div>
            </div>

            <h3 className="text-2xl font-bold text-white mb-3">
              Database Connection Issue
            </h3>
            
            <p className="text-gray-300 mb-6 leading-relaxed">
              We're experiencing temporary connectivity issues with the database. 
              This usually resolves itself automatically.
            </p>

            <div className="space-y-4">
              <button
                onClick={this.retry}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <RefreshCw className="h-5 w-5" />
                Try Again
              </button>

              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <RefreshCw className="h-5 w-5" />
                Refresh Page
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-gray-400 hover:text-white text-sm font-medium">
                  Technical Details
                </summary>
                <div className="mt-2 p-4 bg-gray-800/50 rounded-lg border border-gray-700/30">
                  <pre className="text-xs text-red-400 whitespace-pre-wrap overflow-x-auto">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <pre className="text-xs text-gray-500 mt-2 whitespace-pre-wrap overflow-x-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle database errors
export function useDatabaseErrorHandler() {
  const handleDatabaseError = React.useCallback((error: Error) => {
    console.error('Database operation failed:', error);
    
    // You can add custom error handling logic here
    if (error.message.includes('SQLITE_MISUSE') || error.message.includes('Database is closed')) {
      // Handle SQLite connection issues
      console.warn('SQLite connection issue detected, attempting to reconnect...');
      // Trigger a page refresh or show a user-friendly message
    }
  }, []);

  return { handleDatabaseError };
}

// Simple fallback component for specific use cases
export function SimpleDatabaseErrorFallback({ 
  error, 
  retry 
}: { 
  error: Error; 
  retry: () => void; 
}) {
  return (
    <div className="flex items-center justify-center p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
      <div className="text-center">
        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400 mx-auto mb-3" />
        <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2">
          Failed to fetch data
        </h4>
        <p className="text-sm text-red-600 dark:text-red-400 mb-4">
          {error.message.includes('Failed to fetch') ? 
            'Unable to connect to the database' : 
            'A database error occurred'}
        </p>
        <button
          onClick={retry}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  );
}

export default DatabaseErrorBoundary; 