import YahooFinance from 'yahoo-finance2';

const _yf = new YahooFinance({ suppressNotices: ['ripHistorical', 'yahooSurvey'] });

export default async function handler(req, res) {
  try {
    const query = req.query.query;
    const results = await _yf.search(query, { newsCount: 0 });
    
    const equities = (results.quotes || [])
      .filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
      .map(q => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol
      }))
      .slice(0, 10);
      
    res.json(equities);
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ error: 'Failed to search' });
  }
}
