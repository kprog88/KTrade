import { useState, useEffect, useMemo } from 'react'
import {
  ComposedChart, Line, Bar, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell
} from 'recharts'
import { TrendingUp, BarChart2, Activity, Building2, UserCheck, AlertTriangle } from 'lucide-react'
import { usePortfolio } from '../context/PortfolioContext'
import { fetchTechnical, fetchInstitutional } from '../data/api'
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
  const sma150   = calcSMA(closes, 150);
  const rsiVals  = calcRSI(closes, 14);
  const macdVals = calcMACD(closes);
  const bolVals  = calcBollinger(closes, 20);

  const lc    = lastValid(closes);
  const ls20  = lastValid(sma20);
  const ls50  = lastValid(sma50);
  const ls150 = lastValid(sma150);
  const lr    = lastValid(rsiVals);
  const lm    = lastValid(macdVals.line);
  const lh    = lastValid(macdVals.hist);
  const lu    = lastValid(bolVals.upper);
  const ll    = lastValid(bolVals.lower);
  const prevHist = macdVals.hist.filter(v => v != null).slice(-2)[0];

  // RSI
  let rsiSig;
  if      (lr > 70)  rsiSig = { label: 'Overbought',      type: 'sell'    };
  else if (lr < 30)  rsiSig = { label: 'Oversold',        type: 'buy'     };
  else if (lr >= 55) rsiSig = { label: 'Bullish',         type: 'buy'     };
  else if (lr <= 45) rsiSig = { label: 'Bearish',         type: 'sell'    };
  else               rsiSig = { label: 'Neutral',         type: 'neutral' };

  // MACD
  let macdSig;
  if      (lm > 0 && lh > 0 && lh > prevHist) macdSig = { label: 'Bullish Cross ↑', type: 'buy'  };
  else if (lm > 0)                             macdSig = { label: 'Bullish',          type: 'buy'  };
  else if (lm < 0 && lh < 0 && lh < prevHist) macdSig = { label: 'Bearish Cross ↓', type: 'sell' };
  else                                         macdSig = { label: 'Bearish',          type: 'sell' };

  // MA trend
  let maSig;
  if      (lc > ls20 && ls20 > ls50) maSig = { label: 'Uptrend ↑↑',   type: 'buy'          };
  else if (lc < ls20 && ls20 < ls50) maSig = { label: 'Downtrend ↓↓', type: 'sell'         };
  else if (lc > ls20)                maSig = { label: 'Above MA20',    type: 'neutral-buy'  };
  else                               maSig = { label: 'Below MA20',    type: 'neutral-sell' };

  // Bollinger
  let bolSig;
  if      (lc > lu)              bolSig = { label: 'Above Upper Band', type: 'sell'         };
  else if (lc < ll)              bolSig = { label: 'Below Lower Band', type: 'buy'          };
  else if (lc > (lu + ll) / 2)  bolSig = { label: 'Upper Half',       type: 'neutral-buy'  };
  else                           bolSig = { label: 'Lower Half',       type: 'neutral-sell' };

  // Volume
  const recentVol = vols.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const avgVol    = vols.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const vr = avgVol > 0 ? recentVol / avgVol : 1;
  let volSig;
  if      (vr > 1.5) volSig = { label: 'High Volume',   type: 'strong'       };
  else if (vr > 1.1) volSig = { label: 'Above Avg Vol', type: 'neutral-buy'  };
  else if (vr < 0.7) volSig = { label: 'Low Volume',    type: 'neutral-sell' };
  else               volSig = { label: 'Normal Volume', type: 'neutral'      };

  const signals = [
    { name: 'RSI(14)',   ...rsiSig,  value: lr?.toFixed(1) },
    { name: 'MACD',      ...macdSig },
    { name: 'MA Trend',  ...maSig   },
    { name: 'Bollinger', ...bolSig  },
    { name: 'Volume',    ...volSig  },
  ];

  const buyCount  = signals.filter(s => s.type === 'buy').length;
  const sellCount = signals.filter(s => s.type === 'sell').length;

  let overall, overallType;
  if      (buyCount >= 3)                    { overall = 'STRONG BUY';  overallType = 'strong-buy';  }
  else if (buyCount === 2 && sellCount <= 1) { overall = 'BUY';         overallType = 'buy';         }
  else if (buyCount > sellCount)             { overall = 'HOLD / BUY';  overallType = 'buy';         }
  else if (sellCount >= 3)                   { overall = 'STRONG SELL'; overallType = 'strong-sell'; }
  else if (sellCount === 2 && buyCount <= 1) { overall = 'SELL';        overallType = 'sell';        }
  else if (sellCount > buyCount)             { overall = 'HOLD / SELL'; overallType = 'sell';        }
  else                                       { overall = 'HOLD';        overallType = 'hold';        }

  return {
    signals, overall, overallType,
    computed: { sma20, sma50, sma150, rsiVals, macdVals, bolVals },
    stats: { lc, ls20, ls50, ls150, lr, lm, lu, ll },
  };
}

