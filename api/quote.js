export default async function handler(req, res) {
  try {
    const symbol = req.query.symbol;
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`);
    const data = await response.json();
    
    if (!data.chart.result) throw new Error('No data');
    const meta = data.chart.result[0].meta;
    const currency = meta.currency || 'USD';
    
    let exchangeRate = 1;
    let currencySymbol = '$';
    
    if (currency !== 'USD') {
      try {
        let fxSymbol = `${currency}USD=X`;
        let divisor = 1;
        if (currency === 'GBp') { fxSymbol = 'GBPUSD=X'; divisor = 100; }
        else if (currency === 'ILA') { fxSymbol = 'ILSUSD=X'; divisor = 100; }
        
        const fxRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${fxSymbol}?interval=1d&range=1d`);
        const fxData = await fxRes.json();
        exchangeRate = fxData.chart.result[0].meta.regularMarketPrice / divisor;
      } catch (e) {
        console.warn('Failed to fetch exchange rate for', currency);
      }
    }
    
    if (currency === 'EUR') currencySymbol = '€';
    else if (currency === 'ILS' || currency === 'ILA') currencySymbol = '₪';
    else if (currency === 'GBP' || currency === 'GBp') currencySymbol = '£';
    else if (currency === 'JPY') currencySymbol = '¥';
    else if (currency !== 'USD') currencySymbol = currency + " ";
    
    res.json({
      symbol: meta.symbol,
      price: meta.regularMarketPrice,
      change: meta.regularMarketPrice - meta.chartPreviousClose,
      changePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
      currency: currency,
      currencySymbol: currencySymbol,
      exchangeRateToUSD: exchangeRate
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
}
