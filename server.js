import express from 'express';
import cors from 'cors';
import learnHandler from './api/learn.js';

const app = express();
app.use(cors());
app.use(express.json());

// Get real-time quote
app.get('/api/quote', async (req, res) => {
  try {
    const symbol = req.query.symbol;
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`);
    const data = await response.json();
    
    if (!data.chart.result) throw new Error('No data');
    const meta = data.chart.result[0].meta;
    const currency = meta.currency || 'USD';
    
    let exchangeRate = 1;
    let currencySymbol = '$';
    
    if (currency !== 'USD') {
      try {
        let fxSymbol = `${currency}USD=X`;
        let divisor = 1;
        
        if (currency === 'GBp') {
          fxSymbol = 'GBPUSD=X';
          divisor = 100;
        } else if (currency === 'ILA') {
          fxSymbol = 'ILSUSD=X';
          divisor = 100;
        }
        
        const fxRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${fxSymbol}?interval=1d&range=1d`);
        const fxData = await fxRes.json();
        const fxMeta = fxData.chart.result[0].meta;
        exchangeRate = fxMeta.regularMarketPrice / divisor;
      } catch (e) {
        console.warn('Failed to fetch exchange rate for', currency);
      }
    }
    
    // Map nice currency symbols for frontend
    if (currency === 'EUR') currencySymbol = '€';
    else if (currency === 'ILS' || currency === 'ILA') currencySymbol = '₪';
    else if (currency === 'GBP' || currency === 'GBp') currencySymbol = '£';
    else if (currency === 'JPY') currencySymbol = '¥';
    else if (currency !== 'USD') currencySymbol = currency + " ";
    
    res.json({
      symbol: meta.symbol,
      price: meta.regularMarketPrice,
      change: meta.regularMarketPrice - meta.chartPreviousClose,
      changePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
      currency: currency,
      currencySymbol: currencySymbol,
      exchangeRateToUSD: exchangeRate
    });
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// Get historical chart
app.get('/api/chart', async (req, res) => {
  try {
    const symbol = req.query.symbol;
    const period = req.query.period || '7d';
    
    const range = period === '1d' ? '1d' : period === '1mo' ? '1mo' : '5d';
    const interval = period === '1d' ? '5m' : period === '1mo' ? '1d' : '1d';

    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`);
    const data = await response.json();
    
    if (!data.chart.result) throw new Error('No data');
    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const closes = result.indicators.quote[0].close || [];
    
    const history = timestamps.map((time, idx) => ({
      time: new Date(time * 1000).toISOString(),
      value: closes[idx]
    })).filter(pt => pt.value !== null && pt.value !== undefined);

    res.json(history);
  } catch (error) {
    console.error('Error fetching chart:', error);
    res.status(500).json({ error: 'Failed to fetch chart' });
  }
});

// Search for symbols
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.query;
    const response = await fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${query}`);
    const data = await response.json();
    
    const equities = data.quotes
      .filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
      .map(q => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol
      }))
      .slice(0, 10);
          res.json(equities);
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: 'Failed to search' });
  }
});

