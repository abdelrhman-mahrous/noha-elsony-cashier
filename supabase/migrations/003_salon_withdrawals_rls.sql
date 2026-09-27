-- ═══════════════════════════════════════════════════════════════
-- 003_salon_withdrawals_rls.sql
-- إصلاح وتفعيل سياسات الأمان (RLS) لجدول المسحوبات salon_withdrawals
-- ═══════════════════════════════════════════════════════════════

-- 1. التأكد من وجود الجدول بالأعمدة المطلوبة
CREATE TABLE IF NOT EXISTS public.salon_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount NUMERIC(10, 2) NOT NULL,
    reason TEXT NOT NULL,
    withdrawn_by TEXT DEFAULT 'الأونر',
    withdrawal_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. تفعيل RLS على الجدول
ALTER TABLE public.salon_withdrawals ENABLE ROW LEVEL SECURITY;

-- 3. حذف أي سياسات قديمة متعارضة
DROP POLICY IF EXISTS "Allow all operations for salon_withdrawals" ON public.salon_withdrawals;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.salon_withdrawals;
DROP POLICY IF EXISTS "Enable insert access for all users" ON public.salon_withdrawals;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.salon_withdrawals;
DROP POLICY IF EXISTS "Enable delete access for all users" ON public.salon_withdrawals;

-- 4. إضافة سياسات القراءة والإضافة والتعديل والحذف (للأونر والكاشير)
CREATE POLICY "Enable read access for all users"
ON public.salon_withdrawals
FOR SELECT
USING (true);

CREATE POLICY "Enable insert access for all users"
ON public.salon_withdrawals
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Enable update access for all users"
ON public.salon_withdrawals
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete access for all users"
ON public.salon_withdrawals
FOR DELETE
USING (true);
