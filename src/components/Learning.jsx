import React, { useState, useCallback, useRef } from 'react';
import { Search, Loader, ChevronRight, Lightbulb, Target, Star, BookOpen } from 'lucide-react';
import { fetchLearn } from '../data/api';
import './Learning.css';

const LEVEL_CONFIG = {
  Beginner:     { color: '#22c55e', icon: '🌱' },
  Intermediate: { color: '#f59e0b', icon: '⚡' },
  Advanced:     { color: '#ef4444', icon: '🔥' },
  General:      { color: '#8b5cf6', icon: '📚' },
};

const TOPICS_BY_LEVEL = [
  {
    level: 'Beginner',
    topics: [
      'RSI', 'MACD', 'Moving Averages', 'Support & Resistance',
      'Risk Management', 'Dividends', 'Dollar-Cost Averaging',
      'ETFs & Index Funds', 'Market Cap', 'Market Cycles',
    ],
  },
  {
    level: 'Intermediate',
    topics: [
      'Bollinger Bands', 'Volume Analysis', 'Options', 'Short Selling',
      'Beta & Volatility', 'Sector Rotation', 'VIX',
      'Federal Reserve & Interest Rates', 'Market Psychology', 'IPOs',
    ],
  },
  {
    level: 'Advanced',
    topics: [
      'Fibonacci Retracements', 'Candlestick Patterns',
      'Fundamental Analysis', 'Portfolio Diversification', 'P/E Ratio',
    ],
  },
];

export default function Learning() {
  const [query, setQuery]       = useState('');
  const [activeChip, setActiveChip] = useState(null);
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState(null);
  const resultRef = useRef(null);

  const search = useCallback(async (q) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    const data = await fetchLearn(q.trim());
    if (data) {
      setResult(data);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } else {
      setError('Could not load explanation. Please try again.');
    }
    setLoading(false);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setActiveChip(null);
    search(query);
  };

  const handleChip = (topic) => {
    // Toggle: clicking the active chip collapses the result
    if (activeChip === topic) {
      setActiveChip(null);
      setResult(null);
      setError(null);
      setQuery('');
      return;
    }
    setActiveChip(topic);
    setQuery(topic);
    search(topic);
  };

  return (
    <div className="learn-page portfolio-container">
      <div className="portfolio-header">
        <h2>AI Trading Academy</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Ask anything about trading, markets, and investing.</p>
      </div>

      {/* Search bar */}
      <div className="learn-search-wrap glass-panel">
        <form className="learn-search-form" onSubmit={handleSubmit}>
          <Search size={20} className="learn-search-icon" />
          <input
            className="learn-search-input"
            type="text"
            placeholder='Ask anything... e.g. "What is RSI?" or "How do options work?"'
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button className="learn-search-btn" type="submit" disabled={loading || !query.trim()}>
            {loading ? <Loader size={16} className="learn-spin" /> : 'Ask'}
          </button>
        </form>
      </div>

      {/* Result panel */}
      {(loading || result || error) && (
        <div ref={resultRef} className="learn-result glass-panel">
          {loading && (
            <div className="learn-loading">
              <Loader size={24} className="learn-spin" />
              <span>Loading explanation…</span>
            </div>
          )}
          {error && <p className="learn-error">{error}</p>}
          {result && <LearnResult result={result} onRelated={handleChip} />}
        </div>
      )}

      {/* Topic library */}
      {TOPICS_BY_LEVEL.map(({ level, topics }) => {
        const cfg = LEVEL_CONFIG[level];
        return (
          <div key={level} className="learn-section glass-panel">
            <div className="learn-section-header">
              <BookOpen size={16} style={{ color: cfg.color }} />
              <span
                className="learn-level-badge"
                style={{ background: cfg.color + '22', color: cfg.color, borderColor: cfg.color + '55' }}
              >
                {cfg.icon} {level}
              </span>
            </div>
            <div className="learn-chips">
              {topics.map(t => (
                <button
                  key={t}
                  className={`learn-chip${activeChip === t ? ' active' : ''}`}
                  onClick={() => handleChip(t)}
                >
                  {t} <ChevronRight size={12} className={`learn-chip-arrow${activeChip === t ? ' open' : ''}`} />
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LearnResult({ result, onRelated }) {
  const cfg = LEVEL_CONFIG[result.level] || LEVEL_CONFIG.General;
  return (
    <div className="learn-result-inner">
      <div className="learn-result-head">
        <span className="learn-result-emoji">{result.emoji}</span>
        <div>
          <h2 className="learn-result-title">{result.title}</h2>
          <span
            className="learn-level-badge"
            style={{ background: cfg.color + '22', color: cfg.color, borderColor: cfg.color + '55' }}
          >
            {cfg.icon} {result.level}
          </span>
        </div>
      </div>

      <p className="learn-tldr">{result.tldr}</p>

      <div className="learn-body">
        {result.body.map((para, i) => <p key={i}>{para}</p>)}
      </div>

      {result.keyPoints?.length > 0 && (
        <div className="learn-key-points">
          <div className="learn-kp-header">
            <Target size={15} /> Key Points
          </div>
          <ul>
            {result.keyPoints.map((kp, i) => <li key={i}>{kp}</li>)}
          </ul>
        </div>
      )}

      {result.tips?.length > 0 && (
        <div className="learn-tip">
          <Lightbulb size={16} />
          <span><strong>Pro Tip:</strong> {result.tips[0]}</span>
        </div>
      )}

      {result.related?.length > 0 && (
        <div className="learn-related">
          <Star size={13} />
          <span>Related:</span>
          {result.related.map(r => (
            <button key={r} className="learn-related-chip" onClick={() => onRelated(r)}>
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
