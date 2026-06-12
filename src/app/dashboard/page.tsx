"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dumbbell, Users, LogOut, Plus, Trophy, Settings, TrendingUp, ChevronRight, Shield } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface UserProfile {
  id: string;
  display_name: string;
  bench_max: number | null;
  pause_max: number | null;
  legs_up_max: number | null;
  current_week: number;
  current_day: number;
  program_started: boolean;
  avatar_url: string | null;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [benchMax, setBenchMax] = useState("");
  const [pauseMax, setPauseMax] = useState("");
  const [legsUpMax, setLegsUpMax] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) {
      setProfile(data);
    }
  }, [supabase]);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }
      setUser(user);
      await fetchProfile(user.id);
      setLoading(false);
    };
    getUser();
  }, [supabase, router, fetchProfile]);

  const handleStartProgram = async () => {
    if (!user) return;
    setSaving(true);

    const bench = parseFloat(benchMax);
    const pause = parseFloat(pauseMax);
    const legsUp = parseFloat(legsUpMax);

    if (isNaN(bench) || isNaN(pause) || isNaN(legsUp)) {
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        bench_max: bench,
        pause_max: pause,
        legs_up_max: legsUp,
        current_week: 1,
        current_day: 1,
        program_started: true,
      })
      .eq("id", user.id);

    if (!error) {
      await supabase.from("weight_history").insert({
        user_id: user.id,
        bench_max: bench,
        pause_max: pause,
        legs_up_max: legsUp,
      });
      setDialogOpen(false);
      await fetchProfile(user.id);
    }
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary text-xl font-medium tracking-wide">読み込み中...</div>
      </div>
    );
  }

  const totalDays = 12 * 3;
  const completedDays = profile
    ? (profile.current_week - 1) * 3 + (profile.current_day - 1)
    : 0;
  const progressPercent = (completedDays / totalDays) * 100;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-xl border-b border-border/60">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Dumbbell className="w-5 h-5 text-primary dumbbell-bounce" />
            <span className="font-bold text-base tracking-tight">BP100</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="w-9 h-9 text-muted-foreground hover:text-foreground">
                <Settings className="w-4.5 h-4.5" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="w-9 h-9 text-muted-foreground hover:text-foreground" onClick={handleLogout}>
              <LogOut className="w-4.5 h-4.5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-7 space-y-5">
        {/* Hero / Welcome */}
        <div className="flex items-center gap-4 py-1">
          <Avatar className="w-14 h-14 border border-border/60 ring-2 ring-primary/15">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
            ) : null}
            <AvatarFallback className="bg-primary/15 text-primary text-xl font-bold">
              {(profile?.display_name ?? "U").charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold leading-tight">
              {profile?.display_name ?? "ユーザー"}
              <span className="text-muted-foreground font-normal text-base ml-1">さん</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">ベンチプレス100kgへの道</p>
          </div>
        </div>

        {!profile?.program_started ? (
          /* プログラム未開始 */
          <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
            <CardHeader className="pb-3">
              <CardTitle className="text-center text-lg">プログラムを始めよう</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-5">
              <p className="text-muted-foreground text-sm leading-relaxed">
                現在のMAX重量を入力して、12週間プログラムを開始しましょう。
              </p>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full h-13 text-base font-semibold neon-glow">
                    <Plus className="w-5 h-5 mr-2" />
                    プログラム開始
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>現在のMAX重量を入力</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>ベンチプレス MAX (kg)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        placeholder="例: 80"
                        value={benchMax}
                        onChange={(e) => setBenchMax(e.target.value)}
                        className="h-12 text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>2秒止め MAX (kg)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        placeholder="例: 70"
                        value={pauseMax}
                        onChange={(e) => setPauseMax(e.target.value)}
                        className="h-12 text-base"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>足上げ MAX (kg)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        placeholder="例: 70"
                        value={legsUpMax}
                        onChange={(e) => setLegsUpMax(e.target.value)}
                        className="h-12 text-base"
                      />
                    </div>
                    <Button
                      onClick={handleStartProgram}
                      disabled={saving}
                      className="w-full h-13 text-base font-semibold neon-glow"
                    >
                      {saving ? "保存中..." : "プログラムを生成"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          /* プログラム進行中 */
          <>
            {/* Progress Card */}
            <Card className="border-border/60 bg-gradient-to-br from-card to-secondary/20">
              <CardContent className="pt-5 pb-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">現在の進捗</p>
                    <p className="text-2xl font-bold leading-none">
                      Week {profile!.current_week}
                      <span className="text-primary ml-2">Day {profile!.current_day}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">完了率</p>
                    <p className="text-2xl font-bold text-primary leading-none">
                      {Math.round(progressPercent)}%
                    </p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Progress value={progressPercent} className="h-2.5" />
                  <p className="text-xs text-muted-foreground text-right">
                    {completedDays} / {totalDays} セッション
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* MAX weights */}
            <Link href="/settings" className="block">
              <Card className="cursor-pointer hover:bg-secondary/40 transition-colors duration-150 border-border/60">
                <CardContent className="py-4 px-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <Dumbbell className="w-3.5 h-3.5" />
                      MAX重量
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">ベンチ</p>
                      <p className="text-lg font-bold text-primary">{profile!.bench_max}<span className="text-xs font-normal text-muted-foreground ml-0.5">kg</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">2秒止め</p>
                      <p className="text-lg font-bold text-primary">{profile!.pause_max}<span className="text-xs font-normal text-muted-foreground ml-0.5">kg</span></p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">足上げ</p>
                      <p className="text-lg font-bold text-primary">{profile!.legs_up_max}<span className="text-xs font-normal text-muted-foreground ml-0.5">kg</span></p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Separator className="opacity-50" />

            {/* Quick Actions */}
            <div className="space-y-2.5">
              <Link href="/program" className="block">
                <Button className="w-full h-14 text-base font-semibold neon-glow gap-3">
                  <Dumbbell className="w-5 h-5" />
                  今日のトレーニングを見る
                </Button>
              </Link>

              <Link href="/progress" className="block">
                <Button variant="secondary" className="w-full h-12 text-sm font-medium gap-3">
                  <TrendingUp className="w-4 h-4" />
                  重量推移グラフ
                </Button>
              </Link>

              <Link href="/friends" className="block">
                <Button variant="secondary" className="w-full h-12 text-sm font-medium gap-3">
                  <Users className="w-4 h-4" />
                  フレンド / リーダーボード
                </Button>
              </Link>

              {user?.email === "ikkei0713@gmail.com" && (
                <Link href="/admin" className="block">
                  <Button variant="secondary" className="w-full h-12 text-sm font-medium gap-3 border-primary/20">
                    <Shield className="w-4 h-4 text-primary" />
                    管理画面
                  </Button>
                </Link>
              )}
            </div>

            {/* Week 12 final message */}
            {profile!.current_week === 12 && profile!.current_day === 3 && (
              <Card className="border-primary/25 bg-gradient-to-b from-primary/8 to-transparent">
                <CardContent className="pt-6 pb-6 text-center space-y-3">
                  <Trophy className="w-10 h-10 text-primary mx-auto" />
                  <h3 className="text-lg font-bold">最終週！</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    12週間の集大成です。100kg目指して頑張りましょう！
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