// ─── PLAIN LANGUAGE SUMMARY ─────────────────────────────────────────────────

function buildPlainSummary(symbol, sigData, holding) {
  const { overall, signals, stats } = sigData;
  const { lc, ls20, ls50, lr, lu, ll } = stats;
  const sym  = holding?.currencySymbol || '$';
  const stop = (lc * 0.93).toFixed(2);
  const t1   = (lc * 1.07).toFixed(2);
  const pnl  = holding?.avgPrice > 0
    ? ((lc - holding.avgPrice) / holding.avgPrice * 100).toFixed(1) : null;

  const isBullish = overall.includes('BUY');
  const isBearish = overall.includes('SELL');

  // One-line headline
  let headline;
  if      (overall === 'STRONG BUY')  headline = `${symbol} is looking very strong right now — almost every indicator is pointing up.`;
  else if (overall === 'BUY')         headline = `${symbol} looks positive — more signals are pointing up than down.`;
  else if (overall === 'HOLD / BUY')  headline = `${symbol} is leaning positive, but not a sure thing yet. Worth keeping an eye on.`;
  else if (overall === 'STRONG SELL') headline = `${symbol} is showing serious warning signs — most indicators are flashing red.`;
  else if (overall === 'SELL')        headline = `${symbol} is showing more weakness than strength. Caution is advised.`;
  else if (overall === 'HOLD / SELL') headline = `${symbol} is drifting lower — signals are mixed but leaning negative.`;
  else headline = `${symbol} is in a quiet, sideways phase — no strong signal in either direction right now.`;

  // Bullet explanations in plain English
  const macdSig = signals.find(s => s.name === 'MACD');
  const volSig  = signals.find(s => s.name === 'Volume');

  const bullets = [
    {
      icon: '📈',
      title: 'Price vs. its average lines',
      text: lc > ls20
        ? `The price (${sym}${lc?.toFixed(2)}) is above its 20-day average (${sym}${ls20?.toFixed(2)}). Think of the average as a "normal zone" for the stock — being above it means buyers are in charge right now.`
        : `The price (${sym}${lc?.toFixed(2)}) has dropped below its 20-day average (${sym}${ls20?.toFixed(2)}). When a stock falls below its average, it's a sign that sellers are currently in control.`,
    },
    {
      icon: '⚡',
      title: 'How fast is it moving? (RSI)',
      text: lr > 70
        ? `RSI is ${lr?.toFixed(1)} — the stock has been rising very fast. Think of it like a runner sprinting: impressive, but they might need to slow down soon. Be careful buying at this level — a pullback is more likely.`
        : lr < 30
        ? `RSI is ${lr?.toFixed(1)} — the stock has been falling fast and looks oversold (dropped more than it probably should have). This is often where a bounce happens. Could be a buying opportunity for the brave.`
        : lr >= 55
        ? `RSI is ${lr?.toFixed(1)} — momentum is healthy and positive. Like a car driving steadily on the highway — moving well without being reckless.`
        : lr <= 45
        ? `RSI is ${lr?.toFixed(1)} — momentum is slowing and leaning negative. Buyers aren't showing up strongly. Not a crash, but not exciting either.`
        : `RSI is ${lr?.toFixed(1)} — perfectly neutral. The stock is pausing, neither rushing up nor falling down. Waiting for a spark.`,
    },
    {
      icon: '🧭',
      title: 'Which direction is the trend? (MACD)',
      text: macdSig?.type === 'buy'
        ? `The MACD is pointing upward — like a compass swinging north. The recent trend is positive: over the past few weeks, more people have been buying than selling.`
        : `The MACD is pointing downward — like a compass pointing south. The recent trend has turned negative: selling pressure is currently stronger than buying.`,
    },
    {
      icon: '📦',
      title: 'Is it cheap or expensive right now? (Bollinger Bands)',
      text: lc > lu
        ? `The price has pushed above its normal upper boundary (${sym}${lu?.toFixed(2)}). This can mean the stock is unusually strong — but also that it may have moved too far, too fast. A pullback back toward the middle is common after this.`
        : lc < ll
        ? `The price has fallen below its normal lower boundary (${sym}${ll?.toFixed(2)}). The stock looks unusually cheap compared to recent history. This can be a buying opportunity — but it could also keep falling if the reason for the drop is serious.`
        : `The price is inside its normal trading range (${sym}${ll?.toFixed(2)} – ${sym}${lu?.toFixed(2)}). Nothing extreme — the stock is behaving within expected bounds.`,
    },
    {
      icon: '👥',
      title: 'How much interest is there? (Volume)',
      text: volSig?.type === 'strong'
        ? `A lot more people than usual are trading this stock right now. High volume means the market really "believes" in the current move — it makes price changes more meaningful and reliable.`
        : volSig?.type === 'neutral-buy'
        ? `Slightly more trading activity than usual — a mild vote of confidence for the current direction.`
        : volSig?.type === 'neutral-sell'
        ? `Fewer people than usual are trading it. Quiet markets can mean uncertainty. Price moves on low volume are less trustworthy.`
        : `Trading volume is normal — in line with a typical day. Nothing unusual to flag here.`,
    },
  ];

  // Action advice
  let actionOwn, actionNotOwn;

  if (isBullish) {
    actionOwn = pnl
      ? `You're currently ${parseFloat(pnl) >= 0 ? 'up' : 'down'} ${Math.abs(pnl)}% on this. The signals look good — you can hold and let it keep running. To protect yourself from a sudden drop, you could set a stop-loss around ${sym}${stop} (about 7% below today's price). Target: ${sym}${t1}.`
      : `The trend is in your favour. Hold and consider setting a safety stop at ${sym}${stop} so you don't lose too much if it reverses. Target: ${sym}${t1}.`;
    actionNotOwn = `The conditions look decent for buying. If you've been watching this stock, this could be a reasonable entry point. Don't put everything in at once — start small, see how it moves. First target to watch: ${sym}${t1}.`;
  } else if (isBearish) {
    actionOwn = pnl && parseFloat(pnl) > 5
      ? `You're up ${pnl}% — the signals are turning negative. It might be smart to take some of that profit off the table now, before the price falls back. You could sell half and keep the rest with a tight stop at ${sym}${stop}.`
      : `The signals are weak. Think about whether you want to ride this out or cut your losses. A hard stop at ${sym}${stop} will limit further damage if things get worse.`;
    actionNotOwn = `Now is probably not the best time to buy. The trend is negative and you'd likely be catching a falling knife. Wait for the RSI to drop below 35 or for the MACD to turn positive before considering an entry.`;
  } else {
    actionOwn = `Nothing urgent — the stock is in a quiet phase. Hold and check back in a week. Consider setting a price alert if it drops below ${sym}${stop}.`;
    actionNotOwn = `No clear "buy now" signal yet. The stock is undecided. Watch for a breakout above ${sym}${(lc * 1.03).toFixed(2)} to turn bullish, or wait patiently for a better setup.`;
  }

  return { headline, bullets, actionOwn, actionNotOwn, isBullish, isBearish };
}

