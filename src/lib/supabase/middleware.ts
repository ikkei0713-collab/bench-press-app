import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// getUser() がハングした場合でもミドルウェアを落とさないためのタイムアウト(ms)
const AUTH_TIMEOUT_MS = 2500;

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // 環境変数が無い場合は認証をスキップしてページを返す。
  // （未設定のまま createServerClient を呼ぶと getUser() が無効URLへ通信して
  //  ハングし、Vercel で MIDDLEWARE_INVOCATION_TIMEOUT(504) になるのを防ぐ）
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "[middleware] Supabase env vars are missing. Set " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel. " +
        "Skipping auth for this request."
    );
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Supabase(Auth)が停止・遅延していても全ページを 504 にしないよう、
  // getUser() にタイムアウトを付ける。失敗時は未認証扱いでページを返す。
  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] =
    null;
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("supabase.auth.getUser timed out")),
          AUTH_TIMEOUT_MS
        )
      ),
    ]);
    user = result.data.user;
  } catch (error) {
    console.error("[middleware] auth check failed or timed out:", error);
    return supabaseResponse;
  }

  // 未認証ユーザーをログインページにリダイレクト
  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    request.nextUrl.pathname !== "/"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // 認証済みユーザーがauth系ページにアクセスしたらダッシュボードへ
  if (user && request.nextUrl.pathname.startsWith("/auth")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
