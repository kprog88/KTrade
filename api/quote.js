import YahooFinance from 'yahoo-finance2';

const _yf = new YahooFinance({ suppressNotices: ['ripHistorical', 'yahooSurvey'] });

export default async function handler(req, res) {
  try {
    const symbol = req.query.symbol;
    const q = await _yf.quote(symbol);

    const currency = q.currency || 'USD';
    let currencySymbol = '$';
    
    if (currency === 'EUR') currencySymbol = '€';
    else if (currency === 'ILS' || currency === 'ILA') currencySymbol = '₪';
    else if (currency === 'GBP' || currency === 'GBp') currencySymbol = '£';
    else if (currency === 'JPY') currencySymbol = '¥';
    else if (currency !== 'USD') currencySymbol = currency + " ";

    let exchangeRate = 1;
    if (currency !== 'USD') {
      try {
        let fxSym = `${currency}USD=X`;
        if (currency === 'GBp') fxSym = 'GBPUSD=X';
        if (currency === 'ILA') fxSym = 'ILSUSD=X';
        
        const fxQ = await _yf.quote(fxSym);
        let divisor = (currency === 'GBp' || currency === 'ILA') ? 100 : 1;
        exchangeRate = (fxQ.regularMarketPrice || 1) / divisor;
      } catch (e) {
        console.warn('Failed to fetch exchange rate for', currency);
      }
    }

    res.json({
      symbol: q.symbol,
      price: q.regularMarketPrice,
      change: q.regularMarketChange,
      changePercent: q.regularMarketChangePercent,
      currency: currency,
      currencySymbol: currencySymbol,
      exchangeRateToUSD: exchangeRate
    });
  } catch (error) {
    console.error('Quote error:', error.message);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
}
