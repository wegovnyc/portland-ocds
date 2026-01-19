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

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// Navbar and ContractList imports removed - not currently used


function App() {
  return (
    <Router>
      <ErrorBoundary>
        <div>
          <header className="header">
            <div>
              <h1>Contract Explorer for the City of Portland, Oregon</h1>
              <p style={{ color: 'var(--text-secondary)' }}>This website is built using the City of Portland Open Contracting Data Standard (OCDS) <a href="https://www.portland.gov/business-opportunities/ocds" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>dataset</a>, an <a href="https://api-docs.openprocurement.org/en/latest/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>openprocurement.api</a> backend and a custom gen-AI-built front end. It was created by <a href="https://wegov.nyc" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>WeGov.NYC</a> to demonstrate an interface for OCDS data. We've also put together an MCP server so you can connect this data to an AI assistant by following <a href="https://wegovnyc.github.io/portland-ocds/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>these instructions</a>.</p>
            </div>
            <div>
              <div style={{ width: '40px', height: '40px', background: '#333', borderRadius: '50%' }}></div>
            </div>
          </header>

          <main>
            {/* <Navbar /> */}
            <Routes>
              <Route path="/" element={<TenderList />} />
              <Route path="/tenders" element={<TenderList />} />
              <Route path="/tenders/:id" element={<TenderList />} />
              {/* <Route path="/contracts" element={<ContractList />} />
              <Route path="/contracts/:id" element={<ContractList />} /> */}
            </Routes>
          </main>
        </div >
      </ErrorBoundary >
    </Router>
  )
}

export default App
