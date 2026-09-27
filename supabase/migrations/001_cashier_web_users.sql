-- ═══════════════════════════════════════════════════════════════
-- جدول cashier_web_users — تسجيل دخول الكاشير لنسخة الويب
-- الباسورد مشفر بـ bcrypt عبر pgcrypto
-- ═══════════════════════════════════════════════════════════════

-- 1. تفعيل pgcrypto لدعم crypt() و gen_salt()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. إنشاء الجدول
CREATE TABLE IF NOT EXISTS cashier_web_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,  -- bcrypt hashed
  name        TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. تفعيل RLS
ALTER TABLE cashier_web_users ENABLE ROW LEVEL SECURITY;

-- 4. لا أحد يقرأ الجدول مباشرة من client — كل العمليات تمر عبر RPC
-- منع كل الـ SELECT من الـ anon role
CREATE POLICY "no_direct_read" ON cashier_web_users
  FOR SELECT USING (FALSE);

CREATE POLICY "no_direct_insert" ON cashier_web_users
  FOR INSERT WITH CHECK (FALSE);

CREATE POLICY "no_direct_update" ON cashier_web_users
  FOR UPDATE USING (FALSE);

CREATE POLICY "no_direct_delete" ON cashier_web_users
  FOR DELETE USING (FALSE);

-- ═══════════════════════════════════════════════════════════════
-- RPC: cashier_web_login(email, password) → returns cashier info or null
-- يعمل بـ SECURITY DEFINER فيتجاوز الـ RLS ويقارن الباسورد
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION cashier_web_login(
  p_email    TEXT,
  p_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user cashier_web_users%ROWTYPE;
  v_valid BOOLEAN;
BEGIN
  -- جلب المستخدم بالإيميل
  SELECT * INTO v_user
  FROM cashier_web_users
  WHERE email = LOWER(TRIM(p_email))
    AND is_active = TRUE;

  -- لو مش موجود → نرجع null (خطأ عام بدون تفاصيل)
  IF NOT FOUND THEN
    RETURN JSON_BUILD_OBJECT('error', 'invalid_credentials');
  END IF;

  -- التحقق من الباسورد بـ bcrypt
  v_valid := (v_user.password_hash = crypt(p_password, v_user.password_hash));

  IF NOT v_valid THEN
    RETURN JSON_BUILD_OBJECT('error', 'invalid_credentials');
  END IF;

  -- نرجع بيانات الكاشير بدون الباسورد
  RETURN JSON_BUILD_OBJECT(
    'id',       v_user.id,
    'email',    v_user.email,
    'name',     v_user.name
  );
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- RPC: cashier_web_change_password(cashier_id, old_pass, new_pass)
-- الكاشير يقدر يغير الباسورد بعد التحقق من القديم
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION cashier_web_change_password(
  p_cashier_id  UUID,
  p_old_password TEXT,
  p_new_password TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user cashier_web_users%ROWTYPE;
  v_valid BOOLEAN;
BEGIN
  SELECT * INTO v_user
  FROM cashier_web_users
  WHERE id = p_cashier_id AND is_active = TRUE;

  IF NOT FOUND THEN
    RETURN JSON_BUILD_OBJECT('error', 'not_found');
  END IF;

  v_valid := (v_user.password_hash = crypt(p_old_password, v_user.password_hash));

  IF NOT v_valid THEN
    RETURN JSON_BUILD_OBJECT('error', 'wrong_old_password');
  END IF;

  IF LENGTH(p_new_password) < 6 THEN
    RETURN JSON_BUILD_OBJECT('error', 'password_too_short');
  END IF;

  UPDATE cashier_web_users
  SET
    password_hash = crypt(p_new_password, gen_salt('bf', 12)),
    updated_at = NOW()
  WHERE id = p_cashier_id;

  RETURN JSON_BUILD_OBJECT('success', TRUE);
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- كيفية إضافة كاشير جديد (تُنفَّذ يدوياً من Supabase Dashboard)
-- مثال:
-- INSERT INTO cashier_web_users (email, password_hash, name)
-- VALUES (
--   'cashier@salon.com',
--   crypt('MySecretPass123', gen_salt('bf', 12)),
--   'الكاشير'
-- );
-- ═══════════════════════════════════════════════════════════════
