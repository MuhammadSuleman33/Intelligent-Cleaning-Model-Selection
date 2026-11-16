import { Component } from 'react'

/**
 * Catches render errors from children (e.g. Plotly) so the rest of the page still shows.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { err: null }
  }

  static getDerivedStateFromError(err) {
    return { err }
  }

  render() {
    if (this.state.err) {
      return (
        this.props.fallback ?? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {this.props.title ? <p className="font-semibold text-rose-200">{this.props.title}</p> : null}
            <p className="mt-1 text-rose-100/90">Something went wrong rendering this section.</p>
            {this.state.err?.message ? (
              <p className="mt-2 break-all font-mono text-xs text-rose-200/70">{this.state.err.message}</p>
            ) : null}
          </div>
        )
      )
    }
    return this.props.children
  }
}
