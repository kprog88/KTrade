import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import learnHandler from './api/learn.js';
import aiInsightsHandler from './api/ai-insights.js';
import marketNewsHandler from './api/market-news.js';
import YahooFinance from 'yahoo-finance2';

const _yf = new YahooFinance({ suppressNotices: ['ripHistorical', 'yahooSurvey'] });

const app = express();
app.use(cors());
app.use(express.json());

// Get real-time quote
app.get('/api/quote', async (req, res) => {
  try {
    const symbol = req.query.symbol;
    const q = await _yf.quote(symbol);

    const currency = q.currency || 'USD';
    let currencySymbol = '$';
    if (currency === 'EUR') currencySymbol = '€';
    else if (currency === 'ILS' || currency === 'ILA') currencySymbol = '₪';
    else if (currency === 'GBP' || currency === 'GBp') currencySymbol = '£';
    else if (currency === 'JPY') currencySymbol = '¥';
    else if (currency !== 'USD') currencySymbol = currency + ' ';

    // Get exchange rate if not USD
    let exchangeRate = 1;
    if (currency !== 'USD') {
      try {
        let fxSym = `${currency}USD=X`;
        if (currency === 'GBp') fxSym = 'GBPUSD=X';
        if (currency === 'ILA') fxSym = 'ILSUSD=X';
        const fxQ = await _yf.quote(fxSym);
        let divisor = (currency === 'GBp' || currency === 'ILA') ? 100 : 1;
        exchangeRate = (fxQ.regularMarketPrice || 1) / divisor;
      } catch (e) {
        console.warn('FX rate failed for', currency);
      }
    }

    res.json({
      symbol: q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
      currency,
      currencySymbol,
      exchangeRateToUSD: exchangeRate,
    });
  } catch (error) {
    console.error('Error fetching quote:', error.message);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// Get historical chart
app.get('/api/chart', async (req, res) => {
  try {
    const symbol = req.query.symbol;
    const period = req.query.period || '7d';

    // Map period string to yahoo-finance2 params
    const now = Math.floor(Date.now() / 1000);
    let period1, interval;
    if (period === '1d') {
      period1 = now - 1 * 24 * 60 * 60;
      interval = '5m';
    } else if (period === '1mo') {
      period1 = now - 30 * 24 * 60 * 60;
      interval = '1d';
    } else if (period === '5y') {
      period1 = now - 5 * 365 * 24 * 60 * 60;
      interval = '1wk';
    } else {
      // default 7 days
      period1 = now - 7 * 24 * 60 * 60;
      interval = '1d';
    }

    const result = await _yf.chart(symbol, { period1, period2: now, interval });
    const quotes = result.quotes || [];

    const history = quotes
      .map(q => ({
        time: q.date instanceof Date ? q.date.toISOString() : new Date(q.date).toISOString(),
        value: q.close ?? null,
      }))
      .filter(pt => pt.value !== null && pt.value !== undefined);

    res.json(history);
  } catch (error) {
    console.error('Error fetching chart:', error.message);
    res.status(500).json({ error: 'Failed to fetch chart' });
  }
});

// Search for symbols
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.query;
    const results = await _yf.search(query, { newsCount: 0 });
    const equities = (results.quotes || [])
      .filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
      .map(q => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
      }))
      .slice(0, 10);
    res.json(equities);
  } catch (error) {
    console.error('Error searching:', error.message);
    res.status(500).json({ error: 'Failed to search' });
  }
});

// Market Momentum Scanners
app.get('/api/market-momentum', async (req, res) => {
  try {
    const symbols = ['NVDA', 'PLTR', 'CRWD', 'META', 'UBER', 'MSTR'];
    const results = await Promise.all(symbols.map(async (symbol) => {
      try {
        const q = await _yf.quote(symbol);
        return {
          symbol: q.symbol,
          price: q.regularMarketPrice,
          change: q.regularMarketChange,
          changePercent: q.regularMarketChangePercent,
          name: q.shortName || q.symbol,
        };
      } catch (e) { return null; }
    }));

    const validResults = results.filter(Boolean).sort((a, b) => b.changePercent - a.changePercent);
    res.json(validResults);
  } catch (error) {
    console.error('Error fetching momentum:', error.message);
    res.status(500).json({ error: 'Failed to fetch momentum' });
  }
});

// AI Insights — powered by Claude
app.post('/api/ai-insights', (req, res) => aiInsightsHandler(req, res));

// Institutional ownership + insider transactions
let _instCrumb = null, _instCookies = null, _instCrumbTs = 0;
const _UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function getYahooAuth() {
  if (_instCrumb && Date.now() - _instCrumbTs < 25 * 60 * 1000) return { crumb: _instCrumb, cookies: _instCookies };
  const homeRes = await fetch('https://finance.yahoo.com/', { headers: { 'User-Agent': _UA, 'Accept': 'text/html' }, redirect: 'follow' });
  let cookieParts = [];
  if (typeof homeRes.headers.getSetCookie === 'function') {
    cookieParts = homeRes.headers.getSetCookie().map(c => c.split(';')[0]);
  } else {
    cookieParts = (homeRes.headers.get('set-cookie') || '').split(',').map(c => c.split(';')[0].trim()).filter(Boolean);
  }
  const cookieStr = cookieParts.join('; ');
  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', { headers: { 'User-Agent': _UA, 'Cookie': cookieStr } });
  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.startsWith('<') || crumb.length < 3) throw new Error('Crumb failed');
  _instCrumb = crumb; _instCookies = cookieStr; _instCrumbTs = Date.now();
  return { crumb, cookies: cookieStr };
}

