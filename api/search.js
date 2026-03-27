export default async function handler(req, res) {
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
    res.status(500).json({ error: 'Failed to search' });
  }
}
