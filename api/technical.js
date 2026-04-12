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

      // Fallback: direct Yahoo Finance v8 API
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
          }
        }
      );

      if (!response.ok) throw new Error(`Yahoo API returned ${response.status}`);
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
