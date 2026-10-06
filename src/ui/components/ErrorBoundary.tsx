import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/** Catches render errors so one broken page never blanks the whole app. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled UI error:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" style={{ padding: 24, maxWidth: 720, margin: '0 auto' }}>
        <h2>Something went wrong</h2>
        <p>
          The page failed to render. Your test progress is saved automatically; you can go back to
          the <a href="#/">dashboard</a> and resume.
        </p>
        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, opacity: 0.8 }}>
          {this.state.error.message}
        </pre>
        <button type="button" onClick={() => this.setState({ error: null })}>
          Try again
        </button>
      </div>
    );
  }
}
