import { useState, useEffect } from 'react'
import './App.css'
import Dashboard from './components/Dashboard'
import Portfolio from './components/Portfolio'
import Watchlist from './components/Watchlist'
import Learning from './components/Learning'
import TechnicalAnalysis from './components/TechnicalAnalysis'
import Insights from './components/Insights'
import Legal from './components/Legal'
import Login from './components/Login'
import { PortfolioProvider } from './context/PortfolioContext'
import { useAuth } from './context/AuthContext'
import { auth } from './firebase'
import { Activity, BookOpen, LayoutDashboard, Briefcase, Eye, BarChart2, BrainCircuit } from 'lucide-react'
import './components/Legal.css'

function App() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [legalPage, setLegalPage] = useState(null); // 'terms' | 'privacy' | 'risk'
  const [theme, setTheme] = useState('dark');

  // Use window.innerWidth (CSS pixels) — respects viewport meta tag on all devices
  const checkMobile = () => window.innerWidth <= 768;

  const [isMobile, setIsMobile] = useState(checkMobile);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleResize = () => setIsMobile(checkMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  if (!currentUser) {
    return <Login />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', mobileLabel: 'Home',     icon: <LayoutDashboard size={20} /> },
    { id: 'portfolio', label: 'Portfolio',  mobileLabel: 'Portfolio', icon: <Briefcase size={20} /> },
    { id: 'insights',  label: 'Insights',   mobileLabel: 'Insights',  icon: <BrainCircuit size={20} /> },
    { id: 'analysis',  label: 'Analysis',   mobileLabel: 'Analysis',  icon: <BarChart2 size={20} /> },
    { id: 'watchlist', label: 'Watchlist',  mobileLabel: 'Watch',     icon: <Eye size={20} /> },
    { id: 'learning',  label: 'Academy',    mobileLabel: 'Learn',     icon: <BookOpen size={20} /> },
  ];

  return (
    <div className="app-container">
      {/* Desktop sidebar — hidden on mobile */}
      {!isMobile && (
        <aside className="sidebar">
          <div className="logo" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <Activity size={28} color="var(--accent-color)" />
               <span style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>KTrade</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '400', letterSpacing: '0.05em', marginLeft: '2.25rem' }}>your ai trading assistant</div>
          </div>
          <nav className="nav-links">
            {navItems.map(item => (
              <a
                key={item.id}
                href="#"
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); setActiveTab(item.id); }}
                style={item.id === 'learning' ? { display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--panel-border)' } : { display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                {item.icon}
                {item.label}
              </a>
            ))}
          </nav>
        </aside>
      )}

      <main className="main-content" style={isMobile ? { paddingBottom: '80px', maxWidth: '100%', width: '100%', padding: '1rem', paddingBottom: '80px' } : {}}>
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isMobile && <Activity size={22} color="var(--accent-color)" />}
            <h1 style={isMobile ? { fontSize: '1.2rem' } : {}}>
              {isMobile ? 'KTrade' : 'Overview'}
            </h1>
          </div>
          <div className="header-user">
            <button
              onClick={toggleTheme}
              style={{
                fontSize: '1.1rem',
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
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
            {!isMobile && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{currentUser.displayName || 'KTrade User'}</span>
                <button onClick={() => auth.signOut()} style={{ color: 'var(--danger-color)', fontSize: '0.75rem', marginTop: '0.2rem' }}>Sign Out</button>
              </div>
            )}
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt="avatar"
                style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid var(--accent-color)', cursor: 'pointer' }}
                onClick={isMobile ? () => auth.signOut() : undefined}
                title={isMobile ? 'Tap to sign out' : ''}
              />
            ) : (
              <div className="avatar" onClick={isMobile ? () => auth.signOut() : undefined} style={{ cursor: isMobile ? 'pointer' : 'default' }}></div>
            )}
          </div>
        </header>

        {legalPage ? (
          <Legal page={legalPage} onBack={() => setLegalPage(null)} />
        ) : (
          <PortfolioProvider>
            {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} />}
            {activeTab === 'portfolio' && <Portfolio />}
            {activeTab === 'insights'  && <Insights />}
            {activeTab === 'analysis'  && <TechnicalAnalysis />}
            {activeTab === 'watchlist' && <Watchlist />}
            {activeTab === 'learning'  && <Learning />}
          </PortfolioProvider>
        )}

        <footer className="app-footer">
          <span>&copy; {new Date().getFullYear()} KTrade — Alex Katzevich</span>
          <div className="app-footer-links">
            <button className="app-footer-link" onClick={() => setLegalPage('terms')}>Terms of Service</button>
            <span className="app-footer-sep">·</span>
            <button className="app-footer-link" onClick={() => setLegalPage('privacy')}>Privacy Policy</button>
            <span className="app-footer-sep">·</span>
            <button className="app-footer-link" onClick={() => setLegalPage('risk')}>Risk Disclaimer</button>
          </div>
        </footer>
      </main>

      {/* Mobile bottom nav bar — only shown on mobile */}
      {isMobile && (
        <nav style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          height: '68px',
          background: 'var(--bg-color)',
          borderTop: '1px solid var(--panel-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          zIndex: 1000,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                padding: '0.4rem 0.5rem',
                background: 'none',
                border: 'none',
                color: activeTab === item.id ? 'var(--accent-color)' : 'var(--text-secondary)',
                fontSize: '0.6rem',
                fontWeight: activeTab === item.id ? '600' : '400',
                cursor: 'pointer',
                transition: 'color 0.2s ease',
                borderTop: activeTab === item.id ? '2px solid var(--accent-color)' : '2px solid transparent',
                marginTop: '-1px',
                flex: 1,
                minWidth: 0,
              }}
            >
              {item.icon}
              {item.mobileLabel || item.label}
            </button>
          ))}
        </nav>
      )}
    </div>
  )
}

export default App
