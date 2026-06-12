-- =============================================
-- プロフィールに身長・体重を追加
-- Supabaseダッシュボード > SQL Editor で実行してください
-- =============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS height_cm NUMERIC,
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC;

-- 既存のRLSポリシー（自分のプロフィールはupdate可）でそのまま編集できます。
