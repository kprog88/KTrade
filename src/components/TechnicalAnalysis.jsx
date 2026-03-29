import { useState, useEffect, useMemo } from 'react'
import {
  ComposedChart, Line, Bar, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell
} from 'recharts'
import { TrendingUp, BarChart2, Activity } from 'lucide-react'
import { usePortfolio } from '../context/PortfolioContext'
import { fetchTechnical } from '../data/api'
import './TechnicalAnalysis.css'

// ─── INDICATOR MATH ─────────────────────────────────────────────────────────

function calcSMA(arr, period) {
  return arr.map((_, i) => {
    if (i < period - 1) return null;
    return arr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
  });
}

function calcEMA(arr, period) {
  const k = 2 / (period + 1);
  const out = new Array(arr.length).fill(null);
  // Find first valid index, then seed with SMA
  let start = arr.findIndex(v => v != null);
  if (start === -1 || start + period > arr.length) return out;
  out[start + period - 1] =
    arr.slice(start, start + period).reduce((a, b) => a + b, 0) / period;
  for (let i = start + period; i < arr.length; i++) {
    out[i] = arr[i] * k + out[i - 1] * (1 - k);
  }
  return out;
}

function calcRSI(closes, period = 14) {
  const out = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return out;
  let ag = 0, al = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) ag += d; else al -= d;
  }
  ag /= period; al /= period;
  out[period] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    ag = (ag * (period - 1) + Math.max(d, 0)) / period;
    al = (al * (period - 1) + Math.max(-d, 0)) / period;
    out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  }
  return out;
}

function calcMACD(closes) {
  const e12  = calcEMA(closes, 12);
  const e26  = calcEMA(closes, 26);
  const line = e12.map((v, i) => v != null && e26[i] != null ? +(v - e26[i]).toFixed(4) : null);
  const sig  = calcEMA(line, 9);
  const hist = line.map((v, i) => v != null && sig[i] != null ? +(v - sig[i]).toFixed(4) : null);
  return { line, sig, hist };
}

function calcBollinger(closes, period = 20) {
  const mid = calcSMA(closes, period);
  const upper = [], lower = [];
  closes.forEach((_, i) => {
    if (mid[i] == null) { upper.push(null); lower.push(null); return; }
    const slice = closes.slice(i - period + 1, i + 1);
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mid[i]) ** 2, 0) / period);
    upper.push(+(mid[i] + 2 * std).toFixed(3));
    lower.push(+(mid[i] - 2 * std).toFixed(3));
  });
  return { upper, lower, mid };
}

function lastValid(arr) {
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return arr[i];
  return null;
}

// ─── SIGNAL ANALYSIS ────────────────────────────────────────────────────────

