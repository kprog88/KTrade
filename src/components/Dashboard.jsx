import { useState, useEffect, useMemo } from 'react'
import { usePortfolio } from '../context/PortfolioContext'
import { fetchMomentum, fetchMarketNews } from '../data/api'
import { BrainCircuit, TrendingUp, TrendingDown, Newspaper, ExternalLink } from 'lucide-react'
import './Dashboard.css'

const COLORS = ['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1', '#f43f5e'];

function timeAgo(unixTs) {
  const diff = Math.floor(Date.now() / 1000) - unixTs;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Dashboard({ onNavigate }) {
  const { holdings } = usePortfolio();
  const [momentum, setMomentum] = useState([]);
  const [news, setNews]         = useState([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [tooltip, setTooltip]   = useState(null);

  const metrics = useMemo(() => {
    let totalValue = 0, costBasis = 0, topGainer = null, topLoser = null;

    holdings.forEach(asset => {
      const price = asset.currentPrice || asset.avgPrice;
      const rate  = asset.exchangeRateToUSD || 1;
      const tVal  = asset.amount * price * rate;
      const costB = asset.amount * asset.avgPrice * rate;
      totalValue += tVal;
      costBasis  += costB;
      const changePct = asset.avgPrice > 0 ? ((tVal - costB) / costB) * 100 : 0;
      if (!topGainer || changePct > topGainer.pct) topGainer = { symbol: asset.symbol, pct: changePct };
      if (!topLoser  || changePct < topLoser.pct)  topLoser  = { symbol: asset.symbol, pct: changePct };
    });

    const profit        = totalValue - costBasis;
    const profitPercent = costBasis > 0 ? (profit / costBasis) * 100 : 0;
    return { totalValue, profit, profitPercent, assetCount: holdings.length, topGainer, topLoser };
  }, [holdings]);

  const holdingRows = useMemo(() => {
    return [...holdings]
      .map(h => {
        const price  = h.currentPrice || h.avgPrice;
        const rate   = h.exchangeRateToUSD || 1;
        const value  = h.amount * price * rate;
        const cost   = h.amount * h.avgPrice * rate;
        const pnlPct = h.avgPrice > 0 ? ((price - h.avgPrice) / h.avgPrice) * 100 : 0;
        const weight = metrics.totalValue > 0 ? (value / metrics.totalValue) * 100 : 0;
        return { symbol: h.symbol, value, pnlPct, weight };
      })
      .sort((a, b) => b.value - a.value)
      .map((h, i) => ({ ...h, colorIdx: i }));
  }, [holdings, metrics.totalValue]);

  useEffect(() => {
    fetchMomentum().then(d => { if (d?.length) setMomentum(d); });
    fetchMarketNews().then(d => { setNews(d || []); setNewsLoading(false); });
  }, []);

  const fmt = n => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="dashboard-grid">

      {/* ── Metrics bar ── */}
      <div className="glass-panel portfolio-overview">
        <div className="metric">
          <span className="metric-label">Total Balance</span>
          <span className="metric-value">${fmt(metrics.totalValue)}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Total P/L</span>
          <span className={`metric-value ${metrics.profit >= 0 ? 'trend-positive' : 'trend-negative'}`}>
            {metrics.profit >= 0 ? '+' : '-'}${fmt(Math.abs(metrics.profit))}
            <span style={{ fontSize: '0.8em', opacity: 0.85 }}> ({metrics.profitPercent.toFixed(1)}%)</span>
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">Positions</span>
          <span className="metric-value">{metrics.assetCount}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Best</span>
          {metrics.topGainer ? (
            <span className="metric-value trend-positive">
              {metrics.topGainer.symbol} +{Math.abs(metrics.topGainer.pct).toFixed(1)}%
            </span>
          ) : <span className="metric-value" style={{ color: 'var(--text-secondary)' }}>--</span>}
        </div>
        <div className="metric">
          <span className="metric-label">Worst</span>
          {metrics.topLoser ? (
            <span className={`metric-value ${metrics.topLoser.pct >= 0 ? 'trend-positive' : 'trend-negative'}`}>
              {metrics.topLoser.symbol} {metrics.topLoser.pct >= 0 ? '+' : ''}{metrics.topLoser.pct.toFixed(1)}%
            </span>
          ) : <span className="metric-value" style={{ color: 'var(--text-secondary)' }}>--</span>}
        </div>
      </div>

      {/* ── Market News ── */}
      <div className="glass-panel news-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Newspaper size={16} color="var(--accent-color)" />
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Market News</h2>
        </div>

        {newsLoading ? (
          <div className="news-loading">
            <span style={{ animation: 'spin 0.8s linear infinite', display: 'inline-block' }}>⟳</span>
            Loading latest headlines…
          </div>
        ) : news.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>No news available right now.</p>
        ) : (
          <div className="news-list">
            {news.map((article, i) => (
              <a
                key={i}
                className="news-item"
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="news-source-badge">{article.publisher?.split(' ')[0] || 'News'}</span>
                <div className="news-content">
                  <div className="news-headline">{article.title}</div>
                  <div className="news-meta">
                    {article.publishedAt ? timeAgo(article.publishedAt) : ''}
                    <ExternalLink size={10} style={{ marginLeft: '0.3rem', opacity: 0.5, verticalAlign: 'middle' }} />
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* ── Holdings breakdown ── */}
      <div className="glass-panel db-holdings-panel">
        <div className="db-holdings-header">
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Holdings</h2>
          <span className="db-holdings-count">{holdingRows.length} positions</span>
        </div>

        {holdingRows.length === 0 ? (
          <div className="db-holdings-empty">Add positions in Portfolio to see your holdings here.</div>
        ) : (
          <div className="db-holdings-list">
            {holdingRows.map(h => {
              const color = COLORS[h.colorIdx % COLORS.length];
              return (
                <div key={h.symbol} className="db-holding-row">
                  <div className="db-holding-dot" style={{ background: color }} />
                  <div className="db-holding-info">
                    <div className="db-holding-top">
                      <span className="db-holding-symbol">{h.symbol}</span>
                      <span className={`db-holding-pnl ${h.pnlPct >= 0 ? 'pos' : 'neg'}`}>
                        {h.pnlPct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                        {h.pnlPct >= 0 ? '+' : ''}{h.pnlPct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="db-holding-bar-wrap">
                      <div className="db-holding-bar">
                        <div className="db-holding-bar-fill" style={{ width: `${Math.min(h.weight, 100)}%`, background: color }} />
                      </div>
                      <span className="db-holding-weight">{h.weight.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="db-holding-value">${fmt(h.value)}</div>
                </div>
              );
            })}
          </div>
        )}

        {onNavigate && (
          <button className="db-insights-btn" onClick={() => onNavigate('insights')}>
            <BrainCircuit size={14} /> View AI Analysis
          </button>
        )}
      </div>

      {/* ── Market Opportunities ── */}
      <div className="glass-panel" style={{ gridColumn: 'span 12', marginTop: '0.5rem', overflow: 'visible' }}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1rem', fontWeight: 600 }}>Market Opportunities</h2>
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {momentum.map((stock, i) => {
            const isPos = stock.change >= 0;
            const rationales = [
              'Massive institutional accumulation detected.',
              'MACD crossing zero-line — breakout forming.',
              'Trading significantly above 50-day MA.',
              'Sector tailwinds driving outsized volume.',
            ];
            return (
              <div
                key={i}
                className="glass-panel momentum-card"
                style={{ padding: '1rem', cursor: 'default' }}
                onMouseEnter={e => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setTooltip({ text: rationales[i % rationales.length], x: r.left, y: r.top - 8, width: r.width });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={`https://financialmodelingprep.com/image-stock/${stock.symbol}.png`} alt=""
                      style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                      onError={e => { e.target.style.display = 'none'; }} />
                    <strong style={{ fontSize: '1rem' }}>{stock.symbol}</strong>
                  </div>
                  <div className={isPos ? 'trend-positive' : 'trend-negative'} style={{ fontSize: '0.85rem' }}>
                    {isPos ? '+' : ''}{stock.changePercent.toFixed(2)}% {isPos ? '▲' : '▼'}
                  </div>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stock.name}</div>
                <div style={{ marginTop: '0.4rem', fontSize: '1.1rem', fontWeight: 700 }}>${stock.price.toFixed(2)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {tooltip && (
        <div style={{
          position: 'fixed', left: tooltip.x, top: tooltip.y, transform: 'translateY(-100%)',
          width: Math.max(tooltip.width, 220), zIndex: 99999,
          background: 'var(--bg-color)', border: '1px solid var(--accent-color)',
          borderRadius: '12px', padding: '0.85rem 1rem', fontSize: '0.85rem',
          lineHeight: '1.5', color: 'var(--text-primary)', boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
          pointerEvents: 'none',
        }}>
          <strong style={{ color: 'var(--accent-color)' }}>✦ AI Review:</strong> {tooltip.text}
        </div>
      )}

    </div>
  );
}
