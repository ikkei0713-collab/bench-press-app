"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("メールアドレスまたはパスワードが間違っています");
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12">
      <div className="w-full max-w-sm mx-auto">
        {/* App identity */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-[68px] h-[68px] rounded-[20px] bg-gradient-to-b from-primary to-[oklch(0.54_0.17_256)] flex items-center justify-center shadow-lg shadow-primary/25 mb-5">
            <Dumbbell className="w-9 h-9 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="large-title">Bench Press</h1>
          <p className="text-muted-foreground mt-1.5 text-[15px]">100kg Program</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
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
              パスワード
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
            {loading ? "ログイン中..." : "ログイン"}
          </Button>
        </form>

        <p className="mt-8 text-center text-[15px] text-muted-foreground">
          アカウントをお持ちでない方は{" "}
          <Link href="/auth/signup" className="text-primary font-medium">
            新規登録
          </Link>
        </p>
      </div>
    </div>
  );
}
