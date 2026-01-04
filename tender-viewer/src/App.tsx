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
import Navbar from './components/Navbar';
import ContractList from './components/ContractList';
import TenderPage from './components/TenderPage';
import ContractPage from './components/ContractPage';

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <div>
          <header className="header">
            <div>
              <h1>Contract Explorer for the City of Portland, Oregon</h1>
              <p style={{ color: 'var(--text-secondary)' }}>An experimental website using Portland, Oregon's Open Contracting Data Standard (OCDS) compliant contracting dataset, openprocurement.api and this vibe coded front-end application.</p>
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
