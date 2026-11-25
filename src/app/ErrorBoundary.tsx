import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('LocalNet error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="login-wrap">
          <div className="card login-card" style={{ textAlign: 'center' }}>
            <h1 className="page-title">Une erreur est survenue</h1>
            <p className="small muted">L’interface a rencontré un problème. Vos données locales restent intactes.</p>
            <button className="btn primary" onClick={() => location.reload()}>Recharger LocalNet</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
