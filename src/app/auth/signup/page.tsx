"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell, CheckCircle2 } from "lucide-react";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password.length < 6) {
      setError("パスワードは6文字以上で入力してください");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col justify-center px-6 py-12">
        <div className="w-full max-w-sm mx-auto text-center">
          <div className="w-[68px] h-[68px] rounded-[20px] bg-gradient-to-b from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-6 mx-auto">
            <CheckCircle2 className="w-9 h-9 text-white" strokeWidth={2.2} />
          </div>
          <h2 className="large-title">登録完了</h2>
          <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed">
            確認メールを送信しました。
            <br />
            メール内のリンクをクリックして
            <br />
            登録を完了してください。
          </p>
          <Button
            onClick={() => router.push("/auth/login")}
            className="w-full h-12 text-[17px] mt-8"
          >
            ログインページへ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12">
      <div className="w-full max-w-sm mx-auto">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-[68px] h-[68px] rounded-[20px] bg-gradient-to-b from-primary to-[oklch(0.54_0.17_256)] flex items-center justify-center shadow-lg shadow-primary/25 mb-5">
            <Dumbbell className="w-9 h-9 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="large-title">アカウント作成</h1>
          <p className="text-muted-foreground mt-1.5 text-[15px]">100kg Program を始めよう</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="displayName" className="text-xs font-medium text-muted-foreground px-1">
              表示名
            </Label>
            <Input
              id="displayName"
              type="text"
              placeholder="あなたの名前"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-muted-foreground px-1">
              メールアドレス
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-muted-foreground px-1">
              パスワード（6文字以上）
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="パスワードを入力"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="h-12 text-base"
            />
          </div>

          {error && (
            <p className="text-destructive text-sm text-center pt-1">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-[17px] mt-2"
            disabled={loading}
          >
            {loading ? "登録中..." : "アカウント作成"}
          </Button>
        </form>

        <p className="mt-8 text-center text-[15px] text-muted-foreground">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/auth/login" className="text-primary font-medium">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  );
}
