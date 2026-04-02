export default async function handler(req, res) {
  try {
    const symbol = req.query.symbol;
    const period = req.query.period || '7d';
    
    const rangeMap    = { '1d': '1d', '1mo': '1mo', '5y': '5y' };
    const intervalMap = { '1d': '5m', '1mo': '1d', '5y': '1wk' };
    const range    = rangeMap[period]    || '5d';
    const interval = intervalMap[period] || '1d';

    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`);
    const data = await response.json();
    
    if (!data.chart.result) throw new Error('No data');
    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const closes = result.indicators.quote[0].close || [];
    
    const history = timestamps.map((time, idx) => {
      const d = new Date(time * 1000);
      return {
        time: d.toISOString(),
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
        value: closes[idx],
      };
    }).filter(pt => pt.value !== null && pt.value !== undefined);

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chart' });
  }
}
