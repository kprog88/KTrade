import YahooFinance from 'yahoo-finance2';

const _yf = new YahooFinance({ suppressNotices: ['ripHistorical', 'yahooSurvey'] });

export default async function handler(req, res) {
  try {
    const currency = req.query.currency.toUpperCase();
    if (currency === 'USD') return res.json({ rate: 1 });
    
    let fxSym = `${currency}USD=X`;
    if (currency === 'ILS' || currency === 'ILA') fxSym = 'ILSUSD=X';
    if (currency === 'GBP' || currency === 'GBp') fxSym = 'GBPUSD=X';
    
    const q = await _yf.quote(fxSym);
    let divisor = (currency === 'ILA' || currency === 'GBp') ? 100 : 1;
    res.json({ rate: (q.regularMarketPrice || 1) / divisor });
  } catch (error) {
    console.error('Exchange rate error:', error.message);
    res.json({ rate: 1 }); // safe fallback
  }
}
