import React, { Component, ErrorInfo, ReactNode } from 'react'
import { StandardError, classifyError, logError, getErrorFallback } from '../../lib/error/error-handler'

interface Props {
  children: ReactNode
  fallback?: (error: StandardError, reset: () => void) => ReactNode
  onError?: (error: StandardError, errorInfo: ErrorInfo) => void
  isolate?: boolean // Whether to prevent error bubbling
}

interface State {
  hasError: boolean
  error: StandardError | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error: classifyError(error)
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const standardError = classifyError(error)
    
    this.setState({
      error: standardError,
      errorInfo
    })

    // Log the error
    logError(standardError, {
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name
    })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(standardError, errorInfo)
    }

    // Don't bubble error if isolation is enabled
    if (this.props.isolate) {
      console.error('Error caught and isolated by boundary:', standardError)
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset)
      }

      // Use default fallback
      const fallback = getErrorFallback(this.state.error)
      return <DefaultErrorFallback error={this.state.error} errorInfo={this.state.errorInfo} onReset={this.handleReset} fallback={fallback} />
    }

    return this.props.children
  }
}

// Default error fallback component
interface DefaultErrorFallbackProps {
  error: StandardError
  errorInfo: ErrorInfo | null
  onReset: () => void
  fallback: {
    title: string
    message: string
    action?: string
  }
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({ error, errorInfo, onReset, fallback }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'border-red-500/20 bg-red-500/10'
      case 'HIGH': return 'border-orange-500/20 bg-orange-500/10'
      case 'MEDIUM': return 'border-yellow-500/20 bg-yellow-500/10'
      case 'LOW': return 'border-blue-500/20 bg-blue-500/10'
      default: return 'border-slate-500/20 bg-slate-500/10'
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'NETWORK':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        )
      case 'VALIDATION':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )
      case 'AUTHENTICATION':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        )
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  return (
    <div className={`border rounded-xl p-8 text-center ${getSeverityColor(error.severity)}`}>
      <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-slate-800/50">
        {getIcon(error.type)}
      </div>
      
      <h3 className="text-lg font-semibold text-white mb-2">{fallback.title}</h3>
      <p className="text-slate-400 text-sm mb-6">{fallback.message}</p>
      
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button
          onClick={onReset}
          className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg text-cyan-400 text-sm transition-colors"
        >
          {fallback.action || 'Try Again'}
        </button>
        
        {error.type === 'NETWORK' && (
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/20 rounded-lg text-slate-400 text-sm transition-colors"
          >
            Reload Page
          </button>
        )}
      </div>
      
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-6 text-left">
          <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-400 mb-2">
            Error Details (Development Only)
          </summary>
          <div className="bg-slate-800/50 rounded p-3 text-xs text-slate-400 font-mono overflow-auto max-h-32">
            <div className="mb-2">Type: {error.type}</div>
            <div className="mb-2">Severity: {error.severity}</div>
            <div className="mb-2">Message: {error.message}</div>
            {error.code && <div className="mb-2">Code: {error.code}</div>}
            {error.details && (
              <div className="mb-2">
                Details: <pre className="whitespace-pre-wrap">{JSON.stringify(error.details, null, 2)}</pre>
              </div>
            )}
            {errorInfo?.componentStack && (
              <div>
                Component Stack: <pre className="whitespace-pre-wrap text-xs">{errorInfo.componentStack}</pre>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  )
}

// Specialized error boundaries for different contexts

export class ApiErrorBoundary extends Component<Omit<Props, 'fallback'>> {
  render() {
    return (
      <ErrorBoundary
        {...this.props}
        fallback={(error, reset) => (
          <div className="bg-slate-900/50 border border-red-500/20 rounded-xl p-6 text-center">
            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold mb-2">API Error</h3>
            <p className="text-slate-400 text-sm mb-4">{error.userMessage || 'Failed to connect to our services.'}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-lg text-cyan-400 text-sm transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/20 rounded-lg text-slate-400 text-sm transition-colors"
              >
                Reload
              </button>
            </div>
          </div>
        )}
      />
    )
  }
}

export class ComponentErrorBoundary extends Component<Omit<Props, 'fallback'>> {
  render() {
    return (
      <ErrorBoundary
        {...this.props}
        isolate={true}
        fallback={(error, reset) => (
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center">
            <p className="text-slate-400 text-sm">Component failed to load</p>
            <button
              onClick={reset}
              className="mt-2 px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-slate-300 text-xs transition-colors"
            >
              Retry
            </button>
          </div>
        )}
      />
    )
  }
}

// Hook for functional components to handle errors
export function useErrorHandler() {
  const [error, setError] = React.useState<StandardError | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: unknown) => {
    const standardError = classifyError(error)
    logError(standardError)
    setError(standardError)
  }, [])

  React.useEffect(() => {
    if (error) {
      // You could also send the error to a monitoring service here
      console.error('Error captured by useErrorHandler:', error)
    }
  }, [error])

  return { error, captureError, resetError }
}
