import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
    this.setState({ errorInfo });

    // Log error to monitoring service
    this.logError(error, errorInfo);
  }

  logError = (error, errorInfo) => {
    // Implement error logging to your monitoring service
    console.error("Error details:", {
      error: error,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });
  };

  handleRetry = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  handleReportIssue = () => {
    const errorDetails = {
      error: this.state.error?.toString(),
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    // Implement your error reporting mechanism
    console.log("Reporting issue:", errorDetails);
    alert("Thank you for reporting the issue. Our team will investigate.");
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Something went wrong
              </h2>

              <div className="bg-red-50 rounded-md p-4 mb-6">
                <p className="text-red-700 text-sm">
                  {this.state.error?.message || "An unexpected error occurred"}
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={this.handleRetry}
                  disabled={this.state.retryCount >= 3}
                  className="btn-primary w-full"
                >
                  {this.state.retryCount >= 3
                    ? "Too many retries"
                    : "Try Again"}
                </button>

                <button
                  onClick={() => window.location.reload()}
                  className="btn-outline w-full"
                >
                  Refresh Page
                </button>

                <button
                  onClick={this.handleReportIssue}
                  className="text-primary hover:text-secondary text-sm"
                >
                  Report this issue
                </button>
              </div>

              <div className="mt-6 text-sm text-gray-500">
                <p>If the problem persists, please try:</p>
                <ul className="list-disc list-inside mt-2">
                  <li>Clearing your browser cache</li>
                  <li>Checking your internet connection</li>
                  <li>Logging out and back in</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
