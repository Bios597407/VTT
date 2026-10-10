// Common domain types for "NỀ NẾP LỚP 10 – VTT PRO"
// Trường THPT Võ Trường Toản - Lớp 10A16 (2026-2027)

export type RoleType = 'gvcn' | 'lop_truong' | 'lop_pho' | 'to_truong' | 'hoc_sinh';

export type ConductLevel = 'Tốt' | 'Khá' | 'Đạt' | 'Chưa đạt' | 'Chờ xác nhận quy tắc làm tròn/ngưỡng';

export type AttendanceStatus =
  | 'present'
  | 'absence_pending_verification'
  | 'permitted_absence'
  | 'unpermitted_absence'
  | 'late'
  | 'truancy'
  | 'permitted_early_leave'
  | 'unauthorized_early_leave';

export interface Student {
  id: string;
  student_code: string; // e.g. "10A16.01"
  full_name: string;
  first_name: string; // Tên (e.g. Anh, Bảo)
  last_name: string;  // Họ và tên đệm (e.g. Trần Đức, Lê Thiên)
  class_id: string;
  is_demo: boolean;
  avatar_url?: string;
  group_id?: string;
  seat_number?: string;
  status: 'active' | 'suspended' | 'transferred' | 'deferred';
  created_at?: string;
}

export interface Group {
  id: string;
  class_id: string;
  group_number: number; // 1, 2, 3, 4
  group_name: string;
  leader_student_id?: string;
}

export interface Seat {
  id: string;
  class_id: string;
  row_number: number;
  col_number: number;
  table_number: number;
  student_id?: string;
}

export type IncidentStatus = 'draft' | 'pending_verification' | 'approved' | 'rejected' | 'more_info_needed';
export type ScoreEffectStatus = 'none' | 'pending_rule' | 'confirmed_effect' | 'waived';

export interface Incident {
  id: string;
  canonical_id?: string; // If this is a report linked to a canonical incident
  student_id: string;
  class_id: string;
  conduct_code: string | null; // "01" .. "24" or null for "Sự việc khác"
  is_other_category: boolean; // Software safety category "Sự việc khác — chờ xem xét"
  other_category_description?: string;
  date: string; // YYYY-MM-DD
  session: 'morning' | 'afternoon';
  period?: number;
  time?: string;
  teacher_permission?: boolean; // Required question for Phone V24 and food/sale V15
  incident_status: IncidentStatus;
  score_effect_status: ScoreEffectStatus;
  base_deduction: number; // e.g. -2, -4, -6 or 0
  effective_deduction: number; // official deducted points (0 if pending_rule or not approved)
  reported_by: string;
  reporter_role: string;
  witnesses?: string;
  notes?: string;
  duplicate_warning?: boolean;
  linked_report_ids?: string[];
  evidence_urls?: string[];
  gvcn_comment?: string;
  created_at: string;
}

export interface RewardRecord {
  id: string;
  student_id: string;
  class_id: string;
  reward_code: 'RW01' | 'RW02' | 'RW03' | 'RW04';
  title: string;
  points: number; // +1 or +2
  status: 'pending' | 'approved' | 'rejected';
  proposer: string;
  approver?: string;
  evidence_url?: string;
  date: string;
  month_id?: string;
  duplicate_warning?: boolean;
  created_at: string;
}

export interface PositiveNote {
  id: string;
  student_id: string;
  class_id: string;
  teacher_name: string;
  note_content: string;
  date: string;
  category: 'academic' | 'discipline' | 'helping_others' | 'sports_arts' | 'general';
  created_at: string;
}

export interface Task {
  id: string;
  class_id: string;
  title: string;
  description: string;
  assigned_to_type: 'student' | 'group' | 'all';
  assigned_student_ids: string[];
  due_date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'late' | 'not_completed' | 'cancelled';
  created_by: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  date: string;
  session: 'morning' | 'afternoon';
  status: AttendanceStatus;
  arrival_time?: string;
  reason?: string;
  evidence_url?: string;
  is_legitimate_exception: boolean; // hospital, family bereavement, IELTS, competency exam
  exception_reason?: string;
  vnedu_ref_number?: string;
  linked_incident_id?: string;
}

