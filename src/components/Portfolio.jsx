import { useState, useEffect } from 'react'
import { fetchQuote, fetchSearch, fetchExchangeRate } from '../data/api'
import { usePortfolio } from '../context/PortfolioContext'
import './Portfolio.css'

export default function Portfolio() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [amount, setAmount] = useState('');
  const [avgPrice, setAvgPrice] = useState('');
  const [assetCurrency, setAssetCurrency] = useState('USD');
  const [selectedStock, setSelectedStock] = useState(null);

  const { holdings, setHoldings } = usePortfolio();
  const [editingAsset, setEditingAsset] = useState(null);
  const [searchResults, setSearchResults] = useState([]);

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

  const handleSaveAsset = async () => {
    // Basic validation
    if (!editingAsset && !selectedStock) return;
    if (!amount || !avgPrice) return;
    
    // Check if we are editing
    if (editingAsset) {
      setHoldings(holdings.map(h => h.symbol === editingAsset ? {
        ...h, amount: parseFloat(amount), avgPrice: parseFloat(avgPrice)
      } : h));
      setEditingAsset(null);
    } else {
      const actualSymbol = selectedStock.symbol.toUpperCase();
      const quote = await fetchQuote(actualSymbol);
      const currentPrice = quote ? quote.price : parseFloat(avgPrice); 
      
      const manualRate = await fetchExchangeRate(assetCurrency);
      let currSym = '$';
      if (assetCurrency === 'EUR') currSym = '€';
      if (assetCurrency === 'ILS') currSym = '₪';
      if (assetCurrency === 'GBP') currSym = '£';
      if (assetCurrency === 'CAD') currSym = 'C$';
      
      setHoldings([...holdings, {
        symbol: actualSymbol,
        amount: parseFloat(amount),
        avgPrice: parseFloat(avgPrice),
        currentPrice: currentPrice,
        currencySymbol: currSym,
        exchangeRateToUSD: manualRate,
        name: selectedStock.name
      }]);
    }
    
    setSearchQuery('');
    setSelectedStock(null);
    setAmount('');
    setAvgPrice('');
    setShowAddForm(false);
  };

  const handleRemove = (symbol) => {
    setHoldings(holdings.filter(h => h.symbol !== symbol));
  };
  
  const handleEdit = (asset) => {
    setSearchQuery(asset.symbol);
    setSelectedStock({ symbol: asset.symbol, name: asset.name });
    setAmount(asset.amount);
    setAvgPrice(asset.avgPrice);
    setEditingAsset(asset.symbol);
    setShowAddForm(true);
  };

  return (
    <div className="portfolio-container">
      <div className="portfolio-header">
        <h2>Your Holdings</h2>
        <button 
          className="btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? 'Cancel' : '+ Add Asset'}
        </button>
      </div>

      {showAddForm && (
        <div className="glass-panel add-asset-form" style={{ position: 'relative', zIndex: 1000 }}>
          <h3>Add New Asset</h3>
          <div className="form-group-row">
            <div className="form-group" style={{ position: 'relative' }}>
              <label>Asset Symbol</label>
              {selectedStock ? (
                <div 
                  className="form-input" 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.75rem', cursor: 'pointer', background: 'var(--panel-bg)' }} 
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
                    <span className="text-secondary" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>{selectedStock.name}</span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)' }}>&times;</span>
                </div>
              ) : (
                <>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="Search symbol (e.g. AAPL)" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  />
                  {showDropdown && searchQuery && (
                    <div className="autocomplete-dropdown glass-panel" style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999, maxHeight: '250px', overflowY: 'auto', padding: '0.5rem', marginTop: '0.5rem', background: 'var(--bg-color)', border: '1px solid var(--accent-color)' }}>
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
                          <span className="text-secondary" style={{ fontSize: '0.85rem' }}>{stock.name}</span>
                        </div>
                      )) : (
                        <div style={{ padding: '0.5rem', color: 'var(--text-secondary)', textAlign: 'center', fontSize: '0.875rem' }}>
                          {searchQuery ? 'Loading...' : 'Type to search...'}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="form-group">
              <label>Amount</label>
              <input type="number" className="form-input" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Currency</label>
              <select className="form-input" value={assetCurrency} onChange={e => setAssetCurrency(e.target.value)}>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="ILS">ILS (₪)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (C$)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Avg Buy Price</label>
              <input type="number" className="form-input" placeholder="0.00" value={avgPrice} onChange={e => setAvgPrice(e.target.value)} />
            </div>
            <div className="form-group flex-end">
              <button 
                className="btn-primary w-full" 
                onClick={handleSaveAsset}
                disabled={!selectedStock || !amount || !avgPrice}
                style={{ opacity: (!selectedStock || !amount || !avgPrice) ? 0.5 : 1 }}
              >
                {editingAsset ? 'Update Asset' : 'Save Asset'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel table-container">
        <table className="portfolio-table">
          <thead>
            <tr>
              <th>Asset</th>
              <th>Holding</th>
              <th>Avg Price</th>
              <th>Current Price</th>
              <th>Total Value</th>
              <th>P/L</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((asset, idx) => {
              const stockName = asset.name || 'Unknown Asset';
              const currentP = asset.currentPrice || asset.avgPrice; // fallback
              const rate = asset.exchangeRateToUSD || 1;
              const sym = asset.currencySymbol || '$';
              
              const totalValueUSD = asset.amount * currentP * rate;
              const costBasisUSD = asset.amount * asset.avgPrice * rate;
              const plUSD = totalValueUSD - costBasisUSD;
              const isPositive = plUSD >= 0;
              
              return (
                <tr key={`${asset.symbol}-${idx}`}>
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
                        <div className="text-sm text-secondary">{stockName}</div>
                      </div>
                    </div>
                  </td>
                  <td>{asset.amount.toFixed(2)}</td>
                  <td>{sym}{asset.avgPrice.toFixed(2)}</td>
                  <td>{asset.currentPrice > 0 ? `${sym}${asset.currentPrice.toFixed(2)}` : 'Loading...'}</td>
                  <td>${totalValueUSD.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
                  <td className={isPositive ? 'trend-positive' : 'trend-negative'}>
                    {isPositive ? '+' : '-'}${Math.abs(plUSD).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </td>
                  <td>
                    <button style={{ color: 'var(--text-secondary)', marginRight: '0.5rem', background: 'transparent', padding: '0.2rem' }} onClick={() => handleEdit(asset)}>Edit</button>
                    <button style={{ color: 'var(--danger-color)', background: 'transparent', padding: '0.2rem' }} onClick={() => handleRemove(asset.symbol)}>Remove</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
