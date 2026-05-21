// api/create-payment.js — CryptAPI Edition
// No account, no KYC, no middleman.
// CryptAPI generates a unique forwarding address per payment.
// When user pays → CryptAPI forwards to YOUR wallet → calls your webhook.
//
// REQUIRED ENV VARS:
//   CRYPTAPI_BTC_ADDRESS   your Bitcoin wallet address
//   CRYPTAPI_ETH_ADDRESS   your Ethereum wallet address
//   CRYPTAPI_USDT_ADDRESS  your USDT TRC-20 address
//   CRYPTAPI_USDC_ADDRESS  your USDC ERC-20 address
//   CRYPTAPI_SOL_ADDRESS   your Solana wallet address
//   SITE_URL               https://gta6store.co.uk

const { sendEmail, emails } = require('./send-email');

const CRYPTAPI = 'https://api.cryptapi.io';

// Map frontend crypto → { coin path for CryptAPI API, env var with your wallet }
const COIN_MAP = {
  'Bitcoin (BTC)':  { coin: 'btc',         env: 'CRYPTAPI_BTC_ADDRESS',  ticker: 'BTC'  },
  'Ethereum (ETH)': { coin: 'eth',         env: 'CRYPTAPI_ETH_ADDRESS',  ticker: 'ETH'  },
  'USDT':           { coin: 'trc20/usdt',  env: 'CRYPTAPI_USDT_ADDRESS', ticker: 'USDT' },
  'USDC':           { coin: 'erc20/usdc',  env: 'CRYPTAPI_USDC_ADDRESS', ticker: 'USDC' },
  'Solana (SOL)':   { coin: 'sol',         env: 'CRYPTAPI_SOL_ADDRESS',  ticker: 'SOL'  },
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin',  process.env.SITE_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const {
    bookingId, name, email, wallet,
    edition, platform, fullPrice, advancePrice, cryptoMethod
  } = req.body || {};

  if (!bookingId || !email || !advancePrice) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const coinInfo = COIN_MAP[cryptoMethod];
  if (!coinInfo) {
    return res.status(400).json({ error: 'Unsupported crypto: ' + cryptoMethod });
  }

  const yourWallet = process.env[coinInfo.env];
  const siteUrl    = process.env.SITE_URL || 'https://gta6store.co.uk';

  // ── Demo mode: wallet address not configured yet ──────────────
  if (!yourWallet) {
    console.log(`[create-payment] Demo mode — ${coinInfo.env} not set`);
    await saveBooking({ bookingId, name, email, wallet, edition, platform, fullPrice, advancePrice, cryptoMethod, txRef: 'DEMO' });
    return res.json({
      demo:           true,
      payment_id:     bookingId,             // use bookingId for status polling
      pay_address:    'DEMO_ADDRESS_SET_' + coinInfo.env + '_IN_VERCEL',
      pay_amount:     (parseFloat(advancePrice) / 60000).toFixed(8),
      pay_currency:   coinInfo.ticker,
      price_amount:   advancePrice,
      price_currency: 'USD',
      payment_status: 'waiting',
      expiration_estimate_date: new Date(Date.now() + 20 * 60 * 1000).toISOString()
    });
  }

  try {
    // ── 1. Get live crypto price conversion from CryptAPI ─────────
    let cryptoAmount = null;
    try {
      const priceRes = await fetch(
        `${CRYPTAPI}/${coinInfo.coin}/convert/?value=${parseFloat(advancePrice)}&from=USD`
      );
      const priceData = await priceRes.json();
      if (priceData.status === 'success') {
        cryptoAmount = priceData.value_coin;
      }
    } catch (e) {
      console.warn('[create-payment] Price fetch failed, will use estimate:', e.message);
    }

    // ── 2. Create unique payment address via CryptAPI ─────────────
    // Callback URL — CryptAPI calls this GET URL when payment arrives
    const callbackUrl = `${siteUrl}/api/payment-webhook?bookingId=${encodeURIComponent(bookingId)}&coin=${encodeURIComponent(coinInfo.coin)}`;

    const createRes = await fetch(
      `${CRYPTAPI}/${coinInfo.coin}/create/?` +
      `callback=${encodeURIComponent(callbackUrl)}` +
      `&address=${encodeURIComponent(yourWallet)}` +
      `&confirmations=1` +
      `&pending=0`
    );

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error('CryptAPI create failed: ' + err);
    }

    const createData = await createRes.json();

    if (createData.status !== 'success' || !createData.address_in) {
      throw new Error('CryptAPI error: ' + JSON.stringify(createData));
    }

    console.log(`[CryptAPI] Payment address created: ${createData.address_in} for booking ${bookingId}`);

    // ── 3. Save booking to Supabase ───────────────────────────────
    await saveBooking({
      bookingId, name, email, wallet, edition, platform,
      fullPrice, advancePrice, cryptoMethod, txRef: createData.address_in
    });

    // ── 4. Send "payment address ready" email ─────────────────────
    sendEmail(emails.bookingPending({
      name:        name || 'GTA6 Fan',
      email,
      bookingId,
      edition:     edition || '',
      platform:    platform || '',
      advanceUSD:  advancePrice,
      cryptoMethod,
      payAmount:   cryptoAmount || '...',
      payCurrency: coinInfo.ticker,
      payAddress:  createData.address_in,
      expiresAt:   new Date(Date.now() + 20 * 60 * 1000).toISOString()
    })).catch(e => console.error('[create-payment] email error:', e.message));

    // ── 5. Return to frontend ─────────────────────────────────────
    return res.status(200).json({
      payment_id:               bookingId,        // used for status polling
      pay_address:              createData.address_in,
      pay_amount:               cryptoAmount,
      pay_currency:             coinInfo.ticker,
      price_amount:             advancePrice,
      price_currency:           'USD',
      payment_status:           'waiting',
      expiration_estimate_date: new Date(Date.now() + 20 * 60 * 1000).toISOString()
    });

  } catch (err) {
    console.error('[create-payment] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

/* ── Save booking to Supabase ── */
async function saveBooking({ bookingId, name, email, wallet, edition, platform, fullPrice, advancePrice, cryptoMethod, txRef }) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return;
  try {
    const r = await fetch(`${url}/rest/v1/bookings`, {
      method: 'POST',
      headers: {
        'apikey': key, 'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json', 'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        booking_id:     bookingId,
        name:           name || '',
        email,
        wallet_address: wallet || null,
        edition:        edition || '',
        platform:       platform || '',
        full_price:     parseFloat(fullPrice) || 0,
        advance_price:  parseFloat(advancePrice),
        crypto_method:  cryptoMethod,
        crypto_tx_hash: txRef || null,
        status:         'payment_pending'
      })
    });
    if (!r.ok) console.error('[Supabase] Insert failed:', await r.text());
  } catch (e) {
    console.error('[Supabase] Error:', e.message);
  }
}
