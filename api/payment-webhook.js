// api/payment-webhook.js — CryptAPI Edition
// CryptAPI calls this URL (GET request) when a payment is received.
// URL format: /api/payment-webhook?bookingId=GTA6-XXXX&coin=btc&txid_in=...&value_coin=...&confirmations=1
//
// IMPORTANT: Must respond with exactly the text *ok* — otherwise CryptAPI retries every 5 mins.

const { sendEmail, emails } = require('./send-email');

module.exports = async function handler(req, res) {
  // CryptAPI sends GET requests for callbacks
  if (req.method !== 'GET') return res.status(405).send('Method Not Allowed');

  const {
    bookingId,        // passed in our callback URL
    coin,             // passed in our callback URL (e.g. 'btc', 'trc20/usdt')
    txid_in,          // incoming transaction hash (from sender)
    txid_out,         // outgoing transaction hash (to your wallet)
    value_coin,       // amount received in crypto
    value_forwarded,  // amount forwarded to your wallet (after CryptAPI 1% fee)
    confirmations     // number of blockchain confirmations
  } = req.query;

  console.log(`[webhook] CryptAPI callback — bookingId:${bookingId} coin:${coin} txid:${txid_in} confs:${confirmations}`);

  if (!bookingId) {
    console.error('[webhook] Missing bookingId in callback');
    // Still respond *ok* to prevent retry spam
    res.setHeader('Content-Type', 'text/plain');
    return res.status(200).send('*ok*');
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  // CryptAPI sends partial callbacks at 0 confirmations and again at 1+
  // We mark as 'confirming' at 0 confs, 'confirmed' at 1+ confs
  const numConfs    = parseInt(confirmations || '0');
  const bookingStatus = numConfs >= 1 ? 'confirmed' : 'payment_confirming';

  if (supabaseUrl && supabaseKey) {
    try {
      // ── Update booking status ─────────────────────────────────
      const sbRes = await fetch(
        `${supabaseUrl}/rest/v1/bookings?booking_id=eq.${encodeURIComponent(bookingId)}`,
        {
          method: 'PATCH',
          headers: {
            'apikey':        supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type':  'application/json',
            'Prefer':        'return=minimal'
          },
          body: JSON.stringify({
            status:         bookingStatus,
            crypto_tx_hash: txid_in || txid_out || null
          })
        }
      );

      if (!sbRes.ok) {
        console.error('[webhook] Supabase update failed:', await sbRes.text());
      } else {
        console.log(`[webhook] Booking ${bookingId} → ${bookingStatus} (${numConfs} confs, ${value_coin} received)`);
      }

      // ── On confirmed: increment stat + send confirmation email ──
      if (bookingStatus === 'confirmed') {
        await incrementBookingStat(supabaseUrl, supabaseKey);
        await sendConfirmationEmail(supabaseUrl, supabaseKey, bookingId);
      }

    } catch (e) {
      console.error('[webhook] Supabase error:', e.message);
    }
  }

  // MUST respond with *ok* — CryptAPI stops retrying only when it sees this
  res.setHeader('Content-Type', 'text/plain');
  return res.status(200).send('*ok*');
};

/* ── Helpers ── */

async function incrementBookingStat(supabaseUrl, supabaseKey) {
  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/site_settings?key=eq.stat_bookings&select=value`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
    );
    const rows    = await r.json();
    const current = parseInt((rows[0] && rows[0].value) || '0');
    await fetch(
      `${supabaseUrl}/rest/v1/site_settings?key=eq.stat_bookings`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json', 'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ value: String(current + 1) })
      }
    );
  } catch (e) {
    console.error('[webhook] incrementBookingStat error:', e.message);
  }
}

async function sendConfirmationEmail(supabaseUrl, supabaseKey, bookingId) {
  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/bookings?booking_id=eq.${encodeURIComponent(bookingId)}&select=name,email,edition,platform,full_price,advance_price,crypto_method&limit=1`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
    );
    const rows = await r.json();
    if (!rows || !rows.length || !rows[0].email) return;
    const b = rows[0];
    await sendEmail(emails.bookingConfirmed({
      name:         b.name          || 'GTA6 Fan',
      email:        b.email,
      bookingId,
      edition:      b.edition       || 'Standard Edition',
      platform:     b.platform      || 'PS5',
      advanceUSD:   b.advance_price || 0,
      fullPriceUSD: b.full_price    || 0,
      cryptoMethod: b.crypto_method || 'Crypto'
    }));
    console.log('[webhook] Confirmation email → ', b.email);
  } catch (e) {
    console.error('[webhook] sendConfirmationEmail error:', e.message);
  }
}
