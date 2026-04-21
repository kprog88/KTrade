import YahooFinance from 'yahoo-finance2';

const _yf = new YahooFinance({ suppressNotices: ['ripHistorical', 'yahooSurvey'] });

const INDICES = [
  { symbol: '^GSPC',  name: 'S&P 500',   region: 'US' },
  { symbol: '^IXIC',  name: 'NASDAQ',    region: 'US' },
  { symbol: '^DJI',   name: 'Dow Jones', region: 'US' },
  { symbol: '^GDAXI', name: 'DAX',       region: 'DE' },
  { symbol: '^N225',  name: 'Nikkei 225',region: 'JP' },
  { symbol: '^FTSE',  name: 'FTSE 100',  region: 'GB' },
];

async function proxiedFetchJson(url) {
  const proxies = [
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
  ];
  for (const pUrl of proxies) {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(pUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: controller.signal });
      clearTimeout(id);
      if (res.ok) return await res.json();
    } catch (e) { /* skip */ }
  }
  throw new Error('All proxy attempts failed');
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
  try {
    const now = Math.floor(Date.now() / 1000);
    const results = await Promise.all(INDICES.map(async (idx) => {
      try {
        let q;
        let chartResult;
        
        try {
          const promiseQ = _yf.quote(idx.symbol);
          const promiseC = _yf.chart(idx.symbol, { period1: now - 30 * 24 * 60 * 60, period2: now, interval: '1d' });
          // Fail fast to leave time for proxy
          const timeout = new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 2500));
          [q, chartResult] = await Promise.race([Promise.all([promiseQ, promiseC]), timeout]);
        } catch(err) {
          console.warn('world-indices: yahoo-finance2 failed or timed out, trying proxy...');
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(idx.symbol)}?interval=1d&range=1mo`;
          const proxyData = await proxiedFetchJson(url);
          const meta = proxyData.chart.result[0].meta;
          const timestamps = proxyData.chart.result[0].timestamp || [];
          const quoteData = proxyData.chart.result[0].indicators.quote[0];
          
          q = {
            regularMarketPrice: meta.regularMarketPrice,
            regularMarketChange: meta.regularMarketPrice - meta.chartPreviousClose,
            regularMarketChangePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100
          };
          chartResult = {
            quotes: timestamps.map((t, i) => ({ close: quoteData.close?.[i] ?? null }))
          };
        }

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
