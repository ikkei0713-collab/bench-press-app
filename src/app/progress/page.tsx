"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabBar } from "@/components/ui/tab-bar";
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
        <div className="animate-pulse text-muted-foreground text-[15px] font-medium">読み込み中...</div>
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
    <div className="min-h-screen pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/60 pt-safe">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full text-muted-foreground">
              <ArrowLeft className="w-[18px] h-[18px]" />
            </Button>
          </Link>
          <h1 className="font-semibold text-[17px]">重量推移</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 space-y-5">
        {records.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 space-y-4">
              <div className="w-14 h-14 rounded-[16px] bg-secondary flex items-center justify-center mx-auto">
                <TrendingUp className="w-7 h-7 text-muted-foreground" strokeWidth={2.2} />
              </div>
              <p className="text-muted-foreground text-[14px] leading-relaxed">
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
                      <p className="text-[11px] text-muted-foreground mb-1">ベンチ</p>
                      <p className="text-[22px] font-bold tracking-tight text-foreground">
                        {last.bench_max}
                        <span className="text-xs font-medium text-muted-foreground ml-0.5">kg</span>
                      </p>
                      <p
                        className={`text-[13px] font-medium mt-0.5 ${benchDiff > 0 ? "text-emerald-400" : benchDiff < 0 ? "text-red-400" : "text-muted-foreground"}`}
                      >
                        {benchDiff > 0 ? "+" : ""}
                        {benchDiff}kg
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">2秒止め</p>
                      <p className="text-[22px] font-bold tracking-tight text-foreground">
                        {last.pause_max}
                        <span className="text-xs font-medium text-muted-foreground ml-0.5">kg</span>
                      </p>
                      <p
                        className={`text-[13px] font-medium mt-0.5 ${pauseDiff > 0 ? "text-emerald-400" : pauseDiff < 0 ? "text-red-400" : "text-muted-foreground"}`}
                      >
                        {pauseDiff > 0 ? "+" : ""}
                        {pauseDiff}kg
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-1">足上げ</p>
                      <p className="text-[22px] font-bold tracking-tight text-foreground">
                        {last.legs_up_max}
                        <span className="text-xs font-medium text-muted-foreground ml-0.5">kg</span>
                      </p>
                      <p
                        className={`text-[13px] font-medium mt-0.5 ${legsUpDiff > 0 ? "text-emerald-400" : legsUpDiff < 0 ? "text-red-400" : "text-muted-foreground"}`}
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
            <Card>
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
                        stroke="rgba(255,255,255,0.07)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                        axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
                        axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                        tickLine={false}
                        domain={["dataMin - 5", "dataMax + 5"]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(30,32,38,0.9)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "14px",
                          color: "white",
                          backdropFilter: "blur(12px)",
                          boxShadow: "0 8px 28px rgba(0,0,0,0.4)",
                        }}
                        labelStyle={{ color: "rgba(255,255,255,0.6)" }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="ベンチ"
                        stroke="#0A84FF"
                        strokeWidth={2.5}
                        dot={{ fill: "#0A84FF", r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="2秒止め"
                        stroke="#FF9F0A"
                        strokeWidth={2.5}
                        dot={{ fill: "#FF9F0A", r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="足上げ"
                        stroke="#30D158"
                        strokeWidth={2.5}
                        dot={{ fill: "#30D158", r: 3 }}
                        activeDot={{ r: 5 }}
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
                <div>
                  {[...records].reverse().map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between py-3 border-b border-border/60 last:border-0"
                    >
                      <p className="text-[13px] text-muted-foreground">
                        {new Date(r.recorded_at).toLocaleDateString("ja-JP", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      <div className="flex gap-4 text-[14px]">
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

      <TabBar />
    </div>
  );
}
