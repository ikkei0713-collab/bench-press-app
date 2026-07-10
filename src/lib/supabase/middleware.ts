import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  // /auth/callback は認可コードをセッションに交換する途中なので判定対象外
  const isAuthPage =
    pathname.startsWith("/auth") && !pathname.startsWith("/auth/callback");

  // 未認証ユーザーをログインページにリダイレクト
  if (!user && !isAuthPage) {
    return redirectTo(request, "/auth/login", supabaseResponse);
  }

  // 認証済みユーザーがauth系ページやトップにアクセスしたらダッシュボードへ
  if (user && (isAuthPage || pathname === "/")) {
    return redirectTo(request, "/dashboard", supabaseResponse);
  }

  return supabaseResponse;
}

function redirectTo(
  request: NextRequest,
  pathname: string,
  source: NextResponse
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";

  const response = NextResponse.redirect(url);
  // getUser() がトークンを更新していた場合、新しいセッションcookieは source に
  // しか載っていない。引き継がずに返すと古いリフレッシュトークンが既に無効化
  // されているためセッションごと失われる。
  source.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}
