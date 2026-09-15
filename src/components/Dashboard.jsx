import { useState, useEffect, useMemo } from 'react'
import { PieChart, Pie, Cell, Sector } from 'recharts'
import { usePortfolio } from '../context/PortfolioContext'
import { fetchMomentum, fetchWorldIndices, fetchMarketNews } from '../data/api'
import { BrainCircuit, TrendingUp, TrendingDown, Globe, Newspaper } from 'lucide-react'
import './Dashboard.css'

const PIE_COLORS = ['#6366f1','#8b5cf6','#22d3ee','#3b82f6','#f59e0b','#10b981','#ec4899','#f43f5e','#14b8a6'];

function Sparkline({ data, positive }) {
  if (!data || data.length < 2) return <div style={{ width:72, height:26 }} />;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const W = 72, H = 26;
  const pts = data.map((v,i) => `${(i/(data.length-1))*W},${H-2-((v-min)/range)*(H-4)}`).join(' ');
  const color = positive ? 'var(--up)' : 'var(--down)';
  return (
    <svg width={W} height={H} style={{ display:'block', flexShrink:0 }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5}
        strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
    </svg>
  );
}

function timeAgo(ts) {
  if (!ts) return '';
  const d = Math.floor(Date.now()/1000) - ts;
  if (d < 60)    return `${d}s ago`;
  if (d < 3600)  return `${Math.floor(d/60)}m ago`;
  if (d < 86400) return `${Math.floor(d/3600)}h ago`;
  return `${Math.floor(d/86400)}d ago`;
}

const fmt2 = n => n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});

