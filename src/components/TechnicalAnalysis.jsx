import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react'
import { createChart, ColorType, AreaSeries, LineSeries, HistogramSeries } from 'lightweight-charts'
import { TrendingUp, BarChart2, Activity, Building2, UserCheck, AlertTriangle, ChevronDown, Sparkles } from 'lucide-react'
import { usePortfolio } from '../context/PortfolioContext'
import { fetchTechnical, fetchInstitutional, fetchStockScore } from '../data/api'
import './TechnicalAnalysis.css'

// ─── INDICATOR MATH ──────────────────────────────────────────────────────────

function calcSMA(arr, n) {
  return arr.map((_, i) => {
    if (i < n - 1) return null;
    return arr.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n;
  });
}

function calcEMA(arr, n) {
  const k = 2 / (n + 1);
  const out = new Array(arr.length).fill(null);
  const s = arr.findIndex(v => v != null);
  if (s < 0 || s + n > arr.length) return out;
  out[s + n - 1] = arr.slice(s, s + n).reduce((a, b) => a + b, 0) / n;
  for (let i = s + n; i < arr.length; i++)
    out[i] = arr[i] * k + out[i - 1] * (1 - k);
  return out;
}

function calcRSI(closes, n = 14) {
  const out = new Array(closes.length).fill(null);
  if (closes.length < n + 1) return out;
  let ag = 0, al = 0;
  for (let i = 1; i <= n; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) ag += d; else al -= d;
  }
  ag /= n; al /= n;
  out[n] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  for (let i = n + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    ag = (ag * (n - 1) + Math.max(d, 0)) / n;
    al = (al * (n - 1) + Math.max(-d, 0)) / n;
    out[i] = al === 0 ? 100 : 100 - 100 / (1 + ag / al);
  }
  return out;
}

function calcMACD(closes) {
  const e12 = calcEMA(closes, 12), e26 = calcEMA(closes, 26);
  const line = e12.map((v, i) => v != null && e26[i] != null ? +(v - e26[i]).toFixed(4) : null);
  const sig  = calcEMA(line, 9);
  const hist = line.map((v, i) => v != null && sig[i] != null ? +(v - sig[i]).toFixed(4) : null);
  return { line, sig, hist };
}

function calcBollinger(closes, n = 20) {
  const mid = calcSMA(closes, n);
  const upper = [], lower = [];
  closes.forEach((_, i) => {
    if (mid[i] == null) { upper.push(null); lower.push(null); return; }
    const sl = closes.slice(i - n + 1, i + 1);
    const std = Math.sqrt(sl.reduce((s, v) => s + (v - mid[i]) ** 2, 0) / n);
    upper.push(+(mid[i] + 2 * std).toFixed(3));
    lower.push(+(mid[i] - 2 * std).toFixed(3));
  });
  return { upper, lower, mid };
}

function lastValid(arr) {
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return arr[i];
  return null;
}

// ─── SIGNAL ANALYSIS ─────────────────────────────────────────────────────────

function buildSignals(ohlcv) {
  const closes = ohlcv.map(d => d.close);
  const vols   = ohlcv.map(d => d.volume);
  const sma20  = calcSMA(closes, 20), sma50 = calcSMA(closes, 50);
  const sma120 = calcSMA(closes, 120), sma150 = calcSMA(closes, 150);
  const rsiV   = calcRSI(closes, 14);
  const macdV  = calcMACD(closes);
  const bolV   = calcBollinger(closes, 20);

  const lc = lastValid(closes), l20 = lastValid(sma20), l50 = lastValid(sma50);
  const l120 = lastValid(sma120), l150 = lastValid(sma150);
  const lr = lastValid(rsiV), lm = lastValid(macdV.line), lh = lastValid(macdV.hist);
  const lu = lastValid(bolV.upper), ll = lastValid(bolV.lower);
  const prevH = macdV.hist.filter(v => v != null).slice(-2)[0];

  const rsiSig  = lr > 70  ? { label:'Overbought', type:'sell' }
                : lr < 30  ? { label:'Oversold',   type:'buy'  }
                : lr >= 55 ? { label:'Bullish',     type:'buy'  }
                : lr <= 45 ? { label:'Bearish',     type:'sell' }
                :            { label:'Neutral',     type:'neutral' };

  const macdSig = lm > 0 && lh > 0 && lh > prevH ? { label:'Bullish Cross ↑', type:'buy'  }
                : lm > 0                           ? { label:'Bullish',         type:'buy'  }
                : lm < 0 && lh < 0 && lh < prevH  ? { label:'Bearish Cross ↓', type:'sell' }
                :                                    { label:'Bearish',         type:'sell' };

  const maSig   = lc > l20 && l20 > l50 && l50 > l120 ? { label:'Strong Uptrend ↑↑', type:'buy'          }
                : lc < l20 && l20 < l50 && l50 < l120  ? { label:'Strong Downtrend ↓↓',type:'sell'         }
                : lc > l20                              ? { label:'Above MA20',        type:'neutral-buy'  }
                :                                         { label:'Below MA20',        type:'neutral-sell' };

  const bolSig  = lc > lu ? { label:'Above Upper Band', type:'sell'        }
                : lc < ll ? { label:'Below Lower Band', type:'buy'         }
                : lc > (lu + ll) / 2 ? { label:'Upper Half', type:'neutral-buy'  }
                :                       { label:'Lower Half', type:'neutral-sell' };

  const rVol = vols.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const aVol = vols.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const vr = aVol > 0 ? rVol / aVol : 1;
  const volSig = vr > 1.5 ? { label:'High Volume',   type:'strong'       }
               : vr > 1.1 ? { label:'Above Avg',     type:'neutral-buy'  }
               : vr < 0.7 ? { label:'Low Volume',    type:'neutral-sell' }
               :             { label:'Normal Volume', type:'neutral'      };

  const signals = [
    { name:'RSI(14)',  ...rsiSig,  value: lr?.toFixed(1) },
    { name:'MACD',     ...macdSig },
    { name:'MA Trend', ...maSig   },
    { name:'Bollinger',...bolSig  },
    { name:'Volume',   ...volSig  },
  ];

  const buys  = signals.filter(s => s.type === 'buy').length;
  const sells = signals.filter(s => s.type === 'sell').length;

  let overall, overallType;
  if      (buys >= 3)                  { overall='STRONG BUY';  overallType='strong-buy';  }
  else if (buys === 2 && sells <= 1)   { overall='BUY';         overallType='buy';         }
  else if (buys > sells)               { overall='HOLD / BUY';  overallType='buy';         }
  else if (sells >= 3)                 { overall='STRONG SELL'; overallType='strong-sell'; }
  else if (sells === 2 && buys <= 1)   { overall='SELL';        overallType='sell';        }
  else if (sells > buys)               { overall='HOLD / SELL'; overallType='sell';        }
  else                                 { overall='HOLD';        overallType='hold';        }

  return {
    signals, overall, overallType,
    computed: { sma20, sma50, sma120, sma150, rsiV, macdV, bolV },
    stats: { lc, l20, l50, l120, l150, lr, lm, lu, ll },
  };
}

