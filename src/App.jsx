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

  // screen.width = physical device pixels. Samsung desktop mode fakes
  // window.innerWidth (fires resize to ~1280px) but cannot change screen.width.
  // We read this once at mount and never re-read on resize — screen size
  // doesn't change mid-session, only Samsung's fake viewport does.
  const isMobile = screen.width <= 1024;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  if (!currentUser) {
    return <Login />;
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard',  mobileLabel: 'Home',     icon: <LayoutDashboard size={18} />, title: 'Overview' },
    { id: 'portfolio', label: 'Portfolio',  mobileLabel: 'Portfolio', icon: <Briefcase size={18} />,      title: 'Portfolio' },
    { id: 'insights',  label: 'Insights',   mobileLabel: 'Insights',  icon: <BrainCircuit size={18} />,   title: 'AI Insights' },
    { id: 'analysis',  label: 'Analysis',   mobileLabel: 'Analysis',  icon: <BarChart2 size={18} />,      title: 'Smart Analysis' },
    { id: 'watchlist', label: 'Watchlist',  mobileLabel: 'Watch',     icon: <Eye size={18} />,            title: 'Watchlist' },
    { id: 'learning',  label: 'Academy',    mobileLabel: 'Learn',     icon: <BookOpen size={18} />,       title: 'Academy' },
  ];

  const currentNav = navItems.find(n => n.id === activeTab);

  return (
    <div className="app-container">
      {/* Desktop sidebar — hidden on mobile */}
      {!isMobile && (
        <aside className="sidebar">
          <div className="logo">
            <div className="logo-row">
              <Activity size={26} color="var(--accent-color)" />
              <span className="logo-name">KTrade</span>
            </div>
            <div className="logo-tagline">your ai trading assistant</div>
          </div>
          <nav className="nav-links">
            {navItems.map(item => (
              <a
                key={item.id}
                href="#"
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={(e) => { e.preventDefault(); setActiveTab(item.id); setLegalPage(null); }}
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
            {isMobile && <Activity size={20} color="var(--indigo)" />}
            <h1 style={isMobile ? { fontSize: '1.1rem' } : {}}>
              {isMobile ? 'KTrade' : (currentNav?.title || 'Overview')}
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
            {activeTab === 'dashboard' && <Dashboard onNavigate={setActiveTab} mobile={isMobile} />}
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
              onClick={() => { setActiveTab(item.id); setLegalPage(null); }}
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
