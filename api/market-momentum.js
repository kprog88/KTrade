import YahooFinance from 'yahoo-finance2';

const _yf = new YahooFinance({ suppressNotices: ['ripHistorical', 'yahooSurvey'] });

export default async function handler(req, res) {
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
