import { useState, useEffect, useCallback } from 'react'
import { fetchQuote, fetchChart, fetchSearch } from '../data/api'
import {
  ComposedChart, Line, ReferenceLine,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart
} from 'recharts'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
import { X, ChevronDown } from 'lucide-react'
import './Portfolio.css'
import './Watchlist.css'

// ── Indicators ──────────────────────────────────────────────────────────────

function sma(data, period) {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1);
    return slice.reduce((s, d) => s + d.value, 0) / period;
  });
}

function supportResistance(data) {
  if (data.length < 5) return { support: null, resistance: null };
  const values = data.map(d => d.value);
  // Use lowest 10th-percentile as support, highest 90th as resistance
  const sorted = [...values].sort((a, b) => a - b);
  const support    = sorted[Math.floor(sorted.length * 0.1)];
  const resistance = sorted[Math.floor(sorted.length * 0.9)];
  return { support, resistance };
}

// ── Mini chart inside each card ─────────────────────────────────────────────

function MiniChart({ chartData, isPositive }) {
  return (
    <ResponsiveContainer width="100%" height={80}>
      <LineChart data={chartData}>
        <YAxis domain={['auto', 'auto']} hide />
        <Line type="monotone" dataKey="value" stroke={isPositive ? 'var(--success-color)' : 'var(--danger-color)'}
          strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ── Expanded TA chart ────────────────────────────────────────────────────────

function ma200w(weeklyData) {
  if (weeklyData.length < 200) return null;
  const last200 = weeklyData.slice(-200);
  return last200.reduce((s, d) => s + d.value, 0) / 200;
}

function TAChart({ symbol, onClose }) {
  const [chartData, setChartData]   = useState([]);
  const [ma200val, setMa200val]     = useState(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchChart(symbol, '1mo'),
      fetchChart(symbol, '5y'),
    ]).then(([monthly, weekly]) => {
      setChartData(monthly || []);
      setMa200val(ma200w(weekly || []));
      setLoading(false);
    });
  }, [symbol]);

  if (loading) {
    return (
      <div className="wl-ta-wrap">
        <div className="wl-ta-header">
          <span className="wl-ta-title">{symbol} — Technical Analysis</span>
          <button className="wl-ta-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="wl-ta-loading">Loading chart…</div>
      </div>
    );
  }

  if (!chartData.length) {
    return (
      <div className="wl-ta-wrap">
        <div className="wl-ta-header">
          <span className="wl-ta-title">{symbol} — Technical Analysis</span>
          <button className="wl-ta-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="wl-ta-loading">No chart data available.</div>
      </div>
    );
  }

  const ma20vals = sma(chartData, 20);
  const ma50vals = sma(chartData, 50);
  const { support, resistance } = supportResistance(chartData);

  const enriched = chartData.map((d, i) => ({
    ...d,
    ma20: ma20vals[i] !== null ? +ma20vals[i].toFixed(2) : null,
    ma50: ma50vals[i] !== null ? +ma50vals[i].toFixed(2) : null,
  }));

  const prices   = chartData.map(d => d.value);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const pad      = (maxPrice - minPrice) * 0.08;
  const domain   = [+(minPrice - pad).toFixed(2), +(maxPrice + pad).toFixed(2)];

  const fmt = v => `$${v?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="wl-ta-wrap">
      <div className="wl-ta-header">
        <span className="wl-ta-title">{symbol} — 30-Day Chart</span>
        <div className="wl-ta-legend">
          <span className="wl-ta-leg-item" style={{ color: '#6366f1' }}>── Price</span>
          <span className="wl-ta-leg-item" style={{ color: '#f59e0b' }}>── MA20</span>
          {ma50vals.some(v => v !== null) && (
            <span className="wl-ta-leg-item" style={{ color: '#ec4899' }}>── MA50</span>
          )}
          {ma200val   && <span className="wl-ta-leg-item" style={{ color: '#38bdf8' }}>── MA200W</span>}
          {support    && <span className="wl-ta-leg-item" style={{ color: 'var(--success-color)' }}>── Support</span>}
          {resistance && <span className="wl-ta-leg-item" style={{ color: 'var(--danger-color)' }}>── Resistance</span>}
        </div>
        <button className="wl-ta-close" onClick={onClose}><X size={16} /></button>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={enriched} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
            tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis domain={domain} tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
            tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} width={52} />
          <Tooltip
            contentStyle={{ background: 'var(--bg-color)', border: '1px solid var(--panel-border)', borderRadius: 8, fontSize: '0.78rem' }}
            itemStyle={{ color: 'var(--text-primary)' }}
            formatter={(v, name) => [fmt(v), name]}
            labelStyle={{ color: 'var(--text-secondary)', marginBottom: 4 }}
          />

          {/* 200-week MA — major long-term support level */}
          {ma200val && domain[0] <= ma200val && ma200val <= domain[1] && (
            <ReferenceLine y={+ma200val.toFixed(2)} stroke="#38bdf8" strokeDasharray="6 3" strokeWidth={2}
              label={{ value: `MA200W ${fmt(ma200val)}`, position: 'insideTopRight', fontSize: 10, fill: '#38bdf8' }} />
          )}

          {/* Support & resistance */}
          {support && (
            <ReferenceLine y={support} stroke="var(--success-color)" strokeDasharray="4 3" strokeWidth={1.5}
              label={{ value: `S ${fmt(support)}`, position: 'insideTopLeft', fontSize: 10, fill: 'var(--success-color)' }} />
          )}
          {resistance && (
            <ReferenceLine y={resistance} stroke="var(--danger-color)" strokeDasharray="4 3" strokeWidth={1.5}
              label={{ value: `R ${fmt(resistance)}`, position: 'insideBottomLeft', fontSize: 10, fill: 'var(--danger-color)' }} />
          )}

          {/* Moving averages */}
          <Line type="monotone" dataKey="ma50" stroke="#ec4899" strokeWidth={1.5}
            dot={false} isAnimationActive={false} connectNulls name="MA50" />
          <Line type="monotone" dataKey="ma20" stroke="#f59e0b" strokeWidth={1.5}
            dot={false} isAnimationActive={false} connectNulls name="MA20" />

          {/* Price */}
          <Line type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2}
            dot={false} isAnimationActive={false} name="Price" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Watchlist() {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery]   = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [isTableView, setIsTableView]   = useState(false);
  const [expandedSymbol, setExpandedSymbol] = useState(null);

  useEffect(() => {
    if (!searchQuery) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const r = await fetchSearch(searchQuery);
      setSearchResults(r);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const [watchlist, setWatchlist]     = useState([]);
  const [loadedFromDB, setLoadedFromDB] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    db.collection('users').doc(currentUser.uid).get().then(doc => {
      if (doc.exists && doc.data().watchlist) {
        setWatchlist(doc.data().watchlist);
      } else {
        setWatchlist([
          { symbol: 'TSLA', price: 0, change: 0, changePercent: 0, chartData: [] },
          { symbol: 'AMD',  price: 0, change: 0, changePercent: 0, chartData: [] },
        ]);
      }
      setLoadedFromDB(true);
    });
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !loadedFromDB) return;
    const stripped = watchlist.map(w => ({ symbol: w.symbol, name: w.name || 'Unknown Asset' }));
    db.collection('users').doc(currentUser.uid).set({ watchlist: stripped }, { merge: true });
  }, [watchlist.length, currentUser, loadedFromDB]);

  useEffect(() => {
    if (!loadedFromDB || watchlist.length === 0) return;
    const needsLoad = watchlist.some(w => !w.price);
    if (!needsLoad) return;
    const load = async () => {
      const updated = await Promise.all(watchlist.map(async item => {
        if (item.price > 0) return item;
        const quote = await fetchQuote(item.symbol);
        const chart = await fetchChart(item.symbol, '7d');
        return quote ? { ...item, price: quote.price, change: quote.change, changePercent: quote.changePercent, chartData: chart, name: item.name || 'Unknown Asset', currencySymbol: quote.currencySymbol } : item;
      }));
      setWatchlist(updated);
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFromDB, watchlist.length]);

  const handleAddToWatchlist = async () => {
    if (!selectedStock) return;
    if (watchlist.find(i => i.symbol === selectedStock.symbol)) {
      setSearchQuery(''); setSelectedStock(null); setShowDropdown(false); return;
    }
    const symbol = selectedStock.symbol.toUpperCase();
    const newItem = { symbol, name: selectedStock.name, price: 0, change: 0, changePercent: 0, chartData: [] };
    setWatchlist(prev => [...prev, newItem]);
    setSearchQuery(''); setSelectedStock(null); setShowDropdown(false);
    const quote = await fetchQuote(symbol);
    const chart = await fetchChart(symbol, '7d');
    if (quote) {
      setWatchlist(prev => prev.map(item =>
        item.symbol === symbol
          ? { ...item, price: quote.price, change: quote.change, changePercent: quote.changePercent, chartData: chart, name: selectedStock.name, currencySymbol: quote.currencySymbol }
          : item
      ));
    }
  };

  const handleRemove  = symbol => setWatchlist(watchlist.filter(i => i.symbol !== symbol));
  const handleCardClick = symbol => setExpandedSymbol(prev => prev === symbol ? null : symbol);

  return (
    <div className="portfolio-container">
      {/* ── Header ── */}
      <div className="portfolio-header" style={{ position: 'relative', zIndex: 1000, overflow: 'visible' }}>
        <h2>Your Watchlist</h2>
        <div style={{ display: 'flex', gap: '0.75rem', position: 'relative', alignItems: 'center', flexWrap: 'wrap' }}>
          {selectedStock ? (
            <div className="form-input" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.75rem', cursor: 'pointer', background: 'var(--panel-bg)', flex: '1 1 200px' }} onClick={() => setSelectedStock(null)}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img src={`https://financialmodelingprep.com/image-stock/${selectedStock.symbol.split('.')[0]}.png`} alt={selectedStock.symbol} style={{ width: 20, height: 20, borderRadius: '50%' }} onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${selectedStock.symbol}&background=random`; }} />
                <strong>{selectedStock.symbol}</strong>
              </div>
              <span style={{ color: 'var(--text-secondary)' }}>&times;</span>
            </div>
          ) : (
            <input type="text" className="form-input" placeholder="Search symbol to watch…" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              style={{ flex: '1 1 200px' }}
            />
          )}

          <button className="btn-primary" onClick={handleAddToWatchlist} disabled={!selectedStock} style={{ opacity: !selectedStock ? 0.5 : 1, whiteSpace: 'nowrap' }}>
            + Add
          </button>

          {showDropdown && searchQuery && !selectedStock && (
            <div className="autocomplete-dropdown glass-panel" style={{ position: 'absolute', top: '100%', left: 0, width: 250, zIndex: 9999, maxHeight: 200, overflowY: 'auto', padding: '0.5rem', marginTop: '0.5rem' }}>
              {searchResults.length > 0 ? searchResults.map(stock => (
                <div key={stock.symbol} className="autocomplete-item"
                  style={{ padding: '0.6rem', cursor: 'pointer', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s' }}
                  onMouseDown={e => { e.preventDefault(); setSearchQuery(stock.symbol); setSelectedStock(stock); setShowDropdown(false); }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--panel-border)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img src={`https://financialmodelingprep.com/image-stock/${stock.symbol.split('.')[0]}.png`} alt={stock.symbol} style={{ width: 20, height: 20, borderRadius: '50%' }} onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${stock.symbol}&background=random`; }} />
                    <strong>{stock.symbol}</strong>
                  </div>
                  <span className="text-secondary" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>{stock.name}</span>
                </div>
              )) : (
                <div style={{ padding: '0.5rem', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.875rem' }}>
                  {searchQuery ? 'Loading…' : 'Type to search…'}
                </div>
              )}
            </div>
          )}

          <button className="btn-primary" style={{ background: 'var(--panel-border)', whiteSpace: 'nowrap' }} onClick={() => setIsTableView(!isTableView)}>
            {isTableView ? '⊞ Grid' : '☰ Table'}
          </button>
        </div>
      </div>

      {/* ── Table view ── */}
      {isTableView ? (
        <div className="glass-panel table-container" style={{ marginTop: '1rem' }}>
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>Asset</th><th>Price</th><th>24h Change</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map((asset, i) => {
                const pos = asset.change >= 0;
                return (
                  <tr key={`${asset.symbol}-${i}`}>
                    <td>
                      <div className="asset-info">
                        <div className="asset-icon" style={{ background: 'transparent', padding: 0, overflow: 'hidden' }}>
                          <img src={`https://financialmodelingprep.com/image-stock/${asset.symbol.split('.')[0]}.png`} alt={asset.symbol} style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }} onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${asset.symbol}&background=random`; }} />
                        </div>
                        <div><strong>{asset.symbol}</strong><div className="text-sm text-secondary">{asset.name || 'Unknown Asset'}</div></div>
                      </div>
                    </td>
                    <td>{asset.price > 0 ? `${asset.currencySymbol || '$'}${asset.price.toFixed(2)}` : 'Loading…'}</td>
                    <td className={pos ? 'trend-positive' : 'trend-negative'}>
                      {asset.price > 0 && <>{pos ? '+' : '-'}{asset.currencySymbol || '$'}{Math.abs(asset.change).toFixed(2)} ({pos ? '+' : ''}{asset.changePercent.toFixed(2)}%) {pos ? '▲' : '▼'}</>}
                    </td>
                    <td><button style={{ color: 'var(--danger-color)', background: 'transparent', padding: '0.2rem' }} onClick={() => handleRemove(asset.symbol)}>Remove</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── Grid view ── */
        <div className="wl-grid" style={{ marginTop: '1rem' }}>
          {watchlist.map((asset, i) => {
            const pos      = asset.change >= 0;
            const expanded = expandedSymbol === asset.symbol;
            return (
              <div key={`${asset.symbol}-${i}`} className={`glass-panel wl-card${expanded ? ' wl-card--expanded' : ''}`}>
                {/* Remove button */}
                <button className="wl-remove" onClick={e => { e.stopPropagation(); handleRemove(asset.symbol); }} title="Remove">
                  <X size={14} />
                </button>

                {/* Card header — click to expand */}
                <div className="wl-card-top" onClick={() => handleCardClick(asset.symbol)}>
                  <div className="asset-info" style={{ flex: 1 }}>
                    <div className="asset-icon" style={{ background: 'transparent', padding: 0, overflow: 'hidden' }}>
                      <img src={`https://financialmodelingprep.com/image-stock/${asset.symbol.split('.')[0]}.png`} alt={asset.symbol}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
                        onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${asset.symbol}&background=random`; }} />
                    </div>
                    <div>
                      <strong>{asset.symbol}</strong>
                      <div className="text-sm text-secondary">{asset.name || 'Unknown Asset'}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', marginRight: '1.5rem' }}>
                    <strong>{asset.price > 0 ? `${asset.currencySymbol || '$'}${asset.price.toFixed(2)}` : 'Loading…'}</strong>
                    {asset.price > 0 && (
                      <div className={pos ? 'trend-positive' : 'trend-negative'} style={{ fontSize: '0.75rem' }}>
                        {pos ? '+' : ''}{asset.changePercent.toFixed(2)}% {pos ? '▲' : '▼'}
                      </div>
                    )}
                  </div>
                  <ChevronDown size={15} className={`wl-chevron${expanded ? ' open' : ''}`} />
                </div>

                {/* Mini sparkline (when collapsed) */}
                {!expanded && (
                  <div style={{ height: 70, marginTop: '0.5rem' }}>
                    {asset.chartData?.length > 0
                      ? <MiniChart chartData={asset.chartData} isPositive={pos} />
                      : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Loading…</div>}
                  </div>
                )}

                {/* Expanded TA chart */}
                {expanded && (
                  <TAChart symbol={asset.symbol} onClose={() => setExpandedSymbol(null)} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
