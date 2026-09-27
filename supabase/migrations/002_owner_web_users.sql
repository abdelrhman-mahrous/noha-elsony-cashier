-- ═══════════════════════════════════════════════════════════════
-- جدول owner_web_users — تسجيل دخول صاحبة الصالون لنسخة الويب
-- الباسورد مشفر بـ bcrypt عبر pgcrypto (نفس نهج cashier_web_users)
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS owner_web_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE owner_web_users ENABLE ROW LEVEL SECURITY;

-- لا أحد يقرأ الجدول مباشرة من client
CREATE POLICY "owner_no_direct_read"   ON owner_web_users FOR SELECT USING (FALSE);
CREATE POLICY "owner_no_direct_insert" ON owner_web_users FOR INSERT WITH CHECK (FALSE);
CREATE POLICY "owner_no_direct_update" ON owner_web_users FOR UPDATE USING (FALSE);
CREATE POLICY "owner_no_direct_delete" ON owner_web_users FOR DELETE USING (FALSE);

-- ═══════════════════════════════════════════════════════════════
-- RPC: owner_web_login
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION owner_web_login(
  p_email    TEXT,
  p_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user owner_web_users%ROWTYPE;
BEGIN
  SELECT * INTO v_user
  FROM owner_web_users
  WHERE email = LOWER(TRIM(p_email)) AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN JSON_BUILD_OBJECT('error', 'invalid_credentials');
  END IF;

  IF v_user.password_hash <> crypt(p_password, v_user.password_hash) THEN
    RETURN JSON_BUILD_OBJECT('error', 'invalid_credentials');
  END IF;

  RETURN JSON_BUILD_OBJECT('id', v_user.id, 'email', v_user.email, 'name', v_user.name);
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- RPC: owner_web_change_password
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION owner_web_change_password(
  p_owner_id    UUID,
  p_old_password TEXT,
  p_new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user owner_web_users%ROWTYPE;
BEGIN
  SELECT * INTO v_user FROM owner_web_users WHERE id = p_owner_id AND is_active = TRUE;
  IF NOT FOUND THEN RETURN JSON_BUILD_OBJECT('error', 'not_found'); END IF;
  IF v_user.password_hash <> crypt(p_old_password, v_user.password_hash) THEN
    RETURN JSON_BUILD_OBJECT('error', 'wrong_old_password');
  END IF;
  IF LENGTH(p_new_password) < 6 THEN
    RETURN JSON_BUILD_OBJECT('error', 'password_too_short');
  END IF;
  UPDATE owner_web_users
  SET password_hash = crypt(p_new_password, gen_salt('bf', 12)), updated_at = NOW()
  WHERE id = p_owner_id;
  RETURN JSON_BUILD_OBJECT('success', TRUE);
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- كيفية إضافة الأونر (من Supabase SQL Editor فقط):
-- INSERT INTO owner_web_users (email, password_hash, name)
-- VALUES (
--   'owner@salon.com',
--   crypt('OwnerSecretPass!', gen_salt('bf', 12)),
--   'نهي السني'
-- );
-- ═══════════════════════════════════════════════════════════════
