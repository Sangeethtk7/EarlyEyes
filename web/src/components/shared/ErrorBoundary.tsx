import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary class component that intercepts runtime errors and presents
 * a user-friendly error summary and recovery path.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error captured by ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAF7] p-6 text-center">
          <div className="max-w-md bg-white border border-[#E8E5E0] rounded-2xl p-8 shadow-sm space-y-6">
            <div className="text-4xl select-none">🌿</div>
            <h1 className="text-2xl font-semibold text-[#2C2C2C]">
              Something went wrong
            </h1>
            <p className="text-gray-500 text-sm">
              We encountered an unexpected layout rendering issue. Please reload the page.
            </p>
            {this.state.error && (
              <pre className="bg-red-50/50 text-red-600 text-xs p-4 rounded-xl overflow-x-auto text-left max-h-32 font-mono">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#7C9E87] hover:bg-[#6c8e76] text-white py-2.5 px-4 rounded-xl font-medium transition duration-200"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
