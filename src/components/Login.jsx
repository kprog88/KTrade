import React from 'react';
import { auth, googleProvider } from '../firebase';
import { Activity } from 'lucide-react';

export default function Login() {
  const handleLogin = async () => {
    try {
      await auth.signInWithPopup(googleProvider);
    } catch (e) {
      console.error("Firebase Auth Error:", e);
      alert(`Login failed: ${e.message || "Unknown error occurred"}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-color)', color: 'var(--text-primary)' }}>
      <div className="glass-panel" style={{ padding: '3rem', width: '100%', maxWidth: '400px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
           <div style={{ display: 'inline-flex', padding: '1rem', background: 'rgba(79, 70, 229, 0.1)', borderRadius: '50%' }}>
             <Activity size={48} color="var(--accent-color)" />
           </div>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
             <h1 style={{ fontSize: '2.5rem', margin: 0, letterSpacing: '-0.05em' }}>KTrade</h1>
             <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>your ai trading assistant</span>
           </div>
        </div>

        <button 
          onClick={handleLogin}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem',
            width: '100%', padding: '1rem', background: 'var(--panel-bg)', 
            border: '1px solid var(--panel-border)', borderRadius: '12px',
            fontSize: '1rem', fontWeight: 'bold', color: 'var(--text-primary)',
            cursor: 'pointer', transition: 'all 0.2s ease', 
            boxShadow: 'var(--glass-shadow)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--glass-shadow)'; }}
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" style={{ width: '20px', height: '20px' }} />
          Sign in with Google
        </button>
        
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
          Secure Authentication handled directly by Google.
        </p>

      </div>
    </div>
  );
}
