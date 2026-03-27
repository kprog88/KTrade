export default async function handler(req, res) {
  try {
    const symbols = ['NVDA', 'PLTR', 'CRWD', 'META', 'UBER', 'MSTR'];
    const results = await Promise.all(symbols.map(async (symbol) => {
      try {
        const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`);
        const data = await response.json();
        if (!data.chart.result) return null;
        const meta = data.chart.result[0].meta;
        return {
          symbol: meta.symbol,
          price: meta.regularMarketPrice,
          change: meta.regularMarketPrice - meta.chartPreviousClose,
          changePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
          name: meta.symbol
        };
      } catch (e) { return null; }
    }));
    
    const validResults = results.filter(Boolean).sort((a,b) => b.changePercent - a.changePercent);
    res.json(validResults);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch momentum' });
  }
}
