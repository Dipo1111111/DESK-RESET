// Gumroad sale webhook → Telegram notification
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID  = process.env.TELEGRAM_CHAT_ID;

  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('Telegram env vars missing');
    return res.status(200).json({ ok: false, note: 'Telegram not configured' });
  }

  try {
    const body = req.body;

    // Gumroad sends form-encoded or JSON depending on config
    // Normalize to a flat object
    const sale = body?.sale || body;
    const product  = sale?.product_name  || sale?.product?.name || 'The Desk Reset';
    const email    = sale?.email         || sale?.customer_email || '—';
    const price    = sale?.price          || sale?.amount_cents
                    ? `$${(sale.amount_cents / 100).toFixed(2)}`
                    : '—';
    const currency = sale?.currency      || 'USD';
    const orderId  = sale?.order_id      || sale?.id || '—';

    const message =
      `🛒 *New Sale!*\n\n` +
      `📦 ${product}\n` +
      `💰 ${price} ${currency}\n` +
      `🧑 ${email}\n` +
      `🔖 \`${orderId}\``;

    const tgRes = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
          parse_mode: 'Markdown',
        }),
      }
    );

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      console.error('Telegram error:', tgData);
      return res.status(502).json({ error: 'Telegram send failed', detail: tgData });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook failed' });
  }
}
