import YahooFinance from 'yahoo-finance2';

const _yf = new YahooFinance({ suppressNotices: ['ripHistorical', 'yahooSurvey'] });

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
    const symbols = ['NVDA', 'PLTR', 'CRWD', 'META', 'UBER', 'MSTR'];
    const results = await Promise.all(symbols.map(async (symbol) => {
      try {
        let q;
        try {
          q = await _yf.quote(symbol);
        } catch(e) {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
          const data = await proxiedFetchJson(url);
          const meta = data.chart.result[0].meta;
          q = {
            symbol: meta.symbol,
            regularMarketPrice: meta.regularMarketPrice,
            regularMarketChange: meta.regularMarketPrice - meta.chartPreviousClose,
            regularMarketChangePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
            shortName: meta.symbol
          };
        }
        return {
          symbol: q.symbol,
          price: q.regularMarketPrice,
          change: q.regularMarketChange,
          changePercent: q.regularMarketChangePercent,
          name: q.shortName || q.symbol
        };
      } catch (e) { return null; }
    }));
    
    const validResults = results.filter(Boolean).sort((a,b) => b.changePercent - a.changePercent);
    res.json(validResults);
  } catch (error) {
    console.error('Market momentum error:', error.message);
    res.status(500).json({ error: 'Failed to fetch momentum' });
  }
}
