// Vercel serverless endpoint: returns public Supabase connection settings only.
// SUPABASE_ANON_KEY is a public/anon key, NOT a service_role key.
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({error: 'Method not allowed'});
  const url = process.env.SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';
  if (!url || !anonKey) return res.status(200).json({configured: false});
  if (!/^https:\/\/[a-z0-9.-]+$/i.test(url)) return res.status(500).json({configured:false, error:'Invalid SUPABASE_URL'});
  return res.status(200).json({configured: true, url, anonKey});
};