// ─── PLAIN LANGUAGE SUMMARY ──────────────────────────────────────────────────

function buildPlainSummary(symbol, sigData, holding) {
  const { overall, signals, stats } = sigData;
  const { lc, l20, l120, lr, lu, ll } = stats;
  const sym  = holding?.currencySymbol || '$';
  const stop = (lc * 0.93).toFixed(2);
  const t1   = (lc * 1.07).toFixed(2);
  const pnl  = holding?.avgPrice > 0
    ? ((lc - holding.avgPrice) / holding.avgPrice * 100).toFixed(1) : null;

  const isBullish = overall.includes('BUY');
  const isBearish = overall.includes('SELL');

  let headline;
  if      (overall==='STRONG BUY')  headline=`${symbol} is looking very strong — almost every indicator is pointing up.`;
  else if (overall==='BUY')         headline=`${symbol} looks positive — more signals are pointing up than down.`;
  else if (overall==='HOLD / BUY')  headline=`${symbol} is leaning bullish, but not a clear signal yet. Worth monitoring.`;
  else if (overall==='STRONG SELL') headline=`${symbol} is showing serious warning signs — most indicators are flashing red.`;
  else if (overall==='SELL')        headline=`${symbol} is showing more weakness than strength — caution advised.`;
  else if (overall==='HOLD / SELL') headline=`${symbol} is drifting lower — signals are mixed but leaning negative.`;
  else headline=`${symbol} is in a sideways phase — no strong signal in either direction.`;

  const macdSig = signals.find(s => s.name === 'MACD');
  const volSig  = signals.find(s => s.name === 'Volume');

  const bullets = [
    {
      icon:'📈', title:'Price vs Moving Averages',
      text: lc > l20
        ? `Price (${sym}${lc?.toFixed(2)}) is above its 20-day average (${sym}${l20?.toFixed(2)}) — buyers are in control short-term. ${lc > l120 ? `Also above the 120-day (${sym}${l120?.toFixed(2)}), confirming a strong sustained uptrend.` : `But it's still below the 120-day (${sym}${l120?.toFixed(2)}), so longer-term recovery is still needed.`}`
        : `Price (${sym}${lc?.toFixed(2)}) is below its 20-day average (${sym}${l20?.toFixed(2)}) — short-term weakness. ${lc < l120 ? `Also below the 120-day (${sym}${l120?.toFixed(2)}), confirming a sustained downtrend.` : `However it's still above the 120-day (${sym}${l120?.toFixed(2)}), so the longer-term trend is intact.`}`,
    },
    {
      icon:'⚡', title:'Momentum (RSI)',
      text: lr > 70 ? `RSI ${lr?.toFixed(1)} — overbought. The stock has sprinted ahead; a pullback is likely. Careful buying here.`
          : lr < 30 ? `RSI ${lr?.toFixed(1)} — oversold. The stock has fallen hard; a bounce is increasingly probable.`
          : lr >= 55 ? `RSI ${lr?.toFixed(1)} — healthy momentum. Moving steadily without being overextended.`
          : lr <= 45 ? `RSI ${lr?.toFixed(1)} — momentum fading. Buyers aren't showing up strongly.`
          : `RSI ${lr?.toFixed(1)} — perfectly neutral. The stock is pausing, waiting for a direction.`,
    },
    {
      icon:'🧭', title:'Trend Direction (MACD)',
      text: macdSig?.type === 'buy'
        ? `MACD is pointing upward — the trend is building bullish momentum. Over recent weeks buyers have been in control.`
        : `MACD is pointing downward — the recent trend has turned negative. Selling pressure outweighs buying.`,
    },
    {
      icon:'📦', title:'Price Range (Bollinger Bands)',
      text: lc > lu ? `Price has pushed above the upper band (${sym}${lu?.toFixed(2)}) — unusually strong but potentially overextended. A pullback toward the middle is common after this.`
          : lc < ll ? `Price has fallen below the lower band (${sym}${ll?.toFixed(2)}) — looks cheap relative to recent history. Potential reversal zone.`
          : `Price is inside the normal trading range (${sym}${ll?.toFixed(2)}–${sym}${lu?.toFixed(2)}). Behaving within expected bounds.`,
    },
    {
      icon:'👥', title:'Market Interest (Volume)',
      text: volSig?.type === 'strong' ? `Significantly above-average volume — the market believes in this move. High volume confirms price direction.`
          : volSig?.type === 'neutral-buy' ? `Slightly above-average trading activity — mild confirmation of the current direction.`
          : volSig?.type === 'neutral-sell' ? `Below-average volume — price moves on low conviction. Less reliable signal.`
          : `Normal volume — typical day, nothing unusual.`,
    },
  ];

  let actionOwn, actionNotOwn;
  if (isBullish) {
    actionOwn    = pnl ? `You're ${parseFloat(pnl) >= 0 ? 'up' : 'down'} ${Math.abs(pnl)}% on this. Signals look positive — hold and let it run. Consider a stop-loss at ${sym}${stop} (~7% below). Target: ${sym}${t1}.`
                       : `Trend is in your favour. Hold and set a stop at ${sym}${stop}. Target: ${sym}${t1}.`;
    actionNotOwn = `Conditions look reasonable for a buy. Consider a small initial position; don't go all-in at once. First target: ${sym}${t1}.`;
  } else if (isBearish) {
    actionOwn    = pnl && parseFloat(pnl) > 5
      ? `You're up ${pnl}% but signals are turning negative. Consider taking partial profits. Hard stop at ${sym}${stop}.`
      : `Signals are weak. Decide whether to hold or cut losses. Stop at ${sym}${stop} limits further damage.`;
    actionNotOwn = `Not a good entry right now. Wait for RSI to drop below 35 or MACD to turn bullish before considering a buy.`;
  } else {
    actionOwn    = `Stock is in a quiet phase — no urgent action needed. Set a price alert below ${sym}${stop}.`;
    actionNotOwn = `No clear buy signal yet. Watch for a breakout above ${sym}${(lc * 1.03).toFixed(2)} before considering entry.`;
  }

  return { headline, bullets, actionOwn, actionNotOwn, isBullish, isBearish };
}

