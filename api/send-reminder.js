// api/send-reminder.js — Vercel Serverless Function (Manual Trigger)
// Send the "7 days to launch" balance payment reminder to ALL confirmed bookings.
//
// USAGE (trigger manually from admin or cURL):
//   POST https://gta6store.in/api/send-reminder
//   Body: { "secret": "YOUR_ADMIN_SECRET" }
//
// Triggered once, 7 days before November 19, 2026.

const { sendEmail, emails } = require('./send-email');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Simple secret gate — add ADMIN_SECRET to Vercel environment variables
  const { secret } = req.body || {};
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  try {
    // Fetch all confirmed bookings
    const res2 = await fetch(
      `${supabaseUrl}/rest/v1/bookings?status=eq.confirmed&select=name,email,booking_id,edition,platform,full_price,advance_price,crypto_method`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
    );
    const bookings = await res2.json();

    if (!Array.isArray(bookings) || bookings.length === 0) {
      return res.json({ ok: true, sent: 0, message: 'No confirmed bookings found' });
    }

    let sent = 0, failed = 0;
    for (const b of bookings) {
      if (!b.email) continue;
      const remaining = (parseFloat(b.full_price || 0) - parseFloat(b.advance_price || 0)).toFixed(2);
      const result = await sendEmail(emails.balanceReminder({
        name:         b.name         || 'GTA6 Fan',
        email:        b.email,
        bookingId:    b.booking_id,
        edition:      b.edition      || 'Standard Edition',
        platform:     b.platform     || 'PS5',
        remainingUSD: remaining,
        cryptoMethod: b.crypto_method || 'Crypto'
      }));
      if (result && result.error) failed++;
      else sent++;
      // Rate limit: 10 emails/sec max on Brevo free tier
      await new Promise(r => setTimeout(r, 120));
    }

    console.log(`[reminder] Done — sent: ${sent}, failed: ${failed}`);
    return res.json({ ok: true, sent, failed, total: bookings.length });

  } catch(e) {
    console.error('[reminder] Error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};
