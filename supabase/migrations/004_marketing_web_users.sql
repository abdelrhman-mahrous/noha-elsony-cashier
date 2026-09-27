-- ═══════════════════════════════════════════════════════════════
-- جدول marketing_web_users — تسجيل دخول مسؤولي التسويق والعروض والشكاوى
-- الباسورد مشفر بـ bcrypt عبر pgcrypto
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS marketing_web_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'marketing', -- 'marketing' | 'support' | 'manager'
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE marketing_web_users ENABLE ROW LEVEL SECURITY;

-- حماية الجدول من القراءة أو التعديل المباشر من الـ Client
CREATE POLICY "marketing_no_direct_read"   ON marketing_web_users FOR SELECT USING (FALSE);
CREATE POLICY "marketing_no_direct_insert" ON marketing_web_users FOR INSERT WITH CHECK (FALSE);
CREATE POLICY "marketing_no_direct_update" ON marketing_web_users FOR UPDATE USING (FALSE);
CREATE POLICY "marketing_no_direct_delete" ON marketing_web_users FOR DELETE USING (FALSE);

-- ═══════════════════════════════════════════════════════════════
-- RPC: marketing_web_login
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION marketing_web_login(
  p_email    TEXT,
  p_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user marketing_web_users%ROWTYPE;
BEGIN
  SELECT * INTO v_user
  FROM marketing_web_users
  WHERE email = LOWER(TRIM(p_email)) AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN JSON_BUILD_OBJECT('error', 'invalid_credentials');
  END IF;

  IF v_user.password_hash <> crypt(p_password, v_user.password_hash) THEN
    RETURN JSON_BUILD_OBJECT('error', 'invalid_credentials');
  END IF;

  RETURN JSON_BUILD_OBJECT(
    'id', v_user.id,
    'email', v_user.email,
    'name', v_user.name,
    'role', v_user.role
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- RPC: marketing_web_change_password
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION marketing_web_change_password(
  p_user_id     UUID,
  p_old_password TEXT,
  p_new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user marketing_web_users%ROWTYPE;
BEGIN
  SELECT * INTO v_user 
  FROM marketing_web_users 
  WHERE id = p_user_id AND is_active = TRUE;

  IF NOT FOUND THEN 
    RETURN JSON_BUILD_OBJECT('error', 'not_found'); 
  END IF;

  IF v_user.password_hash <> crypt(p_old_password, v_user.password_hash) THEN
    RETURN JSON_BUILD_OBJECT('error', 'wrong_old_password');
  END IF;

  IF LENGTH(p_new_password) < 6 THEN
    RETURN JSON_BUILD_OBJECT('error', 'password_too_short');
  END IF;

  UPDATE marketing_web_users
  SET password_hash = crypt(p_new_password, gen_salt('bf', 12)), updated_at = NOW()
  WHERE id = p_user_id;

  RETURN JSON_BUILD_OBJECT('success', TRUE);
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- إضافة مستخدم تسويق ودعم افتراضي (مثال للتشغيل في Supabase SQL Editor):
-- ═══════════════════════════════════════════════════════════════
-- INSERT INTO marketing_web_users (email, password_hash, name, role)
-- VALUES (
--   'marketing@salon.com',
--   crypt('Marketing2025!', gen_salt('bf', 12)),
--   'مسؤول التسويق والعلاقات',
--   'marketing'
-- ) ON CONFLICT (email) DO NOTHING;
