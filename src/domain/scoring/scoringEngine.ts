// Core Pure Scoring Engine
// School: THPT Võ Trường Toản - QĐ 525/QĐ-THPT.VTT & Thông tư 22/2021/TT-BGDĐT
// Class: 10A16 (2026-2027)

import { ConductLevel, Incident, RewardRecord } from '../../types';

export interface WeeklyScoreInput {
  baseScore?: number; // default 8
  isCalculated: boolean;
  isFutureWeek?: boolean;
  incidents: Incident[];
  rewards: RewardRecord[];
}

export interface WeeklyScoreResult {
  raw_week_score: number | null;
  official_week_score: number | null;
  total_deductions: number;
  total_rewards: number;
  eligible_incidents_count: number;
  eligible_rewards_count: number;
  explanation: string;
}

/**
 * Maps a YYYY-MM-DD date string to academic week number (1 to 36).
 * School Year 2026-2027 Semester 1 starts on Monday, September 7, 2026.
 */
export function getWeekNumberForDate(dateStr?: string | null): number {
  if (!dateStr || typeof dateStr !== 'string') return 1;
  const cleanDate = dateStr.trim();
  if (!cleanDate) return 1;

  const d = new Date(cleanDate + 'T00:00:00');
  if (isNaN(d.getTime())) return 1;

  // Monday Sep 7, 2026 is Week 1
  const termStart = new Date('2026-09-07T00:00:00');
  const diffMs = d.getTime() - termStart.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 1;
  const weekNum = Math.floor(diffDays / 7) + 1;
  return Math.max(1, Math.min(36, weekNum));
}

export interface WeekDateRange {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  startDateStr: string;  // e.g. "07/09/2026"
  endDateStr: string;    // e.g. "12/09/2026"
  shortRange: string;    // e.g. "07/09 - 12/09"
  noYearRange: string;   // e.g. "7/9 - 12/9"
  optionLabel: string;   // e.g. "Tuần 1 (07/09 - 12/09)"
  fullRangeText: string; // e.g. "Từ ngày 07/09/2026 đến ngày 12/09/2026"
}

export function getWeekDateRange(weekNum: number): WeekDateRange {
  const w = Math.max(1, Math.min(36, weekNum));
  const startMs = new Date(2026, 8, 7).getTime() + (w - 1) * 7 * 24 * 60 * 60 * 1000;
  const startDate = new Date(startMs);
  const endDate = new Date(startMs + 5 * 24 * 60 * 60 * 1000);

  const pad = (n: number) => (n < 10 ? '0' + n : '' + n);

  const sDay = startDate.getDate();
  const sMonth = startDate.getMonth() + 1;
  const sYear = startDate.getFullYear();

  const eDay = endDate.getDate();
  const eMonth = endDate.getMonth() + 1;
  const eYear = endDate.getFullYear();

  const startDateStr = `${pad(sDay)}/${pad(sMonth)}/${sYear}`;
  const endDateStr = `${pad(eDay)}/${pad(eMonth)}/${eYear}`;
  const shortRange = `${pad(sDay)}/${pad(sMonth)} - ${pad(eDay)}/${pad(eMonth)}`;
  const noYearRange = `${sDay}/${sMonth} - ${eDay}/${eMonth}`;
  const optionLabel = `Tuần ${w} (${shortRange})`;
  const fullRangeText = `Từ ngày ${startDateStr} đến ngày ${endDateStr}`;

  return {
    weekNumber: w,
    startDate,
    endDate,
    startDateStr,
    endDateStr,
    shortRange,
    noYearRange,
    optionLabel,
    fullRangeText,
  };
}

export interface StudentWeeklyAttendanceSummary {
  hasAbsence: boolean;
  permittedCount: number;
  unpermittedCount: number;
  lateCount: number;
  displayText: string;
  shortText: string;
  details: string[];
}

