// api/send-email.js — Brevo Transactional Email Engine
// Shared by create-payment.js, payment-webhook.js, and subscribe.js
//
// USAGE:
//   const { sendEmail, emails } = require('./send-email');
//   await sendEmail(emails.bookingPending({ name, email, bookingId, ... }));

const BREVO_API  = 'https://api.brevo.com/v3/smtp/email';
const FROM_NAME  = 'GTA6Store';
const FROM_EMAIL = 'bookings@gta6store.co.uk';
const SITE_URL   = 'https://gta6store.co.uk';

/* ════════════════════════════════════════════════════════════════
   CORE SEND FUNCTION
════════════════════════════════════════════════════════════════ */
async function sendEmail({ to, toName, subject, htmlContent }) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    console.log(`[email] BREVO_API_KEY not set — skipping email → ${to} | "${subject}"`);
    return { skipped: true };
  }

  try {
    const res = await fetch(BREVO_API, {
      method: 'POST',
      headers: {
        'api-key':      apiKey,
        'Content-Type': 'application/json',
        'Accept':       'application/json'
      },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to: [{ email: to, name: toName || '' }],
        subject,
        htmlContent
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Brevo error ${res.status}: ${err}`);
    }

    const result = await res.json();
    console.log(`[email] Sent → ${to} | "${subject}" | msgId: ${result.messageId}`);
    return result;
  } catch (err) {
    // Log but don't crash the caller — email is non-critical
    console.error('[email] Failed to send:', err.message);
    return { error: err.message };
  }
}

/* ════════════════════════════════════════════════════════════════
   SHARED EMAIL STYLES (inline — email client compatible)
════════════════════════════════════════════════════════════════ */
const S = {
  body:     'margin:0;padding:0;background:#080809;font-family:Arial,Helvetica,sans-serif;',
  wrap:     'max-width:600px;margin:0 auto;background:#080809;',
  header:   'background:#0C0C0F;padding:28px 36px;border-bottom:1px solid rgba(201,168,76,0.2);',
  logo:     'margin:0;font-size:26px;font-weight:900;letter-spacing:4px;color:#C9A84C;',
  logoDim:  'color:#524E48;',
  tagline:  'margin:4px 0 0;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#524E48;',
  content:  'background:#13131A;padding:36px 36px 28px;border:1px solid rgba(201,168,76,0.12);border-top:none;',
  h1:       'margin:0 0 6px;font-size:32px;font-weight:900;letter-spacing:2px;color:#C9A84C;line-height:1.1;',
  h2:       'margin:24px 0 10px;font-size:18px;font-weight:700;letter-spacing:1px;color:#F0EDE4;',
  p:        'margin:0 0 14px;font-size:14px;line-height:1.8;color:#9A9489;',
  plight:   'margin:0 0 14px;font-size:14px;line-height:1.8;color:#F0EDE4;',
  gold:     'color:#C9A84C;font-weight:700;',
  small:    'font-size:12px;color:#524E48;',
  divider:  'border:none;border-top:1px solid rgba(255,255,255,0.05);margin:24px 0;',
  // ID box
  idBox:    'background:#0C0C0F;border:1px solid rgba(201,168,76,0.3);padding:16px 24px;text-align:center;margin:20px 0;',
  idLabel:  'display:block;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#524E48;margin-bottom:6px;',
  idValue:  'display:block;font-size:28px;font-weight:900;letter-spacing:5px;color:#C9A84C;',
  // Info row
  infoRow:  'border-bottom:1px solid rgba(255,255,255,0.05);padding:10px 0;',
  infoKey:  'font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#524E48;',
  infoVal:  'font-size:14px;color:#F0EDE4;font-weight:600;text-align:right;',
  // CTA button
  cta:      'display:inline-block;background:#C9A84C;color:#000;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;padding:14px 32px;text-decoration:none;',
  // Warning box
  warn:     'background:rgba(192,57,43,0.08);border:1px solid rgba(192,57,43,0.25);padding:14px 18px;margin:16px 0;',
  warnText: 'margin:0;font-size:13px;color:#E57C71;line-height:1.7;',
  // Success box
  success:  'background:rgba(39,174,96,0.06);border:1px solid rgba(39,174,96,0.2);padding:14px 18px;margin:16px 0;',
  successT: 'margin:0;font-size:13px;color:#2ECC71;line-height:1.7;',
  // Footer
  footer:   'background:#080809;padding:24px 36px;border-top:1px solid rgba(255,255,255,0.04);',
  footerTxt:'margin:0 0 8px;font-size:11px;color:#524E48;line-height:1.7;',
};

function wrap(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
</head>
<body style="${S.body}">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="${S.body}">
<tr><td>
  <table width="600" align="center" cellpadding="0" cellspacing="0" role="presentation" style="${S.wrap}">
    <!-- HEADER -->
    <tr><td style="${S.header}">
      <p style="${S.logo}">GTA6<span style="${S.logoDim}">Store</span>.in</p>
      <p style="${S.tagline}">Independent GTA 6 Pre-Booking Platform</p>
    </td></tr>

    <!-- CONTENT -->
    <tr><td style="${S.content}">
      ${content}
    </td></tr>

    <!-- FOOTER -->
    <tr><td style="${S.footer}">
      <p style="${S.footerTxt}">GTA6Store.co.uk is an independent third-party pre-booking service, not affiliated with Rockstar Games or Take-Two Interactive Software, Inc. Grand Theft Auto and GTA are registered trademarks of Take-Two Interactive Software, Inc.</p>
      <p style="${S.footerTxt}">All pre-booking advances are 100% refundable. For support, reply to this email.</p>
      <p style="${S.footerTxt};margin:0;">© 2026 GTA6Store.co.uk &nbsp;·&nbsp; <a href="${SITE_URL}" style="color:#524E48;">${SITE_URL}</a></p>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

function infoRow(label, value, goldValue) {
  return `<tr>
    <td style="${S.infoRow}${S.infoKey}">${label}</td>
    <td style="${S.infoRow}${S.infoVal}${goldValue ? S.gold : ''}">${value}</td>
  </tr>`;
}

/* ════════════════════════════════════════════════════════════════
   EMAIL TEMPLATES
════════════════════════════════════════════════════════════════ */
const emails = {

  /* ── 1. Payment Pending ── sent when payment address is created */
  bookingPending({ name, email, bookingId, edition, platform, advanceUSD, cryptoMethod, payAmount, payCurrency, payAddress, expiresAt }) {
    const expiry = expiresAt ? new Date(expiresAt).toUTCString() : '20 minutes from now';
    return {
      to: email,
      toName: name,
      subject: `Your GTA 6 Payment Address — Booking ${bookingId}`,
      htmlContent: wrap(`
        <h1 style="${S.h1}">Payment Address Ready</h1>
        <p style="${S.p}">Hi ${name}, your payment details are below. Send your crypto <strong style="color:#F0EDE4;">within 20 minutes</strong> to secure your booking.</p>

        <div style="${S.idBox}">
          <span style="${S.idLabel}">Booking ID</span>
          <span style="${S.idValue}">${bookingId}</span>
        </div>

        <h2 style="${S.h2}">Payment Instructions</h2>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          ${infoRow('Edition', edition)}
          ${infoRow('Platform', platform)}
          ${infoRow('USD Amount', '$' + parseFloat(advanceUSD).toFixed(2) + ' USD')}
          ${infoRow('Send Exactly', `${payAmount} ${(payCurrency||'').toUpperCase()}`, true)}
        </table>

        <div style="background:#0C0C0F;border:1px solid rgba(201,168,76,0.25);padding:16px 20px;margin:20px 0;">
          <p style="margin:0 0 4px;${S.infoKey}">Wallet Address</p>
          <p style="margin:0;font-family:monospace;font-size:13px;color:#C9A84C;word-break:break-all;line-height:1.6;">${payAddress}</p>
        </div>

        <div style="${S.warn}">
          <p style="${S.warnText}">⚠ <strong>Send EXACTLY ${payAmount} ${(payCurrency||'').toUpperCase()}.</strong> Do not round. Any difference will delay confirmation. This address expires at: <strong>${expiry}</strong>.</p>
        </div>

        <p style="${S.small}">After sending, confirmation usually takes 1–10 minutes. Once confirmed, you'll receive a second email with your locked-in booking receipt.</p>
      `)
    };
  },

  /* ── 2. Booking Confirmed ── sent after blockchain confirmation */
  bookingConfirmed({ name, email, bookingId, edition, platform, advanceUSD, fullPriceUSD, cryptoMethod }) {
    const remaining = (parseFloat(fullPriceUSD) - parseFloat(advanceUSD)).toFixed(2);
    const launchDate = 'November 19, 2026';
    return {
      to: email,
      toName: name,
      subject: `✅ GTA 6 Pre-Booking Confirmed — ${bookingId}`,
      htmlContent: wrap(`
        <h1 style="${S.h1}">Booking Confirmed!</h1>
        <p style="${S.p}">Hi ${name}, your crypto payment has been verified on the blockchain. Your GTA 6 pre-booking is <strong style="color:#2ECC71;">locked in</strong>.</p>

        <div style="${S.idBox}">
          <span style="${S.idLabel}">Your Booking ID — Save this</span>
          <span style="${S.idValue}">${bookingId}</span>
        </div>

        <h2 style="${S.h2}">Booking Summary</h2>
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          ${infoRow('Edition', edition)}
          ${infoRow('Platform', platform)}
          ${infoRow('Full Game Price', '$' + parseFloat(fullPriceUSD).toFixed(2) + ' USD')}
          ${infoRow('Advance Paid', '$' + parseFloat(advanceUSD).toFixed(2) + ' USD (crypto)', true)}
          ${infoRow('Balance Due', '$' + remaining + ' USD (due before launch)')}
          ${infoRow('Payment Method', cryptoMethod)}
          ${infoRow('Release Date', launchDate)}
        </table>

        <div style="${S.success}">
          <p style="${S.successT}">✅ Your spot is reserved. We'll email you 7 days before ${launchDate} to complete your balance payment in crypto.</p>
        </div>

        <h2 style="${S.h2}">What Happens Next?</h2>
        <p style="${S.p}"><strong style="color:#F0EDE4;">1.</strong> Keep your Booking ID safe — <strong>${bookingId}</strong>.</p>
        <p style="${S.p}"><strong style="color:#F0EDE4;">2.</strong> We'll send a reminder email 7 days before launch to pay the remaining balance.</p>
        <p style="${S.p}"><strong style="color:#F0EDE4;">3.</strong> Once the balance is confirmed, your game key or dispatch details will follow.</p>
        <p style="${S.p}"><strong style="color:#F0EDE4;">4.</strong> 100% refundable — if GTA 6 is delayed or you change your mind, just reply to this email.</p>

        <p style="text-align:center;margin:28px 0 8px;">
          <a href="${SITE_URL}" style="${S.cta}">Visit GTA6Store →</a>
        </p>
      `)
    };
  },

  /* ── 3. Subscriber Welcome ── sent on newsletter signup */
  subscriberWelcome({ email }) {
    return {
      to: email,
      toName: '',
      subject: `You're on the GTA 6 Launch List — GTA6Store`,
      htmlContent: wrap(`
        <h1 style="${S.h1}">You're In.</h1>
        <p style="${S.plight}">You've been added to the GTA 6 launch notification list.</p>
        <p style="${S.p}">We'll alert you as soon as:</p>
        <p style="${S.p}">🎮 &nbsp;GTA 6 release date is finalised (Nov 19, 2026)</p>
        <p style="${S.p}">💰 &nbsp;Pre-booking goes live / slots are limited</p>
        <p style="${S.p}">🔑 &nbsp;Game key distribution begins</p>

        <hr style="${S.divider}"/>

        <p style="${S.p}">Want to lock in your copy right now? Pre-book with a small crypto advance — 100% refundable.</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${SITE_URL}/#booking" style="${S.cta}">Pre-Book GTA 6 Now →</a>
        </p>

        <p style="${S.small}">You're receiving this because you signed up at gta6store.co.uk. <a href="${SITE_URL}" style="color:#524E48;">Unsubscribe</a> anytime by replying with "unsubscribe".</p>
      `)
    };
  },

  /* ── 4. Balance Payment Reminder ── sent 7 days before launch (manual trigger or cron) */
  balanceReminder({ name, email, bookingId, edition, platform, remainingUSD, cryptoMethod }) {
    return {
      to: email,
      toName: name,
      subject: `⏰ 7 Days to GTA 6 Launch — Complete Your Payment (${bookingId})`,
      htmlContent: wrap(`
        <h1 style="${S.h1}">7 Days to Launch</h1>
        <p style="${S.plight}">Hi ${name}, GTA 6 launches in <strong style="color:#C9A84C;">7 days</strong>. Complete your balance payment to confirm your copy.</p>

        <div style="${S.idBox}">
          <span style="${S.idLabel}">Your Booking ID</span>
          <span style="${S.idValue}">${bookingId}</span>
        </div>

        <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
          ${infoRow('Edition', edition)}
          ${infoRow('Platform', platform)}
          ${infoRow('Balance Due', '$' + parseFloat(remainingUSD).toFixed(2) + ' USD', true)}
          ${infoRow('Pay With', cryptoMethod)}
        </table>

        <div style="${S.warn}">
          <p style="${S.warnText}">⚠ <strong>Complete your balance payment by Nov 18, 2026.</strong> Unconfirmed bookings may not receive keys on launch day.</p>
        </div>

        <p style="text-align:center;margin:28px 0 8px;">
          <a href="${SITE_URL}/#booking" style="${S.cta}">Complete Payment →</a>
        </p>

        <p style="${S.small}">Booking ${bookingId} · ${edition} · ${platform}</p>
      `)
    };
  }

};

module.exports = { sendEmail, emails };
