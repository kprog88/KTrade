import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] });

const WEIGHTS = { technical: 0.38, momentum: 0.27, fundamental: 0.20, institutional: 0.15 };

// ─── MATH HELPERS ────────────────────────────────────────────────────────────

function sma(arr, n) {
  return arr.map((_, i) => {
    if (i < n - 1) return null;
    return arr.slice(i - n + 1, i + 1).reduce((a, b) => a + b, 0) / n;
  });
}

function ema(arr, n) {
  const k = 2 / (n + 1);
  const out = new Array(arr.length).fill(null);
  const start = arr.findIndex(v => v != null);
  if (start < 0 || start + n > arr.length) return out;
  out[start + n - 1] = arr.slice(start, start + n).reduce((a, b) => a + b, 0) / n;
  for (let i = start + n; i < arr.length; i++)
    out[i] = arr[i] * k + out[i - 1] * (1 - k);
  return out;
}

function rsi(closes, n = 14) {
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

function macd(closes) {
  const e12 = ema(closes, 12), e26 = ema(closes, 26);
  const line = e12.map((v, i) => v != null && e26[i] != null ? v - e26[i] : null);
  const sig = ema(line, 9);
  const hist = line.map((v, i) => v != null && sig[i] != null ? v - sig[i] : null);
  return { line, sig, hist };
}

function bollinger(closes, n = 20) {
  const mid = sma(closes, n);
  return closes.map((_, i) => {
    if (mid[i] == null) return { upper: null, lower: null, mid: null };
    const slice = closes.slice(i - n + 1, i + 1);
    const std = Math.sqrt(slice.reduce((s, v) => s + (v - mid[i]) ** 2, 0) / n);
    return { upper: mid[i] + 2 * std, lower: mid[i] - 2 * std, mid: mid[i] };
  });
}

function last(arr) {
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return arr[i];
  return null;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

// ─── TECHNICAL SCORE ─────────────────────────────────────────────────────────

function techScore(ohlcv) {
  const c = ohlcv.map(d => d.close);
  const v = ohlcv.map(d => d.volume);
  const s20 = sma(c, 20), s50 = sma(c, 50), s120 = sma(c, 120), s200 = sma(c, 200);
  const rsiv = rsi(c, 14);
  const { line: ml, hist: mh } = macd(c);
  const bols = bollinger(c, 20);

  const lc = last(c), l20 = last(s20), l50 = last(s50), l120 = last(s120), l200 = last(s200);
  const lr = last(rsiv), lm = last(ml), lh = last(mh);
  const prevH = mh.filter(v => v != null).slice(-2)[0] ?? 0;
  const lb = last(bols);

  // RSI (0-100)
  let rsiSc = 50;
  if      (lr > 80) rsiSc = 12;
  else if (lr > 70) rsiSc = 28;
  else if (lr >= 58) rsiSc = 72;
  else if (lr >= 50) rsiSc = 62;
  else if (lr >= 42) rsiSc = 38;
  else if (lr >= 30) rsiSc = 28;
  else if (lr >= 20) rsiSc = 62; // oversold bounce potential
  else rsiSc = 55;

  // MACD (0-100)
  let macdSc = 50;
  if      (lm > 0 && lh > 0 && lh > prevH) macdSc = 88;
  else if (lm > 0 && lh > 0)               macdSc = 75;
  else if (lm > 0)                          macdSc = 62;
  else if (lm < 0 && lh < 0 && lh < prevH) macdSc = 12;
  else if (lm < 0 && lh < 0)               macdSc = 25;
  else                                      macdSc = 38;

  // MA Stack (0-100) — the Minervini/O'Neil trend template
  let maSc = 50;
  if (lc && l20 && l50 && l200) {
    if      (lc > l20 && l20 > l50 && l50 > l200) maSc = 95; // perfect bullish stack
    else if (lc > l20 && l20 > l50)               maSc = 80;
    else if (lc > l20)                             maSc = 62;
    else if (lc < l20 && l20 < l50 && l50 < l200) maSc = 5;  // perfect bearish stack
    else if (lc < l20 && l20 < l50)               maSc = 20;
    else if (lc < l20)                             maSc = 38;
  } else if (lc && l20) {
    maSc = lc > l20 ? 65 : 35;
  }

  // Add premium for 200-day support (institutional anchor)
  if (lc && l200 && lc > l200 * 1.0) maSc = clamp(maSc + 5, 0, 100);

  // Bollinger position (0-100)
  let bolSc = 50;
  if (lb?.upper && lb?.lower) {
    const range = lb.upper - lb.lower;
    if (range > 0) {
      const pos = (lc - lb.lower) / range;
      bolSc = clamp(25 + pos * 55, 0, 100);
      if (lc > lb.upper) bolSc = 30; // above upper = stretched
      if (lc < lb.lower) bolSc = 68; // below lower = oversold
    }
  }

  // Volume confirmation (0-100)
  const rVol = v.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const aVol = v.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const vr = aVol > 0 ? rVol / aVol : 1;
  const volSc = vr > 2.0 ? 82 : vr > 1.5 ? 72 : vr > 1.1 ? 60 : vr < 0.6 ? 35 : vr < 0.8 ? 42 : 50;

  // Volatility-adjusted weight: if vol is high confirm direction
  const score = Math.round(
    rsiSc * 0.22 + macdSc * 0.26 + maSc * 0.32 + bolSc * 0.10 + volSc * 0.10
  );

  return {
    score: clamp(score, 0, 100),
    components: {
      rsi: { score: Math.round(rsiSc), value: lr?.toFixed(1) ?? 'N/A' },
      macd: { score: Math.round(macdSc), signal: lm > 0 ? 'Bullish' : 'Bearish' },
      maTrend: { score: Math.round(maSc), aligned: lc > l20 && l20 > l50 },
      bollinger: { score: Math.round(bolSc) },
      volume: { score: Math.round(volSc), ratio: vr.toFixed(2) },
    },
  };
}

// ─── MOMENTUM SCORE ──────────────────────────────────────────────────────────

function momentumScore(ohlcv) {
  const c = ohlcv.map(d => d.close);
  const n = c.length, lat = c[n - 1];
  if (n < 20) return { score: 50, components: {} };

  function normReturn(ret, range) {
    if (ret == null) return null;
    return clamp(50 + (ret / range) * 50, 0, 100);
  }

  const r1m  = n >= 22  ? (lat / c[n - 22]  - 1) * 100 : null;
  const r3m  = n >= 63  ? (lat / c[n - 63]  - 1) * 100 : null;
  const r6m  = n >= 126 ? (lat / c[n - 126] - 1) * 100 : null;
  const r1y  = n >= 252 ? (lat / c[n - 252] - 1) * 100 : null;

  const s1m = normReturn(r1m, 12);
  const s3m = normReturn(r3m, 22);
  const s6m = normReturn(r6m, 40);
  const s1y = normReturn(r1y, 60);

  // Trend acceleration: 1m return vs 3m rate
  let accelBonus = 0;
  if (r1m != null && r3m != null) {
    const r3mRate = r3m / 3;
    accelBonus = r1m > r3mRate * 1.2 ? 5 : r1m < r3mRate * 0.5 ? -5 : 0;
  }

  const weights = [
    { s: s1m, w: 0.38 }, { s: s3m, w: 0.30 },
    { s: s6m, w: 0.20 }, { s: s1y ?? 50, w: 0.12 },
  ];
  const base = weights.reduce((sum, { s, w }) => sum + (s ?? 50) * w, 0);
  const score = clamp(Math.round(base + accelBonus), 0, 100);

  const fmt = v => v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(1)}%` : null;
  return {
    score,
    components: { '1M': fmt(r1m), '3M': fmt(r3m), '6M': fmt(r6m), '1Y': fmt(r1y) },
  };
}

// ─── FUNDAMENTAL SCORE ───────────────────────────────────────────────────────

function fundamentalScore(summary) {
  if (!summary) return { score: 50, components: {}, dataAvailable: false };

  const ks = summary.defaultKeyStatistics ?? {};
  const fd = summary.financialData ?? {};
  const sd = summary.summaryDetail ?? {};

  let score = 50, pts = 0;
  const comp = {};

  function add(val, label, map) {
    if (val == null || isNaN(val)) return;
    comp[label] = typeof val === 'number' && val < 1 && val > -1
      ? `${(val * 100).toFixed(1)}%` : val.toFixed?.(1) ?? val;
    const mapped = map(val);
    score += mapped - 50;
    pts++;
  }

  // Forward P/E (lower = better for value, high-growth exception handled via PEG)
  const fpe = ks.forwardPE ?? sd.forwardPE;
  if (fpe > 0) add(fpe, 'Fwd P/E', v =>
    v < 10 ? 83 : v < 15 ? 75 : v < 22 ? 65 : v < 30 ? 52 : v < 40 ? 38 : v < 60 ? 26 : 14
  );

  // PEG ratio (growth at a reasonable price)
  const peg = ks.pegRatio;
  if (peg && peg > 0) add(peg, 'PEG', v =>
    v < 0.5 ? 88 : v < 1.0 ? 78 : v < 1.5 ? 65 : v < 2.0 ? 52 : v < 3.0 ? 38 : 22
  );

  // EPS quarterly growth
  const epsG = ks.earningsQuarterlyGrowth;
  if (epsG != null) add(epsG, 'EPS Growth',
    v => v > 0.50 ? 88 : v > 0.25 ? 78 : v > 0.10 ? 68 : v > 0 ? 56 : v > -0.10 ? 42 : 25
  );

  // Revenue growth YoY
  const revG = fd.revenueGrowth;
  if (revG != null) add(revG, 'Rev Growth',
    v => v > 0.35 ? 88 : v > 0.20 ? 78 : v > 0.08 ? 67 : v > 0 ? 56 : v > -0.10 ? 40 : 22
  );

  // Profit margin
  const pm = fd.profitMargins;
  if (pm != null) add(pm, 'Net Margin',
    v => v > 0.30 ? 88 : v > 0.18 ? 76 : v > 0.09 ? 65 : v > 0.03 ? 54 : v > 0 ? 44 : 20
  );

  // Return on equity
  const roe = fd.returnOnEquity;
  if (roe != null) add(roe, 'ROE',
    v => v > 0.30 ? 85 : v > 0.18 ? 73 : v > 0.10 ? 62 : v > 0 ? 50 : 28
  );

  // Debt/equity (lower is better for most)
  const de = fd.debtToEquity;
  if (de != null && de >= 0) add(de, 'Debt/Eq',
    v => v < 0.2 ? 80 : v < 0.8 ? 68 : v < 1.5 ? 55 : v < 3.0 ? 40 : 22
  );

  // Free cash flow yield proxy (currentRatio)
  const cr = fd.currentRatio;
  if (cr != null) add(cr, 'Curr Ratio',
    v => v > 3 ? 75 : v > 2 ? 70 : v > 1.5 ? 65 : v > 1 ? 55 : v > 0.7 ? 40 : 25
  );

  return {
    score: clamp(Math.round(score), 0, 100),
    components: comp,
    dataAvailable: pts > 0,
  };
}

// ─── INSTITUTIONAL SCORE ─────────────────────────────────────────────────────

function institutionalScore(inst) {
  if (!inst) return { score: 50, components: {}, dataAvailable: false };
  const { breakdown = {}, topHolders = [], transactions = [] } = inst;

  let score = 50;
  const comp = {};

  // Institutional ownership %
  const ip = breakdown.institutionPct;
  if (ip != null) {
    score += (ip > 0.85 ? 68 : ip > 0.70 ? 63 : ip > 0.50 ? 58 : ip > 0.30 ? 53 : 44) - 50;
    comp['Inst. Owned'] = `${(ip * 100).toFixed(1)}%`;
  }

  // Net institutional buying activity
  const buyers  = topHolders.filter(h => (h.pctChange ?? 0) > 0.002).length;
  const sellers = topHolders.filter(h => (h.pctChange ?? 0) < -0.002).length;
  if (topHolders.length > 0) {
    const net = (buyers - sellers) / topHolders.length;
    score += net * 20;
    comp['Fund Activity'] = buyers > sellers ? `${buyers} buying` : sellers > buyers ? `${sellers} trimming` : 'Stable';
  }

  // Insider net transactions
  const ib = transactions.filter(t => t.code === 'P').length;
  const is_ = transactions.filter(t => t.code === 'S').length;
  if (transactions.length > 0) {
    const net = (ib - is_) / transactions.length;
    score += net * 14;
    comp['Insider Txns'] = ib > is_ ? `${ib} buys` : is_ > ib ? `${is_} sells` : 'Mixed';
  }

  // Insider ownership (skin in the game)
  const insP = breakdown.insiderPct;
  if (insP != null) {
    score += insP > 0.10 ? 8 : insP > 0.05 ? 4 : insP < 0.01 ? -4 : 0;
    comp['Insider Owned'] = `${(insP * 100).toFixed(2)}%`;
  }

  return {
    score: clamp(Math.round(score), 0, 100),
    components: comp,
    dataAvailable: topHolders.length > 0 || transactions.length > 0,
  };
}

// ─── VERDICT ─────────────────────────────────────────────────────────────────

function verdict(score) {
  if (score >= 76) return { label: 'STRONG BUY',  type: 'strong-buy',  color: '#22c55e' };
  if (score >= 62) return { label: 'BUY',          type: 'buy',         color: '#4ade80' };
  if (score >= 46) return { label: 'HOLD',         type: 'hold',        color: '#f59e0b' };
  if (score >= 32) return { label: 'SELL',         type: 'sell',        color: '#f87171' };
  return                  { label: 'STRONG SELL',  type: 'strong-sell', color: '#ef4444' };
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=300');

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'Symbol required' });

  try {
    const now = Math.floor(Date.now() / 1000);
    const ago = now - 400 * 86400; // slightly more than 1y for 200-day MA

    const [priceRes, fundRes, instRes] = await Promise.allSettled([
      yf.chart(symbol, { period1: ago, period2: now, interval: '1d' }).then(r =>
        (r.quotes || [])
          .map(q => ({
            date:   q.date instanceof Date ? q.date.toISOString().slice(0, 10) : String(q.date).slice(0, 10),
            open:   q.open   ?? null,
            high:   q.high   ?? null,
            low:    q.low    ?? null,
            close:  q.close  ?? null,
            volume: q.volume ?? 0,
          }))
          .filter(d => d.close != null && d.close > 0)
      ),

      yf.quoteSummary(symbol, {
        modules: ['defaultKeyStatistics', 'financialData', 'summaryDetail'],
      }).catch(() => null),

      yf.quoteSummary(symbol, {
        modules: ['institutionOwnership', 'insiderTransactions', 'majorHoldersBreakdown'],
      }).then(r => {
        const mh  = r.majorHoldersBreakdown ?? {};
        const io  = r.institutionOwnership?.ownershipList ?? [];
        const it  = r.insiderTransactions?.transactions ?? [];
        return {
          breakdown: {
            institutionPct:   mh.institutionsPercentHeld  ?? null,
            institutionCount: mh.institutionsCount        ?? null,
            insiderPct:       mh.insidersPercentHeld      ?? null,
          },
          topHolders: io.slice(0, 10).map(h => ({
            name:       h.organization ?? h.name ?? '',
            pctHeld:    h.pctHeld   ?? null,
            pctChange:  h.pctChange ?? null,
            reportDate: h.reportDate?.fmt ?? null,
          })),
          transactions: it.slice(0, 8).map(t => ({
            name:   t.filerName ?? '',
            role:   t.filerRelation ?? '',
            shares: t.shares   ?? null,
            value:  t.value    ?? null,
            code:   t.transactionCode ?? (String(t.transactionText).toLowerCase().includes('sale') ? 'S' : 'P'),
            date:   t.startDate?.fmt ?? null,
          })),
        };
      }).catch(() => null),
    ]);

    const ohlcv = priceRes.status === 'fulfilled' ? priceRes.value : [];
    const fund  = fundRes.status  === 'fulfilled' ? fundRes.value  : null;
    const inst  = instRes.status  === 'fulfilled' ? instRes.value  : null;

    if (ohlcv.length < 30)
      return res.status(500).json({ error: 'Insufficient price history' });

    const tScore = techScore(ohlcv);
    const mScore = momentumScore(ohlcv);
    const fScore = fundamentalScore(fund);
    const iScore = institutionalScore(inst);

    const combined = clamp(Math.round(
      tScore.score * WEIGHTS.technical +
      mScore.score * WEIGHTS.momentum  +
      fScore.score * WEIGHTS.fundamental +
      iScore.score * WEIGHTS.institutional
    ), 0, 100);

    const v = verdict(combined);

    res.json({
      symbol: symbol.toUpperCase(),
      score:   combined,
      verdict: v.label,
      verdictType: v.type,
      color:   v.color,
      breakdown: {
        technical:     tScore.score,
        momentum:      mScore.score,
        fundamental:   fScore.score,
        institutional: iScore.score,
      },
      details: {
        technical:     tScore.components,
        momentum:      mScore.components,
        fundamental:   fScore.components,
        institutional: iScore.components,
      },
      weights: WEIGHTS,
      meta: {
        hasFundamental:   fScore.dataAvailable,
        hasInstitutional: iScore.dataAvailable,
        pricePoints:      ohlcv.length,
      },
    });
  } catch (err) {
    console.error('stock-score error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
