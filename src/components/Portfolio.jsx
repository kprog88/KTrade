import { useState, useEffect } from 'react'
import { fetchQuote, fetchSearch, fetchExchangeRate } from '../data/api'
import { usePortfolio } from '../context/PortfolioContext'
import { Briefcase, TrendingUp, TrendingDown, ScanLine } from 'lucide-react'
import PortfolioScanner from './PortfolioScanner'
import './Portfolio.css'

const CARD_ACCENTS = ['#6366f1','#8b5cf6','#22d3ee','#3b82f6','#f59e0b','#10b981','#ec4899','#f43f5e','#14b8a6'];

const CURR_SYM = { USD:'$', EUR:'€', ILS:'₪', GBP:'£', CAD:'C$' };
const fmt2 = n => n.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});

export default function Portfolio({ isMobile }) {
  const [showAddForm,    setShowAddForm]    = useState(false);
  const [showScanner,    setShowScanner]    = useState(false);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [showDropdown,   setShowDropdown]   = useState(false);
  const [amount,         setAmount]         = useState('');
  const [avgPrice,       setAvgPrice]       = useState('');
  const [assetCurrency,  setAssetCurrency]  = useState('USD');
  const [selectedStock,  setSelectedStock]  = useState(null);
  const [editingAsset,   setEditingAsset]   = useState(null);
  const [searchResults,  setSearchResults]  = useState([]);

  const { holdings, setHoldings } = usePortfolio();

  // Merge scanned holdings into existing portfolio
  const handleScanImport = async (scanned) => {
    const updated = [...holdings];
    for (const item of scanned) {
      const idx = updated.findIndex(h => h.symbol === item.symbol);
      // Try to fetch a live quote so currentPrice is populated right away
      const q = await fetchQuote(item.symbol).catch(() => null);
      const entry = {
        symbol:       item.symbol,
        name:         item.name || item.symbol,
        amount:       item.amount,
        avgPrice:     item.avgPrice || (q ? q.price : 0),
        currentPrice: q ? q.price : (item.currentPrice || item.avgPrice || 0),
        currencySymbol: q?.currencySymbol || '$',
        exchangeRateToUSD: 1,
      };
      if (idx >= 0) updated[idx] = entry;
      else updated.push(entry);
    }
    setHoldings(updated);
  };

  useEffect(() => {
    if (!searchQuery) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      const r = await fetchSearch(searchQuery);
      setSearchResults(r);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const resetForm = () => {
    setSearchQuery(''); setSelectedStock(null);
    setAmount(''); setAvgPrice('');
    setEditingAsset(null); setShowAddForm(false);
  };

  const handleSave = async () => {
    if (!editingAsset && !selectedStock) return;
    if (!amount || !avgPrice) return;

    if (editingAsset) {
      setHoldings(holdings.map(h => h.symbol === editingAsset
        ? { ...h, amount: parseFloat(amount), avgPrice: parseFloat(avgPrice) }
        : h));
    } else {
      const sym  = selectedStock.symbol.toUpperCase();
      const q    = await fetchQuote(sym);
      const rate = await fetchExchangeRate(assetCurrency);
      setHoldings([...holdings, {
        symbol: sym,
        amount: parseFloat(amount),
        avgPrice: parseFloat(avgPrice),
        currentPrice: q ? q.price : parseFloat(avgPrice),
        currencySymbol: CURR_SYM[assetCurrency] || '$',
        exchangeRateToUSD: rate,
        name: selectedStock.name,
      }]);
    }
    resetForm();
  };

  const handleEdit = asset => {
    setSearchQuery(asset.symbol);
    setSelectedStock({ symbol: asset.symbol, name: asset.name });
    setAmount(asset.amount);
    setAvgPrice(asset.avgPrice);
    setEditingAsset(asset.symbol);
    setShowAddForm(true);
  };

  const handleRemove = sym => setHoldings(holdings.filter(h => h.symbol !== sym));

  return (
    <div className="portfolio-page">

      {showScanner && (
        <PortfolioScanner
          isMobile={isMobile}
          onClose={() => setShowScanner(false)}
          onImport={handleScanImport}
        />
      )}

      <div className="portfolio-header">
        <div>
          <h2>Your Holdings</h2>
          <p>{holdings.length} position{holdings.length !== 1 ? 's' : ''} tracked</p>
        </div>
        <div style={{ display:'flex', gap:'0.5rem', flexWrap:'wrap', justifyContent:'flex-end' }}>
          <button
            onClick={() => setShowScanner(true)}
            style={{
              display:'flex', alignItems:'center', gap:'0.4rem',
              padding:'0.55rem 0.9rem',
              background:'var(--indigo-g)',
              border:'1px solid var(--border-accent)',
              borderRadius:'var(--r-s)',
              color:'var(--indigo-2)',
              fontSize:'0.82rem',
              fontWeight:'600',
              fontFamily:'inherit',
              cursor:'pointer',
              transition:'background 0.15s',
            }}
          >
            <ScanLine size={14} /> Scan Screenshot
          </button>
          <button className="btn-primary" onClick={() => { resetForm(); setShowAddForm(s => !s); }}>
            {showAddForm ? 'Cancel' : '+ Add Position'}
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="glass-panel add-asset-form" style={{ position:'relative', zIndex:1000, overflow:'visible' }}>
          <h3 style={{ marginBottom:'0.25rem' }}>{editingAsset ? 'Edit Position' : 'Add New Position'}</h3>
          <div className="form-group-row">

            {/* Symbol search */}
            <div className="form-group" style={{ position:'relative' }}>
              <label>Symbol</label>
              {selectedStock ? (
                <div className="form-input" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}
                  onClick={() => setSelectedStock(null)}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                    <img src={`https://financialmodelingprep.com/image-stock/${selectedStock.symbol.split('.')[0]}.png`}
                      alt="" style={{ width:20, height:20, borderRadius:'50%' }}
                      onError={e => { e.target.src=`https://ui-avatars.com/api/?name=${selectedStock.symbol}&background=random`; }} />
                    <strong>{selectedStock.symbol}</strong>
                    <span style={{ fontSize:'0.78rem', color:'var(--text-2)', overflow:'hidden', textOverflow:'ellipsis', maxWidth:100 }}>{selectedStock.name}</span>
                  </div>
                  <span style={{ color:'var(--text-2)' }}>×</span>
                </div>
              ) : (
                <>
                  <input type="text" className="form-input" placeholder="Search (e.g. AAPL)"
                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    onFocus={() => setShowDropdown(true)}
                    onBlur={() => setTimeout(() => setShowDropdown(false), 200)} />
                  {showDropdown && searchQuery && (
                    <div className="autocomplete-dropdown glass-panel" style={{ position:'absolute', top:'100%', left:0, right:0, zIndex:9999, maxHeight:240, overflowY:'auto', padding:'0.4rem', marginTop:'0.4rem' }}>
                      {searchResults.length > 0 ? searchResults.map(s => (
                        <div key={s.symbol} style={{ padding:'0.55rem 0.6rem', cursor:'pointer', borderRadius:6, display:'flex', justifyContent:'space-between', alignItems:'center', transition:'background 0.15s' }}
                          onMouseDown={e => { e.preventDefault(); setSearchQuery(s.symbol); setSelectedStock(s); setShowDropdown(false); }}
                          onMouseEnter={e => e.currentTarget.style.background='var(--panel-hover)'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                            <img src={`https://financialmodelingprep.com/image-stock/${s.symbol.split('.')[0]}.png`}
                              alt="" style={{ width:18, height:18, borderRadius:'50%' }}
                              onError={e => { e.target.src=`https://ui-avatars.com/api/?name=${s.symbol}&background=random`; }} />
                            <strong style={{ fontSize:'0.875rem' }}>{s.symbol}</strong>
                          </div>
                          <span style={{ fontSize:'0.78rem', color:'var(--text-2)' }}>{s.name}</span>
                        </div>
                      )) : (
                        <div style={{ padding:'0.6rem', color:'var(--text-2)', textAlign:'center', fontSize:'0.8rem' }}>
                          {searchQuery ? 'Searching…' : 'Type to search'}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="form-group">
              <label>Shares</label>
              <input type="number" className="form-input" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
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
              <button className="btn-primary w-full" onClick={handleSave}
                disabled={!editingAsset && (!selectedStock || !amount || !avgPrice)}
                style={{ opacity:(!editingAsset && (!selectedStock || !amount || !avgPrice)) ? 0.45 : 1 }}>
                {editingAsset ? 'Update' : 'Save Position'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="holdings-grid">
        {holdings.length === 0 ? (
          <div className="holdings-empty">
            <Briefcase size={40} style={{ opacity:0.2 }} />
            <p style={{ fontWeight:600 }}>No positions yet</p>
            <p style={{ fontSize:'0.82rem', opacity:0.7 }}>Add your first stock above to start tracking your portfolio.</p>
          </div>
        ) : (
          holdings.map((asset, idx) => {
            const price   = asset.currentPrice || asset.avgPrice;
            const rate    = asset.exchangeRateToUSD || 1;
            const sym     = asset.currencySymbol || '$';
            const value   = asset.amount * price * rate;
            const cost    = asset.amount * asset.avgPrice * rate;
            const pl      = value - cost;
            const plPct   = cost > 0 ? (pl / cost) * 100 : 0;
            const chgPct  = asset.avgPrice > 0 ? ((price - asset.avgPrice) / asset.avgPrice) * 100 : 0;
            const isPos   = pl >= 0;
            const accent  = CARD_ACCENTS[idx % CARD_ACCENTS.length];

            return (
              <div key={`${asset.symbol}-${idx}`} className="holding-card"
                style={{ '--card-accent': accent, animationDelay:`${idx*0.05}s` }}>

                <div className="hc-top">
                  <div className="hc-identity">
                    <img
                      src={`https://financialmodelingprep.com/image-stock/${asset.symbol.split('.')[0]}.png`}
                      alt={asset.symbol} className="hc-logo"
                      onError={e => { e.target.src=`https://ui-avatars.com/api/?name=${asset.symbol}&background=6366f1&color=fff&bold=true`; }} />
                    <div className="hc-names">
                      <div className="hc-symbol">{asset.symbol}</div>
                      <div className="hc-name">{asset.name || 'Unknown'}</div>
                    </div>
                  </div>
                  <div className="hc-price-block">
                    <div className="hc-price">{sym}{price.toFixed(2)}</div>
                    <div className={`hc-chg ${chgPct >= 0 ? 'pos':'neg'}`}>
                      {chgPct >= 0 ? '▲' : '▼'} {Math.abs(chgPct).toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="hc-pnl-row">
                  <div className="hc-metric">
                    <div className="hc-metric-label">Market Value</div>
                    <div className="hc-metric-val">${fmt2(value)}</div>
                  </div>
                  <div className="hc-metric">
                    <div className="hc-metric-label">P / L</div>
                    <div className={`hc-metric-val ${isPos?'pos':'neg'}`}>
                      {isPos ? '+' : '-'}${fmt2(Math.abs(pl))}
                    </div>
                  </div>
                  <div className="hc-metric">
                    <div className="hc-metric-label">Shares</div>
                    <div className="hc-metric-val">{asset.amount.toFixed(2)}</div>
                  </div>
                  <div className="hc-metric">
                    <div className="hc-metric-label">Avg Cost</div>
                    <div className="hc-metric-val">{sym}{asset.avgPrice.toFixed(2)}</div>
                  </div>
                </div>

                <div className="hc-bar-wrap">
                  <div className="hc-bar-label">
                    <span>Return</span>
                    <span style={{ color: isPos ? 'var(--up)':'var(--down)', fontWeight:700 }}>
                      {isPos?'+':''}{plPct.toFixed(2)}%
                    </span>
                  </div>
                  <div className="hc-bar">
                    <div className="hc-bar-fill"
                      style={{ width:`${Math.min(Math.abs(plPct)/50*100,100)}%`, background: isPos ? 'var(--up)':'var(--down)' }} />
                  </div>
                </div>

                <div className="hc-actions">
                  <button className="hc-btn" onClick={() => handleEdit(asset)}>
                    {isPos ? <TrendingUp size={12} style={{ marginRight:3 }} /> : <TrendingDown size={12} style={{ marginRight:3 }} />}
                    Edit
                  </button>
                  <button className="hc-btn danger" onClick={() => handleRemove(asset.symbol)}>Remove</button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
