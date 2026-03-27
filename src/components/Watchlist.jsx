import { useState, useEffect } from 'react'
import { fetchQuote, fetchChart, fetchSearch } from '../data/api'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase'
import './Portfolio.css'

export default function Watchlist() {
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const [searchResults, setSearchResults] = useState([]);
  const [selectedStock, setSelectedStock] = useState(null);
  const [isTableView, setIsTableView] = useState(false);

  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      const results = await fetchSearch(searchQuery);
      setSearchResults(results);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const [watchlist, setWatchlist] = useState([]);
  const [loadedFromDB, setLoadedFromDB] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    db.collection('users').doc(currentUser.uid).get().then(doc => {
      if (doc.exists && doc.data().watchlist) {
        setWatchlist(doc.data().watchlist);
      } else {
        setWatchlist([
          { symbol: 'TSLA', price: 0, change: 0, changePercent: 0, chartData: [] },
          { symbol: 'AMD', price: 0, change: 0, changePercent: 0, chartData: [] }
        ]);
      }
      setLoadedFromDB(true);
    });
  }, [currentUser]);

  // Strip massive graph payloads when saving to cloud constraints
  useEffect(() => {
    if (!currentUser || !loadedFromDB) return;
    const stripped = watchlist.map(w => ({ symbol: w.symbol, name: w.name || 'Unknown Asset' }));
    db.collection('users').doc(currentUser.uid).set({ watchlist: stripped }, { merge: true });
  }, [watchlist.length, currentUser, loadedFromDB]);

  useEffect(() => {
    if (!loadedFromDB || watchlist.length === 0) return;
    const loadRealData = async () => {
      // Check if we already have the price to avoid repeating calls
      const needsLoad = watchlist.some(w => !w.price);
      if (!needsLoad) return;

      const updatedList = await Promise.all(watchlist.map(async (item) => {
        if (item.price > 0) return item; 
        const quote = await fetchQuote(item.symbol);
        const chart = await fetchChart(item.symbol, '7d');
        if (quote) {
          return { ...item, price: quote.price, change: quote.change, changePercent: quote.changePercent, chartData: chart, name: item.name || 'Unknown Asset', currencySymbol: quote.currencySymbol };
        }
        return item;
      }));
      setWatchlist(updatedList);
    };
    loadRealData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFromDB, watchlist.length]);

  const handleAddToWatchlist = async () => {
    if (!selectedStock) return;
    
    // Check if already in watchlist
    if (watchlist.find(item => item.symbol === selectedStock.symbol)) {
      setSearchQuery('');
      setSelectedStock(null);
      setShowDropdown(false);
      return;
    }

    const symbol = selectedStock.symbol.toUpperCase();
    const stockName = selectedStock.name;
    
    // Optimistic add
    const newItem = { symbol, name: stockName, price: 0, change: 0, changePercent: 0, chartData: [] };
    setWatchlist(prev => [...prev, newItem]);
    
    setSearchQuery('');
    setSelectedStock(null);
    setShowDropdown(false);

    // Fetch real data
    const quote = await fetchQuote(symbol);
    const chart = await fetchChart(symbol, '7d');
    
    if (quote) {
      setWatchlist(prev => prev.map(item => 
        item.symbol === symbol 
          ? { ...item, price: quote.price, change: quote.change, changePercent: quote.changePercent, chartData: chart, name: stockName, currencySymbol: quote.currencySymbol }
          : item
      ));
    }
  };

  const handleRemove = (symbol) => {
    setWatchlist(watchlist.filter(item => item.symbol !== symbol));
  };

  return (
    <div className="portfolio-container">
      <div className="portfolio-header" style={{ position: 'relative', zIndex: 1000 }}>
        <h2>Your Watchlist</h2>
        <div style={{ display: 'flex', gap: '1rem', position: 'relative', alignItems: 'center' }}>
          {selectedStock ? (
            <div 
              className="form-input" 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.75rem', cursor: 'pointer', background: 'var(--panel-bg)', minWidth: '250px' }} 
              onClick={() => setSelectedStock(null)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <img 
                  src={`https://financialmodelingprep.com/image-stock/${selectedStock.symbol.split('.')[0]}.png`} 
                  alt={selectedStock.symbol} 
                  style={{ width: '20px', height: '20px', borderRadius: '50%' }} 
                  onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${selectedStock.symbol}&background=random` }} 
                />
                <strong>{selectedStock.symbol}</strong>
              </div>
              <span style={{ color: 'var(--text-secondary)' }}>&times;</span>
            </div>
          ) : (
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search symbol to watch..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              style={{ minWidth: '250px' }}
            />
          )}
          
          <button 
            className="btn-primary" 
            onClick={handleAddToWatchlist}
            disabled={!selectedStock}
            style={{ opacity: !selectedStock ? 0.5 : 1 }}
          >
            Add to Watchlist
          </button>

          {showDropdown && searchQuery && !selectedStock && (
            <div className="autocomplete-dropdown glass-panel" style={{ position: 'absolute', top: '100%', left: 0, width: '250px', zIndex: 9999, maxHeight: '200px', overflowY: 'auto', padding: '0.5rem', marginTop: '0.5rem' }}>
              {searchResults.length > 0 ? searchResults.map(stock => (
                <div 
                  key={stock.symbol}
                  className="autocomplete-item"
                  style={{ padding: '0.6rem', cursor: 'pointer', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.2s' }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSearchQuery(stock.symbol);
                    setSelectedStock(stock);
                    setShowDropdown(false);
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--panel-border)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <img 
                      src={`https://financialmodelingprep.com/image-stock/${stock.symbol.split('.')[0]}.png`} 
                      alt={stock.symbol} 
                      style={{ width: '20px', height: '20px', borderRadius: '50%' }} 
                      onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${stock.symbol}&background=random` }} 
                    />
                    <strong>{stock.symbol}</strong>
                  </div>
                  <span className="text-secondary" style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>{stock.name}</span>
                </div>
              )) : (
                <div style={{ padding: '0.5rem', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.875rem' }}>
                  {searchQuery ? 'Loading...' : 'Type to search...'}
                </div>
              )}
            </div>
          )}
          
          <button 
            className="btn-primary" 
            style={{ marginLeft: 'auto', background: 'var(--panel-border)' }}
            onClick={() => setIsTableView(!isTableView)}
          >
            {isTableView ? 'Grid View' : 'Table View'}
          </button>
        </div>
      </div>

      {isTableView ? (
        <div className="glass-panel table-container" style={{ marginTop: '1rem' }}>
          <table className="portfolio-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Price</th>
                <th>24h Change</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {watchlist.map((asset, index) => {
                const isPositive = asset.change >= 0;
                return (
                  <tr key={`${asset.symbol}-table-${index}`}>
                    <td>
                      <div className="asset-info">
                        <div className="asset-icon" style={{ background: 'transparent', padding: 0, overflow: 'hidden' }}>
                          <img 
                            src={`https://financialmodelingprep.com/image-stock/${asset.symbol.split('.')[0]}.png`} 
                            alt={asset.symbol}
                            style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
                            onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${asset.symbol}&background=random` }}
                          />
                        </div>
                        <div>
                          <strong>{asset.symbol}</strong>
                          <div className="text-sm text-secondary">{asset.name || 'Unknown Asset'}</div>
                        </div>
                      </div>
                    </td>
                    <td>{asset.price > 0 ? `${asset.currencySymbol || '$'}${asset.price.toFixed(2)}` : 'Loading...'}</td>
                    <td className={isPositive ? 'trend-positive' : 'trend-negative'}>
                      {asset.price > 0 ? (
                        <>{isPositive ? '+' : '-'}{asset.currencySymbol || '$'}{Math.abs(asset.change).toFixed(2)} ({isPositive ? '+' : ''}{asset.changePercent.toFixed(2)}%) {isPositive ? '▲' : '▼'}</>
                      ) : ''}
                    </td>
                    <td>
                      <button style={{ color: 'var(--danger-color)', background: 'transparent', padding: '0.2rem' }} onClick={() => handleRemove(asset.symbol)}>Remove</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="dashboard-grid" style={{ marginTop: '1rem' }}>
          {watchlist.map((asset, index) => {
            const isPositive = asset.change >= 0;
            return (
              <div key={`${asset.symbol}-${index}`} className="glass-panel" style={{ gridColumn: 'span 4', position: 'relative' }}>
                <button 
                  onClick={() => handleRemove(asset.symbol)}
                  style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', color: 'var(--text-secondary)', cursor: 'pointer', background: 'transparent', border: 'none', fontSize: '1.2rem' }}
                  title="Remove from Watchlist"
                >
                  &times;
                </button>
                <div className="asset-info" style={{ marginBottom: '1rem' }}>
                  <div className="asset-icon" style={{ background: 'transparent', padding: 0, overflow: 'hidden' }}>
                    <img 
                      src={`https://financialmodelingprep.com/image-stock/${asset.symbol.split('.')[0]}.png`} 
                      alt={asset.symbol}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
                      onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${asset.symbol}&background=random` }}
                    />
                  </div>
                  <div>
                    <strong>{asset.symbol}</strong>
                    <div className="text-sm text-secondary">{asset.name || 'Unknown Asset'}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right', paddingRight: '1rem' }}>
                    <strong>{asset.price ? `${asset.currencySymbol || '$'}${asset.price.toFixed(2)}` : 'Loading...'}</strong>
                    {asset.price > 0 && (
                      <div className={isPositive ? "trend-positive" : "trend-negative"} style={{ fontSize: '0.75rem' }}>
                        {isPositive ? '+' : ''}{asset.change.toFixed(2)} ({isPositive ? '+' : ''}{asset.changePercent.toFixed(2)}%) {isPositive ? '▲' : '▼'}
                      </div>
                    )}
                  </div>
                </div>
                <div className="chart-placeholder" style={{ height: '80px', marginTop: '0', padding: 0, background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {asset.chartData && asset.chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={asset.chartData}>
                        <YAxis domain={['auto', 'auto']} hide />
                        <Line type="monotone" dataKey="value" stroke={isPositive ? '#10b981' : '#ef4444'} strokeWidth={2} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <span style={{color: 'var(--text-secondary)', fontSize: '0.8rem'}}>Loading chart...</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  )
}
