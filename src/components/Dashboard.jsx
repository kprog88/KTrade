import { useState, useEffect, useMemo } from 'react'
import { usePortfolio } from '../context/PortfolioContext'
import { fetchMomentum, fetchWorldIndices } from '../data/api'
import { BrainCircuit, TrendingUp, TrendingDown, Sparkles, Zap } from 'lucide-react'
import './Dashboard.css'

const COLORS = ['#8b5cf6','#6366f1','#06b6d4','#3b82f6','#f59e0b','#10b981','#ec4899','#f43f5e','#14b8a6'];

function moodLabel(pct) {
  if (pct > 20)  return { text: '🚀 crushing it', cls: 'up' };
  if (pct > 5)   return { text: '📈 looking good', cls: 'up' };
  if (pct > 0)   return { text: '😌 in the green', cls: 'up' };
  if (pct > -5)  return { text: '😬 slightly red', cls: 'down' };
  if (pct > -15) return { text: '📉 rough patch', cls: 'down' };
  return              { text: '🩸 ouch', cls: 'down' };
}

const fmt = n => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function Dashboard({ onNavigate, mobile }) {
  const { holdings } = usePortfolio();
  const [worldIndices, setWorldIndices] = useState([]);
  const [momentum,     setMomentum]     = useState([]);

  useEffect(() => {
    fetchWorldIndices().then(d => { if (d?.length) setWorldIndices(d); });
    fetchMomentum().then(d      => { if (d?.length) setMomentum(d);   });
  }, []);

  const metrics = useMemo(() => {
    let totalValue = 0, costBasis = 0, topGainer = null, topLoser = null;
    holdings.forEach(asset => {
      const price = asset.currentPrice || asset.avgPrice;
      const rate  = asset.exchangeRateToUSD || 1;
      const tVal  = asset.amount * price * rate;
      const costB = asset.amount * asset.avgPrice * rate;
      totalValue += tVal;
      costBasis  += costB;
      const pct = asset.avgPrice > 0 ? ((tVal - costB) / costB) * 100 : 0;
      if (!topGainer || pct > topGainer.pct) topGainer = { symbol: asset.symbol, pct };
      if (!topLoser  || pct < topLoser.pct)  topLoser  = { symbol: asset.symbol, pct };
    });
    const profit = totalValue - costBasis;
    const profitPct = costBasis > 0 ? (profit / costBasis) * 100 : 0;
    return { totalValue, costBasis, profit, profitPct, assetCount: holdings.length, topGainer, topLoser };
  }, [holdings]);

  const holdingRows = useMemo(() => {
    return [...holdings]
      .map(h => {
        const price  = h.currentPrice || h.avgPrice;
        const rate   = h.exchangeRateToUSD || 1;
        const value  = h.amount * price * rate;
        const pnlPct = h.avgPrice > 0 ? ((price - h.avgPrice) / h.avgPrice) * 100 : 0;
        const weight = metrics.totalValue > 0 ? (value / metrics.totalValue) * 100 : 0;
        return { symbol: h.symbol, value, pnlPct, weight };
      })
      .sort((a, b) => b.value - a.value)
      .map((h, i) => ({ ...h, color: COLORS[i % COLORS.length] }));
  }, [holdings, metrics.totalValue]);

  const [dollars, cents] = fmt(metrics.totalValue).split('.');
  const isUp   = metrics.profit >= 0;
  const mood   = moodLabel(metrics.profitPct);
  const topH   = holdingRows[0];
  const insightText = topH && topH.weight > 35
    ? `${topH.symbol} is eating ${topH.weight.toFixed(0)}% of your book. That's a lot of eggs in one basket — consider trimming into strength.`
    : holdings.length === 0
    ? `Add your first position in Portfolio to see your AI health score.`
    : `Concentration looks healthy across your ${holdings.length} positions. No single stock dominates the book.`;

  const statGrid = mobile ? { gridTemplateColumns: '1fr 1fr' } : {};
  const bodyGrid = mobile ? { gridTemplateColumns: '1fr' }     : {};

  return (
    <div className="dbx-page">

      {/* ── Hero ── */}
      <div className="dbx-hero">
        <div className="dbx-hero-label">Net Worth</div>
        <div className={`dbx-hero-value${isUp ? '' : ' down'}`}>
          ${dollars}<span className="dbx-hero-cents">.{cents}</span>
        </div>
        <div className="dbx-hero-sub">
          <span className={`dbx-hero-delta ${isUp ? 'dbx-pos' : 'dbx-neg'}`}>
            {isUp ? '+' : '-'}${fmt(Math.abs(metrics.profit))}
          </span>
          <span className={`dbx-hero-pct ${isUp ? 'dbx-pos' : 'dbx-neg'}`}>
            {isUp ? '+' : ''}{metrics.profitPct.toFixed(1)}% all time
          </span>
          {metrics.assetCount > 0 && (
            <span className={`dbx-hero-mood ${mood.cls}`}>{mood.text}</span>
          )}
        </div>
      </div>

      {/* ── Stat row ── */}
      <div className="dbx-stats" style={statGrid}>
        <div className="dbx-stat-card dbx-stat-card--positions">
          <div className="dbx-stat-label">Positions</div>
          <div className="dbx-stat-value">{metrics.assetCount}</div>
        </div>
        <div className="dbx-stat-card dbx-stat-card--best">
          <div className="dbx-stat-label">Best</div>
          <div className="dbx-stat-value dbx-pos">
            {metrics.topGainer ? `${metrics.topGainer.symbol} +${Math.abs(metrics.topGainer.pct).toFixed(1)}%` : '—'}
          </div>
        </div>
        {!mobile && (
          <div className="dbx-stat-card dbx-stat-card--worst">
            <div className="dbx-stat-label">Worst</div>
            <div className={`dbx-stat-value ${metrics.topLoser?.pct < 0 ? 'dbx-neg' : 'dbx-pos'}`}>
              {metrics.topLoser ? `${metrics.topLoser.symbol} ${metrics.topLoser.pct >= 0 ? '+' : ''}${metrics.topLoser.pct.toFixed(1)}%` : '—'}
            </div>
          </div>
        )}
        <div className="dbx-stat-card dbx-stat-card--health">
          <div className="dbx-stat-label">AI Health</div>
          <div className={`dbx-stat-value${topH && topH.weight > 35 ? '' : ' good'}`}>
            {topH && topH.weight > 35 ? 'Review ⚠' : 'Good ✓'}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="dbx-body" style={bodyGrid}>

        {/* Holdings */}
        <div className="dbx-holdings">
          <div className="dbx-section-hdr">
            <span className="dbx-section-title">Holdings</span>
            <span className="dbx-section-sub">sorted by value</span>
          </div>
          {holdingRows.length === 0 ? (
            <div className="dbx-empty">Add positions in Portfolio<br />to see your holdings here.</div>
          ) : (
            <div className="dbx-holding-list">
              {holdingRows.map(h => (
                <div key={h.symbol} className="dbx-holding-row">
                  <div className="dbx-holding-bar" style={{ background: h.color }} />
                  <div className="dbx-holding-info">
                    <div className="dbx-holding-symbol">{h.symbol}</div>
                    <div className="dbx-holding-weight">{h.weight.toFixed(1)}% of portfolio</div>
                  </div>
                  <div className="dbx-holding-right">
                    <div className="dbx-holding-value">${fmt(h.value)}</div>
                    <div className={`dbx-holding-pnl ${h.pnlPct >= 0 ? 'dbx-pos' : 'dbx-neg'}`}>
                      {h.pnlPct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      {h.pnlPct >= 0 ? '+' : ''}{h.pnlPct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Side column */}
        <div className="dbx-side">

          {/* AI Insight */}
          <div className="dbx-insight-card">
            <div className="dbx-insight-hdr">
              <BrainCircuit size={14} />
              <span>AI Insight</span>
            </div>
            <p>{insightText}</p>
            {onNavigate && (
              <button className="dbx-insight-btn" onClick={() => onNavigate('insights')}>
                <Sparkles size={12} /> View full analysis
              </button>
            )}
          </div>

          {/* Market Snapshot */}
          <div className="dbx-snapshot">
            <div className="dbx-section-title">Market Snapshot</div>
            <div className="dbx-snapshot-list">
              {worldIndices.length === 0
                ? Array.from({ length: 4 }).map((_, i) => <div key={i} className="dbx-snapshot-skeleton" />)
                : worldIndices.slice(0, 5).map(idx => {
                    const pos = idx.changePercent >= 0;
                    return (
                      <div key={idx.symbol} className="dbx-snapshot-row">
                        <span className="dbx-snapshot-name">{idx.name}</span>
                        <span className={`dbx-snapshot-chg ${pos ? 'up' : 'down'}`}>
                          {pos ? '+' : ''}{idx.changePercent?.toFixed(2)}%
                        </span>
                      </div>
                    );
                  })}
            </div>
          </div>

          {/* Today's Movers */}
          {momentum.length > 0 && (
            <div className="dbx-movers">
              <div className="dbx-section-title" style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                <Zap size={13} style={{ color:'var(--warn)' }} /> Today's Movers
              </div>
              <div className="dbx-mover-list">
                {momentum.slice(0, 5).map((s, i) => {
                  const pos = s.changePercent >= 0;
                  return (
                    <div key={i} className="dbx-mover-row">
                      <img src={`https://financialmodelingprep.com/image-stock/${s.symbol}.png`}
                        alt="" className="dbx-mover-logo"
                        onError={e => { e.target.style.display = 'none'; }} />
                      <span className="dbx-mover-sym">{s.symbol}</span>
                      <span className="dbx-mover-price">${s.price?.toFixed(2)}</span>
                      <span className={`dbx-mover-chg ${pos ? 'up' : 'down'}`}>
                        {pos ? '+' : ''}{s.changePercent?.toFixed(2)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
