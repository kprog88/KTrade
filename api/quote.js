import YahooFinance from 'yahoo-finance2';

const _yf = new YahooFinance({ suppressNotices: ['ripHistorical', 'yahooSurvey'] });

async function proxiedFetchJson(url) {
  const proxies = [
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
  ];
  for (const pUrl of proxies) {
    try {
      const res = await fetch(pUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
      if (res.ok) return await res.json();
    } catch (e) { /* skip */ }
  }
  throw new Error('All proxy attempts failed');
}

export default async function handler(req, res) {
  try {
    const symbol = req.query.symbol;
    let q;
    
    try {
      q = await _yf.quote(symbol);
    } catch (err) {
      console.warn('yahoo-finance2 quote failed, trying proxy fallback...');
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
      const data = await proxiedFetchJson(url);
      if (!data?.chart?.result?.[0]?.meta) throw new Error('No data via proxy');
      const meta = data.chart.result[0].meta;
      q = {
        symbol: meta.symbol,
        regularMarketPrice: meta.regularMarketPrice,
        regularMarketChange: meta.regularMarketPrice - meta.chartPreviousClose,
        regularMarketChangePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
        currency: meta.currency
      };
    }

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
        
        try {
          const fxQ = await _yf.quote(fxSym);
          let divisor = (currency === 'GBp' || currency === 'ILA') ? 100 : 1;
          exchangeRate = (fxQ.regularMarketPrice || 1) / divisor;
        } catch(e) {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(fxSym)}?interval=1d&range=1d`;
          const proxyData = await proxiedFetchJson(url);
          const meta = proxyData.chart.result[0].meta;
          let divisor = (currency === 'GBp' || currency === 'ILA') ? 100 : 1;
          exchangeRate = (meta.regularMarketPrice || 1) / divisor;
        }
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
