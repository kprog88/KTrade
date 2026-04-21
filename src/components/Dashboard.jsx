import { useState, useEffect, useMemo } from 'react'
import { PieChart, Pie, Cell, Sector } from 'recharts'
import { usePortfolio } from '../context/PortfolioContext'
import { fetchMomentum, fetchWorldIndices, fetchMarketNews } from '../data/api'
import { BrainCircuit, TrendingUp, TrendingDown, Globe, Newspaper, ExternalLink } from 'lucide-react'
import './Dashboard.css'

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#f43f5e', '#14b8a6'];

// ── Mini SVG sparkline ──────────────────────────────────────────────────────
function Sparkline({ data, positive }) {
  if (!data || data.length < 2) return <div style={{ width: 72, height: 28 }} />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 72, H = 28;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - 2 - ((v - min) / range) * (H - 4)}`)
    .join(' ');
  const color = positive ? 'var(--success-color)' : 'var(--danger-color)';
  return (
    <svg width={W} height={H} style={{ display: 'block', flexShrink: 0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
    </svg>
  );
}

// ── Relative time ────────────────────────────────────────────────────────────
function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ── Main component ───────────────────────────────────────────────────────────
export default function Dashboard({ onNavigate, mobile }) {
  const { holdings } = usePortfolio();
  const [momentum, setMomentum]           = useState([]);
  const [worldIndices, setWorldIndices]   = useState([]);
  const [news, setNews]                   = useState([]);
  const [activePieIndex, setActivePieIndex] = useState(null);

  useEffect(() => {
    fetchMomentum().then(d    => { if (d?.length) setMomentum(d); });
    fetchWorldIndices().then(d => { if (d?.length) setWorldIndices(d); });
    fetchMarketNews().then(d  => { if (d?.length) setNews(d.slice(0, 3)); });
  }, []);

  // Portfolio metrics
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
    const pieData       = [...holdings]
      .map(h => {
        const price = h.currentPrice || h.avgPrice;
        const rate  = h.exchangeRateToUSD || 1;
        return { name: h.symbol, value: h.amount * price * rate };
      })
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
    return { totalValue, costBasis, profit, profitPercent, assetCount: holdings.length, topGainer, topLoser, pieData };
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

  const fmt = n => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtIdx = n => n >= 10000
    ? n.toLocaleString(undefined, { maximumFractionDigits: 0 })
    : n.toLocaleString(undefined, { maximumFractionDigits: 2 });

  const renderActiveSlice = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius - 4} outerRadius={outerRadius + 12}
          startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={1} />
        <text x={cx} y={cy - 10} textAnchor="middle" fill="#fff" fontSize={14} fontWeight={700}>{payload.name}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill={fill} fontSize={12} fontWeight={600}>
          {(percent * 100).toFixed(1)}%
        </text>
        <text x={cx} y={cy + 27} textAnchor="middle" fill="var(--text-secondary)" fontSize={11}>
          ${fmt(payload.value)}
        </text>
      </g>
    );
  };

  const fullCol    = { gridColumn: '1 / -1', minWidth: 0 };
  const gridStyle  = mobile ? { gridTemplateColumns: '1fr', gap: '0.85rem' } : {};
  const metricValS = mobile ? { fontSize: '1.05rem', fontWeight: 600 } : {};

  return (
    <div className="dashboard-grid" style={gridStyle}>

      {/* ── 1. Portfolio metrics ──────────────────────────────── */}
      <div className="glass-panel portfolio-overview" style={{ ...fullCol }}>
        <div className="metric">
          <span className="metric-label">Total Balance</span>
          <span className="metric-value" style={metricValS}>${fmt(metrics.totalValue)}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Total P/L</span>
          <span className={`metric-value ${metrics.profit >= 0 ? 'pnl-pos' : 'pnl-neg'}`} style={metricValS}>
            {metrics.profit >= 0 ? '+' : '-'}${fmt(Math.abs(metrics.profit))}
            <span className="metric-sub"> ({metrics.profitPercent >= 0 ? '+' : ''}{metrics.profitPercent.toFixed(1)}%)</span>
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">Positions</span>
          <span className="metric-value" style={metricValS}>{metrics.assetCount}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Best Performer</span>
          {metrics.topGainer
            ? <span className="metric-value pnl-pos" style={metricValS}>{metrics.topGainer.symbol} +{Math.abs(metrics.topGainer.pct).toFixed(1)}%</span>
            : <span className="metric-value" style={{ ...metricValS, color: 'var(--text-secondary)' }}>--</span>}
        </div>
        {!mobile && (
          <div className="metric">
            <span className="metric-label">Worst Performer</span>
            {metrics.topLoser
              ? <span className={`metric-value ${metrics.topLoser.pct >= 0 ? 'pnl-pos' : 'pnl-neg'}`}>
                  {metrics.topLoser.symbol} {metrics.topLoser.pct >= 0 ? '+' : ''}{metrics.topLoser.pct.toFixed(1)}%
                </span>
              : <span className="metric-value" style={{ color: 'var(--text-secondary)' }}>--</span>}
          </div>
        )}
      </div>

      {/* ── 2. Global Markets ─────────────────────────────────── */}
      <div className="glass-panel" style={{ ...fullCol }}>
        <div className="db-section-hdr">
          <Globe size={14} strokeWidth={2} />
          <h2 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            Global Markets
          </h2>
        </div>
        <div className="db-indices-strip">
          {worldIndices.length === 0
            ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="db-index-card db-index-skeleton" />)
            : worldIndices.map(idx => {
                const pos = idx.changePercent >= 0;
                return (
                  <div key={idx.symbol} className="db-index-card">
                    <div className="db-index-top">
                      <span className="db-index-region">{idx.region}</span>
                      <span className={`db-index-chg ${pos ? 'pos' : 'neg'}`}>
                        {pos ? '+' : ''}{idx.changePercent?.toFixed(2)}%
                      </span>
                    </div>
                    <div className="db-index-name">{idx.name}</div>
                    <div className="db-index-price">{fmtIdx(idx.price ?? 0)}</div>
                    <Sparkline data={idx.sparkline} positive={pos} />
                  </div>
                );
              })
          }
        </div>
      </div>

      {/* ── 3a. Holdings + Donut ──────────────────────────────── */}
      <div className="glass-panel db-holdings-panel" style={mobile ? fullCol : { minWidth: 0 }}>
        <div className="db-holdings-header">
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Holdings</h2>
          <span className="db-holdings-count">{holdingRows.length} positions</span>
        </div>

        {holdingRows.length === 0 ? (
          <div className="db-holdings-empty">Add positions in Portfolio to see your holdings here.</div>
        ) : (
          <>
            {/* Allocation donut — desktop only */}
            {!mobile && metrics.pieData.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <PieChart width={200} height={160}>
                  <Pie
                    data={metrics.pieData}
                    cx={100} cy={80}
                    innerRadius={48} outerRadius={70}
                    dataKey="value"
                    stroke="none"
                    paddingAngle={2}
                    activeIndex={activePieIndex}
                    activeShape={renderActiveSlice}
                    onMouseEnter={(_, i) => setActivePieIndex(i)}
                    onMouseLeave={() => setActivePieIndex(null)}
                  >
                    {metrics.pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]}
                        opacity={activePieIndex === null || activePieIndex === i ? 1 : 0.4} />
                    ))}
                  </Pie>
                </PieChart>
              </div>
            )}

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
          </>
        )}

        {onNavigate && (
          <button className="db-insights-btn" onClick={() => onNavigate('insights')}>
            <BrainCircuit size={14} /> View AI Analysis
          </button>
        )}
      </div>

      {/* ── 3b. Market News ──────────────────────────────────── */}
      <div className="glass-panel db-news-panel" style={mobile ? fullCol : { minWidth: 0 }}>
        <div className="db-section-hdr">
          <Newspaper size={14} strokeWidth={2} />
          <h2 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
            Market News
          </h2>
        </div>

        {news.length === 0 ? (
          <div className="db-news-skeleton-wrap">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="db-news-skeleton" />)}
          </div>
        ) : (
          <div className="db-news-list">
            {news.map((item, i) => (
              <a key={i} href={item.link} target="_blank" rel="noreferrer" className="db-news-item">
                <div className="db-news-index">{String(i + 1).padStart(2, '0')}</div>
                <div className="db-news-body">
                  <div className="db-news-title">{item.title}</div>
                  <div className="db-news-meta">
                    <span className="db-news-src">{item.publisher}</span>
                    <span className="db-news-time">{timeAgo(item.publishedAt)}</span>
                  </div>
                </div>
                <ExternalLink size={13} className="db-news-ext" />
              </a>
            ))}
          </div>
        )}

        {/* Today's movers strip */}
        {momentum.length > 0 && (
          <>
            <div className="db-section-hdr" style={{ marginTop: '1.25rem' }}>
              <TrendingUp size={14} strokeWidth={2} />
              <h2 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)' }}>
                Today's Movers
              </h2>
            </div>
            <div className="db-movers-list">
              {momentum.slice(0, 5).map((s, i) => {
                const pos = s.changePercent >= 0;
                return (
                  <div key={i} className="db-mover-row">
                    <img
                      src={`https://financialmodelingprep.com/image-stock/${s.symbol}.png`}
                      alt=""
                      className="db-mover-logo"
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                    <span className="db-mover-sym">{s.symbol}</span>
                    <span className="db-mover-price">${s.price?.toFixed(2)}</span>
                    <span className={`db-mover-chg ${pos ? 'pos' : 'neg'}`}>
                      {pos ? '+' : ''}{s.changePercent?.toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
