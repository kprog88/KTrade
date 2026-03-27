import { useState, useEffect } from 'react'
import './App.css'
import Dashboard from './components/Dashboard'
import Portfolio from './components/Portfolio'
import Watchlist from './components/Watchlist'
import Learning from './components/Learning'
import Login from './components/Login'
import { PortfolioProvider } from './context/PortfolioContext'
import { useAuth } from './context/AuthContext'
import { auth } from './firebase'
import { Activity, BookOpen } from 'lucide-react'

function App() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  if (!currentUser) {
    return <Login />;
  }

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="logo" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <Activity size={28} color="var(--accent-color)" />
             <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>KTrade</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '400', letterSpacing: '0.05em', marginLeft: '2.25rem' }}>your ai trading assistant</div>
        </div>
        <nav className="nav-links">
          <a 
            href="#" 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}
          >
            <span style={{ fontSize: '1.2rem' }}>📊</span>
            <span>Dashboard</span>
          </a>
          <a 
            href="#" 
            className={`nav-item ${activeTab === 'portfolio' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('portfolio'); }}
          >
            <span style={{ fontSize: '1.2rem' }}>💼</span>
            <span>Portfolio</span>
          </a>
          <a 
            href="#" 
            className={`nav-item ${activeTab === 'watchlist' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('watchlist'); }}
          >
            <span style={{ fontSize: '1.2rem' }}>👁️</span>
            <span>Watchlist</span>
          </a>
          <a 
            href="#" 
            className={`nav-item ${activeTab === 'learning' ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setActiveTab('learning'); }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--panel-border)' }}
          >
            <BookOpen size={18} />
            <span>Academy</span>
          </a>
        </nav>
      </aside>

      <main className="main-content">
        <header className="header">
          <h1>Overview</h1>
          <div className="header-user">
            <button 
              onClick={toggleTheme} 
              className="theme-toggle-btn"
              style={{
                marginRight: '1rem',
                fontSize: '1.25rem',
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)',
                cursor: 'pointer'
              }}
              title="Toggle Theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '1rem' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{currentUser.displayName || 'KTrade User'}</span>
              <button onClick={() => auth.signOut()} style={{ color: 'var(--danger-color)', fontSize: '0.75rem', marginTop: '0.2rem' }}>Sign Out</button>
            </div>
            {currentUser.photoURL ? (
              <img src={currentUser.photoURL} alt="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--accent-color)' }} />
            ) : (
              <div className="avatar"></div>
            )}
          </div>
        </header>

        <PortfolioProvider>
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'portfolio' && <Portfolio />}
          {activeTab === 'watchlist' && <Watchlist />}
          {activeTab === 'learning' && <Learning />}
        </PortfolioProvider>

        <footer style={{ textAlign: 'center', padding: '2rem 1rem 1rem', marginTop: 'auto', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          &copy; {new Date().getFullYear()} All rights reserved to Alex Katzevich
        </footer>
      </main>
    </div>
  )
}

export default App