export function formatStudentWeeklyAttendance(
  studentId: string,
  weekNum: number,
  attendanceRecords: any[]
): StudentWeeklyAttendanceSummary {
  const weekRecords = (attendanceRecords || []).filter((rec) => {
    if (!rec || rec.student_id !== studentId) return false;
    return getWeekNumberForDate(rec.date) === weekNum;
  });

  const dayLabels: Record<number, string> = {
    1: 'T2',
    2: 'T3',
    3: 'T4',
    4: 'T5',
    5: 'T6',
    6: 'T7',
    0: 'CN',
  };

  let permittedCount = 0;
  let unpermittedCount = 0;
  let lateCount = 0;
  const details: string[] = [];

  for (const rec of weekRecords) {
    if (rec.status === 'present') continue;

    const d = new Date(rec.date + 'T00:00:00');
    const dayName = !isNaN(d.getTime()) ? dayLabels[d.getDay()] || 'T' : 'Ng';

    if (rec.status === 'permitted_absence') {
      permittedCount++;
      details.push(`${dayName} (CP)`);
    } else if (rec.status === 'unpermitted_absence') {
      unpermittedCount++;
      details.push(`${dayName} (KP)`);
    } else if (rec.status === 'absence_pending_verification') {
      permittedCount++;
      details.push(`${dayName} (Chờ CP)`);
    } else if (rec.status === 'late') {
      lateCount++;
      details.push(`${dayName} (Trễ)`);
    } else if (rec.status === 'truancy') {
      unpermittedCount++;
      details.push(`${dayName} (Trốn tiết)`);
    } else if (rec.status === 'permitted_early_leave') {
      permittedCount++;
      details.push(`${dayName} (Về sớm-CP)`);
    } else if (rec.status === 'unauthorized_early_leave') {
      unpermittedCount++;
      details.push(`${dayName} (Về sớm-KP)`);
    }
  }

  const hasAbsence = details.length > 0;
  let shortText = '';
  let displayText = '';

  if (!hasAbsence) {
    shortText = 'Đủ (0 vắng)';
    displayText = '✅ Đủ (0 vắng)';
  } else {
    shortText = `Vắng ${details.join(', ')}`;
    displayText = `⚠️ Vắng ${details.join(', ')}`;
  }

  return {
    hasAbsence,
    permittedCount,
    unpermittedCount,
    lateCount,
    displayText,
    shortText,
    details,
  };
}

/**
 * Calculate weekly conduct score.
 * Base score = 8 points.
 * official_week_score = min(10, max(0, raw_week_score)).
 * Clamp happens exactly ONCE at the end.
 * Pending incidents, rejected incidents, or incidents with score_effect_status = 'pending_rule' contribute 0.
 * Pending rewards contribute 0.
 * Future or uncomputed week returns null.
 */
export function calculateWeeklyScore(input: WeeklyScoreInput): WeeklyScoreResult {
  if (input.isFutureWeek || !input.isCalculated) {
    return {
      raw_week_score: null,
      official_week_score: null,
      total_deductions: 0,
      total_rewards: 0,
      eligible_incidents_count: 0,
      eligible_rewards_count: 0,
      explanation: 'Tuần tương lai hoặc chưa đến kỳ tính điểm',
    };
  }

  const baseScore = input.baseScore ?? 8;

  // Track canonical incidents to prevent duplicate counting
  const processedCanonicalIds = new Set<string>();
  let totalDeductions = 0;
  let eligibleIncidentsCount = 0;

  for (const inc of input.incidents) {
    // Only approved factual incidents can have score effect
    if (inc.incident_status !== 'approved') continue;
    // If score effect status is pending_rule, none, or waived: contributes 0
    if (inc.score_effect_status !== 'confirmed_effect') continue;

    // Check canonical deduplication
    const dedupeKey = inc.canonical_id || inc.id;
    if (processedCanonicalIds.has(dedupeKey)) {
      continue; // raw duplicate report already covered by canonical
    }
    processedCanonicalIds.add(dedupeKey);

    totalDeductions += inc.effective_deduction; // e.g. -2, -4, -6
    eligibleIncidentsCount++;
  }

  // Rewards: only approved rewards affect score
  let totalRewards = 0;
  let eligibleRewardsCount = 0;
  for (const rew of input.rewards) {
    if (rew.status === 'approved') {
      totalRewards += rew.points;
      eligibleRewardsCount++;
    }
  }

  // Calculate raw score without intermediate clamping
  const raw_week_score = baseScore + totalDeductions + totalRewards;

  // Clamp ONCE at the very end to range [0, 10]
  const official_week_score = Math.min(10, Math.max(0, raw_week_score));

  return {
    raw_week_score: Number(raw_week_score.toFixed(4)),
    official_week_score: Number(official_week_score.toFixed(4)),
    total_deductions: totalDeductions,
    total_rewards: totalRewards,
    eligible_incidents_count: eligibleIncidentsCount,
    eligible_rewards_count: eligibleRewardsCount,
    explanation: `Điểm cơ bản (${baseScore}) + Điểm trừ (${totalDeductions}) + Khen thưởng (+${totalRewards}) = ${raw_week_score} -> Điểm chính thức: ${official_week_score}`,
  };
}

