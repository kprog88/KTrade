export default async function handler(req, res) {
  try {
    const currency = req.query.currency.toUpperCase();
    if (currency === 'USD') return res.json({ rate: 1 });
    
    let fxSymbol = `${currency}USD=X`;
    if (currency === 'ILS' || currency === 'ILA') fxSymbol = 'ILSUSD=X';
    if (currency === 'GBP' || currency === 'GBp') fxSymbol = 'GBPUSD=X';
    
    const fxRes = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${fxSymbol}?interval=1d&range=1d`);
    const fxData = await fxRes.json();
    const fxMeta = fxData.chart.result[0].meta;
    
    let divisor = 1;
    if (currency === 'ILA' || currency === 'GBp') divisor = 100;

    res.json({ rate: fxMeta.regularMarketPrice / divisor });
  } catch (error) {
    res.json({ rate: 1 }); // safe fallback
  }
}