function buildSignals(ohlcv) {
  const closes  = ohlcv.map(d => d.close);
  const vols    = ohlcv.map(d => d.volume);

  const sma20    = calcSMA(closes, 20);
  const sma50    = calcSMA(closes, 50);
  const rsiVals  = calcRSI(closes, 14);
  const macdVals = calcMACD(closes);
  const bolVals  = calcBollinger(closes, 20);

  const lc   = lastValid(closes);
  const ls20 = lastValid(sma20);
  const ls50 = lastValid(sma50);
  const lr   = lastValid(rsiVals);
  const lm   = lastValid(macdVals.line);
  const ls   = lastValid(macdVals.sig);
  const lh   = lastValid(macdVals.hist);
  const lu   = lastValid(bolVals.upper);
  const ll   = lastValid(bolVals.lower);
  const prevHist = macdVals.hist.filter(v => v != null).slice(-2)[0];

  // RSI signal
  let rsiSig;
  if      (lr > 70) rsiSig = { label: 'Overbought',      type: 'sell' };
  else if (lr < 30) rsiSig = { label: 'Oversold',        type: 'buy'  };
  else if (lr >= 55) rsiSig = { label: 'Bullish',         type: 'buy'  };
  else if (lr <= 45) rsiSig = { label: 'Bearish',         type: 'sell' };
  else               rsiSig = { label: 'Neutral',         type: 'neutral' };

  // MACD signal
  let macdSig;
  if      (lm > ls && lh > 0 && lh > prevHist) macdSig = { label: 'Bullish Cross ↑', type: 'buy'  };
  else if (lm > ls)                             macdSig = { label: 'Bullish',          type: 'buy'  };
  else if (lm < ls && lh < 0 && lh < prevHist) macdSig = { label: 'Bearish Cross ↓', type: 'sell' };
  else                                          macdSig = { label: 'Bearish',          type: 'sell' };

  // MA trend signal
  let maSig;
  if      (lc > ls20 && ls20 > ls50) maSig = { label: 'Uptrend ↑↑',   type: 'buy'          };
  else if (lc < ls20 && ls20 < ls50) maSig = { label: 'Downtrend ↓↓', type: 'sell'         };
  else if (lc > ls20)                maSig = { label: 'Above MA20',    type: 'neutral-buy'  };
  else                               maSig = { label: 'Below MA20',    type: 'neutral-sell' };

  // Bollinger signal
  let bolSig;
  if      (lc > lu)              bolSig = { label: 'Above Upper Band', type: 'sell'         };
  else if (lc < ll)              bolSig = { label: 'Below Lower Band', type: 'buy'          };
  else if (lc > (lu + ll) / 2)  bolSig = { label: 'Upper Half',       type: 'neutral-buy'  };
  else                           bolSig = { label: 'Lower Half',       type: 'neutral-sell' };

  // Volume signal (5-day vs 20-day average)
  const recentVol = vols.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const avgVol    = vols.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const vr = avgVol > 0 ? recentVol / avgVol : 1;
  let volSig;
  if      (vr > 1.5) volSig = { label: 'High Volume',    type: 'strong'       };
  else if (vr > 1.1) volSig = { label: 'Above Avg Vol',  type: 'neutral-buy'  };
  else if (vr < 0.7) volSig = { label: 'Low Volume',     type: 'neutral-sell' };
  else               volSig = { label: 'Normal Volume',  type: 'neutral'      };

  const signals = [
    { name: 'RSI(14)',  ...rsiSig,  value: lr?.toFixed(1) },
    { name: 'MACD',     ...macdSig },
    { name: 'MA Trend', ...maSig   },
    { name: 'Bollinger',...bolSig  },
    { name: 'Volume',   ...volSig  },
  ];

  const buyCount  = signals.filter(s => s.type === 'buy').length;
  const sellCount = signals.filter(s => s.type === 'sell').length;

  let overall, overallType;
  if      (buyCount >= 3)                        { overall = 'STRONG BUY';   overallType = 'strong-buy';  }
  else if (buyCount === 2 && sellCount <= 1)      { overall = 'BUY';          overallType = 'buy';         }
  else if (buyCount > sellCount)                  { overall = 'HOLD / BUY';   overallType = 'buy';         }
  else if (sellCount >= 3)                        { overall = 'STRONG SELL';  overallType = 'strong-sell'; }
  else if (sellCount === 2 && buyCount <= 1)      { overall = 'SELL';         overallType = 'sell';        }
  else if (sellCount > buyCount)                  { overall = 'HOLD / SELL';  overallType = 'sell';        }
  else                                            { overall = 'HOLD';         overallType = 'hold';        }

  return {
    signals, overall, overallType,
    computed: { sma20, sma50, rsiVals, macdVals, bolVals },
    stats: { lc, ls20, ls50, lr, lm, ls: lastValid(macdVals.sig), lu, ll },
  };
}

// ─── ANALYST SUGGESTION ─────────────────────────────────────────────────────

