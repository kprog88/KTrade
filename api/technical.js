import YahooFinance from 'yahoo-finance2';

// yahoo-finance2 handles crumb/cookie automatically and works from Vercel
const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] });

export default async function handler(req, res) {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });

    const now = Math.floor(Date.now() / 1000);
    const oneYearAgo = now - 365 * 24 * 60 * 60;

    let history;

    try {
      // Primary: yahoo-finance2 (handles auth automatically)
      const result = await yf.chart(symbol, {
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
      console.warn('yahoo-finance2 failed, falling back to direct fetch:', yf2Err.message);

      // Fallback: direct Yahoo Finance v8 API bypassed through proxies
      const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`;
      
      const proxies = [
        `https://corsproxy.io/?url=${encodeURIComponent(yfUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(yfUrl)}`
      ];

      let response = null;
      for (const pUrl of proxies) {
        try {
          const res = await fetch(pUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
          if (res.ok) {
            response = res;
            break;
          }
        } catch (e) { /* skip to next proxy */ }
      }
      
      if (!response) {
        throw new Error('All attempts to bypass API blocks failed.');
      }

      const data = await response.json();
      if (!data.chart?.result?.[0]) throw new Error('No chart data');

      const r = data.chart.result[0];
      const timestamps = r.timestamp || [];
      const q = r.indicators.quote[0];

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
      return res.status(500).json({ error: `Insufficient data for ${symbol} (got ${history?.length ?? 0} rows)` });
    }

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=300');
    res.json(history);

  } catch (err) {
    console.error('Technical data error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to fetch technical data' });
  }
}