// ─── INSTITUTIONAL INTERPRETATION ────────────────────────────────────────────

function buildInstInterpretation(inst) {
  const { breakdown, topHolders, transactions } = inst;
  const buyers    = topHolders.filter(h => h.pctChange > 0.002);
  const sellers   = topHolders.filter(h => h.pctChange < -0.002);
  const bigBuyers = topHolders.filter(h => h.pctChange > 0.05);
  const newEntry  = topHolders.filter(h => h.pctChange > 0.1);
  const insideBuys  = transactions.filter(t => t.code === 'P');
  const insideSells = transactions.filter(t => t.code === 'S');
  const parts = [];

  if (newEntry.length > 0)
    parts.push(`🚨 Major conviction move: ${newEntry[0].name} dramatically increased their position — signals extreme confidence from a large fund.`);
  else if (bigBuyers.length > 0)
    parts.push(`📈 ${bigBuyers[0].name} significantly added to their stake. Large fund additions usually reflect strong conviction in future performance.`);
  else if (buyers.length > sellers.length)
    parts.push(`📈 ${buyers.length} top institutional holders are growing their positions. Professional money sees more upside than downside.`);
  else if (sellers.length > buyers.length)
    parts.push(`📉 More big funds are trimming than adding. This can signal professional managers see limited upside or elevated risk.`);
  else
    parts.push(`⚖️ Institutional holders are mostly holding steady — no dramatic moves from the big funds recently.`);

  if (breakdown.institutionPct != null) {
    const pct = (breakdown.institutionPct * 100).toFixed(0);
    if (breakdown.institutionPct > 0.8)
      parts.push(`At ${pct}% institutional ownership, this stock is heavily watched by Wall Street. Movements tend to be deliberate.`);
    else if (breakdown.institutionPct > 0.5)
      parts.push(`${pct}% held by institutions — solid professional interest adding credibility to the stock.`);
    else
      parts.push(`Only ${pct}% institutional ownership — relatively under the radar, which can mean more volatility but also discovery potential.`);
  }

  if (insideBuys.length > 0 && insideSells.length === 0)
    parts.push(`✅ Insiders are buying with no selling — one of the strongest possible bullish signals. They know the business best.`);
  else if (insideBuys.length > insideSells.length)
    parts.push(`✅ More insiders buying than selling. People inside the company believe the stock is undervalued.`);
  else if (insideSells.length > insideBuys.length * 2)
    parts.push(`⚠️ Significant insider selling. While often for personal reasons, a wave of insider selling warrants attention.`);
  else if (transactions.length === 0)
    parts.push(`No recent insider transactions on record.`);
  else
    parts.push(`Insider activity is mixed — some buying, some selling — which is normal and not unusual.`);

  return parts;
}

