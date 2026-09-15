import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react'
import { fetchQuote, fetchChart, fetchSearch, fetchStockScore } from '../data/api'
import {
  ComposedChart, Area, Line, ReferenceLine,
  XAxis, YAxis, Tooltip, LineChart
} from 'recharts'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
import { Eye, X, ChevronDown } from 'lucide-react'
import './Watchlist.css'

const CARD_ACCENTS = ['#6366f1','#8b5cf6','#22d3ee','#3b82f6','#f59e0b','#10b981','#ec4899','#f43f5e'];

// ── Width hook ───────────────────────────────────────────────────────────────
function useChartWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  const measure = useCallback(() => {
    if (!ref.current) return;
    const w = ref.current.getBoundingClientRect().width;
    if (w > 10) { setWidth(Math.floor(w)); return; }
    let el = ref.current.parentElement;
    while (el) {
      const pw = el.getBoundingClientRect().width;
      if (pw > 10) { setWidth(Math.floor(pw - 16)); return; }
      el = el.parentElement;
    }
    setWidth(Math.max(200, window.innerWidth - 80));
  }, []);
  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    const t1 = setTimeout(measure, 60);
    const t2 = setTimeout(measure, 300);
    if (!ref.current) return () => { clearTimeout(t1); clearTimeout(t2); };
    const obs = new ResizeObserver(measure);
    obs.observe(ref.current);
    return () => { obs.disconnect(); clearTimeout(t1); clearTimeout(t2); };
  }, [measure]);
  useEffect(() => {
    window.addEventListener('resize', measure, { passive: true });
    return () => window.removeEventListener('resize', measure);
  }, [measure]);
  return [ref, width];
}

// ── Indicator helpers ────────────────────────────────────────────────────────
function sma(data, period) {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    return data.slice(i - period + 1, i + 1).reduce((s, d) => s + d.value, 0) / period;
  });
}

function supportResistance(data) {
  if (data.length < 5) return { support: null, resistance: null };
  const sorted = [...data.map(d => d.value)].sort((a, b) => a - b);
  return {
    support:    sorted[Math.floor(sorted.length * 0.1)],
    resistance: sorted[Math.floor(sorted.length * 0.9)],
  };
}

function ma200w(weekly) {
  if (weekly.length < 200) return null;
  return weekly.slice(-200).reduce((s, d) => s + d.value, 0) / 200;
}

// ── Mini sparkline ───────────────────────────────────────────────────────────
function MiniChart({ chartData, isPositive }) {
  const [ref, width] = useChartWidth();
  return (
    <div ref={ref} style={{ width:'100%', height:64 }}>
      {width > 0 && (
        <LineChart data={chartData} width={width} height={64}>
          <YAxis domain={['auto','auto']} hide />
          <Line type="monotone" dataKey="value"
            stroke={isPositive ? 'var(--up)' : 'var(--down)'}
            strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      )}
    </div>
  );
}

const LEGEND_ITEMS = [
  { key:'price', label:'Price',   color:'#8b5cf6' },
  { key:'ma20',  label:'MA 20',   color:'#3b82f6' },
  { key:'ma50',  label:'MA 50',   color:'#f59e0b' },
  { key:'ma200w',label:'MA 200W', color:'#22d3ee' },
  { key:'sup',   label:'Support', color:'#10b981' },
  { key:'res',   label:'Resist.', color:'#f43f5e' },
];

