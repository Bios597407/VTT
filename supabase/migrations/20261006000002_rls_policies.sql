-- ROW LEVEL SECURITY (RLS) POLICIES
-- Class-scoped authorization derived strictly from class_memberships & class_role_assignments
-- Never trust browser-provided role or student_id.

-- Helper functions
CREATE OR REPLACE FUNCTION auth.get_user_class_role(target_class_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role TEXT;
BEGIN
  SELECT cra.role INTO v_role
  FROM class_role_assignments cra
  JOIN class_memberships cm ON cra.membership_id = cm.id
  WHERE cm.user_id = auth.uid()
    AND cm.class_id = target_class_id
    AND cm.is_active = true
    AND cra.is_active = true
    AND cra.effective_from <= NOW()
    AND (cra.effective_to IS NULL OR cra.effective_to > NOW())
  LIMIT 1;

  RETURN v_role;
END;
$$;

CREATE OR REPLACE FUNCTION auth.get_user_student_id(target_class_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_student_id TEXT;
BEGIN
  SELECT cm.student_id INTO v_student_id
  FROM class_memberships cm
  WHERE cm.user_id = auth.uid()
    AND cm.class_id = target_class_id
    AND cm.is_active = true
  LIMIT 1;

  RETURN v_student_id;
END;
$$;

-- Enable RLS on core tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_score_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_score_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE semester_score_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE semester_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE annual_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_pending_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE qualitative_comments ENABLE ROW LEVEL SECURITY;

-- 1. Students Table Policy
CREATE POLICY "GVCN and Officers can view class students"
  ON students FOR SELECT
  USING (
    auth.get_user_class_role(class_id) IN ('gvcn', 'lop_truong', 'lop_pho', 'to_truong')
    OR id = auth.get_user_student_id(class_id)
  );

CREATE POLICY "Only GVCN can insert/update students"
  ON students FOR ALL
  USING (auth.get_user_class_role(class_id) = 'gvcn')
  WITH CHECK (auth.get_user_class_role(class_id) = 'gvcn');

-- 2. Incidents Policy
CREATE POLICY "View incidents policy"
  ON incidents FOR SELECT
  USING (
    auth.get_user_class_role(class_id) IN ('gvcn', 'lop_truong', 'lop_pho')
    OR (auth.get_user_class_role(class_id) = 'to_truong')
    OR student_id = auth.get_user_student_id(class_id)
  );

CREATE POLICY "Create incidents policy"
  ON incidents FOR INSERT
  WITH CHECK (
    auth.get_user_class_role(class_id) IN ('gvcn', 'lop_truong', 'lop_pho', 'to_truong')
  );

CREATE POLICY "Only GVCN can update/approve incidents"
  ON incidents FOR UPDATE
  USING (auth.get_user_class_role(class_id) = 'gvcn')
  WITH CHECK (auth.get_user_class_role(class_id) = 'gvcn');

-- 3. Rewards Policy
CREATE POLICY "View rewards policy"
  ON reward_records FOR SELECT
  USING (
    auth.get_user_class_role(class_id) IN ('gvcn', 'lop_truong', 'lop_pho', 'to_truong')
    OR student_id = auth.get_user_student_id(class_id)
  );

CREATE POLICY "Propose rewards"
  ON reward_records FOR INSERT
  WITH CHECK (
    auth.get_user_class_role(class_id) IN ('gvcn', 'lop_truong', 'lop_pho', 'to_truong')
  );

CREATE POLICY "Only GVCN approves rewards"
  ON reward_records FOR UPDATE
  USING (auth.get_user_class_role(class_id) = 'gvcn')
  WITH CHECK (auth.get_user_class_role(class_id) = 'gvcn');

-- 4. Score Snapshots Policies
-- Students can only see their own scores. Student A cannot read Student B.
CREATE POLICY "Student views own weekly scores"
  ON weekly_score_snapshots FOR SELECT
  USING (
    student_id = auth.get_user_student_id((SELECT class_id FROM students WHERE id = weekly_score_snapshots.student_id))
    OR auth.get_user_class_role((SELECT class_id FROM students WHERE id = weekly_score_snapshots.student_id)) = 'gvcn'
  );

CREATE POLICY "Student views own semester scores"
  ON semester_score_snapshots FOR SELECT
  USING (
    student_id = auth.get_user_student_id((SELECT class_id FROM students WHERE id = semester_score_snapshots.student_id))
    OR auth.get_user_class_role((SELECT class_id FROM students WHERE id = semester_score_snapshots.student_id)) = 'gvcn'
  );

-- 5. Audit Log: Append-only for all, no normal user can update or delete
CREATE POLICY "Audit logs insert only"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Only GVCN views audit logs"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM class_role_assignments cra
      JOIN class_memberships cm ON cra.membership_id = cm.id
      WHERE cm.user_id = auth.uid() AND cra.role = 'gvcn' AND cra.is_active = true
    )
  );
-- No UPDATE or DELETE policies on audit_logs!
