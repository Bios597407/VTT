-- SCHEMA MIGRATION: NỀ NẾP LỚP 10 – VTT PRO
-- THPT VÕ TRƯỜNG TOẢN - LỚP 10A16 (2026-2027)
-- All constraints comply with non-cascading historical provenance rules.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 1. Profiles & Core Academic Structure
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE academic_years (
  id TEXT PRIMARY KEY, -- e.g. 'ay-2026-2027'
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE classes (
  id TEXT PRIMARY KEY, -- e.g. 'class-10a16'
  name TEXT NOT NULL,
  grade INT NOT NULL DEFAULT 10,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  gvcn_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  group_number INT NOT NULL,
  group_name TEXT NOT NULL,
  leader_student_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(class_id, group_number)
);

CREATE TABLE students (
  id TEXT PRIMARY KEY,
  student_code TEXT UNIQUE NOT NULL, -- e.g. '10A16.01'
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  avatar_url TEXT,
  group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
  seat_number TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'transferred', 'deferred')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE guardians (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  relationship TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Class Memberships & Authoritative Role Assignments
CREATE TABLE class_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, class_id)
);

CREATE TABLE class_role_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  membership_id UUID NOT NULL REFERENCES class_memberships(id) ON DELETE RESTRICT,
  role TEXT NOT NULL CHECK (role IN ('gvcn', 'lop_truong', 'lop_pho', 'to_truong', 'hoc_sinh')),
  group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_to TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE group_membership_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE seats (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  row_number INT NOT NULL,
  col_number INT NOT NULL,
  table_number INT NOT NULL,
  student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE seat_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seat_id TEXT NOT NULL REFERENCES seats(id) ON DELETE RESTRICT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Calendar: Semesters, Months, Weeks, Periods
CREATE TABLE semesters (
  id TEXT PRIMARY KEY, -- 'HK1', 'HK2'
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL
);

CREATE TABLE months (
  id TEXT PRIMARY KEY, -- 'M09-2026', 'M10-2026'
  semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
  month_number INT NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL
);

CREATE TABLE weeks (
  id TEXT PRIMARY KEY, -- 'W01', 'W02'
  semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
  week_number INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT false
);

-- Resolution: Global vs class-specific override
CREATE TABLE week_month_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_id TEXT NOT NULL REFERENCES weeks(id) ON DELETE RESTRICT,
  month_id TEXT NOT NULL REFERENCES months(id) ON DELETE RESTRICT,
  class_id TEXT REFERENCES classes(id) ON DELETE RESTRICT, -- NULL for global assignment
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE school_sessions (
  id TEXT PRIMARY KEY, -- 'morning', 'afternoon'
  name TEXT NOT NULL,
  session_start_time TIME NOT NULL, -- 06:45 or 12:45
  late_threshold_time TIME NOT NULL, -- 06:50 or 12:50
  session_end_time TIME NOT NULL -- 10:40 or 16:40
);

CREATE TABLE school_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id TEXT NOT NULL REFERENCES school_sessions(id) ON DELETE RESTRICT,
  period_number INT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

-- 3. Attendance Records
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  date DATE NOT NULL,
  session_id TEXT NOT NULL REFERENCES school_sessions(id) ON DELETE RESTRICT,
  status TEXT NOT NULL CHECK (status IN (
    'present',
    'absence_pending_verification',
    'permitted_absence',
    'unpermitted_absence',
    'late',
    'truancy',
    'permitted_early_leave',
    'unauthorized_early_leave'
  )),
  arrival_time TIME,
  reason TEXT,
  evidence_url TEXT,
  is_legitimate_exception BOOLEAN NOT NULL DEFAULT false,
  exception_reason TEXT,
  vnedu_ref_number TEXT,
  linked_incident_id UUID,
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, date, session_id)
);

-- 4. Rules & Catalogs
CREATE TABLE conduct_rule_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_code TEXT UNIQUE NOT NULL,
  document_ref TEXT NOT NULL DEFAULT 'QĐ 525/QĐ-THPT.VTT',
  effective_from DATE NOT NULL,
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE conduct_rule_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id UUID NOT NULL REFERENCES conduct_rule_versions(id) ON DELETE RESTRICT,
  code TEXT NOT NULL CHECK (code ~ '^(0[1-9]|1[0-9]|2[0-4])$'), -- Exactly 01-24
  short_title TEXT NOT NULL,
  description TEXT NOT NULL,
  base_deduction NUMERIC(10,4) NOT NULL, -- -2, -4, or -6
  requires_permission_check BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(version_id, code)
);

