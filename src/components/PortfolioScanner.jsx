import { useState, useRef, useCallback } from 'react'
import { ScanLine, Camera, Upload, X, Check, AlertTriangle } from 'lucide-react'
import './PortfolioScanner.css'

const COLORS = ['#8b5cf6','#6366f1','#06b6d4','#3b82f6','#f59e0b','#10b981','#ec4899','#f43f5e','#14b8a6'];

// Resize image to max 1400px and convert to jpeg for smaller payload
function resizeImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1400;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height / width) * MAX); width = MAX; }
        else                { width  = Math.round((width / height) * MAX); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob(blob => {
        const reader = new FileReader();
        reader.onload = e => resolve({ base64: e.target.result.split(',')[1], mediaType: 'image/jpeg' });
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.82);
    };
    img.src = url;
  });
}

const SCAN_HINTS = [
  'Reading your positions…',
  'Spotting tickers…',
  'Checking share counts…',
  'Extracting buy prices…',
  'Almost there…',
];

export default function PortfolioScanner({ onClose, onImport, isMobile }) {
  const [imageUrl,   setImageUrl]   = useState(null);
  const [imageData,  setImageData]  = useState(null); // { base64, mediaType }
  const [scanning,   setScanning]   = useState(false);
  const [hintIdx,    setHintIdx]    = useState(0);
  const [results,    setResults]    = useState(null); // { holdings, notes }
  const [rows,       setRows]       = useState([]);   // editable extracted rows
  const [error,      setError]      = useState(null);
  const [dragging,   setDragging]   = useState(false);
  const hintTimer = useRef(null);

  const loadFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    setResults(null); setRows([]); setError(null);
    const previewUrl = URL.createObjectURL(file);
    setImageUrl(previewUrl);
    resizeImage(file).then(data => setImageData(data));
  }, []);

  const onFileChange = e => loadFile(e.target.files[0]);

  const onDrop = e => {
    e.preventDefault(); setDragging(false);
    loadFile(e.dataTransfer.files[0]);
  };

  const clearImage = () => {
    if (imageUrl) URL.revokeObjectURL(imageUrl);
    setImageUrl(null); setImageData(null); setResults(null); setRows([]); setError(null);
  };

  const startHints = () => {
    setHintIdx(0);
    let i = 0;
    hintTimer.current = setInterval(() => {
      i = (i + 1) % SCAN_HINTS.length;
      setHintIdx(i);
    }, 1800);
  };

  const stopHints = () => {
    clearInterval(hintTimer.current);
  };

  const scan = async () => {
    if (!imageData) return;
    setScanning(true); setError(null); setResults(null); setRows([]);
    startHints();
    try {
      const res = await fetch('/api/scan-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: imageData.base64, mediaType: imageData.mediaType }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResults(data);
      setRows((data.holdings || []).map((h, i) => ({
        ...h,
        id: i,
        color: COLORS[i % COLORS.length],
        amount:   h.amount   != null ? String(h.amount)   : '',
        avgPrice: h.avgPrice != null ? String(h.avgPrice) : '',
      })));
    } catch (e) {
      setError(e.message || 'Scan failed — please try again.');
    } finally {
      stopHints();
      setScanning(false);
    }
  };

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeRow = id => setRows(prev => prev.filter(r => r.id !== id));

  const handleImport = () => {
    const valid = rows
      .filter(r => r.symbol && parseFloat(r.amount) > 0)
      .map(r => ({
        symbol:   r.symbol.toUpperCase(),
        name:     r.name || r.symbol,
        amount:   parseFloat(r.amount),
        avgPrice: parseFloat(r.avgPrice) || 0,
        currentPrice: r.currentPrice ? parseFloat(r.currentPrice) : undefined,
      }));
    onImport(valid);
    onClose();
  };

  const readyToImport = rows.some(r => r.symbol && parseFloat(r.amount) > 0);
  const missingPrice  = rows.some(r => r.symbol && (!r.avgPrice || r.avgPrice === ''));

  return (
    <div className="ps-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ps-sheet">

        {/* Header */}
        <div className="ps-header">
          <div className="ps-header-left">
            <ScanLine size={18} color="var(--indigo-2)" />
            <div>
              <div className="ps-title">Scan Portfolio Screenshot</div>
              <div className="ps-subtitle">AI reads your holdings from any app</div>
            </div>
          </div>
          <button className="ps-close" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Body */}
        <div className="ps-body">

          {/* Upload area — only show if no image yet */}
          {!imageUrl && (
            <>
              {/* Desktop drop zone */}
              {!isMobile && (
                <div
                  className={`ps-drop-zone${dragging ? ' drag-over' : ''}`}
                  onDragOver={e => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                >
                  <input type="file" accept="image/*" onChange={onFileChange} />
                  <div className="ps-drop-icon">📸</div>
                  <div className="ps-drop-text">Drop a screenshot here</div>
                  <div className="ps-drop-sub">or click to pick a file</div>
                </div>
              )}

              {/* Mobile: camera-first button */}
              {isMobile && (
                <div className="ps-camera-btn">
                  <input type="file" accept="image/*" capture="environment" onChange={onFileChange} />
                  <Camera size={18} />
                  Take photo of your portfolio
                </div>
              )}

              {/* Gallery picker (both mobile and desktop) */}
              <div className="ps-camera-btn" style={{ background:'var(--panel)', borderColor:'var(--border-soft)', color:'var(--text-2)' }}>
                <input type="file" accept="image/*" onChange={onFileChange} />
                <Upload size={16} />
                {isMobile ? 'Choose from gallery' : 'Or pick any image file'}
              </div>
            </>
          )}

          {/* Preview */}
          {imageUrl && !scanning && (
            <div className="ps-preview-wrap">
              <img src={imageUrl} alt="Portfolio screenshot" className="ps-preview-img" />
              <button className="ps-preview-clear" onClick={clearImage} title="Remove"><X size={13} /></button>
            </div>
          )}

          {/* Scan button */}
          {imageUrl && !scanning && !results && (
            <button className="ps-scan-btn" onClick={scan} disabled={!imageData}>
              <ScanLine size={16} />
              Analyze with AI
            </button>
          )}

          {/* Scanning */}
          {scanning && (
            <div className="ps-scanning">
              <div className="ps-scan-spinner" />
              <span>{SCAN_HINTS[hintIdx]}</span>
              <span className="ps-scan-hint">Claude is reading your screenshot</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="ps-error">
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Results */}
          {results && rows.length > 0 && (
            <>
              <div className="ps-results-hdr">
                <div className="ps-results-title">Found {rows.length} position{rows.length !== 1 ? 's' : ''}</div>
              </div>

              {results.notes && (
                <div className="ps-results-note">
                  💡 {results.notes}
                </div>
              )}

              {missingPrice && (
                <div className="ps-results-note" style={{ borderColor: 'rgba(245,158,11,0.3)', color: 'var(--warn)' }}>
                  ⚠ Some buy prices weren't visible — fill them in or leave blank (you can edit later in Portfolio).
                </div>
              )}

              <div className="ps-holding-cards">
                {rows.map((r, i) => (
                  <div key={r.id} className="ps-holding-card">
                    {/* Dot + symbol */}
                    <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                      <div className="ps-hc-dot" style={{ background: r.color }} />
                    </div>
                    <div>
                      <div className="ps-hc-sym">{r.symbol}</div>
                      {r.name && r.name !== r.symbol && (
                        <div className="ps-hc-name">{r.name}</div>
                      )}
                    </div>
                    <button className="ps-hc-remove" onClick={() => removeRow(r.id)} title="Remove">×</button>

                    {/* Shares field */}
                    <div /> {/* spacer */}
                    <div className="ps-hc-field">
                      <div className="ps-hc-label">Shares / Units</div>
                      <input
                        type="number"
                        className={`ps-hc-input${!r.amount ? ' missing' : ''}`}
                        placeholder="0"
                        value={r.amount}
                        onChange={e => updateRow(r.id, 'amount', e.target.value)}
                        min="0"
                        step="any"
                      />
                    </div>

                    {/* Avg price field */}
                    <div className="ps-hc-field">
                      <div className="ps-hc-label">Avg Buy Price</div>
                      <input
                        type="number"
                        className={`ps-hc-input${!r.avgPrice ? ' missing' : ''}`}
                        placeholder="0.00"
                        value={r.avgPrice}
                        onChange={e => updateRow(r.id, 'avgPrice', e.target.value)}
                        min="0"
                        step="any"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {results && rows.length === 0 && (
                <div className="ps-error">
                  <AlertTriangle size={14} style={{ flexShrink:0 }} />
                  No positions found. Make sure the screenshot clearly shows your holdings list.
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer */}
        {results && rows.length > 0 && (
          <div className="ps-footer">
            <button
              className="ps-import-btn"
              onClick={handleImport}
              disabled={!readyToImport}
            >
              <Check size={16} />
              Import {rows.filter(r => r.symbol && parseFloat(r.amount) > 0).length} position{rows.filter(r => r.symbol && parseFloat(r.amount) > 0).length !== 1 ? 's' : ''} into Portfolio
            </button>
            <div className="ps-footer-note">
              Existing positions with the same ticker will be updated. You can edit everything in Portfolio afterwards.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