app.get('/api/institutional', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });

    const { crumb, cookies } = await getYahooAuth();
    const modules = 'institutionOwnership,majorHoldersBreakdown,insiderTransactions';
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&crumb=${encodeURIComponent(crumb)}&formatted=true&lang=en-US&region=US`;

    const response = await fetch(url, { headers: { 'User-Agent': _UA, 'Cookie': cookies } });
    const data = await response.json();

    if (!data.quoteSummary?.result?.[0]) throw new Error(data.quoteSummary?.error?.description || 'No data');
    const result = data.quoteSummary.result[0];

    const bd = result.majorHoldersBreakdown || {};
    const breakdown = {
      institutionPct:   bd.institutionsPercentHeld?.raw    ?? null,
      institutionCount: bd.institutionsCount?.raw          ?? null,
      insiderPct:       bd.insidersPercentHeld?.raw        ?? null,
      floatPct:         bd.institutionsFloatPercentHeld?.raw ?? null,
    };

    const ownerList = result.institutionOwnership?.ownershipList ?? [];
    const topHolders = ownerList.slice(0, 10).map(h => ({
      name: h.organization, pctHeld: h.pctHeld?.raw ?? null,
      pctChange: h.pctChange?.raw ?? null, value: h.value?.raw ?? null,
      position: h.position?.raw ?? null, reportDate: h.reportDate?.fmt ?? null,
    }));

    const txnList = result.insiderTransactions?.transactions ?? [];
    const transactions = txnList.slice(0, 8)
      .map(t => ({ name: t.filerName ?? 'Unknown', role: t.filerRelation ?? '', shares: t.shares?.raw ?? null, value: t.value?.raw ?? null, date: t.startDate?.fmt ?? null, code: t.transactionCode ?? '' }))
      .filter(t => t.code === 'P' || t.code === 'S');

    res.json({ breakdown, topHolders, transactions });
  } catch (err) {
    console.error('Institutional error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to fetch institutional data' });
  }
});

// Technical Analysis — 12 months OHLCV data via yahoo-finance2

app.get('/api/technical', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });

    const now = Math.floor(Date.now() / 1000);
    const oneYearAgo = now - 365 * 24 * 60 * 60;

    let history;

    try {
      const result = await _yf.chart(symbol, {
        period1: oneYearAgo,
        period2: now,
        interval: '1d',
      });

      history = (result.quotes || [])
        .map(q => ({
          date:   q.date instanceof Date ? q.date.toISOString().split('T')[0] : String(q.date).split('T')[0],
          open:   q.open   ?? null,
          high:   q.high   ?? null,
          low:    q.low    ?? null,
          close:  q.close  ?? null,
          volume: q.volume ?? null,
        }))
        .filter(d => d.close !== null && d.close > 0);

    } catch (yf2Err) {
      console.warn('yahoo-finance2 failed, falling back:', yf2Err.message);

      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const data = await response.json();
      if (!data.chart?.result?.[0]) throw new Error('No data');
      const result = data.chart.result[0];
      const timestamps = result.timestamp || [];
      const q = result.indicators.quote[0];

      history = timestamps
        .map((t, i) => ({
          date:   new Date(t * 1000).toISOString().split('T')[0],
          open:   q.open?.[i]   ?? null,
          high:   q.high?.[i]   ?? null,
          low:    q.low?.[i]    ?? null,
          close:  q.close?.[i]  ?? null,
          volume: q.volume?.[i] ?? null,
        }))
        .filter(d => d.close !== null && d.close > 0);
    }

    if (!history || history.length < 30) {
      return res.status(500).json({ error: `Insufficient data for ${symbol}` });
    }

    res.json(history);
  } catch (err) {
    console.error('Technical error:', err);
    res.status(500).json({ error: 'Failed to fetch technical data' });
  }
});

// Explicit Forex Exchange Rate
app.get('/api/exchange-rate', async (req, res) => {
  try {
    const currency = req.query.currency.toUpperCase();
    if (currency === 'USD') return res.json({ rate: 1 });

    let fxSym = `${currency}USD=X`;
    if (currency === 'ILS' || currency === 'ILA') fxSym = 'ILSUSD=X';
    if (currency === 'GBP' || currency === 'GBp') fxSym = 'GBPUSD=X';

    const q = await _yf.quote(fxSym);
    let divisor = (currency === 'ILA' || currency === 'GBp') ? 100 : 1;
    res.json({ rate: (q.regularMarketPrice || 1) / divisor });
  } catch (error) {
    console.error('Exchange rate error:', error.message);
    res.json({ rate: 1 }); // safe fallback
  }
});

// Academy / Learn
app.get('/api/learn', learnHandler);

// Market News
app.get('/api/market-news', (req, res) => marketNewsHandler(req, res));

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend proxy running on http://localhost:${PORT}`);
});
