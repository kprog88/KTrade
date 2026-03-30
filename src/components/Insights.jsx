import { useState, useEffect, useRef } from 'react';
import { RefreshCw, ChevronDown, TrendingUp, TrendingDown, Minus, AlertTriangle, Lightbulb, Activity } from 'lucide-react';
import { usePortfolio } from '../context/PortfolioContext';
import { fetchAIInsights } from '../data/api';
import './Insights.css';

const ACTION_CONFIG = {
  ADD:  { color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.25)',  icon: <TrendingUp  size={13} />, label: 'ADD'  },
  HOLD: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.25)', icon: <Minus       size={13} />, label: 'HOLD' },
  TRIM: { color: '#f97316', bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)', icon: <TrendingDown size={13}/>, label: 'TRIM' },
  EXIT: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)',  icon: <TrendingDown size={13}/>, label: 'EXIT' },
};

function healthScore(actions) {
  if (!actions?.length) return 50;
  const scores = { ADD: 85, HOLD: 60, TRIM: 35, EXIT: 15 };
  const avg = actions.reduce((s, a) => s + (scores[a.action] ?? 50), 0) / actions.length;
  return Math.round(avg);
}

function HealthBar({ score }) {
  const color = score >= 70 ? '#22c55e' : score >= 45 ? '#f59e0b' : '#ef4444';
  const label = score >= 70 ? 'Strong' : score >= 45 ? 'Neutral' : 'Caution';
  return (
    <div className="ins-health">
      <div className="ins-health-bar">
        <div className="ins-health-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="ins-health-label" style={{ color }}>{label} ({score}/100)</span>
    </div>
  );
}

function StockRow({ action, rationale }) {
  const [open, setOpen] = useState(false);
  const cfg = ACTION_CONFIG[action.action] || ACTION_CONFIG.HOLD;
  return (
    <div className={`ins-stock-row${open ? ' open' : ''}`} style={{ borderColor: open ? cfg.color + '55' : '' }}>
      <button className="ins-stock-trigger" onClick={() => setOpen(o => !o)}>
        <span className="ins-action-badge" style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
          {cfg.icon} {cfg.label}
        </span>
        <span className="ins-stock-symbol">{action.symbol}</span>
        <ChevronDown size={16} className={`ins-chevron${open ? ' open' : ''}`} />
      </button>
      <div className="ins-stock-body">
        <div className="ins-stock-body-inner">
          <p>{action.rationale}</p>
        </div>
      </div>
    </div>
  );
}

export default function Insights() {
  const { holdings } = usePortfolio();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const hasFetched = useRef(false);

  const load = async () => {
    setLoading(true);
    setData(null);
    const result = await fetchAIInsights(holdings);
    if (result) {
      setData(result);
      setLastUpdated(new Date());
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      load();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const score = data ? healthScore(data.actions) : null;

  return (
    <div className="ins-page portfolio-container">
      <div className="portfolio-header">
        <h2>Portfolio Intelligence</h2>
        <p style={{ color: 'var(--text-secondary)' }}>AI-powered analysis of your holdings and market conditions.</p>
      </div>

      {/* Header card */}
      <div className="ins-header-card glass-panel">
        <div className="ins-header-top">
          <div className="ins-header-left">
            <Activity size={18} color="var(--accent-color)" />
            <span className="ins-header-title">Portfolio Health</span>
            {lastUpdated && (
              <span className="ins-updated">Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            )}
          </div>
          <button className="ins-refresh-btn" onClick={load} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'ins-spin' : ''} />
            {loading ? 'Analyzing…' : 'Refresh'}
          </button>
        </div>

        {loading && (
          <div className="ins-loading">
            <div className="ins-loading-icon">🤖</div>
            <div className="ins-loading-text">Claude AI is analyzing your portfolio…</div>
            <div className="ins-loading-sub">Reviewing market conditions, sector exposure, and individual positions</div>
          </div>
        )}

        {!loading && data && (
          <>
            {score !== null && <HealthBar score={score} />}
            <p className="ins-summary">{data.summary}</p>
          </>
        )}

        {!loading && !data && (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0' }}>
            Click Refresh to generate your AI analysis.
          </p>
        )}
      </div>

      {/* Stock-by-stock accordion */}
      {!loading && data?.actions?.length > 0 && (
        <div className="glass-panel">
          <div className="ins-section-label">Stock-by-Stock Recommendations</div>
          <div className="ins-stocks">
            {data.actions.map((a, i) => (
              <StockRow key={i} action={a} />
            ))}
          </div>
        </div>
      )}

      {/* Summary row — moves */}
      {!loading && data?.actions?.length > 0 && (
        <div className="glass-panel">
          <div className="ins-section-label">Recommended Moves Summary</div>
          <div className="ins-moves-grid">
            {['ADD', 'HOLD', 'TRIM', 'EXIT'].map(type => {
              const matches = data.actions.filter(a => a.action === type);
              if (!matches.length) return null;
              const cfg = ACTION_CONFIG[type];
              return (
                <div key={type} className="ins-move-card" style={{ borderColor: cfg.border, background: cfg.bg }}>
                  <span className="ins-move-type" style={{ color: cfg.color }}>{cfg.icon} {type}</span>
                  <div className="ins-move-symbols">
                    {matches.map(m => <span key={m.symbol} className="ins-move-symbol">{m.symbol}</span>)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Risk + Suggestion */}
      {!loading && data && (data.topRisk || data.suggestion) && (
        <div className="ins-bottom-grid">
          {data.topRisk && (
            <div className="glass-panel ins-risk-card">
              <div className="ins-card-label" style={{ color: '#ef4444' }}>
                <AlertTriangle size={14} /> Top Risk
              </div>
              <p>{data.topRisk}</p>
            </div>
          )}
          {data.suggestion && (
            <div className="glass-panel ins-suggest-card">
              <div className="ins-card-label" style={{ color: '#22c55e' }}>
                <Lightbulb size={14} /> Suggestion
              </div>
              <p>{data.suggestion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
