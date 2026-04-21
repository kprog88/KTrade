import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['ripHistorical', 'yahooSurvey'] });

const INDICES = [
  { symbol: '^GSPC',  name: 'S&P 500',   region: 'US' },
  { symbol: '^IXIC',  name: 'NASDAQ',    region: 'US' },
  { symbol: '^DJI',   name: 'Dow Jones', region: 'US' },
  { symbol: '^GDAXI', name: 'DAX',       region: 'DE' },
  { symbol: '^N225',  name: 'Nikkei 225',region: 'JP' },
  { symbol: '^FTSE',  name: 'FTSE 100',  region: 'GB' },
];

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  try {
    const now = Math.floor(Date.now() / 1000);
    const results = await Promise.all(INDICES.map(async (idx) => {
      try {
        const [q, chartResult] = await Promise.all([
          yf.quote(idx.symbol),
          yf.chart(idx.symbol, {
            period1: now - 30 * 24 * 60 * 60,
            period2: now,
            interval: '1d',
          }),
        ]);

        const sparkline = (chartResult.quotes || [])
          .filter(p => p.close != null)
          .map(p => p.close);

        return {
          symbol:        idx.symbol,
          name:          idx.name,
          region:        idx.region,
          price:         q.regularMarketPrice,
          change:        q.regularMarketChange,
          changePercent: q.regularMarketChangePercent,
          sparkline,
        };
      } catch (e) {
        console.warn('Index fetch failed:', idx.symbol, e.message);
        return null;
      }
    }));

    res.json(results.filter(Boolean));
  } catch (err) {
    console.error('World indices error:', err.message);
    res.status(500).json({ error: 'Failed to fetch world indices' });
  }
}
