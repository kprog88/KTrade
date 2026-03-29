export default async function handler(req, res) {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });

    const modules = 'institutionOwnership,majorHoldersBreakdown,insiderTransactions';
    const url = `https://query2.finance.yahoo.com/v8/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}&formatted=true&lang=en-US&region=US`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
      }
    });

    const data = await response.json();

    if (!data.quoteSummary?.result?.[0]) {
      throw new Error('No institutional data available for this symbol');
    }

    const result = data.quoteSummary.result[0];

    // ── Major holders breakdown ──────────────────────────────────────────────
    const bd = result.majorHoldersBreakdown || {};
    const breakdown = {
      institutionPct:   bd.institutionsPercentHeld?.raw   ?? null,
      institutionCount: bd.institutionsCount?.raw         ?? null,
      insiderPct:       bd.insidersPercentHeld?.raw       ?? null,
      floatPct:         bd.institutionsFloatPercentHeld?.raw ?? null,
    };

    // ── Top institutional holders ─────────────────────────────────────────────
    const ownerList = result.institutionOwnership?.ownershipList ?? [];
    const topHolders = ownerList.slice(0, 10).map(h => ({
      name:       h.organization,
      pctHeld:    h.pctHeld?.raw    ?? null,
      pctChange:  h.pctChange?.raw  ?? null,
      value:      h.value?.raw      ?? null,
      position:   h.position?.raw   ?? null,
      reportDate: h.reportDate?.fmt ?? null,
    }));

    // ── Insider transactions ─────────────────────────────────────────────────
    const txnList = result.insiderTransactions?.transactions ?? [];
    const transactions = txnList.slice(0, 8).map(t => ({
      name:   t.filerName            ?? 'Unknown',
      role:   t.filerRelation        ?? '',
      text:   t.transactionText      ?? '',
      shares: t.shares?.raw          ?? null,
      value:  t.value?.raw           ?? null,
      date:   t.startDate?.fmt       ?? null,
      code:   t.transactionCode      ?? '', // P=Purchase, S=Sale, A=Grant/Award
    })).filter(t => t.code === 'P' || t.code === 'S'); // only real buys/sells

    res.setHeader('Cache-Control', 's-maxage=3600'); // cache 1 hour (updates quarterly)
    res.json({ breakdown, topHolders, transactions });
  } catch (err) {
    console.error('Institutional data error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to fetch institutional data' });
  }
}
