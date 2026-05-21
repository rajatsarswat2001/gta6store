// api/payment-status.js — CryptAPI Edition
// Instead of polling CryptAPI directly, we read booking status from Supabase.
// The status gets updated by payment-webhook.js when CryptAPI calls us.
// Frontend polls this every 10 seconds.

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  process.env.SITE_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')    return res.status(405).json({ error: 'Method not allowed' });

  // payment_id = bookingId (e.g. GTA6-XXXX) for CryptAPI flow
  const { payment_id } = req.query;
  if (!payment_id) return res.status(400).json({ error: 'payment_id is required' });

  // Demo mode
  if (String(payment_id).startsWith('DEMO-')) {
    return res.json({ payment_status: 'waiting', payment_id });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(503).json({ error: 'Supabase not configured' });
  }

  try {
    const r = await fetch(
      `${supabaseUrl}/rest/v1/bookings?booking_id=eq.${encodeURIComponent(payment_id)}&select=status,booking_id&limit=1`,
      { headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}` } }
    );
    const rows = await r.json();

    if (!rows || !rows.length) {
      return res.status(404).json({ error: 'Booking not found', payment_status: 'waiting' });
    }

    const booking = rows[0];

    // Map Supabase status → frontend status (same names as before)
    const statusMap = {
      'payment_pending':    'waiting',
      'payment_confirming': 'confirming',
      'confirmed':          'confirmed',
      'payment_expired':    'expired',
      'payment_failed':     'failed',
      'refunded':           'refunded'
    };

    return res.json({
      payment_id:     booking.booking_id,
      payment_status: statusMap[booking.status] || booking.status
    });

  } catch (err) {
    console.error('[payment-status] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