// ─── SCORE GAUGE (SVG) ───────────────────────────────────────────────────────

function scoreColor(score) {
  if (score >= 75) return '#22c55e';
  if (score >= 60) return '#4ade80';
  if (score >= 45) return '#f59e0b';
  if (score >= 30) return '#f87171';
  return '#ef4444';
}

function ScoreGauge({ score, size = 160 }) {
  const r = 58, cx = 80, cy = 80;
  const capScore = Math.min(score, 99.9);
  const endAngle = Math.PI + (capScore / 100) * Math.PI;
  const x = cx + r * Math.cos(endAngle);
  const y = cy + r * Math.sin(endAngle);
  const color = scoreColor(score);
  const trackD = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;
  const fillD  = capScore <= 0 ? null
    : `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}`;

  return (
    <svg viewBox="0 0 160 100" width={size} height={size * 0.625} style={{ overflow: 'visible' }}>
      {/* Track */}
      <path d={trackD} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" strokeLinecap="round" />
      {/* Fill */}
      {fillD && (
        <path d={fillD} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }} />
      )}
      {/* Score */}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--text-primary)" fontSize="28" fontWeight="800" fontFamily="Inter, sans-serif">{score}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="var(--text-secondary)" fontSize="9" fontFamily="Inter, sans-serif">OUT OF 100</text>
    </svg>
  );
}

// ─── PILLAR BAR ───────────────────────────────────────────────────────────────

function PillarCard({ label, score, icon, detail }) {
  const color = scoreColor(score);
  return (
    <div className="ta-pillar">
      <div className="ta-pillar-top">
        <span className="ta-pillar-icon">{icon}</span>
        <span className="ta-pillar-label">{label}</span>
        <span className="ta-pillar-score" style={{ color }}>{score}</span>
      </div>
      <div className="ta-pillar-bar-track">
        <div className="ta-pillar-bar-fill" style={{ width: `${score}%`, background: color }} />
      </div>
      {detail && <div className="ta-pillar-detail">{detail}</div>}
    </div>
  );
}

// ─── SCORE HERO ───────────────────────────────────────────────────────────────

function ScoreHero({ scoreData }) {
  if (!scoreData) {
    return (
      <div className="ta-score-hero loading">
        <Activity size={18} className="ta-spinner" />
        <span>Calculating investment score…</span>
      </div>
    );
  }

  const { score, verdict, verdictType, breakdown, details } = scoreData;

  const verdictMeta = {
    'strong-buy':  { label: 'Strong Buy',  emoji: '🚀', desc: 'Exceptional setup across all factors' },
    'buy':         { label: 'Buy',          emoji: '✅', desc: 'Multiple factors align bullish'       },
    'hold':        { label: 'Hold',         emoji: '⏸',  desc: 'Mixed signals — monitor closely'     },
    'sell':        { label: 'Sell',         emoji: '⚠️', desc: 'More bearish signals than bullish'    },
    'strong-sell': { label: 'Strong Sell',  emoji: '🔴', desc: 'High-risk — most signals bearish'    },
  };
  const meta = verdictMeta[verdictType] || { label: verdict, emoji: '⏸', desc: '' };

  const techDetail  = details?.technical  ? Object.entries(details.technical).slice(0, 2).map(([k,v]) => `${k}: ${v?.value ?? v?.signal ?? v}`).join(' · ') : null;
  const momDetail   = details?.momentum   ? Object.entries(details.momentum).filter(([,v]) => v).slice(0, 3).map(([k,v]) => `${k} ${v}`).join(' · ') : null;
  const fundDetail  = details?.fundamental ? Object.entries(details.fundamental).slice(0, 2).map(([k,v]) => `${k}: ${v}`).join(' · ') : null;
  const instDetail  = details?.institutional ? Object.entries(details.institutional).slice(0, 2).map(([,v]) => v).join(' · ') : null;

  return (
    <div className="ta-score-hero">
      <div className="ta-score-left">
        <ScoreGauge score={score} />
        <div className={`ta-verdict-badge ${verdictType}`}>
          <span>{meta.emoji}</span>
          <span>{meta.label}</span>
        </div>
        <p className="ta-verdict-desc">{meta.desc}</p>
      </div>

      <div className="ta-score-right">
        <div className="ta-pillars-grid">
          <PillarCard label="Technical"     score={breakdown.technical}     icon="📊" detail={techDetail}  />
          <PillarCard label="Momentum"      score={breakdown.momentum}      icon="🚀" detail={momDetail}   />
          <PillarCard label="Fundamentals"  score={breakdown.fundamental}   icon="💼" detail={fundDetail}  />
          <PillarCard label="Institutional" score={breakdown.institutional} icon="🏛" detail={instDetail}  />
        </div>
      </div>
    </div>
  );
}

