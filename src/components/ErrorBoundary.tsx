import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/';
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
                    <div className="glass-panel p-8 max-w-lg text-center">
                        <div className="flex justify-center mb-4">
                            <AlertTriangle size={64} className="text-amber-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">
                            Etwas ist schiefgelaufen
                        </h1>
                        <p className="text-gray-300 mb-6">
                            Ein unerwarteter Fehler ist aufgetreten. Bitte versuche die Seite neu zu laden.
                        </p>

                        {this.state.error && (
                            <details className="mb-6 text-left">
                                <summary className="text-gray-400 cursor-pointer hover:text-gray-300 text-sm">
                                    Technische Details
                                </summary>
                                <pre className="mt-2 p-3 bg-black/50 rounded text-xs text-red-400 overflow-auto max-h-32">
                                    {this.state.error.message}
                                    {this.state.errorInfo?.componentStack}
                                </pre>
                            </details>
                        )}

                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={this.handleReload}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                            >
                                <RefreshCw size={18} />
                                Neu laden
                            </button>
                            <button
                                onClick={this.handleGoHome}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                            >
                                <Home size={18} />
                                Zur Lobby
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