function buildSuggestion(symbol, sigData, holding) {
  const { overall, signals, stats } = sigData;
  const { lc, ls20, ls50, lr, lu, ll } = stats;
  const stop = (lc * 0.93).toFixed(2);
  const t1   = (lc * 1.07).toFixed(2);
  const t2   = (lc * 1.15).toFixed(2);
  const pnl  = holding?.avgPrice > 0
    ? ((lc - holding.avgPrice) / holding.avgPrice * 100).toFixed(1) : null;
  const macdSig = signals.find(s => s.name === 'MACD');
  const maSig   = signals.find(s => s.name === 'MA Trend');

  if (overall === 'STRONG BUY') {
    return `${symbol} is displaying a textbook multi-indicator bullish confluence — the strongest setup a technical analyst looks for. RSI at ${lr?.toFixed(1)} signals ${lr < 50 ? 'momentum building from neutral territory, which historically precedes powerful directional moves' : 'sustained buying pressure with room before overbought territory'}. The MACD ${macdSig?.label?.toLowerCase()}, confirming trend strength with accelerating momentum. Price is ${maSig?.type === 'buy' ? 'trading above both the 20-DMA ($' + ls20?.toFixed(2) + ') and 50-DMA ($' + ls50?.toFixed(2) + ') — the classic bullish MA stack' : 'displaying aligned moving average structure'}. ${pnl ? 'Your position is currently ' + (pnl > 0 ? '+' : '') + pnl + '% — consider adding on dips to compound gains.' : 'Accumulate on any intraday pullback.'} Short-term target: $${t1}. Extended target: $${t2}. Protect with a trailing stop at $${stop}.`;
  }
  if (overall === 'BUY' || overall === 'HOLD / BUY') {
    return `${symbol} presents a moderately bullish technical picture. RSI at ${lr?.toFixed(1)} suggests ${lr < 45 ? 'a potential reversal forming from oversold territory — historically a high-probability long entry zone' : 'continued buying interest is present'}. MACD is ${macdSig?.label?.toLowerCase()}, ${macdSig?.type === 'buy' ? 'supporting the case for upside continuation' : 'though with some divergence from price — await confirmation before adding size'}. Price is ${lc > ls20 ? 'holding above the 20-DMA ($' + ls20?.toFixed(2) + '), which is acting as dynamic support — a bullish structural positive' : 'attempting to reclaim the 20-DMA ($' + ls20?.toFixed(2) + ') — a decisive close above this level would signal trend resumption'}. ${pnl ? 'Position is ' + (pnl > 0 ? '+' : '') + pnl + '%.' : ''} Near-term target: $${t1}. Manage risk with a stop below $${stop}.`;
  }
  if (overall === 'STRONG SELL') {
    return `${symbol} is flashing multiple bearish warnings that demand immediate attention. RSI at ${lr?.toFixed(1)} indicates ${lr > 70 ? 'severely overbought conditions — a historically reliable precursor to sharp mean-reversion pullbacks; this level has preceded corrections of 10–20% in similar setups' : 'accelerating distribution pressure with sellers firmly in control'}. The MACD ${macdSig?.label?.toLowerCase()}, reinforcing the bearish thesis with momentum deteriorating rapidly. Price ${maSig?.type === 'sell' ? 'is trading below both the 20-DMA ($' + ls20?.toFixed(2) + ') and 50-DMA ($' + ls50?.toFixed(2) + ') — the bearish MA stack, a pattern associated with sustained downtrends' : 'is testing critical moving average support levels'}. ${pnl && parseFloat(pnl) > 0 ? 'With +' + pnl + '% unrealized gains, this is an optimal point to lock in profits — discipline separates professionals from retail traders.' : 'The position is under pressure; prioritize capital preservation.'} Consider reducing exposure by 50% immediately. Any rally toward $${t1} should be treated as a selling opportunity, not a recovery. Hard stop: $${stop}.`;
  }
  if (overall === 'SELL' || overall === 'HOLD / SELL') {
    return `${symbol}'s technical picture has noticeably weakened. RSI at ${lr?.toFixed(1)} shows ${lr > 60 ? 'fading momentum after a prolonged run — a classic sign of buyer exhaustion and impending rotation' : 'growing selling pressure with bears gaining the upper hand'}. The MACD crossover into bearish territory is a warning that typically precedes further downside; this signal has historically been reliable on daily timeframes. The stock is ${lc < ls20 ? 'trading below its 20-DMA ($' + ls20?.toFixed(2) + '), which has flipped from support to overhead resistance — a structurally negative development' : 'facing increasing technical resistance at key moving average levels'}. ${pnl ? 'Position is currently ' + (pnl > 0 ? '+' : '') + pnl + '% — don\'t let gains evaporate.' : ''} Set a disciplined stop-loss at $${stop}. A technical bounce toward $${t1} may offer a more favorable exit. Avoid averaging down until the trend reverses.`;
  }
  // HOLD
  return `${symbol} is in a consolidation phase with mixed, non-committal signals — the market is in genuine equilibrium. RSI at ${lr?.toFixed(1)} sits in neutral territory, reflecting balanced sentiment; breakouts from this type of compression can be explosive once a catalyst emerges. MACD is ${macdSig?.label?.toLowerCase()}, awaiting a directional trigger. Price is ${Math.abs(lc - ls20) < lc * 0.015 ? 'coiling tightly around the 20-DMA ($' + ls20?.toFixed(2) + ') — this level is the critical inflection point to watch for directional guidance' : lc > ls20 ? 'trading above the 20-DMA ($' + ls20?.toFixed(2) + '), a mild bullish structural positive' : 'trading below the 20-DMA ($' + ls20?.toFixed(2) + '), a mild structural concern'}. The Bollinger Band range ($${ll?.toFixed(2)} – $${lu?.toFixed(2)}) defines the current expected trading envelope. A decisive daily close above $${(lc * 1.025).toFixed(2)} shifts the bias to bullish with a target of $${t1}; a break below $${stop} warrants defensive repositioning. The risk:reward currently favors patience over action.`;
}

