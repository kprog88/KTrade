export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
  try {
    // Yahoo Finance top stories RSS — always real-time
    const response = await fetch('https://finance.yahoo.com/rss/topstories', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const xml = await response.text();

    // Parse <item> blocks
    const items = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
    const articles = items.slice(0, 8).map(item => {
      const title   = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) ||
                       item.match(/<title>(.*?)<\/title>/) || [])[1] || '';
      const link    = (item.match(/<link>(.*?)<\/link>/)    || [])[1]?.trim() || '';
      const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
      const source  = (item.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || 'Yahoo Finance';
      return {
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
        link,
        publisher: source.trim(),
        publishedAt: pubDate ? Math.floor(new Date(pubDate).getTime() / 1000) : null,
      };
    }).filter(a => a.title && a.link);

    res.json(articles);
  } catch (e) {
    res.status(500).json([]);
  }
}
