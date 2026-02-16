// Excelの12週間プログラムを完全再現する計算ロジック
// 基準MAX: ベンチ90kg, 2秒止め80kg, 足上げ80kg

export type ExerciseType = "ベンチプレス" | "2秒止め" | "足上げ";

export interface ExerciseSet {
  exercise: ExerciseType;
  weight: number;
  reps: number;
  sets: number;
  rpe: number | null;
  e1rm: number | null;
}

export interface DayProgram {
  day: number;
  exercises: ExerciseSet[];
}

export interface AccessoryExercise {
  dayLabel: string; // 月曜, 水曜, 金曜
  category: string; // 胸, 三頭, 背中, 肩
  name: string;
  reps: number;
  sets: number;
}

export interface WeekProgram {
  week: number;
  days: DayProgram[];
  accessories: AccessoryExercise[];
}

// e1RM計算: weight * (reps + 10 - RPE) / 33 + weight
function calcE1RM(weight: number, reps: number, rpe: number): number {
  return weight * (reps + 10 - rpe) / 33 + weight;
}

// 小数点第1位に丸める
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// 補助種目データ（Excelから抽出、4週サイクルで繰り返す）
function getAccessories(week: number): AccessoryExercise[] {
  // Week 4,8,12 はディロード週 → 軽めの補助
  const isDeload = week % 4 === 0;

  if (isDeload) {
    return [
      { dayLabel: "月曜", category: "胸", name: "ダンベルフライ", reps: 20, sets: 2 },
      { dayLabel: "月曜", category: "三頭", name: "ローププッシュダウン", reps: 20, sets: 2 },
      { dayLabel: "水曜", category: "背中", name: "ラットプルダウン", reps: 20, sets: 2 },
      { dayLabel: "水曜", category: "肩", name: "ダンベルサイドレイズ", reps: 20, sets: 2 },
      { dayLabel: "金曜", category: "三頭", name: "ケーブルプッシュダウン", reps: 20, sets: 2 },
      { dayLabel: "金曜", category: "胸", name: "ケーブルフライ", reps: 20, sets: 2 },
    ];
  }

  // 通常週: サイクル内の週番号 (1,2,3)
  const cycleWeek = ((week - 1) % 4) + 1; // 1,2,3
  const repsMap: Record<number, number> = { 1: 15, 2: 12, 3: 10 };
  const setsMap: Record<number, number> = { 1: 2, 2: 3, 3: 4 };
  const r = repsMap[cycleWeek] ?? 15;
  const s = setsMap[cycleWeek] ?? 2;

  return [
    { dayLabel: "月曜", category: "胸", name: "ダンベルプレス", reps: r, sets: s },
    { dayLabel: "月曜", category: "三頭", name: "ケーブルプッシュダウン", reps: r + 5, sets: s },
    { dayLabel: "水曜", category: "背中", name: "ラットプルダウン", reps: r, sets: s },
    { dayLabel: "水曜", category: "背中", name: "ダンベルワンハンドロウ", reps: r + 3, sets: s },
    { dayLabel: "水曜", category: "肩", name: "バーベルフロントレイズ", reps: r + 5, sets: s },
    { dayLabel: "水曜", category: "肩", name: "バーベルフェイスプル", reps: r + 5, sets: s },
    { dayLabel: "金曜", category: "三頭", name: "ダンベルローリングエクステンション", reps: r, sets: s },
    { dayLabel: "金曜", category: "三頭", name: "ケーブルプッシュダウン", reps: r + 5, sets: s },
    { dayLabel: "金曜", category: "胸", name: "ダンベルフライ", reps: r, sets: s },
    { dayLabel: "金曜", category: "胸", name: "ケーブルフライ", reps: r + 5, sets: s },
  ];
}