// ─── CHART WIDTH HOOK ─────────────────────────────────────────────────────────

function useChartWidth(isActive) {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);

  const measure = useCallback(() => {
    if (!ref.current) return;
    const w = ref.current.getBoundingClientRect().width;
    if (w > 10) { setWidth(Math.floor(w)); return; }
    let el = ref.current.parentElement;
    while (el) {
      const pw = el.getBoundingClientRect().width;
      if (pw > 10) { setWidth(Math.floor(pw - 24)); return; }
      el = el.parentElement;
    }
    setWidth(Math.max(200, window.innerWidth - 80));
  }, []);

  useLayoutEffect(() => { measure(); }, [measure]);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new ResizeObserver(measure);
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [measure]);

  useEffect(() => {
    if (!isActive) return;
    const ts = [setTimeout(measure, 30), setTimeout(measure, 200), setTimeout(measure, 450)];
    return () => ts.forEach(clearTimeout);
  }, [isActive, measure]);

  useEffect(() => {
    window.addEventListener('resize', measure, { passive: true });
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  return [ref, width];
}

// ─── CHART ───────────────────────────────────────────────────────────────────

const CHART_TABS = ['Price & MAs', 'RSI', 'MACD', 'Volume'];
const MA_OPTIONS = [
  { key:'ma20',  label:'MA 20',  dataKey:'sma20',  color:'#3b82f6' },
  { key:'ma50',  label:'MA 50',  dataKey:'sma50',  color:'#f59e0b' },
  { key:'ma120', label:'MA 120', dataKey:'sma120', color:'#10b981' },
  { key:'ma150', label:'MA 150', dataKey:'sma150', color:'#ec4899' },
];
const CHART_H = 240;

function StockChart({ chartData, isActive, chartWidth, activeTab, visibleMAs }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;
    const w = Math.max(200, Math.min(chartWidth - 2, 1200));
    const sorted = [...chartData].sort((a, b) => new Date(a.date) - new Date(b.date));

    const chart = createChart(chartRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8b95a8',
      },
      grid: {
        vertLines: { color: 'rgba(255,255,255,0.04)' },
        horzLines: { color: 'rgba(255,255,255,0.04)' },
      },
      width: w,
      height: CHART_H,
      rightPriceScale: { borderColor: 'rgba(255,255,255,0.08)' },
      timeScale: { borderColor: 'rgba(255,255,255,0.08)', timeVisible: false },
      crosshair: { horzLine: { color: 'rgba(255,255,255,0.2)' }, vertLine: { color: 'rgba(255,255,255,0.2)' } },
    });

    if (activeTab === 'Price & MAs') {
      chart.addSeries(AreaSeries, { lineColor:'#6366f1', topColor:'rgba(99,102,241,0.25)', bottomColor:'rgba(99,102,241,0)', lineWidth:2 })
        .setData(sorted.map(d => ({ time: d.date, value: d.close })));
      if (visibleMAs.ma20)  chart.addSeries(LineSeries, { color:'#3b82f6', lineWidth:1.5, lineStyle:2 }).setData(sorted.filter(d=>d.sma20).map(d=>({time:d.date,value:d.sma20})));
      if (visibleMAs.ma50)  chart.addSeries(LineSeries, { color:'#f59e0b', lineWidth:1.5, lineStyle:2 }).setData(sorted.filter(d=>d.sma50).map(d=>({time:d.date,value:d.sma50})));
      if (visibleMAs.ma120) chart.addSeries(LineSeries, { color:'#10b981', lineWidth:1.5, lineStyle:2 }).setData(sorted.filter(d=>d.sma120).map(d=>({time:d.date,value:d.sma120})));
      if (visibleMAs.ma150) chart.addSeries(LineSeries, { color:'#ec4899', lineWidth:1.5, lineStyle:2 }).setData(sorted.filter(d=>d.sma150).map(d=>({time:d.date,value:d.sma150})));
      chart.addSeries(LineSeries, { color:'rgba(148,163,184,0.35)', lineWidth:1, lineStyle:3 }).setData(sorted.filter(d=>d.bolUpper).map(d=>({time:d.date,value:d.bolUpper})));
      chart.addSeries(LineSeries, { color:'rgba(148,163,184,0.35)', lineWidth:1, lineStyle:3 }).setData(sorted.filter(d=>d.bolLower).map(d=>({time:d.date,value:d.bolLower})));
    } else if (activeTab === 'RSI') {
      chart.addSeries(LineSeries, { color:'#818cf8', lineWidth:2 }).setData(sorted.filter(d=>d.rsi).map(d=>({time:d.date,value:d.rsi})));
      chart.addSeries(LineSeries, { color:'#ef4444', lineWidth:1, lineStyle:2 }).setData(sorted.map(d=>({time:d.date,value:70})));
      chart.addSeries(LineSeries, { color:'#22c55e', lineWidth:1, lineStyle:2 }).setData(sorted.map(d=>({time:d.date,value:30})));
    } else if (activeTab === 'MACD') {
      chart.addSeries(LineSeries, { color:'#3b82f6', lineWidth:2 }).setData(sorted.filter(d=>d.macd).map(d=>({time:d.date,value:d.macd})));
      chart.addSeries(LineSeries, { color:'#f59e0b', lineWidth:1.5, lineStyle:2 }).setData(sorted.filter(d=>d.signal).map(d=>({time:d.date,value:d.signal})));
      chart.addSeries(HistogramSeries, {}).setData(sorted.filter(d=>d.hist).map(d=>({time:d.date,value:d.hist,color:d.hist>=0?'#22c55e':'#ef4444'})));
    } else if (activeTab === 'Volume') {
      chart.addSeries(HistogramSeries, { priceFormat:{type:'volume'} })
        .setData(sorted.map(d=>({time:d.date,value:d.volume,color:d.close>=d.open?'rgba(34,197,94,0.6)':'rgba(239,68,68,0.6)'})));
    }

    chart.timeScale().fitContent();
    return () => { chart.remove(); };
  }, [chartData, activeTab, chartWidth, visibleMAs]);

  return <div ref={chartRef} className="ta-chart-area" style={{ width:'100%', height: CHART_H + 30, position:'relative' }} />;
}

