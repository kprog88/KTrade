import Anthropic from '@anthropic-ai/sdk';

const PROMPT = `This is a screenshot of a brokerage or investment portfolio app (could be Robinhood, Trading212, IBKR, Schwab, Fidelity, eToro, etc.).

Extract every visible stock, ETF, or crypto position. For each:
- symbol: ticker (uppercase, e.g. "AAPL", "NVDA", "BTC-USD"). If the app shows a name instead, infer the ticker.
- name: company/asset name if shown
- amount: number of shares/units (decimal allowed, e.g. 1.5). If only total value shown and no share count, set null.
- avgPrice: average purchase / cost-basis price per share if visible. Numbers only, no currency symbols. Set null if not visible.
- currentPrice: current market price per share if visible. Set null if not shown.

Return ONLY valid JSON — no markdown, no code fences, no explanation:
{
  "holdings": [
    { "symbol": "AAPL", "name": "Apple Inc.", "amount": 10.5, "avgPrice": 145.50, "currentPrice": 189.30 }
  ],
  "currency": "USD",
  "notes": "Any important caveats — e.g. which fields were missing"
}

Rules:
- symbol must be uppercase string
- amount / avgPrice / currentPrice must be numbers or null, never strings
- Include EVERY position visible — do not skip any
- If you see a crypto ticker like "BTC" that trades on Yahoo Finance as "BTC-USD", use that form
- Do not invent data — only extract what's visible`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { imageBase64, mediaType } = req.body || {};
  if (!imageBase64) return res.status(400).json({ error: 'No image provided' });

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType || 'image/jpeg',
              data: imageBase64,
            },
          },
          { type: 'text', text: PROMPT },
        ],
      }],
    });

    let raw = message.content[0].text.trim();
    // Strip markdown fences if model added them
    raw = raw.replace(/^```(?:json)?\s*/im, '').replace(/\s*```\s*$/m, '').trim();
    const first = raw.indexOf('{'), last = raw.lastIndexOf('}');
    if (first !== -1 && last !== -1) raw = raw.slice(first, last + 1);

    const parsed = JSON.parse(raw);
    res.json(parsed);
  } catch (err) {
    console.error('scan-portfolio error:', err.message);
    res.status(500).json({ error: err.message || 'Scan failed' });
  }
}
