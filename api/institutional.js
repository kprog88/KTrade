// Module-level crumb cache (survives warm Vercel invocations)
let _crumb = null;
let _cookies = null;
let _crumbTs = 0;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function getYahooAuth() {
  // Reuse if < 25 minutes old
  if (_crumb && Date.now() - _crumbTs < 25 * 60 * 1000) {
    return { crumb: _crumb, cookies: _cookies };
  }

  // 1. Hit Yahoo Finance home to get a session cookie
  const homeRes = await fetch('https://finance.yahoo.com/', {
    headers: { 'User-Agent': UA, 'Accept': 'text/html,application/xhtml+xml' },
    redirect: 'follow',
  });

  // Parse Set-Cookie — Node 18+ supports getSetCookie()
  let cookieParts = [];
  if (typeof homeRes.headers.getSetCookie === 'function') {
    cookieParts = homeRes.headers.getSetCookie().map(c => c.split(';')[0]);
  } else {
    const raw = homeRes.headers.get('set-cookie') || '';
    cookieParts = raw.split(',').map(c => c.split(';')[0].trim()).filter(Boolean);
  }
  const cookieStr = cookieParts.join('; ');

  // 2. Get crumb with the session cookie
  const crumbRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, 'Cookie': cookieStr },
  });
  const crumb = await crumbRes.text();

  if (!crumb || crumb.startsWith('<') || crumb.length < 3) {
    throw new Error('Could not obtain Yahoo Finance session crumb');
  }

  _crumb   = crumb.trim();
  _cookies = cookieStr;
  _crumbTs = Date.now();

  return { crumb: _crumb, cookies: _cookies };
}

export default async function handler(req, res) {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: 'Symbol required' });

    const { crumb, cookies } = await getYahooAuth();

    const modules = 'institutionOwnership,majorHoldersBreakdown,insiderTransactions';
    const url =
      `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}` +
      `?modules=${modules}&crumb=${encodeURIComponent(crumb)}&formatted=true&lang=en-US&region=US`;

    const response = await fetch(url, {
      headers: { 'User-Agent': UA, 'Cookie': cookies },
    });
    const data = await response.json();

    if (!data.quoteSummary?.result?.[0]) {
      const msg = data.quoteSummary?.error?.description || 'No data returned';
      throw new Error(msg);
    }

    const result = data.quoteSummary.result[0];

    const bd = result.majorHoldersBreakdown || {};
    const breakdown = {
      institutionPct:   bd.institutionsPercentHeld?.raw    ?? null,
      institutionCount: bd.institutionsCount?.raw          ?? null,
      insiderPct:       bd.insidersPercentHeld?.raw        ?? null,
      floatPct:         bd.institutionsFloatPercentHeld?.raw ?? null,
    };

    const ownerList = result.institutionOwnership?.ownershipList ?? [];
    const topHolders = ownerList.slice(0, 10).map(h => ({
      name:       h.organization,
      pctHeld:    h.pctHeld?.raw    ?? null,
      pctChange:  h.pctChange?.raw  ?? null,
      value:      h.value?.raw      ?? null,
      position:   h.position?.raw   ?? null,
      reportDate: h.reportDate?.fmt ?? null,
    }));

    const txnList = result.insiderTransactions?.transactions ?? [];
    const transactions = txnList
      .slice(0, 8)
      .map(t => ({
        name:   t.filerName       ?? 'Unknown',
        role:   t.filerRelation   ?? '',
        shares: t.shares?.raw     ?? null,
        value:  t.value?.raw      ?? null,
        date:   t.startDate?.fmt  ?? null,
        code:   t.transactionCode ?? '',
      }))
      .filter(t => t.code === 'P' || t.code === 'S');

    res.setHeader('Cache-Control', 's-maxage=3600');
    res.json({ breakdown, topHolders, transactions });
  } catch (err) {
    console.error('Institutional error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to fetch institutional data' });
  }
}
