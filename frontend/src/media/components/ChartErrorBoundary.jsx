import React from 'react';

/**
 * ChartErrorBoundary — wraps every Recharts component.
 * Catches render-time errors and shows an inline fallback without crashing the page.
 */
export class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ChartErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mi-chart-error">
          <span className="mi-chart-error-icon">⚡</span>
          <p>Chart failed to render.</p>
          <button
            className="mi-chart-error-retry"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
