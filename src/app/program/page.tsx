"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { generateProgram, type WeekProgram, type ExerciseSet } from "@/lib/program";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { TabBar } from "@/components/ui/tab-bar";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Save,
  MessageSquare,
  Download,
  Pencil,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";

interface UserProfile {
  id: string;
  bench_max: number;
  pause_max: number;
  legs_up_max: number;
  current_week: number;
  current_day: number;
  program_started: boolean;
}

interface CompletedSession {
  week: number;
  day: number;
}

interface SetLog {
  actual_weight: string;
  actual_reps: string;
}

interface ExerciseLog {
  exercise_index: number;
  exercise_name: string;
  planned_weight: number;
  planned_reps: number;
  planned_sets: number;
  sets: SetLog[];
  memo: string;
}

// DB row shape
interface TrainingLogRow {
  exercise_index: number;
  exercise_name: string;
  set_number: number;
  planned_weight: number;
  planned_reps: number;
  actual_weight: number | null;
  actual_reps: number | null;
  memo: string | null;
}

export default function ProgramPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [program, setProgram] = useState<WeekProgram[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [completedSessions, setCompletedSessions] = useState<CompletedSession[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // Training logs: keyed by "week-day"
  const [logs, setLogs] = useState<Record<string, ExerciseLog[]>>({});
  // Saved logs from DB for completed sessions
  const [savedLogs, setSavedLogs] = useState<Record<string, ExerciseLog[]>>({});
  // 編集中の完了済みセッション (key: "week-day")
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savedEdit, setSavedEdit] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  const fetchCompletedSessions = useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from("completed_sessions")
        .select("week, day")
        .eq("user_id", userId);
      if (data) {
        setCompletedSessions(data);
      }
    },
    [supabase]
  );

  // Fetch saved training logs from DB
  const fetchSavedLogs = useCallback(
    async (userId: string, week: number, day: number): Promise<ExerciseLog[]> => {
      const key = `${week}-${day}`;
      // Check cache
      if (savedLogs[key]) return savedLogs[key];

      const { data } = await supabase
        .from("training_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("week", week)
        .eq("day", day)
        .order("exercise_index")
        .order("set_number");

      if (!data || data.length === 0) return [];

      // Group by exercise_index
      const grouped: Record<number, TrainingLogRow[]> = {};
      for (const row of data as TrainingLogRow[]) {
        if (!grouped[row.exercise_index]) grouped[row.exercise_index] = [];
        grouped[row.exercise_index].push(row);
      }

      const result: ExerciseLog[] = Object.entries(grouped).map(
        ([idx, rows]) => ({
          exercise_index: Number(idx),
          exercise_name: rows[0].exercise_name,
          planned_weight: rows[0].planned_weight,
          planned_reps: rows[0].planned_reps,
          planned_sets: rows.length,
          sets: rows.map((r) => ({
            actual_weight: r.actual_weight?.toString() ?? "",
            actual_reps: r.actual_reps?.toString() ?? "",
          })),
          memo: rows[0].memo ?? "",
        })
      );

      setSavedLogs((prev) => ({ ...prev, [key]: result }));
      return result;
    },
    [supabase, savedLogs]
  );

  // Initialize logs for active day from program data
  const initializeLogs = useCallback(
    (exercises: ExerciseSet[], week: number, day: number, existing?: ExerciseLog[]) => {
      const key = `${week}-${day}`;
      if (logs[key]) return; // Already initialized

      const newLogs: ExerciseLog[] = exercises.map((ex, i) => {
        // Check if we have existing data from DB
        const existingLog = existing?.find((e) => e.exercise_index === i);
        if (existingLog) return existingLog;

        return {
          exercise_index: i,
          exercise_name: ex.exercise,
          planned_weight: Math.round(ex.weight * 2) / 2,
          planned_reps: ex.reps,
          planned_sets: ex.sets,
          sets: Array.from({ length: ex.sets }, () => ({
            actual_weight: (Math.round(ex.weight * 2) / 2).toString(),
            actual_reps: ex.reps.toString(),
          })),
          memo: "",
        };
      });

      setLogs((prev) => ({ ...prev, [key]: newLogs }));
    },
    [logs]
  );

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!prof || !prof.program_started) {
        router.push("/dashboard");
        return;
      }

      setProfile(prof);
      setSelectedWeek(prof.current_week);
      const generated = generateProgram(
        prof.bench_max,
        prof.pause_max,
        prof.legs_up_max
      );
      setProgram(generated);
      await fetchCompletedSessions(user.id);

      // Pre-load logs for current day
      const currentDayData = generated
        .find((w) => w.week === prof.current_week)
        ?.days.find((d) => d.day === prof.current_day);
      if (currentDayData) {
        const existing = await fetchSavedLogs(
          user.id,
          prof.current_week,
          prof.current_day
        );
        // Will initialize in a separate effect
      }

      setLoading(false);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize logs when viewing active day
  useEffect(() => {
    if (!profile || program.length === 0) return;

    const isActive =
      selectedWeek === profile.current_week;
    if (!isActive) return;

    const weekData = program.find((w) => w.week === selectedWeek);
    if (!weekData) return;

    const dayData = weekData.days.find((d) => d.day === profile.current_day);
    if (!dayData) return;

    const key = `${selectedWeek}-${profile.current_day}`;
    if (!logs[key]) {
      const existingKey = savedLogs[key];
      initializeLogs(
        dayData.exercises,
        selectedWeek,
        profile.current_day,
        existingKey
      );
    }
  }, [profile, program, selectedWeek, logs, savedLogs, initializeLogs]);

  // Fetch saved logs when navigating to a completed day
  useEffect(() => {
    if (!profile) return;

    const loadCompletedLogs = async () => {
      const weekData = program.find((w) => w.week === selectedWeek);
      if (!weekData) return;

      for (const d of weekData.days) {
        if (isSessionCompleted(selectedWeek, d.day)) {
          await fetchSavedLogs(profile.id, selectedWeek, d.day);
        }
      }
    };
    loadCompletedLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWeek, profile, program]);

  const isSessionCompleted = (week: number, day: number) => {
    return completedSessions.some((s) => s.week === week && s.day === day);
  };

  const isActiveDay = (week: number, day: number) => {
    return (
      profile &&
      week === profile.current_week &&
      day === profile.current_day &&
      !isSessionCompleted(week, day)
    );
  };

  const handleSetChange = (
    week: number,
    day: number,
    exIdx: number,
    setIdx: number,
    field: "weight" | "reps",
    value: string
  ) => {
    const key = `${week}-${day}`;
    setLogs((prev) => {
      const dayLogs = [...(prev[key] ?? [])];
      const exLog = { ...dayLogs[exIdx] };
      const sets = [...exLog.sets];
      sets[setIdx] = {
        ...sets[setIdx],
        [field === "weight" ? "actual_weight" : "actual_reps"]: value,
      };
      exLog.sets = sets;
      dayLogs[exIdx] = exLog;
      return { ...prev, [key]: dayLogs };
    });
  };

  const handleMemoChange = (
    week: number,
    day: number,
    exIdx: number,
    value: string
  ) => {
    const key = `${week}-${day}`;
    setLogs((prev) => {
      const dayLogs = [...(prev[key] ?? [])];
      const exLog = { ...dayLogs[exIdx], memo: value };
      dayLogs[exIdx] = exLog;
      return { ...prev, [key]: dayLogs };
    });
  };

  const handleSaveTraining = async (week: number, day: number) => {
    if (!profile || saving) return;
    setSaving(true);
    setSaved(false);

    const key = `${week}-${day}`;
    const dayLogs = logs[key];
    if (!dayLogs) {
      setSaving(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Build rows for upsert
    const rows = dayLogs.flatMap((exLog) =>
      exLog.sets.map((s, setIdx) => ({
        user_id: user.id,
        week,
        day,
        exercise_index: exLog.exercise_index,
        exercise_name: exLog.exercise_name,
        set_number: setIdx + 1,
        planned_weight: exLog.planned_weight,
        planned_reps: exLog.planned_reps,
        actual_weight: s.actual_weight ? parseFloat(s.actual_weight) : null,
        actual_reps: s.actual_reps ? parseInt(s.actual_reps) : null,
        memo: exLog.memo || null,
      }))
    );

    // Upsert training logs
    await supabase
      .from("training_logs")
      .upsert(rows, {
        onConflict: "user_id,week,day,exercise_index,set_number",
      });

    // Mark session as completed
    await supabase.from("completed_sessions").upsert(
      { user_id: user.id, week, day },
      { onConflict: "user_id,week,day" }
    );

    // Advance to next day/week
    let nextWeek = week;
    let nextDay = day + 1;
    if (nextDay > 3) {
      nextDay = 1;
      nextWeek = week + 1;
      if (nextWeek > 12) {
        nextWeek = 12;
        nextDay = 3;
      }
    }

    await supabase
      .from("profiles")
      .update({ current_week: nextWeek, current_day: nextDay })
      .eq("id", user.id);

    setProfile((prev) =>
      prev
        ? { ...prev, current_week: nextWeek, current_day: nextDay }
        : null
    );
    setCompletedSessions((prev) => [...prev, { week, day }]);

    // Cache saved logs
    setSavedLogs((prev) => ({ ...prev, [key]: dayLogs }));

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setSaving(false);
  };

  const handleStartEdit = (week: number, day: number) => {
    const key = `${week}-${day}`;
    const existing = savedLogs[key];
    if (existing) {
      // savedLogsのデータをlogsにコピーして編集可能にする
      setLogs((prev) => ({ ...prev, [key]: existing.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s })) })) }));
    }
    setEditingSession(key);
  };

  const handleCancelEdit = () => {
    if (editingSession) {
      // 編集中のlogsを削除してsavedLogsに戻す
      setLogs((prev) => {
        const copy = { ...prev };
        delete copy[editingSession];
        return copy;
      });
    }
    setEditingSession(null);
  };

  const handleSaveEdit = async (week: number, day: number) => {
    if (!profile || savingEdit) return;
    setSavingEdit(true);
    setSavedEdit(false);

    const key = `${week}-${day}`;
    const dayLogs = logs[key];
    if (!dayLogs) {
      setSavingEdit(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const rows = dayLogs.flatMap((exLog) =>
      exLog.sets.map((s, setIdx) => ({
        user_id: user.id,
        week,
        day,
        exercise_index: exLog.exercise_index,
        exercise_name: exLog.exercise_name,
        set_number: setIdx + 1,
        planned_weight: exLog.planned_weight,
        planned_reps: exLog.planned_reps,
        actual_weight: s.actual_weight ? parseFloat(s.actual_weight) : null,
        actual_reps: s.actual_reps ? parseInt(s.actual_reps) : null,
        memo: exLog.memo || null,
      }))
    );

    await supabase
      .from("training_logs")
      .upsert(rows, {
        onConflict: "user_id,week,day,exercise_index,set_number",
      });

    // savedLogsを更新
    setSavedLogs((prev) => ({ ...prev, [key]: dayLogs }));
    setEditingSession(null);
    setSavedEdit(true);
    setTimeout(() => setSavedEdit(false), 3000);
    setSavingEdit(false);
  };

  const handleExportExcel = () => {
    if (!program || program.length === 0) return;

    const rows: Record<string, string | number>[] = [];

    for (const week of program) {
      for (const day of week.days) {
        for (const ex of day.exercises) {
          const weight = Math.round(ex.weight * 2) / 2;
          rows.push({
            Week: week.week,
            Day: day.day,
            種目: ex.exercise,
            "重量(kg)": weight,
            回数: ex.reps,
            セット数: ex.sets,
            RPE: ex.rpe != null ? Math.round(ex.rpe) : "",
            "推定1RM(kg)": ex.e1rm != null ? Math.round(ex.e1rm * 10) / 10 : "",
          });
        }
      }
    }

    const ws = XLSX.utils.json_to_sheet(rows);

    // 列幅を調整
    ws["!cols"] = [
      { wch: 6 },  // Week
      { wch: 5 },  // Day
      { wch: 14 }, // 種目
      { wch: 10 }, // 重量
      { wch: 6 },  // 回数
      { wch: 8 },  // セット数
      { wch: 6 },  // RPE
      { wch: 14 }, // 推定1RM
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "プログラム");
    XLSX.writeFile(wb, "ベンチプレスプログラム.xlsx");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-[15px] font-medium">読み込み中...</div>
      </div>
    );
  }

  const weekData = program.find((w) => w.week === selectedWeek);
  if (!weekData) return null;

  const exerciseColor: Record<string, string> = {
    ベンチプレス: "rounded-full bg-primary/15 text-primary border-transparent",
    "2秒止め": "rounded-full bg-orange-500/15 text-orange-400 border-transparent",
    足上げ: "rounded-full bg-emerald-500/15 text-emerald-400 border-transparent",
  };

  const dayLabels = ["Day 1（月）", "Day 2（水）", "Day 3（金）"];

  // Render exercise card for active day (with inputs)
  const renderActiveExercise = (
    ex: ExerciseSet,
    exIdx: number,
    week: number,
    day: number
  ) => {
    const key = `${week}-${day}`;
    const exLog = logs[key]?.[exIdx];

    return (
      <Card key={exIdx} className="overflow-hidden">
        <CardContent className="p-4 space-y-3.5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className={exerciseColor[ex.exercise] ?? ""}
            >
              {ex.exercise}
            </Badge>
            <div className="flex items-center gap-2.5">
              {ex.rpe && (
                <span className="text-[11px] text-muted-foreground">
                  RPE {Math.round(ex.rpe)}
                </span>
              )}
              {ex.e1rm && (
                <span className="text-[11px] text-muted-foreground">
                  e1RM {Math.round(ex.e1rm * 10) / 10}kg
                </span>
              )}
            </div>
          </div>

          {/* Planned summary */}
          <p className="text-[12px] text-muted-foreground">
            予定: {Math.round(ex.weight * 2) / 2}kg x {ex.reps}回 x{" "}
            {ex.sets}set
          </p>

          {/* Per-set inputs */}
          <div className="space-y-2">
            {Array.from({ length: ex.sets }, (_, setIdx) => (
              <div key={setIdx} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-7 shrink-0 font-medium">
                  S{setIdx + 1}
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  className="h-11 w-[5.5rem] text-center"
                  value={exLog?.sets[setIdx]?.actual_weight ?? ""}
                  onChange={(e) =>
                    handleSetChange(
                      week,
                      day,
                      exIdx,
                      setIdx,
                      "weight",
                      e.target.value
                    )
                  }
                />
                <span className="text-xs text-muted-foreground">kg</span>
                <span className="text-xs text-muted-foreground">x</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  className="h-11 w-16 text-center"
                  value={exLog?.sets[setIdx]?.actual_reps ?? ""}
                  onChange={(e) =>
                    handleSetChange(
                      week,
                      day,
                      exIdx,
                      setIdx,
                      "reps",
                      e.target.value
                    )
                  }
                />
                <span className="text-xs text-muted-foreground">回</span>
              </div>
            ))}
          </div>

          {/* Memo */}
          <div className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground mt-2.5 shrink-0" />
            <textarea
              placeholder="メモを入力..."
              className="w-full rounded-xl border border-input bg-secondary/50 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground min-h-[48px] max-h-[120px] resize-y focus:outline-none focus:border-ring focus:ring-4 focus:ring-primary/15"
              value={exLog?.memo ?? ""}
              onChange={(e) =>
                handleMemoChange(week, day, exIdx, e.target.value)
              }
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render exercise card for completed day (read-only with actual data)
  const renderCompletedExercise = (
    ex: ExerciseSet,
    exIdx: number,
    week: number,
    day: number
  ) => {
    const key = `${week}-${day}`;
    const exLog = savedLogs[key]?.find((l) => l.exercise_index === exIdx);

    return (
      <Card key={exIdx} className="overflow-hidden">
        <CardContent className="p-4 space-y-3.5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className={exerciseColor[ex.exercise] ?? ""}
            >
              {ex.exercise}
            </Badge>
            <div className="flex items-center gap-2">
              {ex.rpe && (
                <span className="text-[11px] text-muted-foreground">
                  RPE {Math.round(ex.rpe)}
                </span>
              )}
            </div>
          </div>

          {exLog ? (
            <>
              {/* Show actual data per set */}
              <p className="text-[12px] text-muted-foreground">
                予定: {Math.round(ex.weight * 2) / 2}kg x {ex.reps}回 x{" "}
                {ex.sets}set
              </p>
              <div className="space-y-1.5">
                {exLog.sets.map((s, setIdx) => {
                  const actualW = s.actual_weight
                    ? parseFloat(s.actual_weight)
                    : null;
                  const actualR = s.actual_reps
                    ? parseInt(s.actual_reps)
                    : null;
                  const diffW =
                    actualW != null
                      ? actualW - exLog.planned_weight
                      : null;
                  const diffR =
                    actualR != null
                      ? actualR - exLog.planned_reps
                      : null;

                  return (
                    <div
                      key={setIdx}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span className="text-xs text-muted-foreground w-7 font-medium">
                        S{setIdx + 1}
                      </span>
                      <span className="font-medium tabular-nums">
                        {actualW ?? "-"}kg
                      </span>
                      {diffW != null && diffW !== 0 && (
                        <span
                          className={`text-xs ${diffW > 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                          ({diffW > 0 ? "+" : ""}
                          {diffW}kg)
                        </span>
                      )}
                      <span className="text-muted-foreground">x</span>
                      <span className="font-medium tabular-nums">
                        {actualR ?? "-"}回
                      </span>
                      {diffR != null && diffR !== 0 && (
                        <span
                          className={`text-xs ${diffR > 0 ? "text-emerald-400" : "text-red-400"}`}
                        >
                          ({diffR > 0 ? "+" : ""}
                          {diffR})
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {exLog.memo && (
                <div className="flex items-start gap-2 pt-0.5">
                  <MessageSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{exLog.memo}</p>
                </div>
              )}
            </>
          ) : (
            /* Fallback: show planned data */
            <>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">重量</p>
                  <p className="text-[22px] font-bold tracking-tight">
                    {Math.round(ex.weight * 2) / 2}
                    <span className="text-xs font-medium text-muted-foreground ml-0.5">kg</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">回数</p>
                  <p className="text-[22px] font-bold tracking-tight">
                    {ex.reps}
                    <span className="text-xs font-medium text-muted-foreground ml-0.5">回</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground mb-1">セット</p>
                  <p className="text-[22px] font-bold tracking-tight">
                    {ex.sets}
                    <span className="text-xs font-medium text-muted-foreground ml-0.5">set</span>
                  </p>
                </div>
              </div>
              {ex.e1rm && (
                <p className="text-[12px] text-muted-foreground text-center">
                  推定1RM: {Math.round(ex.e1rm * 10) / 10}kg
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  // Render exercise card for editing a completed day (with inputs, using logs state)
  const renderEditingExercise = (
    ex: ExerciseSet,
    exIdx: number,
    week: number,
    day: number
  ) => {
    const key = `${week}-${day}`;
    const exLog = logs[key]?.[exIdx];

    return (
      <Card key={exIdx} className="overflow-hidden border-primary/40">
        <CardContent className="p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className={exerciseColor[ex.exercise] ?? ""}
            >
              {ex.exercise}
            </Badge>
            <div className="flex items-center gap-2">
              {ex.rpe && (
                <span className="text-[11px] text-muted-foreground">
                  RPE {Math.round(ex.rpe)}
                </span>
              )}
              <Badge variant="outline" className="rounded-full bg-orange-500/15 text-orange-400 border-transparent text-[11px] px-2.5 py-0.5">
                編集中
              </Badge>
            </div>
          </div>

          <p className="text-[12px] text-muted-foreground">
            予定: {Math.round(ex.weight * 2) / 2}kg x {ex.reps}回 x{" "}
            {ex.sets}set
          </p>

          <div className="space-y-2">
            {exLog?.sets.map((_, setIdx) => (
              <div key={setIdx} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-7 shrink-0 font-medium">
                  S{setIdx + 1}
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  className="h-11 w-[5.5rem] text-center"
                  value={exLog?.sets[setIdx]?.actual_weight ?? ""}
                  onChange={(e) =>
                    handleSetChange(week, day, exIdx, setIdx, "weight", e.target.value)
                  }
                />
                <span className="text-xs text-muted-foreground">kg</span>
                <span className="text-xs text-muted-foreground">x</span>
                <Input
                  type="number"
                  inputMode="numeric"
                  step="1"
                  className="h-11 w-16 text-center"
                  value={exLog?.sets[setIdx]?.actual_reps ?? ""}
                  onChange={(e) =>
                    handleSetChange(week, day, exIdx, setIdx, "reps", e.target.value)
                  }
                />
                <span className="text-xs text-muted-foreground">回</span>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-muted-foreground mt-2.5 shrink-0" />
            <textarea
              placeholder="メモを入力..."
              className="w-full rounded-xl border border-input bg-secondary/50 px-3.5 py-2.5 text-sm placeholder:text-muted-foreground min-h-[48px] max-h-[120px] resize-y focus:outline-none focus:border-ring focus:ring-4 focus:ring-primary/15"
              value={exLog?.memo ?? ""}
              onChange={(e) => handleMemoChange(week, day, exIdx, e.target.value)}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render exercise card for future/non-active day (read-only planned data)
  const renderPlannedExercise = (ex: ExerciseSet, exIdx: number) => {
    return (
      <Card key={exIdx} className="overflow-hidden">
        <CardContent className="p-4 space-y-3.5">
          <div className="flex items-center justify-between">
            <Badge
              variant="outline"
              className={exerciseColor[ex.exercise] ?? ""}
            >
              {ex.exercise}
            </Badge>
            {ex.rpe && (
              <span className="text-[11px] text-muted-foreground">
                RPE {Math.round(ex.rpe)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">重量</p>
              <p className="text-[22px] font-bold tracking-tight">
                {Math.round(ex.weight * 2) / 2}
                <span className="text-xs font-medium text-muted-foreground ml-0.5">kg</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">回数</p>
              <p className="text-[22px] font-bold tracking-tight">
                {ex.reps}
                <span className="text-xs font-medium text-muted-foreground ml-0.5">回</span>
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground mb-1">セット</p>
              <p className="text-[22px] font-bold tracking-tight">
                {ex.sets}
                <span className="text-xs font-medium text-muted-foreground ml-0.5">set</span>
              </p>
            </div>
          </div>
          {ex.e1rm && (
            <p className="text-[12px] text-muted-foreground text-center">
              推定1RM: {Math.round(ex.e1rm * 10) / 10}kg
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-border/60 pt-safe">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="w-9 h-9 rounded-full text-muted-foreground">
                <ArrowLeft className="w-[18px] h-[18px]" />
              </Button>
            </Link>
            <h1 className="font-semibold text-[17px] tracking-tight">トレーニングプログラム</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 rounded-full text-muted-foreground"
            onClick={handleExportExcel}
            title="Excelで出力"
          >
            <Download className="w-[18px] h-[18px]" />
          </Button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pt-5 space-y-6">
        {/* Week Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 rounded-full text-muted-foreground"
            onClick={() => setSelectedWeek(Math.max(1, selectedWeek - 1))}
            disabled={selectedWeek === 1}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center space-y-1.5">
            <h2 className="text-[22px] font-bold tracking-tight">
              Week {selectedWeek}
            </h2>
            <div className="flex items-center justify-center gap-1.5">
              {selectedWeek === profile!.current_week && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                  現在の週
                </span>
              )}
              {[4, 8, 12].includes(selectedWeek) && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-orange-500/15 text-orange-400 font-medium">
                  {selectedWeek === 12 ? "最終テスト" : "ディロード"}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9 rounded-full text-muted-foreground"
            onClick={() => setSelectedWeek(Math.min(12, selectedWeek + 1))}
            disabled={selectedWeek === 12}
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Days Tabs */}
        <Tabs defaultValue="1" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            {weekData.days.map((d) => (
              <TabsTrigger
                key={d.day}
                value={String(d.day)}
                className="relative"
              >
                Day {d.day}
                {isSessionCompleted(selectedWeek, d.day) && (
                  <Check className="w-3 h-3 ml-1 text-emerald-400" />
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {weekData.days.map((dayData, dayIndex) => {
            const active = isActiveDay(selectedWeek, dayData.day);
            const completed = isSessionCompleted(selectedWeek, dayData.day);
            const dayKey = `${selectedWeek}-${dayData.day}`;
            const isEditing = editingSession === dayKey;

            return (
              <TabsContent
                key={dayData.day}
                value={String(dayData.day)}
                className="space-y-4 mt-4"
              >
                <h3 className="text-[13px] font-semibold text-muted-foreground tracking-tight">
                  {dayLabels[dayIndex]}
                </h3>

                {/* Main Exercises */}
                <div className="space-y-3">
                  {dayData.exercises.map((ex, i) =>
                    active
                      ? renderActiveExercise(
                          ex,
                          i,
                          selectedWeek,
                          dayData.day
                        )
                      : completed && isEditing
                        ? renderEditingExercise(
                            ex,
                            i,
                            selectedWeek,
                            dayData.day
                          )
                        : completed
                          ? renderCompletedExercise(
                              ex,
                              i,
                              selectedWeek,
                              dayData.day
                            )
                          : renderPlannedExercise(ex, i)
                  )}
                </div>

                <Separator />

                {/* Accessories */}
                <div>
                  <h4 className="text-[13px] font-semibold text-muted-foreground mb-3 flex items-center gap-1.5 tracking-tight">
                    <Dumbbell className="w-3.5 h-3.5" />
                    補助種目（
                    {dayLabels[dayIndex].includes("月")
                      ? "月曜"
                      : dayLabels[dayIndex].includes("水")
                        ? "水曜"
                        : "金曜"}
                    ）
                  </h4>
                  <div className="space-y-2">
                    {weekData.accessories
                      .filter((a) => {
                        const dayMap: Record<number, string> = {
                          0: "月曜",
                          1: "水曜",
                          2: "金曜",
                        };
                        return a.dayLabel === dayMap[dayIndex];
                      })
                      .map((acc, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-xl bg-secondary/50 px-3.5 py-3"
                        >
                          <div>
                            <p className="text-[14px] font-medium">{acc.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {acc.category}
                            </p>
                          </div>
                          <p className="text-[14px] text-muted-foreground tabular-nums">
                            {acc.reps}回 x {acc.sets}set
                          </p>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Save / Complete Button */}
                {active && (
                  <Button
                    onClick={() =>
                      handleSaveTraining(selectedWeek, dayData.day)
                    }
                    disabled={saving}
                    className="w-full h-14 text-[16px]"
                  >
                    {saving ? (
                      "保存中..."
                    ) : saved ? (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        保存しました！
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5 mr-2" />
                        トレーニング記録を保存
                      </>
                    )}
                  </Button>
                )}

                {/* 完了済みセッション: 編集ボタン / 保存・キャンセルボタン */}
                {completed && !isEditing && (
                  <div className="flex items-center justify-center gap-3 py-2">
                    <span className="inline-flex items-center text-[13px] font-medium px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400">
                      <Check className="w-4 h-4 mr-1.5" />
                      完了済み
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartEdit(selectedWeek, dayData.day)}
                    >
                      <Pencil className="w-4 h-4 mr-1" />
                      編集
                    </Button>
                  </div>
                )}

                {completed && isEditing && (
                  <div className="space-y-2.5 py-1">
                    <Button
                      onClick={() => handleSaveEdit(selectedWeek, dayData.day)}
                      disabled={savingEdit}
                      className="w-full h-14 text-[16px]"
                    >
                      {savingEdit ? (
                        "保存中..."
                      ) : savedEdit ? (
                        <>
                          <Check className="w-5 h-5 mr-2" />
                          修正を保存しました！
                        </>
                      ) : (
                        <>
                          <Save className="w-5 h-5 mr-2" />
                          修正を保存
                        </>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="w-full text-muted-foreground"
                    >
                      <X className="w-4 h-4 mr-1" />
                      キャンセル
                    </Button>
                  </div>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </main>

      <TabBar />
    </div>
  );
}
