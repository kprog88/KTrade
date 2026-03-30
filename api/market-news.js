export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  try {
    const response = await fetch(
      'https://query1.finance.yahoo.com/v1/finance/search?q=stock+market&newsCount=8&quotesCount=0&lang=en-US&region=US',
      { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }
    );
    const data = await response.json();
    const articles = (data?.news || []).map(a => ({
      title: a.title,
      publisher: a.publisher,
      link: a.link,
      publishedAt: a.providerPublishTime,
    }));
    res.json(articles);
  } catch (e) {
    res.status(500).json([]);
  }
}
