import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // マッチしたリクエストごとに Supabase へ getUser() の往復が発生するため、
  // 認証判定の要らないものは除外する
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|apple-icon|icon|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
