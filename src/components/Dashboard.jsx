import { useState, useEffect, useMemo } from 'react'
import { usePortfolio } from '../context/PortfolioContext'
import { fetchMomentum, fetchWorldIndices, fetchMarketNews } from '../data/api'
import { BrainCircuit, TrendingUp, TrendingDown, Sparkles } from 'lucide-react'
import './Dashboard.css'

const COLORS = ['#8b5cf6', '#6366f1', '#06b6d4', '#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#f43f5e', '#14b8a6'];

// "Signal Clean" redesign — spacious hero balance, stat row, holdings + AI insight + market snapshot.
export default function Dashboard({ onNavigate, mobile }) {
  const { holdings } = usePortfolio();
  const [worldIndices, setWorldIndices] = useState([]);
  const [momentum, setMomentum] = useState([]);
  const [news, setNews] = useState([]);

  useEffect(() => {
    fetchWorldIndices().then(d => { if (d?.length) setWorldIndices(d); });
    fetchMomentum().then(d => { if (d?.length) setMomentum(d); });
    fetchMarketNews().then(d => { if (d?.length) setNews(d.slice(0, 3)); });
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
      const changePct = asset.avgPrice > 0 ? ((tVal - costB) / costB) * 100 : 0;
      if (!topGainer || changePct > topGainer.pct) topGainer = { symbol: asset.symbol, pct: changePct };
      if (!topLoser  || changePct < topLoser.pct)  topLoser  = { symbol: asset.symbol, pct: changePct };
    });
    const profit = totalValue - costBasis;
    const profitPercent = costBasis > 0 ? (profit / costBasis) * 100 : 0;
    return { totalValue, costBasis, profit, profitPercent, assetCount: holdings.length, topGainer, topLoser };
  }, [holdings]);

  const holdingRows = useMemo(() => {
    return [...holdings]
      .map(h => {
        const price  = h.currentPrice || h.avgPrice;
        const rate    = h.exchangeRateToUSD || 1;
        const value   = h.amount * price * rate;
        const cost    = h.amount * h.avgPrice * rate;
        const pnlPct  = h.avgPrice > 0 ? ((price - h.avgPrice) / h.avgPrice) * 100 : 0;
        const weight  = metrics.totalValue > 0 ? (value / metrics.totalValue) * 100 : 0;
        return { symbol: h.symbol, value, pnlPct, weight };
      })
      .sort((a, b) => b.value - a.value)
      .map((h, i) => ({ ...h, color: COLORS[i % COLORS.length] }));
  }, [holdings, metrics.totalValue]);

  const fmt = n => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const [dollars, cents] = fmt(metrics.totalValue).split('.');
  const gridStyle = mobile ? { gridTemplateColumns: '1fr' } : {};

  // Concentration insight: flag the single largest holding once it clears 35% of book.
  const topHolding = holdingRows[0];
  const insightText = topHolding && topHolding.weight > 35
    ? `${topHolding.symbol} makes up ${topHolding.weight.toFixed(0)}% of your book. Consider trimming into strength to rebalance concentration risk.`
    : 'Your portfolio concentration is within a healthy range across positions.';

  return (
    <div className="dbx-page">
      <div className="dbx-hero">
        <div>
          <div className="dbx-hero-label">Net worth</div>
          <div className="dbx-hero-value">${dollars}<span className="dbx-hero-cents">.{cents}</span></div>
          <div className="dbx-hero-sub">
            <span className={metrics.profit >= 0 ? 'dbx-pos' : 'dbx-neg'}>
              {metrics.profit >= 0 ? '+' : '-'}${fmt(Math.abs(metrics.profit))}
            </span>
            <span className={`dbx-hero-pct ${metrics.profit >= 0 ? 'dbx-pos' : 'dbx-neg'}`}>
              {metrics.profitPercent >= 0 ? '+' : ''}{metrics.profitPercent.toFixed(1)}% all time
            </span>
          </div>
        </div>
      </div>

      <div className="dbx-stats" style={gridStyle}>
        <div className="dbx-stat-card">
          <div className="dbx-stat-label">Positions</div>
          <div className="dbx-stat-value">{metrics.assetCount}</div>
        </div>
        <div className="dbx-stat-card">
          <div className="dbx-stat-label">Best</div>
          <div className="dbx-stat-value dbx-pos">
            {metrics.topGainer ? `${metrics.topGainer.symbol} +${Math.abs(metrics.topGainer.pct).toFixed(1)}%` : '--'}
          </div>
        </div>
        <div className="dbx-stat-card">
          <div className="dbx-stat-label">Worst</div>
          <div className={`dbx-stat-value ${metrics.topLoser && metrics.topLoser.pct < 0 ? 'dbx-neg' : ''}`}>
            {metrics.topLoser ? `${metrics.topLoser.symbol} ${metrics.topLoser.pct >= 0 ? '+' : ''}${metrics.topLoser.pct.toFixed(1)}%` : '--'}
          </div>
        </div>
        <div className="dbx-stat-card dbx-stat-card--accent">
          <div className="dbx-stat-label">AI Health</div>
          <div className="dbx-stat-value">{topHolding && topHolding.weight > 35 ? 'Review' : 'Good'}</div>
        </div>
      </div>

      <div className="dbx-body" style={mobile ? { gridTemplateColumns: '1fr' } : {}}>
        <div className="dbx-holdings">
          <div className="dbx-section-hdr">
            <span className="dbx-section-title">Holdings</span>
            <span className="dbx-section-sub">sorted by value</span>
          </div>
          {holdingRows.length === 0 ? (
            <div className="dbx-empty">Add positions in Portfolio to see your holdings here.</div>
          ) : (
            <div className="dbx-holding-list">
              {holdingRows.map(h => (
                <div key={h.symbol} className="dbx-holding-row">
                  <div className="dbx-holding-dot" style={{ background: h.color }} />
                  <div className="dbx-holding-info">
                    <div className="dbx-holding-symbol">{h.symbol}</div>
                    <div className="dbx-holding-weight">{h.weight.toFixed(1)}% of portfolio</div>
                  </div>
                  <div className="dbx-holding-right">
                    <div className="dbx-holding-value">${fmt(h.value)}</div>
                    <div className={`dbx-holding-pnl ${h.pnlPct >= 0 ? 'dbx-pos' : 'dbx-neg'}`}>
                      {h.pnlPct >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {h.pnlPct >= 0 ? '+' : ''}{h.pnlPct.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dbx-side">
          <div className="dbx-insight-card">
            <div className="dbx-insight-hdr">
              <BrainCircuit size={15} />
              <span>AI Insight</span>
            </div>
            <p>{insightText}</p>
            {onNavigate && (
              <button className="dbx-insight-btn" onClick={() => onNavigate('insights')}>
                <Sparkles size={13} /> View full analysis
              </button>
            )}
          </div>

          <div className="dbx-snapshot">
            <div className="dbx-section-title" style={{ marginBottom: '0.85rem' }}>Market Snapshot</div>
            <div className="dbx-snapshot-list">
              {worldIndices.length === 0
                ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="dbx-snapshot-skeleton" />)
                : worldIndices.slice(0, 4).map(idx => {
                    const pos = idx.changePercent >= 0;
                    return (
                      <div key={idx.symbol} className="dbx-snapshot-row">
                        <span className="dbx-snapshot-name">{idx.name}</span>
                        <span className={pos ? 'dbx-pos' : 'dbx-neg'}>
                          {pos ? '+' : ''}{idx.changePercent?.toFixed(2)}%
                        </span>
                      </div>
                    );
                  })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
