export default async function handler(req, res) {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const data = await response.json();

    if (!data.chart?.result?.[0]) throw new Error('No chart data returned');

    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const q = result.indicators.quote[0];

    const history = timestamps
      .map((t, i) => ({
        date: new Date(t * 1000).toISOString().split('T')[0],
        open:   q.open?.[i]   ?? null,
        high:   q.high?.[i]   ?? null,
        low:    q.low?.[i]    ?? null,
        close:  q.close?.[i]  ?? null,
        volume: q.volume?.[i] ?? null,
      }))
      .filter(d => d.close !== null);

    res.setHeader('Cache-Control', 's-maxage=300');
    res.json(history);
  } catch (err) {
    console.error('Technical data error:', err);
    res.status(500).json({ error: 'Failed to fetch technical data' });
  }
}
