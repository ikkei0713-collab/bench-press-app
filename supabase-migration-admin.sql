-- =============================================
-- 管理者機能のためのマイグレーション
-- Supabaseダッシュボード > SQL Editor で実行してください
-- =============================================

-- 1. 管理者かどうか判定する関数
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = auth.uid();
  RETURN user_email = 'ikkei0713@gmail.com';
END;
$$;

-- 2. 全ユーザー一覧を取得（管理者のみ）
CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  current_week INTEGER,
  current_day INTEGER,
  bench_max NUMERIC,
  pause_max NUMERIC,
  legs_up_max NUMERIC,
  program_started BOOLEAN,
  avatar_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.email, p.display_name,
    p.current_week, p.current_day,
    p.bench_max, p.pause_max, p.legs_up_max,
    p.program_started, p.avatar_url,
    p.created_at, p.updated_at
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- 3. 特定ユーザーのフレンド一覧を取得（管理者のみ）
CREATE OR REPLACE FUNCTION public.admin_get_user_friends(target_user_id UUID)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  bench_max NUMERIC,
  program_started BOOLEAN,
  current_week INTEGER,
  current_day INTEGER,
  avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.display_name, p.bench_max,
    p.program_started, p.current_week, p.current_day, p.avatar_url
  FROM public.friendships f
  JOIN public.profiles p ON p.id = CASE
    WHEN f.user_id = target_user_id THEN f.friend_id
    ELSE f.user_id
  END
  WHERE f.user_id = target_user_id OR f.friend_id = target_user_id;
END;
$$;

-- 4. 管理者がフレンドシップを作成する関数
CREATE OR REPLACE FUNCTION public.admin_add_friendship(user_a UUID, user_b UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO public.friendships (user_id, friend_id)
  VALUES (user_a, user_b)
  ON CONFLICT DO NOTHING;
END;
$$;

-- 5. 管理者がフレンドシップを削除する関数
CREATE OR REPLACE FUNCTION public.admin_remove_friendship(user_a UUID, user_b UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  DELETE FROM public.friendships
  WHERE (user_id = user_a AND friend_id = user_b)
     OR (user_id = user_b AND friend_id = user_a);
END;
$$;

-- 6. 特定ユーザーの完了セッション数を取得（管理者のみ）
CREATE OR REPLACE FUNCTION public.admin_get_user_sessions(target_user_id UUID)
RETURNS TABLE (
  week INTEGER,
  day INTEGER,
  completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT cs.week, cs.day, cs.completed_at
  FROM public.completed_sessions cs
  WHERE cs.user_id = target_user_id
  ORDER BY cs.week, cs.day;
END;
$$;
