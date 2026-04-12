import YahooFinance from 'yahoo-finance2';
const _yf = new YahooFinance({ suppressNotices: ['ripHistorical'] });
try {
  const q = await _yf.quote('AAPL');
  console.log(JSON.stringify({ price: q.regularMarketPrice, change: q.regularMarketChange, changePercent: q.regularMarketChangePercent }));
} catch(e) {
  console.error('QUOTE ERROR:', e.message);
}

try {
  const now = Math.floor(Date.now() / 1000);
  const oneMonthAgo = now - 30 * 24 * 60 * 60;
  const c = await _yf.chart('AAPL', { period1: oneMonthAgo, period2: now, interval: '1d' });
  console.log('CHART OK, rows:', c.quotes?.length);
} catch(e) {
  console.error('CHART ERROR:', e.message);
}
