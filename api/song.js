// Función serverless (Vercel): GET /api/song?url=https://...
import { handleSongRequest } from './_extract.js';

export default async function handler(req, res) {
  const url = typeof req.query?.url === 'string' ? req.query.url : '';
  const out = await handleSongRequest(url);
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  res.status(out.status).json(out.body);
}
