// Return aggregated stats for the admin dashboard
export default async function handler(req, res) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return res.status(200).json({
      pageviews: 0,
      clicks: 0,
      conversionRate: 0,
      daily: [],
      note: 'Redis not configured — set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN',
    });
  }

  const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const redis = async (cmd, ...args) => {
    const r = await fetch(url, { method: 'POST', headers: auth, body: JSON.stringify([cmd, ...args]) });
    return r.json();
  };

  try {
    // Totals
    const [pvTotal, clTotal] = await Promise.all([
      redis('GET', 'stats:total:pageviews'),
      redis('GET', 'stats:total:clicks'),
    ]);

    const pageviews = parseInt(pvTotal?.result) || 0;
    const clicks = parseInt(clTotal?.result) || 0;

    // Daily breakdown — last 30 days
    const daily = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().split('T')[0];
      const [pv, cl] = await Promise.all([
        redis('GET', `stats:pageview:${date}`),
        redis('GET', `stats:click:${date}`),
      ]);
      daily.push({
        date,
        pageviews: parseInt(pv?.result) || 0,
        clicks: parseInt(cl?.result) || 0,
      });
    }

    res.status(200).json({
      pageviews,
      clicks,
      conversionRate: pageviews > 0 ? +((clicks / pageviews) * 100).toFixed(1) : 0,
      daily,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}
