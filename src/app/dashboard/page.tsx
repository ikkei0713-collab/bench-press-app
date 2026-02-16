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
import { Dumbbell, Users, LogOut, Plus, Trophy, Settings, TrendingUp, ChevronRight } from "lucide-react";
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
      // 初回の重量履歴を記録
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
        <div className="animate-pulse text-primary neon-text text-2xl">Loading...</div>
      </div>
    );
  }

  const totalDays = 12 * 3; // 12 weeks, 3 days each
  const completedDays = profile
    ? (profile.current_week - 1) * 3 + (profile.current_day - 1)
    : 0;
  const progressPercent = (completedDays / totalDays) * 100;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-6 h-6 text-primary dumbbell-bounce" />
            <span className="font-bold text-lg">BP100</span>
          </div>
          <div className="flex items-center gap-1">
            <Link href="/settings">
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <div className="flex items-center gap-4">
          <Avatar className="w-14 h-14 border-2 border-primary/30">
            {profile?.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
            ) : null}
            <AvatarFallback className="bg-primary/20 text-primary text-xl font-bold">
              {(profile?.display_name ?? "U").charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">
              {profile?.display_name ?? "ユーザー"}さん
            </h1>
            <p className="text-muted-foreground">ベンチプレス100kgへの道</p>
          </div>
        </div>

        {!profile?.program_started ? (
          /* プログラム未開始 */
          <Card className="neon-border">
            <CardHeader>
              <CardTitle className="text-center">プログラムを始めよう</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                現在のMAX重量を入力して、12週間プログラムを開始しましょう。
              </p>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full h-14 text-lg font-bold neon-glow">
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
                      className="w-full h-14 text-lg font-bold neon-glow"
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
            <Card className="neon-border">
              <CardContent className="pt-6 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-muted-foreground">現在の進捗</p>
                    <p className="text-2xl font-bold">
                      Week {profile!.current_week}{" "}
                      <span className="text-primary">Day {profile!.current_day}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">完了率</p>
                    <p className="text-2xl font-bold text-primary">
                      {Math.round(progressPercent)}%
                    </p>
                  </div>
                </div>
                <Progress value={progressPercent} className="h-3" />
                <p className="text-xs text-muted-foreground text-center">
                  {completedDays} / {totalDays} セッション完了
                </p>
              </CardContent>
            </Card>

            {/* MAX weights - tap to edit */}
            <Link href="/settings" className="block">
              <Card className="cursor-pointer hover:bg-secondary/30 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                    <Dumbbell className="w-4 h-4" />
                    MAX重量
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">ベンチ</p>
                      <p className="text-xl font-bold text-primary">{profile!.bench_max}kg</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">2秒止め</p>
                      <p className="text-xl font-bold text-primary">{profile!.pause_max}kg</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">足上げ</p>
                      <p className="text-xl font-bold text-primary">{profile!.legs_up_max}kg</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Separator />

            {/* Quick Actions */}
            <div className="space-y-3">
              <Link href="/program" className="block">
                <Button className="w-full h-16 text-lg font-bold neon-glow">
                  <Dumbbell className="w-6 h-6 mr-3" />
                  今日のトレーニングを見る
                </Button>
              </Link>

              <Link href="/progress" className="block">
                <Button variant="secondary" className="w-full h-14 text-base">
                  <TrendingUp className="w-5 h-5 mr-3" />
                  重量推移グラフ
                </Button>
              </Link>

              <Link href="/friends" className="block">
                <Button variant="secondary" className="w-full h-14 text-base">
                  <Users className="w-5 h-5 mr-3" />
                  フレンド / リーダーボード
                </Button>
              </Link>
            </div>

            {/* Week 12 final message */}
            {profile!.current_week === 12 && profile!.current_day === 3 && (
              <Card className="neon-border bg-primary/5">
                <CardContent className="pt-6 text-center space-y-2">
                  <Trophy className="w-12 h-12 text-primary mx-auto" />
                  <h3 className="text-xl font-bold">最終週！</h3>
                  <p className="text-muted-foreground">
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