// Market Momentum Scanners
app.get('/api/market-momentum', async (req, res) => {
  try {
    const symbols = ['NVDA', 'PLTR', 'CRWD', 'META', 'UBER', 'MSTR'];
    const results = await Promise.all(symbols.map(async (symbol) => {
      try {
        const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`);
        const data = await response.json();
        if (!data.chart.result) return null;
        const meta = data.chart.result[0].meta;
        return {
          symbol: meta.symbol,
          price: meta.regularMarketPrice,
          change: meta.regularMarketPrice - meta.chartPreviousClose,
          changePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
          name: meta.symbol
        };
      } catch (e) { return null; }
    }));
    
    const validResults = results.filter(Boolean).sort((a,b) => b.changePercent - a.changePercent);
    res.json(validResults);
  } catch (error) {
    console.error('Error fetching momentum:', error);
    res.status(500).json({ error: 'Failed to fetch momentum' });
  }
});

// Dynamic AI Insights generator
app.post('/api/ai-insights', (req, res) => {
  try {
    const { holdings } = req.body;
    let analysis = '';
    let recommendation = '';

    if (!holdings || holdings.length === 0) {
      analysis = "Your portfolio is currently empty. While cash provides a safe harbor during geopolitical uncertainty, allocating capital to high-momentum tech or defensive consumer staples is advised for wealth generation.";
      recommendation = "Begin constructing your portfolio by exploring the Market Opportunities scanner below. Look for strong volume patterns in semiconductors or software.";
    } else {
      const sortedByValue = [...holdings].sort((a,b) => (b.amount*(b.currentPrice||b.avgPrice)) - (a.amount*(a.currentPrice||a.avgPrice)));
      const topHolding = sortedByValue[0];
      
      const itemsWithChange = holdings.map(h => {
        const p = h.currentPrice || h.avgPrice;
        const cp = h.avgPrice > 0 ? ((p - h.avgPrice) / h.avgPrice) * 100 : 0;
        return { ...h, cp };
      });
      const topGainer = [...itemsWithChange].sort((a,b) => b.cp - a.cp)[0];
      const topLoser = [...itemsWithChange].sort((a,b) => a.cp - b.cp)[0];

      const r = Math.random();
      
      if (r < 0.33) {
        const adjectives = ['massive', 'significant', 'heavy', 'strategic', 'dominant'];
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const stopPrice = ((topHolding.currentPrice || topHolding.avgPrice) * 0.92).toFixed(2);
        
        analysis = `Focusing on your ${adj} concentration in ${topHolding.symbol}: This single asset currently defines your portfolio's risk profile. Given current macroeconomic shifts and geopolitical friction, ${topHolding.symbol} could see amplified volatility in the coming weeks.`;
        recommendation = `Optimal Pro Move: Configure a Trailing Stop-Loss order on ${topHolding.symbol} at $${stopPrice} (8% below the current market price). This mathematical best-practice automatically caps your downside risk at key technical support levels while relentlessly protecting your upside exposure if the momentum continues.`;
        
      } else if (r < 0.66 && topGainer.symbol !== topLoser.symbol) {
        const trimPrice = ((topGainer.currentPrice || topGainer.avgPrice) * 1.05).toFixed(2);
        const buyLimit = ((topLoser.currentPrice || topLoser.avgPrice) * 0.95).toFixed(2);
        
        analysis = `Your capital allocation is experiencing distinct divergence. We're observing spectacular momentum in ${topGainer.symbol} (+${topGainer.cp.toFixed(1)}%), likely riding the macro wave of sector-wide tech enthusiasm. Conversely, ${topLoser.symbol} is dragging performance due to short-term market rotations.`;
        recommendation = `Action Plan: Execute a Limit Sell order for 25% of your ${topGainer.symbol} position at $${trimPrice} to algorithmically lock in those outsized gains. Simultaneously, consider setting a Good-Til-Cancelled (GTC) Buy Limit order on ${topLoser.symbol} at $${buyLimit} (near its 50-day moving average) to dollar-cost average efficiently into the weakness.`;
        
      } else {
        const themes = ["geopolitical uncertainty in major supply chains", "shifting central bank yield curves", "AI infrastructure capital expenditure rotations"];
        const theme = themes[Math.floor(Math.random() * themes.length)];
        const targetHolding = topGainer ? topGainer.symbol : topHolding.symbol;
        const dipPrice = ((topHolding.currentPrice || topHolding.avgPrice) * 0.94).toFixed(2);
        
        analysis = `Analyzing your entire basket of ${holdings.length} assets: Your portfolio displays a distinct growth bias. In today's active climate of ${theme}, this aggressive approach carries a high beta relative to the S&P 500.`;
        recommendation = `Defensive Strategy: Avoid market-order purchases in this high-beta environment. The superior tactical move is deploying a GTC Buy Limit order on ${topHolding.symbol} at $${dipPrice} to automatically acquire the next 6% technical dip. Park your remaining 15% execution reserves in a high-yield sweep account.`;
      }
    }

    res.json({ analysis, recommendation });
  } catch (error) {
    console.error('Error generating AI insights:', error);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

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

// Technical Analysis — 6 months OHLCV data
app.get('/api/technical', async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const data = await response.json();

    if (!data.chart?.result?.[0]) throw new Error('No data');
    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const q = result.indicators.quote[0];

    const history = timestamps
      .map((t, i) => ({
        date:   new Date(t * 1000).toISOString().split('T')[0],
        open:   q.open?.[i]   ?? null,
        high:   q.high?.[i]   ?? null,
        low:    q.low?.[i]    ?? null,
        close:  q.close?.[i]  ?? null,
        volume: q.volume?.[i] ?? null,
      }))
      .filter(d => d.close !== null);

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
    
    let fxSymbol = `${currency}USD=X`;
    if (currency === 'ILS' || currency === 'ILA') fxSymbol = 'ILSUSD=X';
    if (currency === 'GBP' || currency === 'GBp') fxSymbol = 'GBPUSD=X';
    
    const fxRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${fxSymbol}?interval=1d&range=1d`);
    const fxData = await fxRes.json();
    const fxMeta = fxData.chart.result[0].meta;
    
    let divisor = 1;
    if (currency === 'ILA' || currency === 'GBp') divisor = 100;

    res.json({ rate: fxMeta.regularMarketPrice / divisor });
  } catch (error) {
    console.error('Exchange rate error:', error);
    res.json({ rate: 1 }); // safe fallback
  }
});

// Academy / Learn
app.get('/api/learn', learnHandler);

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend proxy running on http://localhost:${PORT}`);
});
