"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TabBar } from "@/components/ui/tab-bar";
import {
  Dumbbell,
  LogOut,
  Plus,
  Trophy,
  Settings,
  ChevronRight,
  Shield,
} from "lucide-react";
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
        <div className="animate-pulse text-muted-foreground text-[15px] font-medium">読み込み中...</div>
      </div>
    );
  }

  const totalDays = 12 * 3;
  const completedDays = profile
    ? (profile.current_week - 1) * 3 + (profile.current_day - 1)
    : 0;
  const progressPercent = (completedDays / totalDays) * 100;

  return (
    <div className="min-h-screen pb-28">
      {/* Nav bar */}
      <header className="sticky top-0 z-40 glass border-b border-border/60 pt-safe">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[8px] bg-gradient-to-b from-primary to-[oklch(0.54_0.17_256)] flex items-center justify-center">
              <Dumbbell className="w-4 h-4 text-white" strokeWidth={2.4} />
            </div>
            <span className="font-semibold text-[15px] tracking-tight">BP100</span>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/settings">
              <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full text-muted-foreground">
                <Settings className="w-[18px] h-[18px]" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full text-muted-foreground" onClick={handleLogout}>
              <LogOut className="w-[18px] h-[18px]" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-6 space-y-6">
        {/* Greeting */}
        <div className="flex items-center gap-3.5">
          <Avatar className="w-14 h-14 ring-1 ring-border">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
            ) : null}
            <AvatarFallback className="bg-secondary text-foreground text-xl font-semibold">
              {(profile?.display_name ?? "U").charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-[13px] text-muted-foreground">ベンチプレス100kgへの道</p>
            <h1 className="text-[26px] font-bold leading-tight tracking-tight">
              {profile?.display_name ?? "ユーザー"}
              <span className="text-muted-foreground font-normal text-lg ml-1">さん</span>
            </h1>
          </div>
        </div>

        {!profile?.program_started ? (
          /* Not started */
          <Card>
            <CardContent className="text-center space-y-5 py-2">
              <div className="w-14 h-14 rounded-[16px] bg-primary/12 flex items-center justify-center mx-auto">
                <Dumbbell className="w-7 h-7 text-primary" strokeWidth={2.2} />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-lg font-semibold">プログラムを始めよう</h2>
                <p className="text-muted-foreground text-[14px] leading-relaxed px-2">
                  現在のMAX重量を入力して、12週間プログラムを開始しましょう。
                </p>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full h-12 text-[16px]">
                    <Plus className="w-5 h-5 mr-1" />
                    プログラム開始
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>現在のMAX重量を入力</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground px-1">ベンチプレス MAX (kg)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        placeholder="例: 80"
                        value={benchMax}
                        onChange={(e) => setBenchMax(e.target.value)}
                        className="h-12 text-base"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground px-1">2秒止め MAX (kg)</Label>
                      <Input
                        type="number"
                        step="0.5"
                        placeholder="例: 70"
                        value={pauseMax}
                        onChange={(e) => setPauseMax(e.target.value)}
                        className="h-12 text-base"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground px-1">足上げ MAX (kg)</Label>
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
                      className="w-full h-12 text-[16px]"
                    >
                      {saving ? "保存中..." : "プログラムを生成"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          /* In progress */
          <>
            {/* Progress hero */}
            <Card className="bg-gradient-to-br from-primary/14 via-card to-card border-primary/15">
              <CardContent className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[12px] text-muted-foreground font-medium mb-1.5">現在の進捗</p>
                    <p className="text-[28px] font-bold leading-none tracking-tight">
                      Week {profile!.current_week}
                      <span className="text-primary ml-2">Day {profile!.current_day}</span>
                    </p>
                  </div>
                  <p className="text-[34px] font-bold text-primary leading-none tracking-tight">
                    {Math.round(progressPercent)}<span className="text-lg font-semibold">%</span>
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Progress value={progressPercent} className="h-2" />
                  <p className="text-[12px] text-muted-foreground text-right">
                    {completedDays} / {totalDays} セッション完了
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* MAX weights */}
            <Link href="/settings" className="block press">
              <Card className="active:bg-card/80 transition-colors">
                <CardContent>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
                      <Dumbbell className="w-3.5 h-3.5" />
                      MAX重量
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: "ベンチ", value: profile!.bench_max },
                      { label: "2秒止め", value: profile!.pause_max },
                      { label: "足上げ", value: profile!.legs_up_max },
                    ].map((m) => (
                      <div key={m.label}>
                        <p className="text-[11px] text-muted-foreground mb-1">{m.label}</p>
                        <p className="text-[22px] font-bold tracking-tight">
                          {m.value}
                          <span className="text-xs font-medium text-muted-foreground ml-0.5">kg</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>

            {/* Primary CTA */}
            <Link href="/program" className="block">
              <Button className="w-full h-14 text-[16px] gap-2.5">
                <Dumbbell className="w-5 h-5" />
                今日のトレーニングを記録
              </Button>
            </Link>

            {/* Admin */}
            {user?.email === "ikkei0713@gmail.com" && (
              <Link href="/admin" className="block press">
                <Card className="active:bg-card/80 transition-colors">
                  <CardContent className="flex items-center gap-3 py-0">
                    <div className="w-8 h-8 rounded-[9px] bg-primary/12 flex items-center justify-center">
                      <Shield className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <span className="text-[15px] font-medium flex-1">管理画面</span>
                    <ChevronRight className="w-4.5 h-4.5 text-muted-foreground/50" />
                  </CardContent>
                </Card>
              </Link>
            )}

            {/* Final week */}
            {profile!.current_week === 12 && profile!.current_day === 3 && (
              <Card className="bg-gradient-to-b from-primary/12 to-card border-primary/20">
                <CardContent className="text-center space-y-2.5 py-2">
                  <Trophy className="w-9 h-9 text-primary mx-auto" />
                  <h3 className="text-lg font-semibold">最終週！</h3>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">
                    12週間の集大成です。100kg目指して頑張りましょう！
                  </p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>

      <TabBar />
    </div>
  );
}