export interface PendingRule {
  code: string; // PENDING-01 .. PENDING-09
  title: string;
  ambiguity: string;
  source_reference: string;
  options: { id: string; label: string; description: string }[];
  selected_option: string | null;
  basis: string | null;
  effective_from: string | null;
  effective_to: string | null;
  status: 'unresolved' | 'confirmed_by_gvcn';
  configured_by?: string;
  confirmed_by?: string;
}

export interface WeekScoreSnapshot {
  id: string;
  student_id: string;
  week_id: string;
  week_number: number;
  revision_no: number;
  is_current: boolean;
  raw_week_score: number | null;
  official_week_score: number | null;
  reward_points: number;
  deduction_points: number;
  incidents_count: number;
  rewards_count: number;
  status: 'draft' | 'calculated' | 'locked';
  calculated_at?: string;
}

export interface MonthScoreSnapshot {
  id: string;
  student_id: string;
  month_id: string;
  month_number: number;
  revision_no: number;
  is_current: boolean;
  average_score: number | null;
  status: 'draft' | 'calculated' | 'locked';
  weeks_included: number;
}

export interface SemesterScoreSnapshot {
  id: string;
  student_id: string;
  semester_id: string; // 'HK1' | 'HK2'
  revision_no: number;
  is_current: boolean;
  calculated_numeric_score: number | null;
  suggested_level: ConductLevel;
  permitted_absences: number;
  unpermitted_absences: number;
  phone_violations_count: number;
  attendance_cap_applied: boolean;
  phone_cap_applied: boolean;
  finalized_level?: ConductLevel;
  gvcn_rationale?: string;
  teacher_comment?: string;
  status: 'draft' | 'calculated' | 'finalized' | 'locked';
}

export interface AnnualResult {
  id: string;
  student_id: string;
  academic_year_id: string;
  revision_no: number;
  is_current: boolean;
  hk1_level: ConductLevel;
  hk2_level: ConductLevel;
  annual_level: ConductLevel;
  status: 'draft' | 'finalized' | 'locked';
  finalized_at?: string;
  finalized_by?: string;
}

export interface SeatingPlan {
  id: string;
  name: string; // e.g. "Sơ đồ Tháng 9", "Sơ đồ Tháng 10 - Xoay bàn", "Sơ đồ Kiểm tra Định kỳ"
  created_at: string;
  updated_at: string;
  seats: Seat[];
}

export interface DutyRosterDay {
  dayOfWeek: 'thu2' | 'thu3' | 'thu4' | 'thu5' | 'thu6' | 'thu7';
  dayLabel: string; // "Thứ 2", "Thứ 3", etc.
  assignedGroupId: string; // 'group-01', 'group-02', 'group-03', 'group-04'
  groupName: string; // 'Tổ 1', 'Tổ 2', etc.
  leaderStudentId?: string; // Tổ trưởng/Nhóm trưởng phụ trách
  cleaners?: string[]; // IDs học sinh quét dọn/đổ rác
  boardCleaners?: string[]; // IDs học sinh lau bảng/giặt giẻ
  deskArrangers?: string[]; // IDs học sinh kê bàn ghế/đóng cửa
  status?: 'pending' | 'completed_good' | 'completed_ok' | 'needs_improvement';
  notes?: string;
}

export interface AuditLog {
  id: string;
  actor_name: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_value?: string;
  after_value?: string;
  reason?: string;
  timestamp: string;
}

export interface QualitativeComment {
  id: string;
  studentId: string;
  author: string;
  authorRole?: string;
  category: 'teacher' | 'self' | 'group' | 'parent';
  content: string;
  date: string;
  created_at?: string;
}

export interface SupportPlan {
  id: string;
  studentId: string;
  objective: string;
  plan: string;
  status: 'Đang thực hiện' | 'Hoàn thành' | 'Cần điều chỉnh' | 'Tạm dừng';
  teacher_name?: string;
  date?: string;
  created_at?: string;
}

