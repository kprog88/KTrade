import { useState, useEffect, useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend, Sector } from 'recharts'
import { usePortfolio } from '../context/PortfolioContext'
import { fetchMomentum } from '../data/api'
import { BrainCircuit, TrendingUp, TrendingDown } from 'lucide-react'
import './Dashboard.css'

const COLORS = ['#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1', '#f43f5e'];

export default function Dashboard({ onNavigate, isMobile }) {
  const { holdings } = usePortfolio();
  const [momentum, setMomentum]       = useState([]);
  const [activePieIndex, setActivePieIndex] = useState(0);
  const [tooltip, setTooltip]         = useState(null);

  const metrics = useMemo(() => {
    let totalValue = 0;
    let costBasis  = 0;
    let topGainer  = null;
    let topLoser   = null;
    const pieDataMap = [];

    holdings.forEach(asset => {
      const price = asset.currentPrice || asset.avgPrice;
      const rate  = asset.exchangeRateToUSD || 1;
      const tVal  = asset.amount * price * rate;
      const costB = asset.amount * asset.avgPrice * rate;

      totalValue += tVal;
      costBasis  += costB;
      pieDataMap.push({ name: asset.symbol, value: tVal });

      const changePct = asset.avgPrice > 0 ? ((tVal - costB) / costB) * 100 : 0;
      if (!topGainer || changePct > topGainer.pct) topGainer = { symbol: asset.symbol, pct: changePct };
      if (!topLoser  || changePct < topLoser.pct)  topLoser  = { symbol: asset.symbol, pct: changePct };
    });

    const profit        = totalValue - costBasis;
    const profitPercent = costBasis > 0 ? (profit / costBasis) * 100 : 0;

    pieDataMap.sort((a, b) => b.value - a.value);

    return { totalValue, costBasis, profit, profitPercent, assetCount: holdings.length, topGainer, topLoser, pieData: pieDataMap };
  }, [holdings]);

  // Per-holding rows with P&L and weight
  const holdingRows = useMemo(() => {
    return [...holdings]
      .map(h => {
        const price  = h.currentPrice || h.avgPrice;
        const rate   = h.exchangeRateToUSD || 1;
        const value  = h.amount * price * rate;
        const cost   = h.amount * h.avgPrice * rate;
        const pnlPct = h.avgPrice > 0 ? ((price - h.avgPrice) / h.avgPrice) * 100 : 0;
        const weight = metrics.totalValue > 0 ? (value / metrics.totalValue) * 100 : 0;
        return { symbol: h.symbol, name: h.name || h.symbol, price, value, pnlPct, weight, colorIdx: 0 };
      })
      .sort((a, b) => b.value - a.value)
      .map((h, i) => ({ ...h, colorIdx: i }));
  }, [holdings, metrics.totalValue]);

  useEffect(() => {
    fetchMomentum().then(d => { if (d?.length) setMomentum(d); });
  }, []);

  const renderActiveShape = (props) => {
    const R = Math.PI / 180;
    const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
    const sin = Math.sin(-R * midAngle), cos = Math.cos(-R * midAngle);
    const sx = cx + (outerRadius + 10) * cos, sy = cy + (outerRadius + 10) * sin;
    const mx = cx + (outerRadius + 30) * cos, my = cy + (outerRadius + 30) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 22, ey = my;
    const anchor = cos >= 0 ? 'start' : 'end';
    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 10} outerRadius={outerRadius + 14} fill={fill} />
        <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
        <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={anchor} fill="var(--text-primary)" fontSize={13} fontWeight="bold">{payload.name}</text>
        <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={anchor} fill="var(--success-color)" fontSize={12}>
          {`$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${(percent * 100).toFixed(1)}%)`}
        </text>
      </g>
    );
  };

  const fmt = (n) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const metricValueStyle = isMobile ? { fontSize: '1.1rem' } : {};

  return (
    <div className="dashboard-grid">

      {/* ── Top metrics bar ── */}
      <div className="glass-panel portfolio-overview" style={isMobile ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'start' } : {}}>
        <div className="metric">
          <span className="metric-label">Total Balance</span>
          <span className="metric-value" style={metricValueStyle}>${fmt(metrics.totalValue)}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Total P/L</span>
          <span className={`metric-value ${metrics.profit >= 0 ? 'trend-positive' : 'trend-negative'}`} style={metricValueStyle}>
            {metrics.profit >= 0 ? '+' : '-'}${fmt(Math.abs(metrics.profit))} ({metrics.profitPercent.toFixed(2)}%) {metrics.profit >= 0 ? '▲' : '▼'}
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">Positions</span>
          <span className="metric-value" style={{ color: 'var(--text-primary)', ...metricValueStyle }}>{metrics.assetCount}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Best</span>
          {metrics.topGainer ? (
            <span className="metric-value trend-positive" style={metricValueStyle}>
              {metrics.topGainer.symbol} +{Math.abs(metrics.topGainer.pct).toFixed(1)}%
            </span>
          ) : <span className="metric-value" style={{ color: 'var(--text-secondary)', ...metricValueStyle }}>--</span>}
        </div>
        <div className="metric">
          <span className="metric-label">Worst</span>
          {metrics.topLoser ? (
            <span className={`metric-value ${metrics.topLoser.pct >= 0 ? 'trend-positive' : 'trend-negative'}`} style={metricValueStyle}>
              {metrics.topLoser.symbol} {metrics.topLoser.pct >= 0 ? '+' : ''}{metrics.topLoser.pct.toFixed(1)}%
            </span>
          ) : <span className="metric-value" style={{ color: 'var(--text-secondary)', ...metricValueStyle }}>--</span>}
        </div>
      </div>

      {/* ── Pie chart ── */}
      <div className="glass-panel holdings-panel">
        <h2 style={{ marginBottom: '1rem' }}>Asset Allocation</h2>
        <div className="pie-chart-wrap">
          {metrics.pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={isMobile ? 220 : 300}>
              <PieChart>
                <Pie
                  data={metrics.pieData}
                  cx="50%" cy="50%"
                  activeIndex={isMobile ? undefined : activePieIndex}
                  activeShape={isMobile ? undefined : renderActiveShape}
                  onMouseEnter={isMobile ? undefined : (_, idx) => setActivePieIndex(idx)}
                  innerRadius={isMobile ? 45 : 60}
                  outerRadius={isMobile ? 75 : 100}
                  dataKey="value"
                  stroke="var(--panel-bg)" strokeWidth={2}
                >
                  {metrics.pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <RechartsTooltip
                  formatter={v => `$${fmt(v)}`}
                  contentStyle={{ background: 'var(--panel-bg)', borderColor: 'var(--panel-border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--text-primary)' }}
                />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: 'var(--text-primary)', fontSize: isMobile ? '0.72rem' : '0.85rem' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ width: '100%', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              Add assets to view allocation.
            </div>
          )}
        </div>
      </div>

      {/* ── Holdings breakdown ── */}
      <div className="glass-panel db-holdings-panel">
        <div className="db-holdings-header">
          <h2>Holdings</h2>
          <span className="db-holdings-count">{holdingRows.length} positions</span>
        </div>

        {holdingRows.length === 0 ? (
          <div className="db-holdings-empty">Add positions in Portfolio to see your holdings here.</div>
        ) : (
          <div className="db-holdings-list">
            {holdingRows.map((h, i) => {
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
        <h2 style={{ marginBottom: '1rem' }}>Market Opportunities</h2>
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
                style={{ flex: '0 0 220px', padding: '1rem', cursor: 'default' }}
                onMouseEnter={e => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setTooltip({ text: rationales[i % rationales.length], x: r.left, y: r.top - 8, width: r.width });
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <img src={`https://financialmodelingprep.com/image-stock/${stock.symbol}.png`} alt="logo"
                      style={{ width: '24px', height: '24px', borderRadius: '50%' }}
                      onError={e => { e.target.style.display = 'none'; }} />
                    <strong style={{ fontSize: '1.1rem' }}>{stock.symbol}</strong>
                  </div>
                  <div className={isPos ? 'trend-positive' : 'trend-negative'} style={{ fontSize: '0.85rem' }}>
                    {isPos ? '+' : ''}{stock.changePercent.toFixed(2)}% {isPos ? '▲' : '▼'}
                  </div>
                </div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stock.name}</div>
                <div style={{ marginTop: '0.5rem', fontSize: '1.25rem', fontWeight: 'bold' }}>${stock.price.toFixed(2)}</div>
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
