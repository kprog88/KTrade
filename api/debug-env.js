export default function handler(req, res) {
  const key = process.env.ANTHROPIC_API_KEY;
  res.json({
    hasKey: !!key,
    prefix: key ? key.slice(0, 14) + '...' : 'NOT SET',
    nodeEnv: process.env.NODE_ENV,
  });
}