export default function Dashboard({ onNavigate, mobile }) {
  const { holdings } = usePortfolio();
  const [momentum,     setMomentum]    = useState([]);
  const [worldIndices, setWorldIndices] = useState([]);
  const [news,         setNews]        = useState([]);
  const [activePie,    setActivePie]   = useState(null);

  useEffect(() => {
    fetchMomentum().then(d    => { if (d?.length) setMomentum(d); });
    fetchWorldIndices().then(d => { if (d?.length) setWorldIndices(d); });
    fetchMarketNews().then(d  => { if (d?.length) setNews(d.slice(0,4)); });
  }, []);

  const metrics = useMemo(() => {
    let totalValue=0, costBasis=0, topGainer=null, topLoser=null;
    holdings.forEach(a => {
      const price = a.currentPrice || a.avgPrice;
      const rate  = a.exchangeRateToUSD || 1;
      const tVal  = a.amount * price * rate;
      const costB = a.amount * a.avgPrice * rate;
      totalValue += tVal;
      costBasis  += costB;
      const pct = a.avgPrice > 0 ? ((tVal - costB) / costB) * 100 : 0;
      if (!topGainer || pct > topGainer.pct) topGainer = { symbol:a.symbol, pct };
      if (!topLoser  || pct < topLoser.pct)  topLoser  = { symbol:a.symbol, pct };
    });
    const profit = totalValue - costBasis;
    const profitPct = costBasis > 0 ? (profit/costBasis)*100 : 0;
    const pieData = [...holdings]
      .map(h => {
        const price = h.currentPrice || h.avgPrice;
        const rate  = h.exchangeRateToUSD || 1;
        return { name: h.symbol, value: h.amount * price * rate };
      })
      .filter(d => d.value > 0)
      .sort((a,b) => b.value - a.value);
    return { totalValue, costBasis, profit, profitPct, assetCount: holdings.length, topGainer, topLoser, pieData };
  }, [holdings]);

  const holdingRows = useMemo(() => {
    return [...holdings].map(h => {
      const price  = h.currentPrice || h.avgPrice;
      const rate   = h.exchangeRateToUSD || 1;
      const value  = h.amount * price * rate;
      const cost   = h.amount * h.avgPrice * rate;
      const pnlPct = h.avgPrice > 0 ? ((price - h.avgPrice) / h.avgPrice) * 100 : 0;
      const weight = metrics.totalValue > 0 ? (value / metrics.totalValue) * 100 : 0;
      return { symbol: h.symbol, value, pnlPct, weight };
    })
    .sort((a,b) => b.value - a.value)
    .map((h,i) => ({ ...h, ci: i }));
  }, [holdings, metrics.totalValue]);

  const fmtIdx = n => n >= 10000
    ? n.toLocaleString(undefined,{maximumFractionDigits:0})
    : n.toLocaleString(undefined,{maximumFractionDigits:2});

  const renderActiveSlice = (props) => {
    const { cx,cy,innerRadius,outerRadius,startAngle,endAngle,fill,payload,percent } = props;
    return (
      <g>
        <Sector cx={cx} cy={cy} innerRadius={innerRadius-4} outerRadius={outerRadius+10}
          startAngle={startAngle} endAngle={endAngle} fill={fill} />
        <text x={cx} y={cy-8}  textAnchor="middle" fill="#fff" fontSize={13} fontWeight={700}>{payload.name}</text>
        <text x={cx} y={cy+9}  textAnchor="middle" fill={fill} fontSize={11} fontWeight={600}>{(percent*100).toFixed(1)}%</text>
        <text x={cx} y={cy+24} textAnchor="middle" fill="var(--text-2)" fontSize={10}>${fmt2(payload.value)}</text>
      </g>
    );
  };

  const isUp = metrics.profit >= 0;

  return (
    <div className="db-wrap">

      {/* ── Hero ── */}
      <div className="db-hero">
        <div className="db-hero-left">
          <div className="db-hero-label">Total Portfolio Value</div>
          <div className="db-hero-value num">${fmt2(metrics.totalValue)}</div>
          <div className="db-hero-pnl">
            <span className={`db-hero-pnl-val ${isUp?'pos':'neg'}`}>
              {isUp ? '+' : '-'}${fmt2(Math.abs(metrics.profit))}
            </span>
            <span className={`db-hero-pnl-pct ${isUp?'pos':'neg'}`}>
              {isUp ? '+' : ''}{metrics.profitPct.toFixed(2)}%
            </span>
          </div>
        </div>

        <div className="db-hero-right">
          <div className="db-hero-stat">
            <div className="db-hero-stat-label">Positions</div>
            <div className="db-hero-stat-val">{metrics.assetCount}</div>
          </div>
          <div className="db-hero-stat">
            <div className="db-hero-stat-label">Best</div>
            {metrics.topGainer
              ? <div className="db-hero-stat-val pos">{metrics.topGainer.symbol} +{Math.abs(metrics.topGainer.pct).toFixed(1)}%</div>
              : <div className="db-hero-stat-val" style={{ color:'var(--text-2)' }}>—</div>}
          </div>
          {!mobile && (
            <div className="db-hero-stat">
              <div className="db-hero-stat-label">Worst</div>
              {metrics.topLoser
                ? <div className={`db-hero-stat-val ${metrics.topLoser.pct >= 0 ? 'pos':'neg'}`}>{metrics.topLoser.symbol} {metrics.topLoser.pct >= 0?'+':''}{metrics.topLoser.pct.toFixed(1)}%</div>
                : <div className="db-hero-stat-val" style={{ color:'var(--text-2)' }}>—</div>}
            </div>
          )}
          <div className="db-hero-stat">
            <div className="db-hero-stat-label">Cost Basis</div>
            <div className="db-hero-stat-val num">${fmt2(metrics.costBasis)}</div>
          </div>
        </div>
      </div>

      {/* ── Global Markets ── */}
      <div className="glass-panel db-markets">
        <div className="db-section-hdr">
          <Globe size={13} />
          <span className="db-section-title">Global Markets</span>
        </div>
        <div className="db-indices-strip">
          {worldIndices.length === 0
            ? Array.from({length:7}).map((_,i) => <div key={i} className="db-index-card db-index-skeleton" style={{height:100}} />)
            : worldIndices.map(idx => {
                const pos = idx.changePercent >= 0;
                return (
                  <div key={idx.symbol} className="db-index-card">
                    <div className="db-index-top">
                      <span className="db-index-region">{idx.region}</span>
                      <span className={`db-index-chg ${pos?'pos':'neg'}`}>{pos?'+':''}{idx.changePercent?.toFixed(2)}%</span>
                    </div>
                    <div className="db-index-name">{idx.name}</div>
                    <div className="db-index-price num">{fmtIdx(idx.price??0)}</div>
                    <Sparkline data={idx.sparkline} positive={pos} />
                  </div>
                );
              })}
        </div>
      </div>

      {/* ── Holdings + News row ── */}
      <div className="db-row">

        {/* Holdings */}
        <div className="glass-panel db-holdings">
          <div className="db-holdings-hdr">
            <span className="db-holdings-title">Holdings</span>
            <span className="db-holdings-count">{holdingRows.length} position{holdingRows.length !== 1 ? 's' : ''}</span>
          </div>

          {holdingRows.length === 0 ? (
            <div className="db-holdings-empty">Add stocks in Portfolio to track them here.</div>
          ) : (
            <>
              {!mobile && metrics.pieData.length > 0 && (
                <div className="db-pie-wrap">
                  <PieChart width={180} height={140}>
                    <Pie data={metrics.pieData} cx={90} cy={70} innerRadius={40} outerRadius={60}
                      dataKey="value" stroke="none" paddingAngle={2}
                      activeIndex={activePie} activeShape={renderActiveSlice}
                      onMouseEnter={(_,i) => setActivePie(i)} onMouseLeave={() => setActivePie(null)}>
                      {metrics.pieData.map((_,i) => (
                        <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]}
                          opacity={activePie===null||activePie===i?1:0.35} />
                      ))}
                    </Pie>
                  </PieChart>
                </div>
              )}

              <div className="db-holdings-list">
                {holdingRows.map(h => {
                  const color = PIE_COLORS[h.ci % PIE_COLORS.length];
                  return (
                    <div key={h.symbol} className="db-holding-row">
                      <div className="db-holding-dot" style={{ background:color }} />
                      <div className="db-holding-info">
                        <div className="db-holding-top">
                          <span className="db-holding-sym">{h.symbol}</span>
                          <span className={`db-holding-pnl ${h.pnlPct>=0?'pos':'neg'}`}>
                            {h.pnlPct>=0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {h.pnlPct>=0?'+':''}{h.pnlPct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="db-holding-bar-row">
                          <div className="db-holding-bar">
                            <div className="db-holding-bar-fill" style={{ width:`${Math.min(h.weight,100)}%`, background:color }} />
                          </div>
                          <span className="db-holding-weight">{h.weight.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="db-holding-val">${fmt2(h.value)}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {onNavigate && (
            <button className="db-insights-btn" onClick={() => onNavigate('insights')}>
              <BrainCircuit size={13} /> AI Insights
            </button>
          )}
        </div>

        {/* News */}
        <div className="glass-panel" style={{ display:'flex', flexDirection:'column', gap:'0.5rem' }}>
          <div className="db-section-hdr">
            <Newspaper size={13} />
            <span className="db-section-title">Market News</span>
          </div>

          {news.length === 0 ? (
            <div className="db-news-skel-wrap">
              {Array.from({length:3}).map((_,i) => <div key={i} className="db-news-skel" />)}
            </div>
          ) : (
            <div className="db-news" style={{ flex:1 }}>
              {news.map((item,i) => (
                <a key={i} href={item.link} target="_blank" rel="noreferrer" className="db-news-item">
                  <div className="db-news-idx">{String(i+1).padStart(2,'0')}</div>
                  <div className="db-news-body">
                    <div className="db-news-title">{item.title}</div>
                    <div className="db-news-meta">
                      <span className="db-news-src">{item.publisher}</span>
                      <span className="db-news-time">{timeAgo(item.publishedAt)}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          )}

          {momentum.length > 0 && (
            <>
              <div className="db-section-hdr" style={{ marginTop:'0.75rem' }}>
                <TrendingUp size={13} />
                <span className="db-section-title">Today's Movers</span>
              </div>
              <div className="db-movers">
                {momentum.slice(0,5).map((s,i) => {
                  const pos = s.changePercent >= 0;
                  return (
                    <div key={i} className="db-mover-row">
                      <img src={`https://financialmodelingprep.com/image-stock/${s.symbol}.png`}
                        alt="" className="db-mover-logo"
                        onError={e => { e.target.style.display='none'; }} />
                      <span className="db-mover-sym">{s.symbol}</span>
                      <span className="db-mover-price">${s.price?.toFixed(2)}</span>
                      <span className={`db-mover-chg ${pos?'pos':'neg'}`}>{pos?'+':''}{s.changePercent?.toFixed(2)}%</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