CREATE TABLE reward_rule_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_code TEXT UNIQUE NOT NULL,
  document_ref TEXT NOT NULL DEFAULT 'QĐ 525/QĐ-THPT.VTT',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reward_rule_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id UUID NOT NULL REFERENCES reward_rule_versions(id) ON DELETE RESTRICT,
  code TEXT NOT NULL CHECK (code IN ('RW01', 'RW02', 'RW03', 'RW04')),
  title TEXT NOT NULL,
  points NUMERIC(10,4) NOT NULL,
  period_unit TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(version_id, code)
);

-- 9 Pending Unresolved Rules
CREATE TABLE rule_pending_confirmations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  code TEXT NOT NULL, -- PENDING-01 to PENDING-09
  title TEXT NOT NULL,
  ambiguity TEXT NOT NULL,
  source_reference TEXT NOT NULL,
  options JSONB NOT NULL,
  selected_option TEXT,
  basis TEXT,
  effective_range DATERANGE,
  status TEXT NOT NULL DEFAULT 'unresolved' CHECK (status IN ('unresolved', 'confirmed_by_gvcn')),
  configured_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  confirmed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  EXCLUDE USING gist (class_id WITH =, code WITH =, effective_range WITH &&)
);

-- 5. Incidents & Software Safety Category
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_id UUID REFERENCES incidents(id) ON DELETE SET NULL,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  conduct_code TEXT, -- NULL for "Sự việc khác — chờ xem xét"
  is_other_category BOOLEAN NOT NULL DEFAULT false,
  other_category_description TEXT,
  date DATE NOT NULL,
  session_id TEXT NOT NULL REFERENCES school_sessions(id) ON DELETE RESTRICT,
  period_number INT,
  time TIME,
  teacher_permission BOOLEAN, -- Question for V15 & V24
  incident_status TEXT NOT NULL DEFAULT 'pending_verification' CHECK (
    incident_status IN ('draft', 'pending_verification', 'approved', 'rejected', 'more_info_needed')
  ),
  score_effect_status TEXT NOT NULL DEFAULT 'none' CHECK (
    score_effect_status IN ('none', 'pending_rule', 'confirmed_effect', 'waived')
  ),
  base_deduction NUMERIC(10,4) NOT NULL DEFAULT 0,
  effective_deduction NUMERIC(10,4) NOT NULL DEFAULT 0,
  reported_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reporter_name TEXT NOT NULL,
  reporter_role TEXT NOT NULL,
  notes TEXT,
  gvcn_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE incident_evidence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE RESTRICT,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE student_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE RESTRICT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  response_content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE correction_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE RESTRICT,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  proposed_correction TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  resolved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Rewards, Positive Notes, Tasks
CREATE TABLE reward_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  reward_code TEXT NOT NULL CHECK (reward_code IN ('RW01', 'RW02', 'RW03', 'RW04')),
  title TEXT NOT NULL,
  points NUMERIC(10,4) NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  proposer TEXT NOT NULL,
  approver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  evidence_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE positive_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  teacher_name TEXT NOT NULL,
  note_content TEXT NOT NULL,
  date DATE NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'completed', 'late', 'not_completed', 'cancelled')
  ),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE task_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE RESTRICT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  completed_at TIMESTAMPTZ,
  notes TEXT
);

-- 7. Qualitative Feedback & Support Plans
CREATE TABLE self_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  week_id TEXT REFERENCES weeks(id) ON DELETE RESTRICT,
  month_id TEXT REFERENCES months(id) ON DELETE RESTRICT,
  semester_id TEXT REFERENCES semesters(id) ON DELETE RESTRICT,
  content TEXT NOT NULL,
  self_rating TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE group_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE RESTRICT,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  month_id TEXT NOT NULL REFERENCES months(id) ON DELETE RESTRICT,
  review_content TEXT NOT NULL,
  suggested_level TEXT,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE teacher_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
  comment_text TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE parent_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
  guardian_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE qualitative_comments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  author TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'gvcn',
  category TEXT NOT NULL DEFAULT 'teacher',
  content TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE support_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  objective TEXT NOT NULL,
  action_plan TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'discontinued')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Score Calculation Runs & Snapshots
