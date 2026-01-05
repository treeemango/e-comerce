import React, { Component, ErrorInfo, ReactNode } from 'react';

const IS_DEV = import.meta.env.DEV;

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorId: null
    };

    constructor(props: Props) {
        super(props);
    }

    public static getDerivedStateFromError(error: Error): State {
        const errorId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        return { hasError: true, error, errorId };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 font-display">
                    <div className="max-w-lg w-full">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 overflow-hidden">
                            <div className="p-6 sm:p-8 text-center">
                                <div className="mx-auto w-14 h-14 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                                    <span className="material-icons text-3xl text-red-600 dark:text-red-400">error_outline</span>
                                </div>
                                <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">We hit a snag</h1>
                                <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                                    Something went wrong while loading this page. Please try again.
                                </p>
                                {this.state.errorId && (
                                    <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                                        Reference: <span className="font-mono">{this.state.errorId}</span>
                                    </p>
                                )}

                                <div className="mt-6 flex flex-col sm:flex-row gap-2">
                                    <button
                                        className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                                        onClick={() => window.location.reload()}
                                    >
                                        Refresh
                                    </button>
                                    <button
                                        className="w-full sm:flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-900 dark:text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
                                        onClick={() => this.setState({ hasError: false, error: null, errorId: null })}
                                    >
                                        Try again
                                    </button>
                                </div>
                            </div>

                            {IS_DEV && this.state.error && (
                                <div className="border-t border-gray-100 dark:border-slate-700 p-4 sm:p-6 text-left">
                                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-200">Developer details</p>
                                    <div className="mt-2 bg-gray-50 dark:bg-slate-900/40 p-3 rounded-lg text-[11px] font-mono text-gray-800 dark:text-gray-200 overflow-auto max-h-56 border border-gray-100 dark:border-slate-700">
                                        {this.state.error.toString()}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
