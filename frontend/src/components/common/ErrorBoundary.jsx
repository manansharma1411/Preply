import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { AlertCircle, RotateCcw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-surface-50">
          <Card className="max-w-md w-full text-center">
            <CardContent className="space-y-4 py-8">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-surface-900">Application Error</h2>
                <p className="text-xs text-surface-500 max-w-xs mx-auto">
                  An unexpected rendering error occurred. Please refresh the workspace.
                </p>
              </div>
              {this.state.error?.message && (
                <div className="p-3 bg-surface-100 rounded-lg text-left text-xs font-mono text-surface-700 overflow-x-auto">
                  {this.state.error.message}
                </div>
              )}
              <Button icon={RotateCcw} onClick={this.handleReload} className="w-full">
                Reload Application
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
