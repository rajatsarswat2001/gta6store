// api/subscribe.js — Vercel Serverless Function
// Handles newsletter subscription:
//   1. Validates email
//   2. Saves to Supabase subscribers table
//   3. Sends welcome email via Brevo

const { sendEmail, emails } = require('./send-email');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  process.env.SITE_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};

  // Validate
  const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRx.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  // 1. Save to Supabase
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const sbRes = await fetch(`${supabaseUrl}/rest/v1/subscribers`, {
        method: 'POST',
        headers: {
          'apikey':        supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type':  'application/json',
          'Prefer':        'resolution=ignore-duplicates,return=minimal' // ignore duplicate emails
        },
        body: JSON.stringify({ email })
      });
      if (!sbRes.ok) {
        const err = await sbRes.text();
        // 23505 = unique violation (already subscribed) — not a real error
        if (!err.includes('23505')) {
          console.error('[subscribe] Supabase insert failed:', err);
        }
      }
    } catch (e) {
      console.error('[subscribe] Supabase error:', e.message);
    }
  }

  // 2. Send welcome email (non-blocking — don't fail request if email fails)
  try {
    await sendEmail(emails.subscriberWelcome({ email }));
  } catch (e) {
    console.error('[subscribe] Welcome email failed:', e.message);
  }

  return res.status(200).json({ ok: true, message: 'Subscribed successfully' });
};
