import Anthropic from '@anthropic-ai/sdk';

function buildPortfolioSummary(holdings) {
  const totalValue = holdings.reduce((sum, h) => {
    const price = h.currentPrice || h.avgPrice;
    return sum + price * h.amount;
  }, 0);

  const rows = holdings
    .map(h => {
      const price  = h.currentPrice || h.avgPrice;
      const value  = price * h.amount;
      const pnlPct = h.avgPrice > 0 ? ((price - h.avgPrice) / h.avgPrice) * 100 : 0;
      const weight = totalValue > 0 ? (value / totalValue) * 100 : 0;
      return {
        symbol:   h.symbol,
        name:     h.name || h.symbol,
        shares:   h.amount,
        avgCost:  h.avgPrice.toFixed(2),
        current:  price.toFixed(2),
        pnlPct:   pnlPct.toFixed(1),
        value:    value.toFixed(2),
        weightPct: weight.toFixed(1),
      };
    })
    .sort((a, b) => parseFloat(b.value) - parseFloat(a.value));

  const totalCost = holdings.reduce((sum, h) => sum + h.avgPrice * h.amount, 0);
  const totalPnlPct = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

  return { rows, totalValue: totalValue.toFixed(2), totalPnlPct: totalPnlPct.toFixed(1) };
}

function buildPrompt({ rows, totalValue, totalPnlPct }) {
  const table = rows.map(r =>
    `• ${r.symbol} (${r.name}): ${r.shares} shares @ avg $${r.avgCost} → now $${r.current} | P&L: ${r.pnlPct}% | Position value: $${r.value} | Weight: ${r.weightPct}%`
  ).join('\n');

  const today = new Date().toISOString().split('T')[0];

  return `You are a senior portfolio manager and experienced stock analyst with 30 years on Wall Street. Today is ${today}.

Here is the investor's current portfolio (total value: $${totalValue}, overall P&L: ${totalPnlPct}%):

${table}

Analyze this portfolio like a real professional. Consider:
- Current macroeconomic environment (interest rates, sector trends, geopolitical risks as of today)
- Concentration risk and diversification gaps
- Which positions to hold, add to, trim, or exit — and why
- Any rebalancing or new category to consider

Respond ONLY with a valid JSON object in exactly this format (no markdown, no code fences):
{
  "summary": "2-3 sentence honest assessment of the overall portfolio health and strategy",
  "actions": [
    {
      "symbol": "TICKER",
      "action": "HOLD|ADD|TRIM|EXIT",
      "rationale": "One clear sentence explaining why"
    }
  ],
  "topRisk": "The single biggest risk facing this portfolio right now (1 sentence)",
  "suggestion": "One actionable portfolio-level improvement to consider (1-2 sentences)"
}

Be direct, specific, and honest. Use real market knowledge. Do not be generic.`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { holdings } = req.body;

    if (!holdings || holdings.length === 0) {
      return res.json({
        summary: "Your portfolio is empty. Building a strong foundation starts with diversification across at least 3-5 sectors.",
        actions: [],
        topRisk: "100% cash means missing compounding returns over time.",
        suggestion: "Start with a broad-market ETF like VTI or SPY to establish a core position, then add individual stocks selectively.",
      });
    }

    const portfolioData = buildPortfolioSummary(holdings);
    const prompt = buildPrompt(portfolioData);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].text.trim();

    // Strip markdown code fences if Claude wraps in them
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    const parsed = JSON.parse(jsonStr);

    res.setHeader('Cache-Control', 'no-store');
    res.json(parsed);
  } catch (err) {
    console.error('AI insights error:', err.message, err.status ?? '');
    res.json({
      summary: `AI error: ${err.message}`,
      actions: [],
      topRisk: "See server console for details.",
      suggestion: "Check ANTHROPIC_API_KEY is set and the server was restarted.",
    });
  }
}
