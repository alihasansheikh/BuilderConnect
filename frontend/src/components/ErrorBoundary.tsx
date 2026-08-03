import { Component, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 dark:bg-gray-900">
          <div className="text-center max-w-md">
            <AlertTriangle className="h-16 w-16 text-yellow-500 dark:text-yellow-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 dark:text-white">Something went wrong</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.href = '/'
              }}
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:opacity-90"
            >
              Go to Home
            </button>
            {import.meta.env.DEV && this.state.error && (
              <pre className="mt-6 text-left text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 p-4 rounded overflow-auto max-h-48">
                {this.state.error.message}
                {'\n'}
                {this.state.error.stack}
              </pre>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