/**
 * Monthly score: average of the weekly scores assigned to that month.
 * Does NOT fill missing data with 0 or 8.
 * Returns null if no valid week data exists.
 */
export function calculateMonthlyScore(weeklyScores: (number | null)[]): number | null {
  const validScores = weeklyScores.filter((s): s is number => s !== null && !isNaN(s));
  if (validScores.length === 0) return null;
  const sum = validScores.reduce((acc, score) => acc + score, 0);
  return Number((sum / validScores.length).toFixed(4));
}

/**
 * Semester numeric score: average of the MONTH scores.
 * Do NOT calculate semester by directly averaging every week.
 * Do NOT fill missing data with 0 or 8.
 */
export function calculateSemesterNumericScore(monthScores: (number | null)[]): number | null {
  const validMonths = monthScores.filter((s): s is number => s !== null && !isNaN(s));
  if (validMonths.length === 0) return null;
  const sum = validMonths.reduce((acc, score) => acc + score, 0);
  return Number((sum / validMonths.length).toFixed(4));
}

/**
 * Determine conduct level based on numeric score.
 * Official thresholds:
 * >= 7.0: Tốt
 * 5.5 - 6.9: Khá
 * 4.0 - 5.4: Đạt
 * < 4.0: Chưa đạt
 *
 * CRITICAL RULE:
 * Do NOT invent rounding. 6.95 must NOT automatically become 7.0 or Tốt.
 * If decimal falls between 6.9 and 7.0, 5.4 and 5.5, or 3.9 and 4.0:
 * returns 'Chờ xác nhận quy tắc làm tròn/ngưỡng'
 */
export function determineBaseConductLevel(numericScore: number | null): ConductLevel | 'Chưa đủ dữ liệu' {
  if (numericScore === null) return 'Chưa đủ dữ liệu';

  // Check unresolved decimal gap (e.g. 6.9 < score < 7.0)
  if (numericScore > 6.9 && numericScore < 7.0) {
    return 'Chờ xác nhận quy tắc làm tròn/ngưỡng';
  }
  if (numericScore > 5.4 && numericScore < 5.5) {
    return 'Chờ xác nhận quy tắc làm tròn/ngưỡng';
  }
  if (numericScore > 3.9 && numericScore < 4.0) {
    return 'Chờ xác nhận quy tắc làm tròn/ngưỡng';
  }

  if (numericScore >= 7.0) return 'Tốt';
  if (numericScore >= 5.5) return 'Khá';
  if (numericScore >= 4.0) return 'Đạt';
  return 'Chưa đạt';
}

export interface SemesterEvaluationRestrictions {
  permittedAbsenceCount: number; // excluding confirmed legitimate exceptions
  unpermittedAbsenceCount: number;
  phoneViolationsCount: number; // V24 count
}

/**
 * Apply semester conduct restrictions:
 * - Permitted absence count >= 10: cannot receive Tốt (cap at Khá).
 * - Unpermitted absence count >= 2: cannot receive Tốt (cap at Khá).
 * - Phone violation 2nd occurrence: maximum conduct level is Đạt.
 * - Phone violation 3rd occurrence: conduct level is Chưa đạt.
 */