export function generateProgram(
  benchMax: number,
  pauseMax: number, // 2秒止めMAX
  legsUpMax: number // 足上げMAX
): WeekProgram[] {
  const weeks: WeekProgram[] = [];

  // e1RM tracking across weeks (referenced by later weeks)
  // We store the e1RM for key exercises from each week
  interface E1RMTracker {
    [key: string]: number;
  }
  const e1rms: E1RMTracker = {};

  // ===== WEEK 1 =====
  {
    const w1d1_bench_w = round1(benchMax * 0.83);
    const w1d1_bench_e = calcE1RM(w1d1_bench_w, 5, 8);
    const w1d1_pause_w = round1(pauseMax * 0.8);
    const w1d1_pause_e = calcE1RM(w1d1_pause_w, 5, 7);

    const w1d2_bench_w = round1(w1d1_bench_e * 0.83);
    const w1d2_legs_w = round1(legsUpMax * 0.775);
    const w1d2_legs_e = calcE1RM(w1d2_legs_w, 8, 8);

    const w1d3_bench1_w = round1(w1d1_bench_e * 0.9);
    const w1d3_bench1_e = calcE1RM(w1d3_bench1_w, 3, 9);
    const w1d3_bench2_w = round1(w1d3_bench1_e * 0.8);
    const w1d3_bench2_e = calcE1RM(w1d3_bench2_w, 6, 8);

    e1rms["w1_bench"] = w1d1_bench_e;
    e1rms["w1_pause"] = w1d1_pause_e;
    e1rms["w1_legs"] = w1d2_legs_e;
    e1rms["w1_d3_bench1"] = w1d3_bench1_e;
    e1rms["w1_d3_bench2"] = w1d3_bench2_e;

    weeks.push({
      week: 1,
      days: [
        {
          day: 1,
          exercises: [
            { exercise: "ベンチプレス", weight: w1d1_bench_w, reps: 5, sets: 3, rpe: 8, e1rm: round1(w1d1_bench_e) },
            { exercise: "2秒止め", weight: w1d1_pause_w, reps: 5, sets: 3, rpe: 7, e1rm: round1(w1d1_pause_e) },
          ],
        },
        {
          day: 2,
          exercises: [
            { exercise: "ベンチプレス", weight: round1(w1d2_bench_w), reps: 1, sets: 3, rpe: null, e1rm: null },
            { exercise: "足上げ", weight: w1d2_legs_w, reps: 8, sets: 3, rpe: 8, e1rm: round1(w1d2_legs_e) },
          ],
        },
        {
          day: 3,
          exercises: [
            { exercise: "ベンチプレス", weight: w1d3_bench1_w, reps: 3, sets: 3, rpe: 9, e1rm: round1(w1d3_bench1_e) },
            { exercise: "ベンチプレス", weight: w1d3_bench2_w, reps: 6, sets: 3, rpe: 8, e1rm: round1(w1d3_bench2_e) },
          ],
        },
      ],
      accessories: getAccessories(1),
    });
  }

  // ===== WEEK 2 =====
  {
    const w2d1_pause_w = round1(e1rms["w1_pause"] * 0.84);
    const w2d1_pause_e = calcE1RM(w2d1_pause_w, 5, 8);
    const w2d1_legs_w = round1(e1rms["w1_legs"] * 0.81);
    const w2d1_legs_e = calcE1RM(w2d1_legs_w, 5, 7);

    const w2d2_bench_w = round1(e1rms["w1_d3_bench1"] * 0.825);
    const w2d2_bench2_w = round1(e1rms["w1_d3_bench2"] * 0.775);
    const w2d2_bench2_e = calcE1RM(w2d2_bench2_w, 8, 8);

    const w2d3_legs_w = round1(w2d1_legs_e * 0.915);
    const w2d3_legs_e = calcE1RM(w2d3_legs_w, 2, 9);
    const w2d3_bench_w = round1(w2d2_bench2_e * 0.81);
    const w2d3_bench_e = calcE1RM(w2d3_bench_w, 6, 8);

    e1rms["w2_pause"] = w2d1_pause_e;
    e1rms["w2_legs"] = w2d1_legs_e;
    e1rms["w2_d2_bench2"] = w2d2_bench2_e;
    e1rms["w2_d3_legs"] = w2d3_legs_e;
    e1rms["w2_d3_bench"] = w2d3_bench_e;

    weeks.push({
      week: 2,
      days: [
        {
          day: 1,
          exercises: [
            { exercise: "2秒止め", weight: w2d1_pause_w, reps: 5, sets: 4, rpe: 8, e1rm: round1(w2d1_pause_e) },
            { exercise: "足上げ", weight: w2d1_legs_w, reps: 5, sets: 4, rpe: 7, e1rm: round1(w2d1_legs_e) },
          ],
        },
        {
          day: 2,
          exercises: [
            { exercise: "ベンチプレス", weight: w2d2_bench_w, reps: 1, sets: 3, rpe: null, e1rm: null },
            { exercise: "ベンチプレス", weight: w2d2_bench2_w, reps: 8, sets: 3, rpe: 8, e1rm: round1(w2d2_bench2_e) },
          ],
        },
        {
          day: 3,
          exercises: [
            { exercise: "足上げ", weight: w2d3_legs_w, reps: 2, sets: 3, rpe: 9, e1rm: round1(w2d3_legs_e) },
            { exercise: "ベンチプレス", weight: w2d3_bench_w, reps: 6, sets: 3, rpe: 8, e1rm: round1(w2d3_bench_e) },
          ],
        },
      ],
      accessories: getAccessories(2),
    });
  }

  // ===== WEEK 3 =====
  {
    const w3d1_legs_w = round1(e1rms["w2_d3_legs"] * 0.845);
    const w3d1_legs_e = calcE1RM(w3d1_legs_w, 5, 8.5);
    const w3d1_bench_w = round1(e1rms["w2_d3_bench"] * 0.81);
    const w3d1_bench_e = calcE1RM(w3d1_bench_w, 5, 7);

    const w3d2_bench_w = round1(w3d1_bench_e * 0.825);
    const w3d2_pause_w = round1(e1rms["w2_pause"] * 0.795);
    const w3d2_pause_e = calcE1RM(w3d2_pause_w, 8, 9);

    const w3d3_bench1_w = round1(w3d1_bench_e * 0.95);
    const w3d3_bench1_e = calcE1RM(w3d3_bench1_w, 1, 9);
    const w3d3_pause_w = round1(w3d2_pause_e * 0.81);
    const w3d3_pause_e = calcE1RM(w3d3_pause_w, 6, 8);

    e1rms["w3_legs"] = w3d1_legs_e;
    e1rms["w3_bench"] = w3d1_bench_e;
    e1rms["w3_pause"] = w3d2_pause_e;
    e1rms["w3_d3_bench1"] = w3d3_bench1_e;
    e1rms["w3_d3_pause"] = w3d3_pause_e;

    weeks.push({
      week: 3,
      days: [
        {
          day: 1,
          exercises: [
            { exercise: "足上げ", weight: w3d1_legs_w, reps: 5, sets: 4, rpe: 8.5, e1rm: round1(w3d1_legs_e) },
            { exercise: "ベンチプレス", weight: w3d1_bench_w, reps: 5, sets: 5, rpe: 7, e1rm: round1(w3d1_bench_e) },
          ],
        },
        {
          day: 2,
          exercises: [
            { exercise: "ベンチプレス", weight: w3d2_bench_w, reps: 1, sets: 3, rpe: null, e1rm: null },
            { exercise: "2秒止め", weight: w3d2_pause_w, reps: 8, sets: 3, rpe: 9, e1rm: round1(w3d2_pause_e) },
          ],
        },
        {
          day: 3,
          exercises: [
            { exercise: "ベンチプレス", weight: w3d3_bench1_w, reps: 1, sets: 3, rpe: 9, e1rm: round1(w3d3_bench1_e) },
            { exercise: "2秒止め", weight: w3d3_pause_w, reps: 6, sets: 4, rpe: 8, e1rm: round1(w3d3_pause_e) },
          ],
        },
      ],
      accessories: getAccessories(3),
    });
  }

  // ===== WEEK 4 (ディロード) =====
  {
    const w4d1_bench_w = round1(e1rms["w3_d3_bench1"] * 0.96);
    const w4d1_bench_e = calcE1RM(w4d1_bench_w, 1, 9.5);
    const w4d1_pause_w = round1(e1rms["w3_d3_pause"] * 0.81);
    const w4d1_pause_e = calcE1RM(w4d1_pause_w, 5, 7);

    const w4d2_bench_w = round1(w4d1_bench_e * 0.825);
    const w4d2_legs_w = round1(e1rms["w3_legs"] * 0.81);
    const w4d2_legs_e = calcE1RM(w4d2_legs_w, 5, 7);

    const w4d3_bench_w = round1(w4d1_bench_e);
    const w4d3_bench_e = w4d1_bench_e; // RPE 10, e1RM = weight itself

    e1rms["w4_bench"] = w4d1_bench_e;
    e1rms["w4_pause"] = w4d1_pause_e;
    e1rms["w4_legs"] = w4d2_legs_e;
    e1rms["w4_d3_bench"] = w4d3_bench_e;

    weeks.push({
      week: 4,
      days: [
        {
          day: 1,
          exercises: [
            { exercise: "ベンチプレス", weight: w4d1_bench_w, reps: 1, sets: 1, rpe: 9.5, e1rm: round1(w4d1_bench_e) },
            { exercise: "2秒止め", weight: w4d1_pause_w, reps: 5, sets: 5, rpe: 7, e1rm: round1(w4d1_pause_e) },
          ],
        },
        {
          day: 2,
          exercises: [
            { exercise: "ベンチプレス", weight: w4d2_bench_w, reps: 1, sets: 3, rpe: null, e1rm: null },
            { exercise: "足上げ", weight: w4d2_legs_w, reps: 5, sets: 5, rpe: 7, e1rm: round1(w4d2_legs_e) },
          ],
        },
        {
          day: 3,
          exercises: [
            { exercise: "ベンチプレス", weight: w4d3_bench_w, reps: 1, sets: 1, rpe: 10, e1rm: round1(w4d3_bench_e) },
          ],
        },
      ],
      accessories: getAccessories(4),
    });
  }

  // ===== WEEK 5 =====
  {
    const w5d1_bench_w = round1(e1rms["w4_d3_bench"] * 0.82);
    const w5d1_bench_e = calcE1RM(w5d1_bench_w, 4, 7);
    const w5d1_pause_w = round1(e1rms["w4_pause"] * 0.81);
    const w5d1_pause_e = calcE1RM(w5d1_pause_w, 4, 6);

    const w5d2_bench_w = round1(w5d1_bench_e * 0.825);
    const w5d2_legs_w = round1(e1rms["w4_legs"] * 0.795);
    const w5d2_legs_e = calcE1RM(w5d2_legs_w, 6, 7);

    const w5d3_bench1_w = round1(w5d1_bench_e * 0.93);
    const w5d3_bench1_e = calcE1RM(w5d3_bench1_w, 2, 9);
    const w5d3_bench2_w = round1(w5d3_bench1_e * 0.8);
    const w5d3_bench2_e = calcE1RM(w5d3_bench2_w, 6, 8);

    e1rms["w5_bench"] = w5d1_bench_e;
    e1rms["w5_pause"] = w5d1_pause_e;
    e1rms["w5_legs"] = w5d2_legs_e;
    e1rms["w5_d3_bench1"] = w5d3_bench1_e;
    e1rms["w5_d3_bench2"] = w5d3_bench2_e;

    weeks.push({
      week: 5,
      days: [
        {
          day: 1,
          exercises: [
            { exercise: "ベンチプレス", weight: w5d1_bench_w, reps: 4, sets: 2, rpe: 7, e1rm: round1(w5d1_bench_e) },
            { exercise: "2秒止め", weight: w5d1_pause_w, reps: 4, sets: 2, rpe: 6, e1rm: round1(w5d1_pause_e) },
          ],
        },
        {
          day: 2,
          exercises: [
            { exercise: "ベンチプレス", weight: w5d2_bench_w, reps: 1, sets: 3, rpe: null, e1rm: null },
            { exercise: "足上げ", weight: w5d2_legs_w, reps: 6, sets: 3, rpe: 7, e1rm: round1(w5d2_legs_e) },
          ],
        },
        {
          day: 3,
          exercises: [
            { exercise: "ベンチプレス", weight: w5d3_bench1_w, reps: 2, sets: 3, rpe: 9, e1rm: round1(w5d3_bench1_e) },
            { exercise: "ベンチプレス", weight: w5d3_bench2_w, reps: 6, sets: 3, rpe: 8, e1rm: round1(w5d3_bench2_e) },
          ],
        },
      ],
      accessories: getAccessories(5),
    });
  }

  // ===== WEEK 6 =====
  {
    const w6d1_pause_w = round1(e1rms["w5_pause"] * 0.86);
    const w6d1_pause_e = calcE1RM(w6d1_pause_w, 4, 8);
    const w6d1_legs_w = round1(e1rms["w5_legs"] * 0.825);
    const w6d1_legs_e = calcE1RM(w6d1_legs_w, 4, 7);

    const w6d2_bench_w = round1(e1rms["w5_d3_bench2"] * 0.825);
    const w6d2_bench2_w = round1(e1rms["w5_d3_bench2"] * 0.81);
    const w6d2_bench2_e = calcE1RM(w6d2_bench2_w, 6, 8);

    const w6d3_legs_w = round1(w6d1_legs_e * 0.925);
    const w6d3_legs_e = calcE1RM(w6d3_legs_w, 2, 9);
    const w6d3_bench_w = round1(w6d2_bench2_e * 0.83);
    const w6d3_bench_e = calcE1RM(w6d3_bench_w, 5, 8);

    e1rms["w6_pause"] = w6d1_pause_e;
    e1rms["w6_legs"] = w6d1_legs_e;
    e1rms["w6_d2_bench2"] = w6d2_bench2_e;
    e1rms["w6_d3_legs"] = w6d3_legs_e;
    e1rms["w6_d3_bench"] = w6d3_bench_e;

    weeks.push({
      week: 6,
      days: [
        {
          day: 1,
          exercises: [
            { exercise: "2秒止め", weight: w6d1_pause_w, reps: 4, sets: 4, rpe: 8, e1rm: round1(w6d1_pause_e) },
            { exercise: "足上げ", weight: w6d1_legs_w, reps: 4, sets: 4, rpe: 7, e1rm: round1(w6d1_legs_e) },
          ],
        },
        {
          day: 2,
          exercises: [
            { exercise: "ベンチプレス", weight: w6d2_bench_w, reps: 1, sets: 3, rpe: null, e1rm: null },
            { exercise: "ベンチプレス", weight: w6d2_bench2_w, reps: 6, sets: 4, rpe: 8, e1rm: round1(w6d2_bench2_e) },
          ],
        },
        {
          day: 3,
          exercises: [
            { exercise: "足上げ", weight: w6d3_legs_w, reps: 2, sets: 3, rpe: 9, e1rm: round1(w6d3_legs_e) },
            { exercise: "ベンチプレス", weight: w6d3_bench_w, reps: 5, sets: 4, rpe: 8, e1rm: round1(w6d3_bench_e) },
          ],
        },
      ],
      accessories: getAccessories(6),
    });
  }

  // ===== WEEK 7 =====
  {
    const w7d1_legs_w = round1(e1rms["w6_d3_legs"] * 0.86);
    const w7d1_legs_e = calcE1RM(w7d1_legs_w, 4, 8.5);
    const w7d1_bench_w = round1(e1rms["w6_d3_bench"] * 0.825);
    const w7d1_bench_e = calcE1RM(w7d1_bench_w, 4, 7);

    const w7d2_bench_w = round1(e1rms["w6_d3_bench"] * 0.825);
    const w7d2_pause_w = round1(e1rms["w6_pause"] * 0.825);
    const w7d2_pause_e = calcE1RM(w7d2_pause_w, 6, 9);

    const w7d3_pause1_w = round1(w7d2_pause_e * 0.95);
    const w7d3_pause1_e = calcE1RM(w7d3_pause1_w, 1, 9);
    const w7d3_pause2_w = round1(w7d2_pause_e * 0.85);
    const w7d3_pause2_e = calcE1RM(w7d3_pause2_w, 4, 8);

    e1rms["w7_legs"] = w7d1_legs_e;
    e1rms["w7_bench"] = w7d1_bench_e;
    e1rms["w7_pause"] = w7d2_pause_e;
    e1rms["w7_d3_pause1"] = w7d3_pause1_e;
    e1rms["w7_d3_pause2"] = w7d3_pause2_e;

    weeks.push({
      week: 7,
      days: [
        {
          day: 1,
          exercises: [
            { exercise: "足上げ", weight: w7d1_legs_w, reps: 4, sets: 5, rpe: 8.5, e1rm: round1(w7d1_legs_e) },
            { exercise: "ベンチプレス", weight: w7d1_bench_w, reps: 4, sets: 6, rpe: 7, e1rm: round1(w7d1_bench_e) },
          ],
        },
        {
          day: 2,
          exercises: [
            { exercise: "ベンチプレス", weight: w7d2_bench_w, reps: 1, sets: 3, rpe: null, e1rm: null },
            { exercise: "2秒止め", weight: w7d2_pause_w, reps: 6, sets: 5, rpe: 9, e1rm: round1(w7d2_pause_e) },
          ],
        },
        {
          day: 3,
          exercises: [
            { exercise: "2秒止め", weight: w7d3_pause1_w, reps: 1, sets: 3, rpe: 9, e1rm: round1(w7d3_pause1_e) },
            { exercise: "2秒止め", weight: w7d3_pause2_w, reps: 4, sets: 5, rpe: 8, e1rm: round1(w7d3_pause2_e) },
          ],
        },
      ],
      accessories: getAccessories(7),
    });
  }

  // ===== WEEK 8 (ディロード) =====
  {
    const w8d1_pause_w = round1(e1rms["w7_d3_pause2"]);
    const w8d1_pause_e = e1rms["w7_d3_pause2"]; // RPE 10
    const w8d1_bench_w = round1(e1rms["w7_bench"] * 0.825);
    const w8d1_bench_e = calcE1RM(w8d1_bench_w, 4, 7);

    const w8d2_bench_w = round1(w8d1_bench_e * 0.825);
    const w8d2_legs_w = round1(e1rms["w7_legs"] * 0.81);
    const w8d2_legs_e = calcE1RM(w8d2_legs_w, 5, 7);

    const w8d3_bench_w = round1(w8d1_bench_e * 1.01);
    const w8d3_bench_e = w8d3_bench_w; // RPE 10

    e1rms["w8_pause"] = w8d1_pause_e;
    e1rms["w8_bench"] = w8d1_bench_e;
    e1rms["w8_legs"] = w8d2_legs_e;
    e1rms["w8_d3_bench"] = w8d3_bench_e;

    weeks.push({
      week: 8,
      days: [
        {
          day: 1,
          exercises: [
            { exercise: "2秒止め", weight: w8d1_pause_w, reps: 1, sets: 1, rpe: 10, e1rm: round1(w8d1_pause_e) },
            { exercise: "ベンチプレス", weight: w8d1_bench_w, reps: 4, sets: 5, rpe: 7, e1rm: round1(w8d1_bench_e) },
          ],
        },
        {
          day: 2,
          exercises: [
            { exercise: "ベンチプレス", weight: w8d2_bench_w, reps: 1, sets: 3, rpe: null, e1rm: null },
            { exercise: "足上げ", weight: w8d2_legs_w, reps: 5, sets: 5, rpe: 7, e1rm: round1(w8d2_legs_e) },
          ],
        },
        {
          day: 3,
          exercises: [
            { exercise: "ベンチプレス", weight: w8d3_bench_w, reps: 1, sets: 1, rpe: 10, e1rm: round1(w8d3_bench_e) },
          ],
        },
      ],
      accessories: getAccessories(8),
    });
  }

  // ===== WEEK 9 =====
  {
    const w9d1_bench_w = round1(e1rms["w8_d3_bench"] * 0.825);
    const w9d1_bench_e = calcE1RM(w9d1_bench_w, 4, 7);
    const w9d1_pause_w = round1(e1rms["w7_d3_pause2"] * 0.83);
    const w9d1_pause_e = calcE1RM(w9d1_pause_w, 4, 7);

    const w9d2_bench_w = round1(w9d1_bench_e * 0.825);
    const w9d2_bench2_w = round1(w9d1_bench_e * 0.755);
    const w9d2_bench2_e = calcE1RM(w9d2_bench2_w, 8, 7);

    const w9d3_legs_w = round1(e1rms["w8_legs"] * 0.91);
    const w9d3_legs_e = calcE1RM(w9d3_legs_w, 1, 7);
    const w9d3_bench_w = round1(w9d2_bench2_e * 0.81);
    const w9d3_bench_e = calcE1RM(w9d3_bench_w, 6, 8);

    e1rms["w9_bench"] = w9d1_bench_e;
    e1rms["w9_pause"] = w9d1_pause_e;
    e1rms["w9_legs"] = w9d3_legs_e;
    e1rms["w9_d2_bench2"] = w9d2_bench2_e;
    e1rms["w9_d3_bench"] = w9d3_bench_e;

    weeks.push({
      week: 9,
      days: [
        {
          day: 1,
          exercises: [
            { exercise: "ベンチプレス", weight: w9d1_bench_w, reps: 4, sets: 4, rpe: 7, e1rm: round1(w9d1_bench_e) },
            { exercise: "2秒止め", weight: w9d1_pause_w, reps: 4, sets: 4, rpe: 7, e1rm: round1(w9d1_pause_e) },
          ],
        },
        {
          day: 2,
          exercises: [
            { exercise: "ベンチプレス", weight: w9d2_bench_w, reps: 1, sets: 3, rpe: null, e1rm: null },
            { exercise: "ベンチプレス", weight: w9d2_bench2_w, reps: 8, sets: 4, rpe: 7, e1rm: round1(w9d2_bench2_e) },
          ],
        },
        {
          day: 3,
          exercises: [
            { exercise: "足上げ", weight: w9d3_legs_w, reps: 1, sets: 3, rpe: 7, e1rm: round1(w9d3_legs_e) },
            { exercise: "ベンチプレス", weight: w9d3_bench_w, reps: 6, sets: 4, rpe: 8, e1rm: round1(w9d3_bench_e) },
          ],
        },
      ],
      accessories: getAccessories(9),
    });
  }

  // ===== WEEK 10 =====
  {
    const w10d1_pause_w = round1(e1rms["w9_pause"] * 0.86);
    const w10d1_pause_e = calcE1RM(w10d1_pause_w, 4, 8);
    const w10d1_legs_w = round1(e1rms["w9_legs"] * 0.825);
    const w10d1_legs_e = calcE1RM(w10d1_legs_w, 4, 7);

    const w10d2_bench_w = round1(e1rms["w9_d2_bench2"] * 0.825);
    const w10d2_bench2_w = round1(e1rms["w9_d3_bench"] * 0.8);
    const w10d2_bench2_e = calcE1RM(w10d2_bench2_w, 6, 8);

    const w10d3_bench1_w = round1(w10d2_bench2_e * 0.93);
    const w10d3_bench1_e = calcE1RM(w10d3_bench1_w, 2, 9);
    const w10d3_bench2_w = round1(w10d2_bench2_e * 0.835);
    const w10d3_bench2_e = calcE1RM(w10d3_bench2_w, 5, 8);

    e1rms["w10_pause"] = w10d1_pause_e;
    e1rms["w10_legs"] = w10d1_legs_e;
    e1rms["w10_d2_bench2"] = w10d2_bench2_e;
    e1rms["w10_d3_bench1"] = w10d3_bench1_e;
    e1rms["w10_d3_bench2"] = w10d3_bench2_e;

    weeks.push({
      week: 10,
      days: [
        {
          day: 1,
          exercises: [
            { exercise: "2秒止め", weight: w10d1_pause_w, reps: 4, sets: 5, rpe: 8, e1rm: round1(w10d1_pause_e) },
            { exercise: "足上げ", weight: w10d1_legs_w, reps: 4, sets: 6, rpe: 7, e1rm: round1(w10d1_legs_e) },
          ],
        },
        {
          day: 2,
          exercises: [
            { exercise: "ベンチプレス", weight: w10d2_bench_w, reps: 1, sets: 3, rpe: null, e1rm: null },
            { exercise: "ベンチプレス", weight: w10d2_bench2_w, reps: 6, sets: 5, rpe: 8, e1rm: round1(w10d2_bench2_e) },
          ],
        },
        {
          day: 3,
          exercises: [
            { exercise: "ベンチプレス", weight: w10d3_bench1_w, reps: 2, sets: 3, rpe: 9, e1rm: round1(w10d3_bench1_e) },
            { exercise: "ベンチプレス", weight: w10d3_bench2_w, reps: 5, sets: 4, rpe: 8, e1rm: round1(w10d3_bench2_e) },
          ],
        },
      ],
      accessories: getAccessories(10),
    });
  }

  // ===== WEEK 11 =====
  {
    const w11d1_legs_w = round1(e1rms["w10_legs"] * 0.86);
    const w11d1_legs_e = calcE1RM(w11d1_legs_w, 4, 8.5);
    const w11d1_bench_w = round1(e1rms["w10_d3_bench2"] * 0.83);
    const w11d1_bench_e = calcE1RM(w11d1_bench_w, 4, 7);

    const w11d2_bench_w = round1(e1rms["w10_d2_bench2"] * 0.825);
    const w11d2_pause_w = round1(e1rms["w10_pause"] * 0.845);
    const w11d2_pause_e = calcE1RM(w11d2_pause_w, 5, 9);

    const w11d3_bench1_w = round1(w11d1_bench_e * 0.95);
    const w11d3_bench1_e = calcE1RM(w11d3_bench1_w, 1, 9);
    const w11d3_pause_w = round1(w11d2_pause_e * 0.85);
    const w11d3_pause_e = calcE1RM(w11d3_pause_w, 4, 8);

    e1rms["w11_legs"] = w11d1_legs_e;
    e1rms["w11_bench"] = w11d1_bench_e;
    e1rms["w11_pause"] = w11d2_pause_e;
    e1rms["w11_d3_bench1"] = w11d3_bench1_e;
    e1rms["w11_d3_pause"] = w11d3_pause_e;

    weeks.push({
      week: 11,
      days: [
        {
          day: 1,
          exercises: [
            { exercise: "足上げ", weight: w11d1_legs_w, reps: 4, sets: 6, rpe: 8.5, e1rm: round1(w11d1_legs_e) },
            { exercise: "ベンチプレス", weight: w11d1_bench_w, reps: 4, sets: 6, rpe: 7, e1rm: round1(w11d1_bench_e) },
          ],
        },
        {
          day: 2,
          exercises: [
            { exercise: "ベンチプレス", weight: w11d2_bench_w, reps: 1, sets: 3, rpe: null, e1rm: null },
            { exercise: "2秒止め", weight: w11d2_pause_w, reps: 5, sets: 5, rpe: 9, e1rm: round1(w11d2_pause_e) },
          ],
        },
        {
          day: 3,
          exercises: [
            { exercise: "ベンチプレス", weight: w11d3_bench1_w, reps: 1, sets: 3, rpe: 9, e1rm: round1(w11d3_bench1_e) },
            { exercise: "2秒止め", weight: w11d3_pause_w, reps: 4, sets: 5, rpe: 8, e1rm: round1(w11d3_pause_e) },
          ],
        },
      ],
      accessories: getAccessories(11),
    });
  }

  // ===== WEEK 12 (最終ディロード + テスト) =====
  {
    const w12d1_pause_w = round1(e1rms["w11_d3_pause"]);
    const w12d1_pause_e = e1rms["w11_d3_pause"]; // RPE 10
    const w12d1_bench_w = round1(e1rms["w11_d3_bench1"] * 0.825);
    const w12d1_bench_e = calcE1RM(w12d1_bench_w, 4, 7);

    const w12d2_bench_w = round1(w12d1_bench_e * 0.825);
    const w12d2_legs_w = round1(e1rms["w11_legs"] * 0.815);
    const w12d2_legs_e = calcE1RM(w12d2_legs_w, 5, 7);

    const w12d3_bench_w = round1(w12d1_bench_e * 1.01);
    const w12d3_bench_e = w12d3_bench_w; // RPE 10

    weeks.push({
      week: 12,
      days: [
        {
          day: 1,
          exercises: [
            { exercise: "2秒止め", weight: w12d1_pause_w, reps: 1, sets: 1, rpe: 10, e1rm: round1(w12d1_pause_e) },
            { exercise: "ベンチプレス", weight: w12d1_bench_w, reps: 4, sets: 5, rpe: 7, e1rm: round1(w12d1_bench_e) },
          ],
        },
        {
          day: 2,
          exercises: [
            { exercise: "ベンチプレス", weight: w12d2_bench_w, reps: 1, sets: 3, rpe: null, e1rm: null },
            { exercise: "足上げ", weight: w12d2_legs_w, reps: 5, sets: 5, rpe: 7, e1rm: round1(w12d2_legs_e) },
          ],
        },
        {
          day: 3,
          exercises: [
            { exercise: "ベンチプレス", weight: w12d3_bench_w, reps: 1, sets: 1, rpe: 10, e1rm: round1(w12d3_bench_e) },
          ],
        },
      ],
      accessories: getAccessories(12),
    });
  }

  return weeks;
}
