import { Component, type ReactNode } from 'react'

/** Shows a recoverable message instead of a blank black screen when a page throws. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="page" style={{ paddingTop: 48, textAlign: 'center' }}>
        <h2>مشکلی پیش آمد</h2>
        <p className="muted small" dir="ltr">{this.state.error.message}</p>
        <button className="btn btn-primary" onClick={() => { this.setState({ error: null }); location.assign('/') }}>
          بازگشت به خانه
        </button>
      </div>
    )
  }
}
