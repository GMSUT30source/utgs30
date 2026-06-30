/**
 * UTGS30 — Finnhub proxy
 * Vercel serverless function: /api/stock?symbol=AAPL&type=quote|profile2|metric
 *
 * Set FINNHUB_API_KEY in Vercel → Settings → Environment Variables
 */
export default async function handler(req, res) {
  // CORS — allow same-origin requests (Vercel serves both)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { symbol, type } = req.query;

  if (!symbol || !type) {
    return res.status(400).json({ error: 'Missing symbol or type param' });
  }

  const token = process.env.FINNHUB_API_KEY;
  if (!token) {
    return res.status(500).json({ error: 'FINNHUB_API_KEY not set on server' });
  }

  const BASE = 'https://finnhub.io/api/v1';
  const urls = {
    quote:    `${BASE}/quote?symbol=${symbol}&token=${token}`,
    profile2: `${BASE}/stock/profile2?symbol=${symbol}&token=${token}`,
    metric:   `${BASE}/stock/metric?symbol=${symbol}&metric=all&token=${token}`,
  };

  const url = urls[type];
  if (!url) {
    return res.status(400).json({ error: `Unknown type "${type}". Use quote, profile2, or metric.` });
  }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Finnhub error', status: upstream.status });
    }
    const data = await upstream.json();

    // Cache for 30 s on Vercel edge (quote data changes frequently)
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=10');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Upstream fetch failed', detail: err.message });
  }
}
