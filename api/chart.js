import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['ripHistorical', 'yahooSurvey'] });

async function proxiedFetchJson(url) {
  const proxies = [
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
  ];
  for (const pUrl of proxies) {
    try {
      const res = await fetch(pUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) return await res.json();
    } catch (e) { /* skip */ }
  }
  throw new Error('All proxy attempts failed');
}

export default async function handler(req, res) {
  try {
    const symbol = req.query.symbol;
    const period = req.query.period || '7d';

    const now = Math.floor(Date.now() / 1000);
    let period1, interval;

    if (period === '1d') {
      period1 = now - 1 * 24 * 60 * 60;
      interval = '5m';
    } else if (period === '1mo') {
      period1 = now - 30 * 24 * 60 * 60;
      interval = '1d';
    } else if (period === '3mo') {
      period1 = now - 90 * 24 * 60 * 60;
      interval = '1d';
    } else if (period === '6mo') {
      period1 = now - 180 * 24 * 60 * 60;
      interval = '1d';
    } else if (period === '5y') {
      period1 = now - 5 * 365 * 24 * 60 * 60;
      interval = '1wk';
    } else {
      // default 7 days
      period1 = now - 7 * 24 * 60 * 60;
      interval = '1d';
    }

    let quotes;
    try {
      const result = await yf.chart(symbol, { period1, period2: now, interval });
      quotes = result.quotes || [];
    } catch(err) {
      console.warn('yahoo-finance2 chart failed, trying proxy fallback...');
      const rangeMap = { '1d': '1d', '7d': '7d', '1mo': '1mo', '3mo': '3mo', '6mo': '6mo', '5y': '5y' };
      const range = rangeMap[period] || '7d';
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
      const data = await proxiedFetchJson(url);
      if (!data?.chart?.result?.[0]) throw new Error('No chart data via proxy');
      
      const r = data.chart.result[0];
      const timestamps = r.timestamp || [];
      const q = r.indicators.quote[0] || {};
      
      quotes = timestamps.map((t, i) => ({
        date: new Date(t * 1000),
        close: q.close?.[i] ?? null
      }));
    }

    const history = quotes
      .map(q => {
        const d = q.date instanceof Date ? q.date : new Date(q.date);
        return {
          time:  d.toISOString(),
          date:  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
          value: q.close ?? null,
        };
      })
      .filter(pt => pt.value !== null && pt.value !== undefined);

    res.json(history);
  } catch (error) {
    console.error('Chart error:', error.message);
    res.status(500).json({ error: 'Failed to fetch chart' });
  }
}
