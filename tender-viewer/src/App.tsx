import React from 'react';
import './App.css'
import TenderList from './components/TenderList'

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'red' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.message}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <div>
        <header className="header">
          <div>
            <h1>Contract Explorer for the City of Portland, Oregon</h1>
            <p style={{ color: 'var(--text-secondary)' }}>An experimental website using Portland, Oregon's Open Contracting Data Standard (OCDS) compliant contracting dataset, openprocurement.api and this vibe coded front-end application.</p>
          </div>
          <div>
            {/* User profile or settings could go here */}
            <div style={{ width: '40px', height: '40px', background: '#333', borderRadius: '50%' }}></div>
          </div>
        </header>

        <main>
          <TenderList />
        </main>
      </div >
    </ErrorBoundary >
  )
}

export default App
