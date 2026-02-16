-- =============================================
-- フレンドのフレンド閲覧機能 + トレーニング編集機能のためのマイグレーション
-- Supabaseダッシュボード > SQL Editor で実行してください
-- =============================================

-- 1. 指定ユーザーのフレンド一覧を取得するRPC関数
-- RLSをバイパスして、フレンドのフレンドシップも閲覧可能にする
CREATE OR REPLACE FUNCTION public.get_friends_of_user(target_user_id UUID)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  current_week INTEGER,
  current_day INTEGER,
  bench_max NUMERIC,
  program_started BOOLEAN,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.current_week,
    p.current_day,
    p.bench_max,
    p.program_started,
    p.avatar_url
  FROM public.friendships f
  JOIN public.profiles p ON p.id = CASE
    WHEN f.user_id = target_user_id THEN f.friend_id
    ELSE f.user_id
  END
  WHERE f.user_id = target_user_id OR f.friend_id = target_user_id;
END;
$$;

-- 2. training_logsの更新ポリシー（編集機能用）
-- 既にUPSERTで使えるINSERT/SELECTポリシーがあるか確認し、UPDATEポリシーを追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'training_logs' AND policyname = 'Users can update own training logs'
  ) THEN
    CREATE POLICY "Users can update own training logs"
      ON public.training_logs FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END
$$;