// ── Expanded TA chart ────────────────────────────────────────────────────────
function TAChart({ symbol, onClose }) {
  const [chartData, setChartData] = useState([]);
  const [ma200val,  setMa200val]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [chartRef, chartWidth]    = useChartWidth();

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchChart(symbol, '6mo'), fetchChart(symbol, '5y')])
      .then(([sixmo, weekly]) => {
        setChartData(sixmo || []);
        setMa200val(ma200w(weekly || []));
        setLoading(false);
      });
  }, [symbol]);

  if (loading) return (
    <div className="wl-ta-wrap">
      <div className="wl-ta-header">
        <span className="wl-ta-title">{symbol} — Chart</span>
        <button className="wl-ta-close" onClick={onClose}><X size={15} /></button>
      </div>
      <div className="wl-ta-loading">Loading chart…</div>
    </div>
  );

  if (!chartData.length) return (
    <div className="wl-ta-wrap">
      <div className="wl-ta-header">
        <span className="wl-ta-title">{symbol} — Chart</span>
        <button className="wl-ta-close" onClick={onClose}><X size={15} /></button>
      </div>
      <div className="wl-ta-loading">No chart data available.</div>
    </div>
  );

  const ma20vals = sma(chartData, 20);
  const ma50vals = sma(chartData, 50);
  const { support, resistance } = supportResistance(chartData);
  const hasMa50  = ma50vals.some(v => v !== null);
  const hasMa200 = ma200val != null;
  const enriched = chartData.map((d, i) => ({
    ...d,
    ma20: ma20vals[i] != null ? +ma20vals[i].toFixed(2) : null,
    ma50: hasMa50 && ma50vals[i] != null ? +ma50vals[i].toFixed(2) : null,
  }));

  const prices = chartData.map(d => d.value);
  const minP = Math.min(...prices), maxP = Math.max(...prices);
  const pad  = (maxP - minP) * 0.08 || 1;
  const domain   = [+(minP - pad).toFixed(2), +(maxP + pad).toFixed(2)];
  const xInterval = Math.max(1, Math.floor(chartData.length / (chartWidth < 400 ? 4 : 7)));
  const chartW    = Math.min(chartWidth, 1200);
  const fmt       = v => `$${v?.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;

  const visibleLegend = LEGEND_ITEMS.filter(l => {
    if (l.key==='ma200w') return hasMa200;
    if (l.key==='sup')    return support != null;
    if (l.key==='res')    return resistance != null;
    if (l.key==='ma50')   return hasMa50;
    return true;
  });

  return (
    <div className="wl-ta-wrap">
      <div className="wl-ta-header">
        <span className="wl-ta-title">{symbol} — 6-Month Chart</span>
        <button className="wl-ta-close" onClick={onClose}><X size={15} /></button>
      </div>
      <div className="wl-ta-legend">
        {visibleLegend.map(l => (
          <span key={l.key} className="wl-ta-leg-item" style={{ '--leg-color': l.color }}>
            <span className="wl-ta-leg-dot" />{l.label}
          </span>
        ))}
      </div>
      <div ref={chartRef} style={{ width:'100%', height:260, overflow:'hidden' }}>
        {chartWidth > 0 && (
          <ComposedChart data={enriched} width={chartW} height={260} margin={{ top:8, right:4, bottom:0, left:0 }}>
            <defs>
              <linearGradient id={`wl-g-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize:10, fill:'var(--text-2)' }}
              tickLine={false} axisLine={false} interval={xInterval} />
            <YAxis domain={domain} tick={{ fontSize:10, fill:'var(--text-2)' }}
              tickLine={false} axisLine={false}
              tickFormatter={v => `$${v?.toFixed(0)}`} width={46} />
            <Tooltip
              contentStyle={{ background:'var(--bg-2)', border:'1px solid var(--border)', borderRadius:8, fontSize:'0.78rem' }}
              itemStyle={{ color:'var(--text-1)' }}
              formatter={(v, name) => [fmt(v), name]}
              labelStyle={{ color:'var(--text-2)', marginBottom:4 }} />
            {hasMa200 && domain[0] <= ma200val && ma200val <= domain[1] && (
              <ReferenceLine y={+ma200val.toFixed(2)} stroke="#22d3ee" strokeDasharray="6 3" strokeWidth={1.5}
                label={{ value:'MA200W', position:'insideTopRight', fontSize:9, fill:'#22d3ee' }} />
            )}
            {support != null && (
              <ReferenceLine y={support} stroke="#10b981" strokeDasharray="4 3" strokeWidth={1.5}
                label={{ value:'S', position:'insideTopLeft', fontSize:9, fill:'#10b981' }} />
            )}
            {resistance != null && (
              <ReferenceLine y={resistance} stroke="#f43f5e" strokeDasharray="4 3" strokeWidth={1.5}
                label={{ value:'R', position:'insideBottomLeft', fontSize:9, fill:'#f43f5e' }} />
            )}
            {hasMa50 && <Line type="monotone" dataKey="ma50" stroke="#f59e0b" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls strokeDasharray="5 2" />}
            <Line type="monotone" dataKey="ma20" stroke="#3b82f6" strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls strokeDasharray="5 2" />
            <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={2} fill={`url(#wl-g-${symbol})`} dot={false} isAnimationActive={false} activeDot={{ r:3 }} />
          </ComposedChart>
        )}
      </div>
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Watchlist() {
  const { currentUser }  = useAuth();
  const [searchQuery,    setSearchQuery]    = useState('');
  const [showDropdown,   setShowDropdown]   = useState(false);
  const [searchResults,  setSearchResults]  = useState([]);
  const [selectedStock,  setSelectedStock]  = useState(null);
  const [expandedSymbol, setExpandedSymbol] = useState(null);
  const [watchlist,      setWatchlist]      = useState([]);
  const [loadedFromDB,   setLoadedFromDB]   = useState(false);
  const [scoreMap,       setScoreMap]       = useState({});

  useEffect(() => {
    if (!searchQuery) { setSearchResults([]); return; }
    const t = setTimeout(async () => { setSearchResults(await fetchSearch(searchQuery)); }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!currentUser) return;
    db.collection('users').doc(currentUser.uid).get().then(doc => {
      if (doc.exists && doc.data().watchlist) {
        setWatchlist(doc.data().watchlist);
      } else {
        setWatchlist([
          { symbol:'TSLA', price:0, change:0, changePercent:0, chartData:[] },
          { symbol:'AMD',  price:0, change:0, changePercent:0, chartData:[] },
        ]);
      }
      setLoadedFromDB(true);
    });
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !loadedFromDB) return;
    db.collection('users').doc(currentUser.uid).set(
      { watchlist: watchlist.map(w => ({ symbol:w.symbol, name:w.name||'Unknown' })) },
      { merge: true }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchlist.length, currentUser, loadedFromDB]);

  useEffect(() => {
    if (!loadedFromDB || watchlist.length === 0) return;
    if (!watchlist.some(w => !w.price)) return;
    (async () => {
      const updated = await Promise.all(watchlist.map(async item => {
        if (item.price > 0) return item;
        const [q, chart] = await Promise.all([fetchQuote(item.symbol), fetchChart(item.symbol, '7d')]);
        return q ? { ...item, price:q.price, change:q.change, changePercent:q.changePercent, chartData:chart, name:item.name||'Unknown', currencySymbol:q.currencySymbol } : item;
      }));
      setWatchlist(updated);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFromDB, watchlist.length]);

  useEffect(() => {
    if (!loadedFromDB || watchlist.length === 0) return;
    const timers = watchlist.map((item, i) =>
      setTimeout(() => {
        fetchStockScore(item.symbol).then(d => {
          if (d) setScoreMap(prev => ({ ...prev, [item.symbol]: d }));
        });
      }, i * 400)
    );
    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFromDB, watchlist.map(w => w.symbol).join(',')]);

  const handleAdd = async () => {
    if (!selectedStock || watchlist.find(i => i.symbol === selectedStock.symbol)) {
      setSearchQuery(''); setSelectedStock(null); return;
    }
    const sym = selectedStock.symbol.toUpperCase();
    setWatchlist(prev => [...prev, { symbol:sym, name:selectedStock.name, price:0, change:0, changePercent:0, chartData:[] }]);
    setSearchQuery(''); setSelectedStock(null); setShowDropdown(false);
    const [q, chart] = await Promise.all([fetchQuote(sym), fetchChart(sym, '7d')]);
    if (q) {
      setWatchlist(prev => prev.map(item => item.symbol === sym
        ? { ...item, price:q.price, change:q.change, changePercent:q.changePercent, chartData:chart, name:selectedStock.name, currencySymbol:q.currencySymbol }
        : item));
    }
  };

  return (
    <div className="wl-page">
      <div className="wl-header">
        <div>
          <h2>Watchlist</h2>
          <p>{watchlist.length} symbol{watchlist.length !== 1 ? 's' : ''} tracked</p>
        </div>
      </div>

      {/* Add row */}
      <div className="wl-add-row">
        <div className="wl-search-wrap">
          {selectedStock ? (
            <div className="wl-input" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}
              onClick={() => setSelectedStock(null)}>
              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                <img src={`https://financialmodelingprep.com/image-stock/${selectedStock.symbol.split('.')[0]}.png`}
                  alt="" style={{ width:18, height:18, borderRadius:'50%' }}
                  onError={e => { e.target.src=`https://ui-avatars.com/api/?name=${selectedStock.symbol}&background=6366f1&color=fff`; }} />
                <strong style={{ fontSize:'0.875rem' }}>{selectedStock.symbol}</strong>
                <span style={{ fontSize:'0.78rem', color:'var(--text-2)' }}>{selectedStock.name}</span>
              </div>
              <span style={{ color:'var(--text-2)' }}>×</span>
            </div>
          ) : (
            <input type="text" className="wl-input" placeholder="Search symbol to watch (e.g. NVDA)…"
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)} />
          )}
          {showDropdown && searchQuery && !selectedStock && (
            <div className="wl-dropdown">
              {searchResults.length > 0 ? searchResults.map(s => (
                <div key={s.symbol} className="wl-dropdown-item"
                  onMouseDown={e => { e.preventDefault(); setSelectedStock(s); setSearchQuery(s.symbol); setShowDropdown(false); }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <img src={`https://financialmodelingprep.com/image-stock/${s.symbol.split('.')[0]}.png`}
                      alt="" style={{ width:18, height:18, borderRadius:'50%' }}
                      onError={e => { e.target.src=`https://ui-avatars.com/api/?name=${s.symbol}&background=random`; }} />
                    <strong style={{ fontSize:'0.85rem' }}>{s.symbol}</strong>
                  </div>
                  <span style={{ fontSize:'0.78rem', color:'var(--text-2)', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.name}</span>
                </div>
              )) : <div className="wl-dropdown-empty">{searchQuery ? 'Searching…' : 'Type to search'}</div>}
            </div>
          )}
        </div>
        <button className="wl-add-btn" onClick={handleAdd} disabled={!selectedStock}>+ Add to Watchlist</button>
      </div>

      {/* Grid */}
      {watchlist.length === 0 ? (
        <div className="wl-empty">
          <Eye size={40} style={{ opacity:0.2 }} />
          <p style={{ fontWeight:600 }}>Your watchlist is empty</p>
          <p style={{ fontSize:'0.82rem', opacity:0.7 }}>Search for a stock above to start tracking it.</p>
        </div>
      ) : (
        <div className="wl-grid">
          {watchlist.map((asset, i) => {
            const pos      = asset.change >= 0;
            const expanded = expandedSymbol === asset.symbol;
            const sc       = scoreMap[asset.symbol];
            const accent   = CARD_ACCENTS[i % CARD_ACCENTS.length];
            const sym      = asset.currencySymbol || '$';

            return (
              <div key={`${asset.symbol}-${i}`} className="wl-card"
                style={{ '--card-accent': accent, animationDelay:`${i*0.05}s` }}>

                <button className="wl-remove" onClick={e => { e.stopPropagation(); setWatchlist(watchlist.filter(w => w.symbol !== asset.symbol)); }}>
                  <X size={13} />
                </button>

                <div className="wl-card-top" onClick={() => setExpandedSymbol(prev => prev === asset.symbol ? null : asset.symbol)}>
                  <img src={`https://financialmodelingprep.com/image-stock/${asset.symbol.split('.')[0]}.png`}
                    alt={asset.symbol} className="wl-card-logo"
                    onError={e => { e.target.src=`https://ui-avatars.com/api/?name=${asset.symbol}&background=6366f1&color=fff&bold=true`; }} />
                  <div className="wl-card-info">
                    <div className="wl-card-sym">{asset.symbol}</div>
                    <div className="wl-card-name">{asset.name || 'Unknown'}</div>
                  </div>
                  <div className="wl-card-right">
                    <div className="wl-card-price">{asset.price > 0 ? `${sym}${asset.price.toFixed(2)}` : '—'}</div>
                    {asset.price > 0 && (
                      <div className={`wl-card-chg ${pos?'pos':'neg'}`}>
                        {pos?'▲':'▼'} {Math.abs(asset.changePercent).toFixed(2)}%
                      </div>
                    )}
                  </div>
                </div>

                {sc && (
                  <div className={`wl-score-badge ${sc.verdictType}`} style={{ display:'flex' }}>
                    <span className="wl-score-num">{sc.score}</span>
                    <span className="wl-score-label">{sc.verdict}</span>
                  </div>
                )}

                {!expanded && asset.chartData?.length > 0 && (
                  <div style={{ marginTop:'0.6rem' }}>
                    <MiniChart chartData={asset.chartData} isPositive={pos} />
                  </div>
                )}

                {!expanded && asset.price === 0 && (
                  <div style={{ height:48, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-2)', fontSize:'0.8rem', marginTop:'0.5rem' }}>
                    Loading…
                  </div>
                )}

                <ChevronDown size={14} className={`wl-chevron${expanded?' open':''}`}
                  onClick={() => setExpandedSymbol(prev => prev === asset.symbol ? null : asset.symbol)} />

                {expanded && <TAChart symbol={asset.symbol} onClose={() => setExpandedSymbol(null)} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