// ─── STOCK CARD ───────────────────────────────────────────────────────────────

function StockCard({ holding, isActive, onSignalReady }) {
  const [ohlcv,       setOhlcv]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [activeTab,   setActiveTab]   = useState('Price & MAs');
  const [visibleMAs,  setVisibleMAs]  = useState({ ma20:true, ma50:true, ma120:true, ma150:false });
  const [instData,    setInstData]    = useState(null);
  const [instLoading, setInstLoading] = useState(true);
  const [instError,   setInstError]   = useState(null);
  const [scoreData,   setScoreData]   = useState(null);
  const hasFetched = useRef(false);
  const [chartContRef, chartWidth] = useChartWidth(isActive);

  useEffect(() => {
    if (!isActive || hasFetched.current) return;
    hasFetched.current = true;

    fetchTechnical(holding.symbol)
      .then(d => { if (!d || d.error) throw new Error(d?.error||'No data'); setOhlcv(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

    fetchInstitutional(holding.symbol)
      .then(d => { if (!d||d.error) throw new Error(d?.error||'No data'); setInstData(d); })
      .catch(e => setInstError(e.message))
      .finally(() => setInstLoading(false));

    fetchStockScore(holding.symbol).then(d => d && setScoreData(d));
  }, [isActive, holding.symbol]);

  const { chartData, sigData } = useMemo(() => {
    if (ohlcv.length < 30) return { chartData:[], sigData:null };
    const { computed, ...rest } = buildSignals(ohlcv);
    const { sma20, sma50, sma120, sma150, rsiV, macdV, bolV } = computed;
    const cd = ohlcv.map((d, i) => ({
      date: d.date, close: d.close, open: d.open, volume: d.volume,
      sma20: sma20[i], sma50: sma50[i], sma120: sma120[i], sma150: sma150[i],
      rsi:   rsiV[i],  macd: macdV.line[i], signal: macdV.sig[i], hist: macdV.hist[i],
      bolUpper: bolV.upper[i], bolLower: bolV.lower[i],
    }));
    return { chartData: cd, sigData: { ...rest, computed } };
  }, [ohlcv]);

  const plainSummary = useMemo(() => {
    if (!sigData || !ohlcv.length) return null;
    return buildPlainSummary(holding.symbol, sigData, holding);
  }, [sigData, ohlcv, holding]);

  useEffect(() => {
    if (sigData && onSignalReady)
      onSignalReady(holding.symbol, { overall: sigData.overall, overallType: sigData.overallType });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sigData]);

  const toggleMA = key => setVisibleMAs(p => ({ ...p, [key]: !p[key] }));

  const badgeClass = type => ({
    buy:           'ta-badge buy',
    sell:          'ta-badge sell',
    strong:        'ta-badge strong-vol',
    'neutral-buy': 'ta-badge neutral-buy',
    'neutral-sell':'ta-badge neutral-sell',
  })[type] || 'ta-badge neutral';

  return (
    <div className="ta-card-body">

      {/* ── Score Hero ── */}
      <ScoreHero scoreData={scoreData} />

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
            {CHART_TABS.map(t => (
              <button key={t} className={`ta-tab ${activeTab===t?'active':''}`} onClick={() => setActiveTab(t)}>{t}</button>
            ))}
          </div>

          {/* ── MA Toggles ── */}
          {activeTab === 'Price & MAs' && (
            <div className="ta-ma-toggles">
              {MA_OPTIONS.map(({ key, label, color }) => (
                <button key={key} className={`ta-ma-toggle ${visibleMAs[key]?'on':'off'}`}
                  style={{ '--ma-color': color }} onClick={() => toggleMA(key)}>
                  <span className="ta-ma-dot" />{label}
                </button>
              ))}
            </div>
          )}

          {/* ── Chart ── */}
          <div ref={chartContRef} style={{ width:'100%' }}>
            <StockChart chartData={chartData} isActive={isActive} chartWidth={chartWidth}
              activeTab={activeTab} visibleMAs={visibleMAs} />
          </div>

          {/* ── Signal Badges ── */}
          {sigData && (
            <div className="ta-signals">
              {sigData.signals.map(s => (
                <div key={s.name} className={badgeClass(s.type)}>
                  <span className="ta-badge-name">{s.name}</span>
                  <span className="ta-badge-label">{s.label}{s.value ? ` (${s.value})` : ''}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Institutional Section ── */}
          <div className="ta-inst-section">
            <div className="ta-inst-header">
              <Building2 size={14} />
              <span>Big Money &amp; Institutional Activity</span>
            </div>

            {instLoading && (
              <div className="ta-inst-loading">
                <Activity size={13} className="ta-spinner" style={{ flexShrink:0 }} />
                <span>Loading institutional data…</span>
              </div>
            )}

            {instError && !instLoading && (
              <div className="ta-inst-unavailable">
                <AlertTriangle size={13} />
                <span>Institutional data unavailable for this symbol.</span>
              </div>
            )}

            {!instLoading && !instError && instData && (
              <>
                <div className="ta-inst-stats">
                  {instData.breakdown.institutionPct != null && (
                    <div className="ta-inst-stat">
                      <div className="ta-inst-stat-val">{(instData.breakdown.institutionPct*100).toFixed(1)}%</div>
                      <div className="ta-inst-stat-label">Institutions</div>
                    </div>
                  )}
                  {instData.breakdown.institutionCount != null && (
                    <div className="ta-inst-stat">
                      <div className="ta-inst-stat-val">{instData.breakdown.institutionCount.toLocaleString()}</div>
                      <div className="ta-inst-stat-label">Fund Holders</div>
                    </div>
                  )}
                  {instData.breakdown.insiderPct != null && (
                    <div className="ta-inst-stat">
                      <div className="ta-inst-stat-val">{(instData.breakdown.insiderPct*100).toFixed(2)}%</div>
                      <div className="ta-inst-stat-label">Insider Owned</div>
                    </div>
                  )}
                </div>

                {instData.topHolders.length > 0 && (
                  <div className="ta-holders">
                    <div className="ta-holders-title"><UserCheck size={12} /> Top Institutional Holders</div>
                    {instData.topHolders.map((h, i) => {
                      const chg = h.pctChange;
                      const isUp = chg != null && chg > 0.001;
                      const isDown = chg != null && chg < -0.001;
                      const isBig = Math.abs(chg ?? 0) > 0.05;
                      return (
                        <div key={i} className={`ta-holder-row ${isBig?'highlight':''}`}>
                          <div className="ta-holder-name">
                            {isBig && <span className="ta-holder-fire">🔥</span>}
                            {h.name}
                          </div>
                          <div className="ta-holder-right">
                            <span className="ta-holder-pct">{h.pctHeld != null ? (h.pctHeld*100).toFixed(2)+'%' : '—'}</span>
                            {chg != null && (
                              <span className={`ta-holder-change ${isUp?'up':isDown?'down':'flat'}`}>
                                {isUp ? `▲ +${(chg*100).toFixed(2)}%` : isDown ? `▼ ${(chg*100).toFixed(2)}%` : '→ Steady'}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {instData.topHolders[0]?.reportDate && (
                      <div className="ta-holders-note">Last reported: {instData.topHolders[0].reportDate} (SEC 13F)</div>
                    )}
                  </div>
                )}

                {instData.transactions.length > 0 && (
                  <div className="ta-insider">
                    <div className="ta-insider-title"><UserCheck size={12} /> Recent Insider Transactions</div>
                    {instData.transactions.map((t, i) => (
                      <div key={i} className={`ta-insider-row ${t.code==='P'?'buy':'sell'}`}>
                        <div className="ta-insider-left">
                          <span className="ta-insider-name">{t.name}</span>
                          <span className="ta-insider-role">{t.role}</span>
                        </div>
                        <div className="ta-insider-right">
                          <span className={`ta-insider-badge ${t.code==='P'?'buy':'sell'}`}>{t.code==='P'?'↑ BUY':'↓ SELL'}</span>
                          {t.shares != null && <span className="ta-insider-shares">{t.shares.toLocaleString()} shares</span>}
                          {t.date && <span className="ta-insider-date">{t.date}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="ta-inst-interp">
                  {buildInstInterpretation(instData).map((line, i) => <p key={i}>{line}</p>)}
                </div>
              </>
            )}
          </div>

          {/* ── Plain Language Summary ── */}
          {plainSummary && (
            <div className="ta-plain-summary">
              <div className="ta-plain-header">
                <TrendingUp size={14} />
                <span>What does this mean?</span>
              </div>

              <div className={`ta-plain-headline ${plainSummary.isBullish?'bull':plainSummary.isBearish?'bear':'neutral'}`}>
                <span className="ta-plain-dot" />
                <p>{plainSummary.headline}</p>
              </div>

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

              <div className="ta-plain-actions">
                <div className="ta-action-block">
                  <div className="ta-action-label">✅ If you own it</div>
                  <div className="ta-action-text">{plainSummary.actionOwn}</div>
                </div>
                <div className="ta-action-block">
                  <div className="ta-action-label">🤔 Thinking of buying?</div>
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

// ─── PAGE ─────────────────────────────────────────────────────────────────────

const OVERALL_CLASS = {
  'strong-buy':  'ta-overall strong-buy',
  'buy':         'ta-overall buy',
  'sell':        'ta-overall sell',
  'strong-sell': 'ta-overall strong-sell',
  'hold':        'ta-overall hold',
};

export default function SmartAnalysis() {
  const { holdings } = usePortfolio();
  const [openSet,    setOpenSet]    = useState(new Set());
  const [mountedSet, setMountedSet] = useState(new Set());
  const [signals,    setSignals]    = useState({});
  const [scoreMap,   setScoreMap]   = useState({});

  // Pre-fetch scores for accordion header badges (staggered)
  useEffect(() => {
    holdings.forEach((h, i) => {
      const t = setTimeout(() => {
        fetchStockScore(h.symbol).then(d => {
          if (d) setScoreMap(prev => ({ ...prev, [h.symbol]: d }));
        });
      }, i * 350);
      return () => clearTimeout(t);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [holdings.map(h => h.symbol).join(',')]);

  const toggle = symbol => {
    setOpenSet(prev => {
      const next = new Set(prev);
      next.has(symbol) ? next.delete(symbol) : next.add(symbol);
      return next;
    });
    setMountedSet(prev => new Set([...prev, symbol]));
  };

  const handleSignalReady = (symbol, info) =>
    setSignals(prev => ({ ...prev, [symbol]: info }));

  return (
    <div className="ta-page">
      <div className="portfolio-header">
        <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
          <Sparkles size={20} color="var(--accent-color)" />
          <h2>Smart Analysis</h2>
        </div>
        <p style={{ color:'var(--text-secondary)', marginTop:'0.25rem', fontSize:'0.875rem' }}>
          Multi-factor AI scoring — technical, momentum, fundamentals &amp; institutional activity.
        </p>
      </div>

      {holdings.length === 0 ? (
        <div className="glass-panel" style={{ textAlign:'center', padding:'3rem', color:'var(--text-secondary)' }}>
          <BarChart2 size={48} style={{ margin:'0 auto 1rem', display:'block', opacity:0.3 }} />
          <p>Add stocks to your portfolio to unlock Smart Analysis.</p>
        </div>
      ) : (
        <div className="ta-accordion">
          {holdings.map(h => {
            const isOpen    = openSet.has(h.symbol);
            const isMounted = mountedSet.has(h.symbol);
            const sig       = signals[h.symbol];
            const sc        = scoreMap[h.symbol];
            const price     = h.currentPrice || h.avgPrice;
            const sym       = h.currencySymbol || '$';
            const changePct = h.currentPrice && h.avgPrice
              ? ((h.currentPrice - h.avgPrice) / h.avgPrice * 100) : 0;
            const isUp = changePct >= 0;

            return (
              <div key={h.symbol} className={`ta-acc-item glass-panel ${isOpen?'open':''}`}>
                <button className="ta-acc-trigger" onClick={() => toggle(h.symbol)}>
                  <div className="ta-acc-left">
                    <span className="ta-acc-symbol">{h.symbol}</span>
                    <span className="ta-acc-name">{h.name || h.symbol}</span>
                    <span className="ta-acc-info">{h.amount} shares · avg {sym}{h.avgPrice?.toFixed(2)}</span>
                  </div>
                  <div className="ta-acc-right">
                    <div className="ta-acc-price">
                      {sym}{price?.toFixed(2)}
                      <span className={`ta-change ${isUp?'up':'down'}`}>{isUp?'▲':'▼'} {Math.abs(changePct).toFixed(2)}%</span>
                    </div>
                    {/* Smart score badge */}
                    {sc ? (
                      <div className={`ta-score-badge ${sc.verdictType}`}>
                        <span className="ta-score-badge-num">{sc.score}</span>
                        <span className="ta-score-badge-label">{sc.verdict}</span>
                      </div>
                    ) : sig ? (
                      <div className={OVERALL_CLASS[sig.overallType] || 'ta-overall hold'}>{sig.overall}</div>
                    ) : null}
                    <ChevronDown size={16} className={`ta-acc-chevron ${isOpen?'open':''}`} />
                  </div>
                </button>

                <div className={`ta-acc-body ${isOpen?'open':''}`}>
                  <div className="ta-acc-body-inner">
                    {isMounted && (
                      <StockCard holding={h} isActive={isOpen} onSignalReady={handleSignalReady} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
