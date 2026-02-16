"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface WeightRecord {
  id: string;
  bench_max: number;
  pause_max: number;
  legs_up_max: number;
  recorded_at: string;
}

export default function ProgressPage() {
  const [records, setRecords] = useState<WeightRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  const fetchHistory = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const { data } = await supabase
      .from("weight_history")
      .select("*")
      .eq("user_id", user.id)
      .order("recorded_at", { ascending: true });

    if (data) {
      setRecords(data);
    }
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-primary neon-text text-2xl">
          Loading...
        </div>
      </div>
    );
  }

  const chartData = records.map((r) => ({
    date: new Date(r.recorded_at).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    }),
    ベンチ: r.bench_max,
    "2秒止め": r.pause_max,
    足上げ: r.legs_up_max,
  }));

  // 最新と最初を比較して増減を計算
  const first = records[0];
  const last = records[records.length - 1];
  const benchDiff = first && last ? last.bench_max - first.bench_max : 0;
  const pauseDiff = first && last ? last.pause_max - first.pause_max : 0;
  const legsUpDiff = first && last ? last.legs_up_max - first.legs_up_max : 0;

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="font-bold text-lg">重量推移</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {records.length === 0 ? (
          <Card className="neon-border">
            <CardContent className="pt-6 text-center py-12">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                まだ記録がありません。
                <br />
                設定ページでMAX重量を更新すると記録されます。
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 変化サマリー */}
            {records.length >= 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    開始からの変化
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-muted-foreground">ベンチ</p>
                      <p className="text-xl font-bold text-primary">
                        {last.bench_max}kg
                      </p>
                      <p
                        className={`text-sm font-medium ${benchDiff > 0 ? "text-emerald-400" : benchDiff < 0 ? "text-red-400" : "text-muted-foreground"}`}
                      >
                        {benchDiff > 0 ? "+" : ""}
                        {benchDiff}kg
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">2秒止め</p>
                      <p className="text-xl font-bold text-primary">
                        {last.pause_max}kg
                      </p>
                      <p
                        className={`text-sm font-medium ${pauseDiff > 0 ? "text-emerald-400" : pauseDiff < 0 ? "text-red-400" : "text-muted-foreground"}`}
                      >
                        {pauseDiff > 0 ? "+" : ""}
                        {pauseDiff}kg
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">足上げ</p>
                      <p className="text-xl font-bold text-primary">
                        {last.legs_up_max}kg
                      </p>
                      <p
                        className={`text-sm font-medium ${legsUpDiff > 0 ? "text-emerald-400" : legsUpDiff < 0 ? "text-red-400" : "text-muted-foreground"}`}
                      >
                        {legsUpDiff > 0 ? "+" : ""}
                        {legsUpDiff}kg
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* グラフ */}
            <Card className="neon-border">
              <CardHeader>
                <CardTitle className="text-base">重量推移グラフ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(0 0% 20%)"
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "hsl(0 0% 60%)", fontSize: 12 }}
                        stroke="hsl(0 0% 30%)"
                      />
                      <YAxis
                        tick={{ fill: "hsl(0 0% 60%)", fontSize: 12 }}
                        stroke="hsl(0 0% 30%)"
                        domain={["dataMin - 5", "dataMax + 5"]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(240 10% 10%)",
                          border: "1px solid hsl(240 10% 25%)",
                          borderRadius: "8px",
                          color: "white",
                        }}
                        labelStyle={{ color: "hsl(0 0% 70%)" }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="ベンチ"
                        stroke="hsl(220 90% 60%)"
                        strokeWidth={2}
                        dot={{ fill: "hsl(220 90% 60%)", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="2秒止め"
                        stroke="hsl(30 90% 55%)"
                        strokeWidth={2}
                        dot={{ fill: "hsl(30 90% 55%)", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="足上げ"
                        stroke="hsl(150 70% 50%)"
                        strokeWidth={2}
                        dot={{ fill: "hsl(150 70% 50%)", r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* 履歴一覧 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">記録一覧</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...records].reverse().map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between py-2 border-b border-border last:border-0"
                    >
                      <p className="text-sm text-muted-foreground">
                        {new Date(r.recorded_at).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <div className="flex gap-4 text-sm">
                        <span>
                          <span className="text-muted-foreground">B:</span>{" "}
                          <span className="font-medium">{r.bench_max}kg</span>
                        </span>
                        <span>
                          <span className="text-muted-foreground">P:</span>{" "}
                          <span className="font-medium">{r.pause_max}kg</span>
                        </span>
                        <span>
                          <span className="text-muted-foreground">L:</span>{" "}
                          <span className="font-medium">{r.legs_up_max}kg</span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