// ─── INSTITUTIONAL INTERPRETATION ───────────────────────────────────────────

function buildInstInterpretation(inst) {
  const { breakdown, topHolders, transactions } = inst;

  const buyers    = topHolders.filter(h => h.pctChange > 0.002);
  const sellers   = topHolders.filter(h => h.pctChange < -0.002);
  const bigBuyers = topHolders.filter(h => h.pctChange > 0.05);
  const newEntry  = topHolders.filter(h => h.pctChange > 0.1);

  const insideBuys  = transactions.filter(t => t.code === 'P');
  const insideSells = transactions.filter(t => t.code === 'S');

  const parts = [];

  // Institutional activity
  if (newEntry.length > 0) {
    parts.push(`🚨 Major move: ${newEntry[0].name} has dramatically increased their position — this signals very high conviction from a large fund that has done deep research on this stock.`);
  } else if (bigBuyers.length > 0) {
    parts.push(`📈 ${bigBuyers[0].name} significantly added to their stake. When a major fund makes a large addition, it usually reflects strong confidence in future performance.`);
  } else if (buyers.length > sellers.length) {
    parts.push(`📈 ${buyers.length} of the top institutional holders are growing their positions. In general, when large professional investors are buying, they see more upside than downside ahead.`);
  } else if (sellers.length > 0 && sellers.length > buyers.length) {
    parts.push(`📉 More big funds are trimming their positions than adding. This can mean professional money managers see limited upside or rising risk — worth paying attention to.`);
  } else {
    parts.push(`⚖️ Institutional holders are mostly holding steady — no dramatic buying or selling from the big funds recently.`);
  }

  // Institutional ownership level
  if (breakdown.institutionPct != null) {
    const pct = (breakdown.institutionPct * 100).toFixed(0);
    if (breakdown.institutionPct > 0.8) {
      parts.push(`At ${pct}% institutional ownership, this stock is heavily followed by Wall Street. High institutional ownership means more professional eyes watching it — movements tend to be more deliberate.`);
    } else if (breakdown.institutionPct > 0.5) {
      parts.push(`${pct}% of this stock is held by institutions — a solid level of professional interest that adds credibility to the stock's trading.`);
    } else {
      parts.push(`Only ${pct}% is held by institutions — relatively low. This stock may be under the radar of Wall Street, which can mean more volatility but also bigger discovery potential.`);
    }
  }

  // Insider activity
  if (insideBuys.length > 0 && insideSells.length === 0) {
    parts.push(`✅ Company insiders are buying shares — insiders know their own business better than anyone. Insider buying with no selling is one of the strongest bullish signals available.`);
  } else if (insideBuys.length > insideSells.length) {
    parts.push(`✅ More insiders are buying than selling recently. This is a positive signal — people inside the company believe the stock is undervalued or has a strong future.`);
  } else if (insideSells.length > insideBuys.length * 2) {
    parts.push(`⚠️ Company insiders have been selling more than buying lately. While executives often sell for personal reasons (taxes, diversification), a wave of insider selling can sometimes precede a slowdown or signal they think the stock is fully valued.`);
  } else if (transactions.length === 0) {
    parts.push(`No recent insider transactions on record.`);
  } else {
    parts.push(`Insider activity is a mixed bag — some selling, some buying — which is normal and doesn't signal anything unusual.`);
  }

  return parts;
}