CREATE TABLE score_calculation_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  period_type TEXT NOT NULL CHECK (period_type IN ('week', 'month', 'semester', 'annual')),
  period_id TEXT NOT NULL,
  run_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('started', 'completed', 'failed')),
  summary JSONB
);

-- Weekly Score Snapshots
CREATE TABLE weekly_score_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  week_id TEXT NOT NULL REFERENCES weeks(id) ON DELETE RESTRICT,
  revision_no INT NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  raw_week_score NUMERIC(10,4),
  official_week_score NUMERIC(10,4),
  total_deductions NUMERIC(10,4) NOT NULL DEFAULT 0,
  total_rewards NUMERIC(10,4) NOT NULL DEFAULT 0,
  calculation_run_id UUID NOT NULL REFERENCES score_calculation_runs(id) ON DELETE RESTRICT,
  superseded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, week_id, revision_no)
);
CREATE UNIQUE INDEX idx_weekly_current ON weekly_score_snapshots (student_id, week_id) WHERE is_current = true;

-- Monthly Score Snapshots
CREATE TABLE monthly_score_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  month_id TEXT NOT NULL REFERENCES months(id) ON DELETE RESTRICT,
  revision_no INT NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  average_score NUMERIC(10,4),
  calculation_run_id UUID NOT NULL REFERENCES score_calculation_runs(id) ON DELETE RESTRICT,
  superseded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, month_id, revision_no)
);
CREATE UNIQUE INDEX idx_monthly_current ON monthly_score_snapshots (student_id, month_id) WHERE is_current = true;

-- Semester Score Snapshots
CREATE TABLE semester_score_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
  revision_no INT NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  calculated_numeric_score NUMERIC(10,4),
  suggested_level TEXT NOT NULL,
  permitted_absences INT NOT NULL DEFAULT 0,
  unpermitted_absences INT NOT NULL DEFAULT 0,
  phone_violations_count INT NOT NULL DEFAULT 0,
  attendance_cap_applied BOOLEAN NOT NULL DEFAULT false,
  phone_cap_applied BOOLEAN NOT NULL DEFAULT false,
  calculation_run_id UUID NOT NULL REFERENCES score_calculation_runs(id) ON DELETE RESTRICT,
  superseded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, semester_id, revision_no)
);
CREATE UNIQUE INDEX idx_semester_current ON semester_score_snapshots (student_id, semester_id) WHERE is_current = true;

-- Semester Decision (GVCN Finalized)
CREATE TABLE semester_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  semester_id TEXT NOT NULL REFERENCES semesters(id) ON DELETE RESTRICT,
  revision_no INT NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  finalized_level TEXT NOT NULL CHECK (finalized_level IN ('Tốt', 'Khá', 'Đạt', 'Chưa đạt')),
  gvcn_rationale TEXT NOT NULL,
  finalized_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  finalized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, semester_id, revision_no)
);
CREATE UNIQUE INDEX idx_semester_decision_current ON semester_decisions (student_id, semester_id) WHERE is_current = true;

-- Annual Results (Matrix of Finalized HKI and HKII)
CREATE TABLE annual_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE RESTRICT,
  revision_no INT NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT true,
  hk1_level TEXT NOT NULL,
  hk2_level TEXT NOT NULL,
  annual_level TEXT NOT NULL CHECK (annual_level IN ('Tốt', 'Khá', 'Đạt', 'Chưa đạt')),
  finalized_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  finalized_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, academic_year_id, revision_no)
);
CREATE UNIQUE INDEX idx_annual_current ON annual_results (student_id, academic_year_id) WHERE is_current = true;

-- 9. Period Locks, Events & Audit Logs
CREATE TABLE period_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  period_type TEXT NOT NULL CHECK (period_type IN ('week', 'month', 'semester', 'annual')),
  period_id TEXT NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT false,
  locked_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ,
  UNIQUE(class_id, period_type, period_id)
);

CREATE TABLE period_lock_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_lock_id UUID NOT NULL REFERENCES period_locks(id) ON DELETE RESTRICT,
  action TEXT NOT NULL CHECK (action IN ('lock', 'reopen')),
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  before_value JSONB,
  after_value JSONB,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Imports History
CREATE TABLE imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  import_fingerprint TEXT NOT NULL,
  file_name TEXT NOT NULL,
  total_rows INT NOT NULL,
  successful_rows INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'committed' CHECK (status IN ('validating', 'committed', 'failed')),
  imported_by UUID REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(class_id, import_fingerprint)
);
