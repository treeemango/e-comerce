import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    constructor(props: Props) {
        super(props);
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 font-display">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-xl max-w-md w-full text-center">
                        <span className="material-icons text-6xl text-red-500 mb-4">error_outline</span>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Something went wrong</h1>
                        <p className="text-gray-600 dark:text-gray-300 mb-6 text-sm">
                            We encountered an unexpected error.
                        </p>
                        <div className="flex flex-col gap-2">
                            <button
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition-colors"
                                onClick={() => window.location.reload()}
                            >
                                Refresh Page
                            </button>
                            <button
                                className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-800 dark:text-white font-bold py-2 px-4 rounded transition-colors"
                                onClick={() => this.setState({ hasError: false, error: null })}
                            >
                                Try Again
                            </button>
                        </div>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mt-8 text-left bg-red-50 dark:bg-red-900/20 p-4 rounded text-[10px] font-mono text-red-600 dark:text-red-400 overflow-auto max-h-48 border border-red-100 dark:border-red-900/30">
                                {this.state.error.toString()}
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