// ─── CHART CONSTANTS ────────────────────────────────────────────────────────

const CHART_TABS = ['Price & MAs', 'RSI', 'MACD', 'Volume'];

const MA_OPTIONS = [
  { key: 'ma20',  label: 'MA 20',  dataKey: 'sma20',  color: '#3b82f6' },
  { key: 'ma50',  label: 'MA 50',  dataKey: 'sma50',  color: '#f59e0b' },
  { key: 'ma150', label: 'MA 150', dataKey: 'sma150', color: '#ec4899' },
];

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
  const [ohlcv,    setOhlcv]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [activeTab, setActiveTab] = useState('Price & MAs');
  const [visibleMAs, setVisibleMAs] = useState({ ma20: true, ma50: true, ma150: true });
  const [instData,     setInstData]     = useState(null);
  const [instLoading,  setInstLoading]  = useState(true);
  const [instError,    setInstError]    = useState(null);

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

    setInstLoading(true);
    setInstError(null);
    fetchInstitutional(holding.symbol)
      .then(data => {
        if (!data || data.error) throw new Error(data?.error || 'No data');
        setInstData(data);
      })
      .catch(e => setInstError(e.message))
      .finally(() => setInstLoading(false));
  }, [holding.symbol]);

  const { chartData, sigData } = useMemo(() => {
    if (ohlcv.length < 30) return { chartData: [], sigData: null };
    const { computed, ...rest } = buildSignals(ohlcv);
    const { sma20, sma50, sma150, rsiVals, macdVals, bolVals } = computed;
    const cd = ohlcv.map((d, i) => ({
      date:     d.date.slice(5),
      close:    d.close,
      open:     d.open,
      volume:   d.volume,
      sma20:    sma20[i],
      sma50:    sma50[i],
      sma150:   sma150[i],
      rsi:      rsiVals[i],
      macd:     macdVals.line[i],
      signal:   macdVals.sig[i],
      hist:     macdVals.hist[i],
      bolUpper: bolVals.upper[i],
      bolLower: bolVals.lower[i],
    }));
    return { chartData: cd, sigData: { ...rest, computed } };
  }, [ohlcv]);

  const gradId    = `grad-${holding.symbol.replace(/[^a-z0-9]/gi, '_')}`;
  const price     = holding.currentPrice || holding.avgPrice;
  const sym       = holding.currencySymbol || '$';
  const changePct = holding.currentPrice && holding.avgPrice
    ? ((holding.currentPrice - holding.avgPrice) / holding.avgPrice * 100) : 0;
  const isUp = changePct >= 0;

  const plainSummary = useMemo(() => {
    if (!sigData) return null;
    return buildPlainSummary(holding.symbol, sigData, holding);
  }, [sigData, holding]);

  const xInterval = chartData.length > 0 ? Math.max(1, Math.floor(chartData.length / 7)) : 1;

  const toggleMA = key => setVisibleMAs(p => ({ ...p, [key]: !p[key] }));

  function renderChart() {
    const common = { data: chartData, margin: { top: 5, right: 8, left: 0, bottom: 5 } };

    if (activeTab === 'Price & MAs') {
      return (
        <>
          {/* MA Toggle Buttons */}
          <div className="ta-ma-toggles">
            {MA_OPTIONS.map(({ key, label, color }) => (
              <button
                key={key}
                className={`ta-ma-toggle ${visibleMAs[key] ? 'on' : 'off'}`}
                style={{ '--ma-color': color }}
                onClick={() => toggleMA(key)}
              >
                <span className="ta-ma-dot" />
                {label}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={265}>
            <ComposedChart {...common}>
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={axisStyle} interval={xInterval} tickLine={false} />
              <YAxis domain={['auto', 'auto']} tick={axisStyle} width={62}
                tickLine={false} axisLine={false} tickFormatter={v => v?.toFixed(0)} />
              <Tooltip contentStyle={tooltipStyle}
                formatter={(v, n) => [`${sym}${v?.toFixed(2)}`, n]} />
              <Legend wrapperStyle={{ fontSize: '0.72rem', paddingTop: '6px' }} />
              <Area type="monotone" dataKey="close" name="Price" stroke="#8b5cf6"
                fill={`url(#${gradId})`} fillOpacity={1} strokeWidth={2}
                dot={false} activeDot={{ r: 3 }} />
              {visibleMAs.ma20 && (
                <Line type="monotone" dataKey="sma20" name="MA 20" stroke="#3b82f6"
                  strokeWidth={1.5} dot={false} strokeDasharray="5 2" connectNulls />
              )}
              {visibleMAs.ma50 && (
                <Line type="monotone" dataKey="sma50" name="MA 50" stroke="#f59e0b"
                  strokeWidth={1.5} dot={false} strokeDasharray="5 2" connectNulls />
              )}
              {visibleMAs.ma150 && (
                <Line type="monotone" dataKey="sma150" name="MA 150" stroke="#ec4899"
                  strokeWidth={1.5} dot={false} strokeDasharray="5 2" connectNulls />
              )}
              <Line type="monotone" dataKey="bolUpper" name="BB Upper"
                stroke="rgba(148,163,184,0.4)" strokeWidth={1}
                dot={false} strokeDasharray="2 3" connectNulls />
              <Line type="monotone" dataKey="bolLower" name="BB Lower"
                stroke="rgba(148,163,184,0.4)" strokeWidth={1}
                dot={false} strokeDasharray="2 3" connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </>
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
    buy:            'ta-badge buy',
    sell:           'ta-badge sell',
    strong:         'ta-badge strong-vol',
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
          {sigData && <div className={overallClass}>{sigData.overall}</div>}
        </div>
      </div>

      {loading && (
        <div className="ta-loading">
          <Activity size={18} className="ta-spinner" />
          <span>Loading 12 months of market data…</span>
        </div>
      )}

      {error && <div className="ta-error">⚠ Could not load chart data: {error}</div>}

      {!loading && !error && chartData.length > 0 && (
        <>
          {/* ── Chart Tabs ── */}
          <div className="ta-tabs">
            {CHART_TABS.map(tab => (
              <button
                key={tab}
                className={`ta-tab ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >{tab}</button>
            ))}
          </div>

          {/* ── Chart ── */}
          <div className="ta-chart-area">{renderChart()}</div>

          {/* ── Signal Badges ── */}
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

          {/* ── Institutional Activity ── */}
          <div className="ta-inst-section">
            <div className="ta-inst-header">
              <Building2 size={15} />
              <span>Big Money &amp; Institutional Activity</span>
            </div>

            {instLoading && (
              <div className="ta-inst-loading">
                <Activity size={14} className="ta-spinner" style={{ flexShrink: 0 }} />
                <span>Loading institutional data…</span>
              </div>
            )}

            {instError && !instLoading && (
              <div className="ta-inst-unavailable">
                <AlertTriangle size={14} />
                <span>Institutional data not available for this symbol.</span>
              </div>
            )}

            {!instLoading && !instError && instData && (
              <>
                {/* ── Overview stats ── */}
                <div className="ta-inst-stats">
                  {instData.breakdown.institutionPct != null && (
                    <div className="ta-inst-stat">
                      <div className="ta-inst-stat-val">
                        {(instData.breakdown.institutionPct * 100).toFixed(1)}%
                      </div>
                      <div className="ta-inst-stat-label">Held by Institutions</div>
                    </div>
                  )}
                  {instData.breakdown.institutionCount != null && (
                    <div className="ta-inst-stat">
                      <div className="ta-inst-stat-val">
                        {instData.breakdown.institutionCount.toLocaleString()}
                      </div>
                      <div className="ta-inst-stat-label">Institutional Investors</div>
                    </div>
                  )}
                  {instData.breakdown.insiderPct != null && (
                    <div className="ta-inst-stat">
                      <div className="ta-inst-stat-val">
                        {(instData.breakdown.insiderPct * 100).toFixed(2)}%
                      </div>
                      <div className="ta-inst-stat-label">Insider Ownership</div>
                    </div>
                  )}
                </div>

                {/* ── Top Institutional Holders ── */}
                {instData.topHolders.length > 0 && (
                  <div className="ta-holders">
                    <div className="ta-holders-title">
                      <UserCheck size={13} /> Top Institutional Holders
                    </div>
                    {instData.topHolders.map((h, i) => {
                      const chg = h.pctChange;
                      const isUp   = chg != null && chg >  0.001;
                      const isDown = chg != null && chg < -0.001;
                      const isBig  = Math.abs(chg ?? 0) > 0.05;
                      return (
                        <div key={i} className={`ta-holder-row ${isBig ? 'highlight' : ''}`}>
                          <div className="ta-holder-name">
                            {isBig && <span className="ta-holder-fire">🔥</span>}
                            {h.name}
                          </div>
                          <div className="ta-holder-right">
                            <span className="ta-holder-pct">
                              {h.pctHeld != null ? (h.pctHeld * 100).toFixed(2) + '%' : '—'}
                            </span>
                            {chg != null && (
                              <span className={`ta-holder-change ${isUp ? 'up' : isDown ? 'down' : 'flat'}`}>
                                {isUp   ? `▲ +${(chg * 100).toFixed(2)}%`
                                : isDown ? `▼ ${(chg * 100).toFixed(2)}%`
                                :          '→ No change'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {instData.topHolders[0]?.reportDate && (
                      <div className="ta-holders-note">
                        Last reported: {instData.topHolders[0].reportDate} (SEC 13F filing)
                      </div>
                    )}
                  </div>
                )}

                {/* ── Insider Transactions ── */}
                {instData.transactions.length > 0 && (
                  <div className="ta-insider">
                    <div className="ta-insider-title">
                      <UserCheck size={13} /> Recent Insider Transactions
                    </div>
                    {instData.transactions.map((t, i) => (
                      <div key={i} className={`ta-insider-row ${t.code === 'P' ? 'buy' : 'sell'}`}>
                        <div className="ta-insider-left">
                          <span className="ta-insider-name">{t.name}</span>
                          <span className="ta-insider-role">{t.role}</span>
                        </div>
                        <div className="ta-insider-right">
                          <span className={`ta-insider-badge ${t.code === 'P' ? 'buy' : 'sell'}`}>
                            {t.code === 'P' ? '↑ BUY' : '↓ SELL'}
                          </span>
                          {t.shares != null && (
                            <span className="ta-insider-shares">
                              {t.shares.toLocaleString()} shares
                            </span>
                          )}
                          {t.date && <span className="ta-insider-date">{t.date}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Plain English Interpretation ── */}
                <div className="ta-inst-interp">
                  {buildInstInterpretation(instData).map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ── Plain Language Summary ── */}
          {plainSummary && (
            <div className="ta-plain-summary">
              <div className="ta-plain-header">
                <TrendingUp size={15} />
                <span>What does this mean?</span>
              </div>

              {/* Headline */}
              <div className={`ta-plain-headline ${plainSummary.isBullish ? 'bull' : plainSummary.isBearish ? 'bear' : 'neutral'}`}>
                <span className="ta-plain-dot" />
                <p>{plainSummary.headline}</p>
              </div>

              {/* Bullets */}
              <div className="ta-plain-bullets">
                {plainSummary.bullets.map((b, i) => (
                  <div key={i} className="ta-plain-bullet">
                    <div className="ta-plain-icon">{b.icon}</div>
                    <div className="ta-plain-content">
                      <div className="ta-plain-title">{b.title}</div>
                      <div className="ta-plain-text">{b.text}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action */}
              <div className="ta-plain-actions">
                <div className="ta-action-block">
                  <div className="ta-action-label">✅ If you already own it</div>
                  <div className="ta-action-text">{plainSummary.actionOwn}</div>
                </div>
                <div className="ta-action-block">
                  <div className="ta-action-label">🤔 If you're thinking of buying</div>
                  <div className="ta-action-text">{plainSummary.actionNotOwn}</div>
                </div>
              </div>
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
          Deep per-stock review — RSI · MACD · Bollinger Bands · MA 20/50/150 · Plain English breakdown.
        </p>
      </div>

      {holdings.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
          <BarChart2 size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.35 }} />
          <p>Add stocks to your portfolio to unlock technical analysis.</p>
        </div>
      ) : (
        <div className="ta-stock-grid">
          {holdings.map(h => <StockCard key={h.symbol} holding={h} />)}
        </div>
      )}
    </div>
  );
}