export function applySemesterRestrictions(
  baseLevel: ConductLevel | 'Chưa đủ dữ liệu',
  restrictions: SemesterEvaluationRestrictions
): {
  finalSuggestedLevel: ConductLevel | 'Chưa đủ dữ liệu';
  attendanceCapApplied: boolean;
  phoneCapApplied: boolean;
  restrictionReasons: string[];
} {
  if (baseLevel === 'Chưa đủ dữ liệu' || baseLevel === 'Chờ xác nhận quy tắc làm tròn/ngưỡng') {
    return {
      finalSuggestedLevel: baseLevel,
      attendanceCapApplied: false,
      phoneCapApplied: false,
      restrictionReasons: [],
    };
  }

  let level: ConductLevel = baseLevel;
  let attendanceCapApplied = false;
  let phoneCapApplied = false;
  const restrictionReasons: string[] = [];

  // Attendance restrictions against 'Tốt'
  if (level === 'Tốt') {
    if (restrictions.permittedAbsenceCount >= 10) {
      level = 'Khá';
      attendanceCapApplied = true;
      restrictionReasons.push(`Nghỉ học có phép >= 10 buổi (${restrictions.permittedAbsenceCount} buổi): không xếp mức Tốt.`);
    }
    if (restrictions.unpermittedAbsenceCount >= 2) {
      level = 'Khá';
      attendanceCapApplied = true;
      restrictionReasons.push(`Nghỉ học không phép >= 2 buổi (${restrictions.unpermittedAbsenceCount} buổi): không xếp mức Tốt.`);
    }
  }

  // Phone violation restrictions
  if (restrictions.phoneViolationsCount === 2) {
    if (level === 'Tốt' || level === 'Khá') {
      level = 'Đạt';
      phoneCapApplied = true;
      restrictionReasons.push('Vi phạm sử dụng điện thoại lần 2: xếp loại học kỳ tối đa ở mức Đạt.');
    }
  } else if (restrictions.phoneViolationsCount >= 3) {
    level = 'Chưa đạt';
    phoneCapApplied = true;
    restrictionReasons.push(`Vi phạm sử dụng điện thoại ${restrictions.phoneViolationsCount} lần: xếp loại học kỳ mức Chưa đạt.`);
  }

  return {
    finalSuggestedLevel: level,
    attendanceCapApplied,
    phoneCapApplied,
    restrictionReasons,
  };
}

/**
 * Official Annual Conduct Matrix (16 combinations)
 * Input: Finalized HKI level and HKII level.
 * Rule from QĐ 525 & Điều 8 Thông tư 22/2021/TT-BGDĐT:
 *
 * TỐT:
 *   HKII = Tốt AND HKI >= Khá (HKI in [Tốt, Khá])
 *
 * KHÁ:
 *   (HKII = Khá AND HKI >= Đạt [Tốt, Khá, Đạt])
 *   OR (HKII = Đạt AND HKI = Tốt)
 *   OR (HKII = Tốt AND HKI in [Đạt, Chưa đạt])
 *
 * ĐẠT:
 *   (HKII = Đạt AND HKI in [Khá, Đạt, Chưa đạt])
 *   OR (HKII = Khá AND HKI = Chưa đạt)
 *
 * CHƯA ĐẠT:
 *   Tất cả trường hợp còn lại (bao gồm HKII = Chưa đạt).
 */
export function calculateAnnualConduct(hk1: ConductLevel, hk2: ConductLevel): ConductLevel {
  // Check unresolved rounding input
  if (hk1 === 'Chờ xác nhận quy tắc làm tròn/ngưỡng' || hk2 === 'Chờ xác nhận quy tắc làm tròn/ngưỡng') {
    return 'Chờ xác nhận quy tắc làm tròn/ngưỡng';
  }

  // TỐT
  if (hk2 === 'Tốt' && (hk1 === 'Tốt' || hk1 === 'Khá')) {
    return 'Tốt';
  }

  // KHÁ
  if (
    (hk2 === 'Khá' && (hk1 === 'Tốt' || hk1 === 'Khá' || hk1 === 'Đạt')) ||
    (hk2 === 'Đạt' && hk1 === 'Tốt') ||
    (hk2 === 'Tốt' && (hk1 === 'Đạt' || hk1 === 'Chưa đạt'))
  ) {
    return 'Khá';
  }

  // ĐẠT
  if (
    (hk2 === 'Đạt' && (hk1 === 'Khá' || hk1 === 'Đạt' || hk1 === 'Chưa đạt')) ||
    (hk2 === 'Khá' && hk1 === 'Chưa đạt')
  ) {
    return 'Đạt';
  }

  // CHƯA ĐẠT: All remaining
  return 'Chưa đạt';
}
