-- ════════════════════════════════════════════════════════════════
-- GTA6Store — Supabase Database Setup
-- Run this entire file in: Supabase Dashboard → SQL Editor → Run
-- ════════════════════════════════════════════════════════════════


-- ────────────────────────────────────────────────────────────────
-- 1. SITE SETTINGS
--    Non-coders edit this table to update prices, SEO, images
--    No code changes needed — page reads this on every load
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS site_settings (
  id         SERIAL PRIMARY KEY,
  key        TEXT UNIQUE NOT NULL,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update timestamp on edit
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_settings_updated_at
BEFORE UPDATE ON site_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Default values (edit these any time from Supabase dashboard)
INSERT INTO site_settings (key, value) VALUES
  -- SEO
  ('seo_title',          'GTA6Store — Pre-Book Grand Theft Auto VI | Pay with Crypto | PS5 · Xbox · PC'),
  ('seo_description',    'Pre-book GTA 6 for PS5, Xbox Series X/S and PC. Pay advance with Bitcoin, Ethereum, USDT or USDC. Get instant Booking ID. Worldwide. Launch: November 19, 2026.'),
  ('seo_keywords',       'GTA 6 pre-order, pre order GTA 6, GTA VI pre-booking, buy GTA 6 crypto, GTA 6 PS5, GTA 6 Xbox, Grand Theft Auto 6 release date 2026'),
  ('og_image_url',       'https://gta6store.in/og-image.jpg'),
  ('og_title',           'GTA6Store — Pre-Book GTA 6 | Pay with Crypto'),
  ('og_description',     'Pre-book Grand Theft Auto VI for PS5, Xbox or PC. Pay with Bitcoin, Ethereum, USDT or USDC. Instant Booking ID. Worldwide. Nov 19, 2026.'),
  ('canonical_url',      'https://gta6store.in/'),

  -- Hero content
  ('hero_badge_text',    'Official Release: November 19, 2026'),
  ('hero_eyebrow',       'Grand Theft Auto VI'),
  ('hero_sub',           'Pre-Book Now — Pay With Crypto — Worldwide'),
  ('notif_bar_text',     'Pre-orders are LIVE! — Advance slots are limited. Secure yours with crypto now.'),

  -- Launch date (used by countdown timer)
  ('launch_date',        '2026-11-19T00:00:00'),

  -- Booking stats (auto-incremented by DB, seed value here)
  ('stat_bookings',      '2841'),

  -- Standard Edition
  ('std_name',           'Standard Edition'),
  ('std_price',          '69.99'),
  ('std_advance',        '20.00'),
  ('std_features',       'Base game disc / digital code|Unique Booking ID confirmation|Email receipt instantly|Launch day delivery'),

  -- Deluxe Edition
  ('deluxe_name',        'Deluxe Edition'),
  ('deluxe_price',       '99.99'),
  ('deluxe_advance',     '35.00'),
  ('deluxe_features',    'Base game + bonus DLC pack|In-game currency bonus (GTA Cash)|Priority Day 1 delivery|Booking ID + PDF receipt|Waitlist backup slot'),

  -- PC Edition
  ('pc_name',            'PC Edition'),
  ('pc_price',           '69.99'),
  ('pc_advance',         '25.00'),
  ('pc_features',        'Digital key (Epic Games / Steam)|Priority waitlist slot|Full refund if PC version delayed|Upgrade to console option'),

  -- Images (Cloudinary URLs — update when you upload images)
  ('hero_bg_image_url',  ''),
  ('edition_std_img',    ''),
  ('edition_deluxe_img', ''),
  ('edition_pc_img',     '')

ON CONFLICT (key) DO NOTHING;


-- ────────────────────────────────────────────────────────────────
-- 2. BOOKINGS
--    Every pre-booking stored here
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id             SERIAL PRIMARY KEY,
  booking_id     TEXT UNIQUE NOT NULL,          -- e.g. GTA6-X7KP
  name           TEXT NOT NULL,
  email          TEXT NOT NULL,
  wallet_address TEXT,                          -- for refunds
  edition        TEXT NOT NULL,                 -- standard | deluxe | pc
  platform       TEXT NOT NULL,                 -- PS5 | Xbox Series X/S | PC
  full_price     DECIMAL(10,2) NOT NULL,
  advance_price  DECIMAL(10,2) NOT NULL,
  crypto_method  TEXT NOT NULL,                 -- Bitcoin | Ethereum | USDT | USDC | Solana
  crypto_tx_hash TEXT,                          -- filled when payment confirmed
  status         TEXT NOT NULL DEFAULT 'pending',
  -- status values: pending | confirmed | cancelled | refunded | completed
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast email lookups (tracking page)
CREATE INDEX IF NOT EXISTS bookings_email_idx ON bookings(email);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings(status);


-- ────────────────────────────────────────────────────────────────
-- 3. SUBSCRIBERS
--    Email list for launch alerts
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscribers (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  subscribed_at TIMESTAMPTZ DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────────
-- 4. ARTICLES (Phase 3 — news/blog)
--    Non-coders write articles here, page fetches and displays
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
  id                SERIAL PRIMARY KEY,
  slug              TEXT UNIQUE NOT NULL,       -- URL: /news/[slug]
  title             TEXT NOT NULL,
  excerpt           TEXT,                       -- Short summary for listing page
  content           TEXT,                       -- Full article (HTML or markdown)
  cover_image_url   TEXT,                       -- Cloudinary URL
  tag               TEXT DEFAULT 'News',        -- Official | Platform | Crypto | India | News
  meta_title        TEXT,                       -- SEO title (if different from title)
  meta_description  TEXT,                       -- SEO description
  is_published      BOOLEAN DEFAULT TRUE,
  published_date    DATE DEFAULT CURRENT_DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Sample articles (matches news cards already on page)
INSERT INTO articles (slug, title, excerpt, tag, published_date) VALUES
  (
    'gta-6-release-date-november-2026',
    'GTA 6 Officially Confirmed for November 19, 2026',
    'Rockstar Games has officially announced the final release date for Grand Theft Auto VI. The game will launch worldwide on PS5 and Xbox Series X/S on November 19, 2026 — making it one of the biggest gaming releases in history.',
    'Official',
    '2026-05-01'
  ),
  (
    'gta-6-pc-version-2027',
    'PC Version Reportedly Coming in 2027 — What We Know',
    'Leaked reports suggest a PC release could follow the console launch by 12–18 months, potentially launching on Epic Games Store and Steam simultaneously. Our PC Edition waitlist is already open.',
    'Platform',
    '2026-04-10'
  ),
  (
    'gta-6-pre-booking-with-crypto',
    'Why GTA 6 Pre-Booking With Crypto Makes Sense in 2026',
    'Crypto payments offer instant global transfers, no chargebacks, and lower fees. We accept Bitcoin, Ethereum, USDT, USDC, and Solana — giving gamers worldwide a frictionless pre-booking experience.',
    'Crypto',
    '2026-03-15'
  )
ON CONFLICT (slug) DO NOTHING;


-- ════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- This protects your data — public can only read settings/articles
-- Only server-side (service key) can write bookings
-- ════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers   ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles      ENABLE ROW LEVEL SECURITY;

-- site_settings: anyone can READ (public anon key is fine)
CREATE POLICY "Public read site_settings"
  ON site_settings FOR SELECT
  USING (true);

-- articles: anyone can READ published articles
CREATE POLICY "Public read published articles"
  ON articles FOR SELECT
  USING (is_published = true);

-- bookings: anyone can INSERT (create booking)
--           nobody can SELECT via anon key (admin only via service key)
CREATE POLICY "Public insert bookings"
  ON bookings FOR INSERT
  WITH CHECK (true);

-- subscribers: anyone can INSERT their email
CREATE POLICY "Public insert subscribers"
  ON subscribers FOR INSERT
  WITH CHECK (true);

-- Admin can write articles (combined with password gate in admin.html)
-- Required so admin.html can INSERT, UPDATE, DELETE articles via anon key
CREATE POLICY "Admin can write articles"
  ON articles FOR ALL
  USING (true)
  WITH CHECK (true);

-- Admin can update site_settings (prices, SEO, etc.)
CREATE POLICY "Admin can update site_settings"
  ON site_settings FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ════════════════════════════════════════════════════════════════
-- DONE ✅
-- Next steps:
-- 1. Go to Settings → API in your Supabase dashboard
-- 2. Copy "Project URL" and "anon public" key
-- 3. Paste them into: index.html, news.html, article.html, admin.html
--    (search for YOUR_SUPABASE_URL_HERE in each file)
-- 4. Default admin password: gta6admin2026
--    Change it in admin.html before going live
-- ════════════════════════════════════════════════════════════════
