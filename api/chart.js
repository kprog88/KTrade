export default async function handler(req, res) {
  try {
    const symbol = req.query.symbol;
    const period = req.query.period || '7d';
    
    const range = period === '1d' ? '1d' : period === '1mo' ? '1mo' : '5d';
    const interval = period === '1d' ? '5m' : period === '1mo' ? '1d' : '1d';

    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}`);
    const data = await response.json();
    
    if (!data.chart.result) throw new Error('No data');
    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const closes = result.indicators.quote[0].close || [];
    
    const history = timestamps.map((time, idx) => ({
      time: new Date(time * 1000).toISOString(),
      value: closes[idx]
    })).filter(pt => pt.value !== null && pt.value !== undefined);

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chart' });
  }
}
