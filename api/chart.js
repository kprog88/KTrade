import YahooFinance from 'yahoo-finance2';

const yf = new YahooFinance({ suppressNotices: ['ripHistorical', 'yahooSurvey'] });

export default async function handler(req, res) {
  try {
    const symbol = req.query.symbol;
    const period = req.query.period || '7d';

    const now = Math.floor(Date.now() / 1000);
    let period1, interval;

    if (period === '1d') {
      period1 = now - 1 * 24 * 60 * 60;
      interval = '5m';
    } else if (period === '1mo') {
      period1 = now - 30 * 24 * 60 * 60;
      interval = '1d';
    } else if (period === '3mo') {
      period1 = now - 90 * 24 * 60 * 60;
      interval = '1d';
    } else if (period === '6mo') {
      period1 = now - 180 * 24 * 60 * 60;
      interval = '1d';
    } else if (period === '5y') {
      period1 = now - 5 * 365 * 24 * 60 * 60;
      interval = '1wk';
    } else {
      // default 7 days
      period1 = now - 7 * 24 * 60 * 60;
      interval = '1d';
    }

    const result = await yf.chart(symbol, { period1, period2: now, interval });
    const quotes = result.quotes || [];

    const history = quotes
      .map(q => {
        const d = q.date instanceof Date ? q.date : new Date(q.date);
        return {
          time:  d.toISOString(),
          date:  d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
          value: q.close ?? null,
        };
      })
      .filter(pt => pt.value !== null && pt.value !== undefined);

    res.json(history);
  } catch (error) {
    console.error('Chart error:', error.message);
    res.status(500).json({ error: 'Failed to fetch chart' });
  }
}
