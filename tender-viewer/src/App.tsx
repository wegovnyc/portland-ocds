import './App.css'
import TenderList from './components/TenderList'

function App() {
  return (
    <div>
      <header className="header">
        <div>
          <h1>OpenContracting<span style={{ color: 'var(--primary-color)' }}>.</span> Viewer</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Live Sandbox Environment</p>
        </div>
        <div>
          {/* User profile or settings could go here */}
          <div style={{ width: '40px', height: '40px', background: '#333', borderRadius: '50%' }}></div>
        </div>
      </header>

      <main>
        <TenderList />
      </main>
    </div>
  )
}

export default App
