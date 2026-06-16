// Record page views and Gumroad clicks via Upstash Redis REST API
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type } = req.body; // "pageview" or "click"
  if (!type || !['pageview', 'click'].includes(type)) {
    return res.status(400).json({ error: 'Invalid type' });
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Silently fail if Redis isn't configured yet
  // (the page still works, just no stats recorded)
  if (!url || !token) {
    return res.status(200).json({ ok: true, note: 'Redis not configured' });
  }

  const auth = { Authorization: `Bearer ${token}` };
  const today = new Date().toISOString().split('T')[0];

  try {
    // Increment daily counter
    await fetch(url, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify(['INCR', `stats:${type}:${today}`]),
    });

    // Increment total counter
    await fetch(url, {
      method: 'POST',
      headers: auth,
      body: JSON.stringify(['INCR', `stats:total:${type}s`]),
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Tracking error:', err);
    res.status(200).json({ ok: true, note: 'Error recording' });
  }
}
