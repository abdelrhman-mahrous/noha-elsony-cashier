-- ═══════════════════════════════════════════════════════════════
-- جدول barber_web_users وتوابعه — تسجيل دخول الكوافيرات لنسخة الويب
-- الباسورد مشفر بـ bcrypt عبر pgcrypto
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS barber_web_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barber_id     UUID REFERENCES barbers(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE barber_web_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "barber_no_direct_read"   ON barber_web_users FOR SELECT USING (FALSE);
CREATE POLICY "barber_no_direct_insert" ON barber_web_users FOR INSERT WITH CHECK (FALSE);
CREATE POLICY "barber_no_direct_update" ON barber_web_users FOR UPDATE USING (FALSE);
CREATE POLICY "barber_no_direct_delete" ON barber_web_users FOR DELETE USING (FALSE);

-- ═══════════════════════════════════════════════════════════════
-- RPC: barber_web_login
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION barber_web_login(
  p_email    TEXT,
  p_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user barber_web_users%ROWTYPE;
  v_barber barbers%ROWTYPE;
BEGIN
  SELECT * INTO v_user
  FROM barber_web_users
  WHERE (email = LOWER(TRIM(p_email)) OR phone = TRIM(p_email))
    AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN JSON_BUILD_OBJECT('error', 'invalid_credentials');
  END IF;

  IF v_user.password_hash <> crypt(p_password, v_user.password_hash) THEN
    RETURN JSON_BUILD_OBJECT('error', 'invalid_credentials');
  END IF;

  -- فحص بيانات الحلاق في جدول barbers إن وجدت
  IF v_user.barber_id IS NOT NULL THEN
    SELECT * INTO v_barber FROM barbers WHERE id = v_user.barber_id;
    IF FOUND THEN
      RETURN JSON_BUILD_OBJECT(
        'id', v_barber.id,
        'email', v_user.email,
        'phone', v_user.phone,
        'name', v_barber.name,
        'image_url', v_barber.image_url,
        'rating', v_barber.rating,
        'total_reviews', v_barber.total_reviews
      );
    END IF;
  END IF;

  RETURN JSON_BUILD_OBJECT(
    'id', v_user.id,
    'email', v_user.email,
    'phone', v_user.phone,
    'name', v_user.name
  );
END;
$$;