// ─── CHART CONSTANTS ────────────────────────────────────────────────────────

const CHART_TABS = ['Price & MAs', 'RSI', 'MACD', 'Volume'];

const tooltipStyle = {
  backgroundColor: 'rgba(13,14,21,0.96)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#f1f5f9',
  fontSize: '0.78rem',
  padding: '0.5rem 0.75rem',
};

const axisStyle = { fontSize: 10, fill: '#94a3b8' };

// ─── STOCK CARD ─────────────────────────────────────────────────────────────

function StockCard({ holding }) {
  const [ohlcv,   setOhlcv]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [activeTab, setActiveTab] = useState('Price & MAs');

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchTechnical(holding.symbol)
      .then(data => {
        if (!data || data.error) throw new Error(data?.error || 'No data returned');
        setOhlcv(data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [holding.symbol]);

  const { chartData, sigData } = useMemo(() => {
    if (ohlcv.length < 30) return { chartData: [], sigData: null };
    const { computed, ...rest } = buildSignals(ohlcv);
    const { sma20, sma50, rsiVals, macdVals, bolVals } = computed;
    const cd = ohlcv.map((d, i) => ({
      date:     d.date.slice(5),      // MM-DD
      close:    d.close,
      open:     d.open,
      high:     d.high,
      low:      d.low,
      volume:   d.volume,
      sma20:    sma20[i],
      sma50:    sma50[i],
      rsi:      rsiVals[i],
      macd:     macdVals.line[i],
      signal:   macdVals.sig[i],
      hist:     macdVals.hist[i],
      bolUpper: bolVals.upper[i],
      bolLower: bolVals.lower[i],
    }));
    return { chartData: cd, sigData: { ...rest, computed } };
  }, [ohlcv]);

  const gradId     = `grad-${holding.symbol.replace(/[^a-z0-9]/gi, '_')}`;
  const price      = holding.currentPrice || holding.avgPrice;
  const sym        = holding.currencySymbol || '$';
  const changePct  = holding.currentPrice && holding.avgPrice
    ? ((holding.currentPrice - holding.avgPrice) / holding.avgPrice * 100)
    : 0;
  const isUp = changePct >= 0;

  const suggestion = useMemo(() => {
    if (!sigData) return '';
    return buildSuggestion(holding.symbol, sigData, holding);
  }, [sigData, holding]);

  const xInterval  = chartData.length > 0 ? Math.max(1, Math.floor(chartData.length / 6)) : 1;

  function renderChart() {
    const common = {
      data: chartData,
      margin: { top: 5, right: 8, left: 0, bottom: 5 },
    };

    if (activeTab === 'Price & MAs') {
      return (
        <ResponsiveContainer width="100%" height={265}>
          <ComposedChart {...common}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={axisStyle} interval={xInterval} tickLine={false} />
            <YAxis domain={['auto', 'auto']} tick={axisStyle} width={62}
              tickLine={false} axisLine={false} tickFormatter={v => v?.toFixed(0)} />
            <Tooltip contentStyle={tooltipStyle}
              formatter={(v, n) => [`${sym}${v?.toFixed(2)}`, n]} />
            <Legend wrapperStyle={{ fontSize: '0.72rem', paddingTop: '6px' }} />
            <Area   type="monotone" dataKey="close"    name="Price"    stroke="#8b5cf6"
              fill={`url(#${gradId})`} fillOpacity={1} strokeWidth={2}
              dot={false} activeDot={{ r: 3 }} />
            <Line   type="monotone" dataKey="sma20"    name="MA 20"    stroke="#3b82f6"
              strokeWidth={1.5} dot={false} strokeDasharray="5 2" connectNulls />
            <Line   type="monotone" dataKey="sma50"    name="MA 50"    stroke="#f59e0b"
              strokeWidth={1.5} dot={false} strokeDasharray="5 2" connectNulls />
            <Line   type="monotone" dataKey="bolUpper" name="BB Upper" stroke="rgba(148,163,184,0.45)"
              strokeWidth={1}   dot={false} strokeDasharray="2 3" connectNulls />
            <Line   type="monotone" dataKey="bolLower" name="BB Lower" stroke="rgba(148,163,184,0.45)"
              strokeWidth={1}   dot={false} strokeDasharray="2 3" connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    if (activeTab === 'RSI') {
      return (
        <ResponsiveContainer width="100%" height={265}>
          <ComposedChart {...common}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={axisStyle} interval={xInterval} tickLine={false} />
            <YAxis domain={[0, 100]} tick={axisStyle} width={32}
              tickLine={false} axisLine={false} ticks={[0, 30, 50, 70, 100]} />
            <Tooltip contentStyle={tooltipStyle}
              formatter={v => [v?.toFixed(1), 'RSI']} />
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5}
              label={{ value: '70 — Overbought', position: 'insideTopRight',
                style: { fontSize: 10, fill: '#ef4444' } }} />
            <ReferenceLine y={50} stroke="rgba(255,255,255,0.18)" strokeDasharray="3 3" strokeWidth={1} />
            <ReferenceLine y={30} stroke="#10b981" strokeDasharray="4 2" strokeWidth={1.5}
              label={{ value: '30 — Oversold', position: 'insideBottomRight',
                style: { fontSize: 10, fill: '#10b981' } }} />
            <Area type="monotone" dataKey="rsi" name="RSI(14)"
              stroke="#8b5cf6" fill="rgba(139,92,246,0.12)"
              strokeWidth={2} dot={false} activeDot={{ r: 3 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    if (activeTab === 'MACD') {
      return (
        <ResponsiveContainer width="100%" height={265}>
          <ComposedChart {...common}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" tick={axisStyle} interval={xInterval} tickLine={false} />
            <YAxis tick={axisStyle} width={52}
              tickLine={false} axisLine={false} tickFormatter={v => v?.toFixed(2)} />
            <Tooltip contentStyle={tooltipStyle}
              formatter={(v, n) => [v?.toFixed(4), n]} />
            <Legend wrapperStyle={{ fontSize: '0.72rem', paddingTop: '6px' }} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
            <Bar dataKey="hist" name="Histogram" radius={[2, 2, 0, 0]} maxBarSize={8}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.hist >= 0 ? '#10b981' : '#ef4444'} opacity={0.8} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="macd"   name="MACD"   stroke="#3b82f6"
              strokeWidth={2}   dot={false} connectNulls />
            <Line type="monotone" dataKey="signal" name="Signal" stroke="#f59e0b"
              strokeWidth={1.5} dot={false} strokeDasharray="5 2" connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    // Volume
    return (
      <ResponsiveContainer width="100%" height={265}>
        <ComposedChart {...common}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={axisStyle} interval={xInterval} tickLine={false} />
          <YAxis tick={axisStyle} width={52}
            tickLine={false} axisLine={false}
            tickFormatter={v => (v / 1e6).toFixed(0) + 'M'} />
          <Tooltip contentStyle={tooltipStyle}
            formatter={v => [(v / 1e6).toFixed(2) + 'M shares', 'Volume']} />
          <Bar dataKey="volume" name="Volume" radius={[2, 2, 0, 0]} maxBarSize={10}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.close >= d.open ? '#10b981' : '#ef4444'} opacity={0.75} />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  const badgeClass = type => ({
    buy:          'ta-badge buy',
    sell:         'ta-badge sell',
    strong:       'ta-badge strong-vol',
    'neutral-buy':  'ta-badge neutral-buy',
    'neutral-sell': 'ta-badge neutral-sell',
  })[type] || 'ta-badge neutral';

  const overallClass = sigData
    ? ({
        'strong-buy':  'ta-overall strong-buy',
        'buy':         'ta-overall buy',
        'sell':        'ta-overall sell',
        'strong-sell': 'ta-overall strong-sell',
        'hold':        'ta-overall hold',
      })[sigData.overallType] || 'ta-overall hold'
    : 'ta-overall hold';

  return (
    <div className="glass-panel ta-card">

      {/* ── Card Header ── */}
      <div className="ta-card-header">
        <div className="ta-card-left">
          <div className="ta-symbol">{holding.symbol}</div>
          <div className="ta-name">{holding.name || holding.symbol}</div>
          <div className="ta-holding-info">
            {holding.amount} shares · avg {sym}{holding.avgPrice?.toFixed(2)}
          </div>
        </div>
        <div className="ta-card-right">
          <div className="ta-price">
            {sym}{price?.toFixed(2)}
            <span className={`ta-change ${isUp ? 'up' : 'down'}`}>
              {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
            </span>
          </div>
          {sigData && (
            <div className={overallClass}>{sigData.overall}</div>
          )}
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="ta-loading">
          <Activity size={18} className="ta-spinner" />
          <span>Loading 6 months of OHLCV data…</span>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="ta-error">⚠ Could not load chart data: {error}</div>
      )}

      {/* ── Main Content ── */}
      {!loading && !error && chartData.length > 0 && (
        <>
          {/* Chart Tabs */}
          <div className="ta-tabs">
            {CHART_TABS.map(tab => (
              <button
                key={tab}
                className={`ta-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >{tab}</button>
            ))}
          </div>

          {/* Chart */}
          <div className="ta-chart-area">{renderChart()}</div>

          {/* Signal Badges */}
          {sigData && (
            <div className="ta-signals">
              {sigData.signals.map(s => (
                <div key={s.name} className={badgeClass(s.type)}>
                  <span className="ta-badge-name">{s.name}</span>
                  <span className="ta-badge-label">
                    {s.label}{s.value ? ` (${s.value})` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Analyst View */}
          {suggestion && (
            <div className="ta-suggestion">
              <div className="ta-suggestion-header">
                <TrendingUp size={15} />
                <span>Technical Analyst View</span>
              </div>
              <p>{suggestion}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── PAGE ────────────────────────────────────────────────────────────────────

export default function TechnicalAnalysis() {
  const { holdings } = usePortfolio();

  return (
    <div className="ta-page">
      <div className="portfolio-header">
        <h2>Technical Analysis</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
          Deep per-stock review — RSI · MACD · Bollinger Bands · Moving Averages · Analyst signals.
        </p>
      </div>

      {holdings.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <BarChart2 size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.35 }} />
          <p>Add stocks to your portfolio to unlock technical analysis.</p>
        </div>
      ) : (
        <div className="ta-stock-grid">
          {holdings.map(h => (
            <StockCard key={h.symbol} holding={h} />
          ))}
        </div>
      )}
    </div>
  );
}
