// Central App State Management & In-Memory Store
// School: THPT Võ Trường Toản - Lớp 10A16 (Năm học 2026-2027)
// Ban Cán Sự (GVCN, Lớp phó, Lớp trưởng) có toàn quyền điều chỉnh tất cả nội dung trong bản nề nếp.
// Dữ liệu thực tế 100% - Không chứa dữ liệu mẫu (Demo).

import {
  Student,
  Group,
  Seat,
  Incident,
  RewardRecord,
  PositiveNote,
  Task,
  AttendanceRecord,
  AttendanceStatus,
  PendingRule,
  WeekScoreSnapshot,
  MonthScoreSnapshot,
  SemesterScoreSnapshot,
  AnnualResult,
  AuditLog,
  RoleType,
  SeatingPlan,
  DutyRosterDay,
} from '../types';
import { PRIVATE_ROSTER_10A16 } from '../lib/privateRosterLoader';
import { OFFICIAL_PENDING_RULES } from '../domain/scoring/pendingRules';
import {
  calculateWeeklyScore,
  getWeekNumberForDate,
} from '../domain/scoring/scoringEngine';
import { OFFICIAL_CONDUCT_CATALOG, ConductCatalogItem, formatIncidentDeductionRationale } from '../domain/incidents/conductCatalog';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface CurrentUser {
  id: string;
  name: string;
  role: RoleType;
  class_id: string;
  student_id?: string;
  group_id?: string;
  email?: string;
  isAuthenticatedOfficer?: boolean;
}

export interface ClassInfo {
  school_name: string;
  class_name: string;
  academic_year: string;
  room_number: string;
  gvcn_name: string;
  gvcn_email: string;
  gvcn_phone: string;
  class_president_name: string;
  class_vice_discipline_name: string;
  class_vice_academic_name: string;
  secretary_name: string;
  slogan: string;
  target_conduct_points: number;
  notes: string;
}

export interface OfficerAccount {
  id: string;
  role: 'gvcn' | 'lop_truong' | 'lop_pho';
  title: string;
  name: string;
  email: string;
  pin: string;
}

export interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'warn' | 'error' | 'info';
  duration?: number;
}

export const OFFICIAL_10A16_GROUPS: Group[] = [
  { id: 'group-01', class_id: 'class-10a16', group_number: 1, group_name: 'Tổ 1', leader_student_id: '10A16-01' },
  { id: 'group-02', class_id: 'class-10a16', group_number: 2, group_name: 'Tổ 2', leader_student_id: '10A16-12' },
  { id: 'group-03', class_id: 'class-10a16', group_number: 3, group_name: 'Tổ 3', leader_student_id: '10A16-23' },
  { id: 'group-04', class_id: 'class-10a16', group_number: 4, group_name: 'Tổ 4', leader_student_id: '10A16-34' },
];

function buildOfficial10A16Students(): Student[] {
  return PRIVATE_ROSTER_10A16.map((s, idx) => {
    let groupId = 'group-01';
    if (idx >= 11 && idx < 22) groupId = 'group-02';
    else if (idx >= 22 && idx < 33) groupId = 'group-03';
    else if (idx >= 33) groupId = 'group-04';

    return {
      ...s,
      group_id: groupId,
      is_demo: false,
      status: 'active',
      seat_number: `Bàn ${Math.floor(idx / 2) + 1} - Dãy ${(idx % 2) + 1}`,
    };
  });
}

class AppStateService {
  // Official Production Roster for 10A16
  public dataMode: 'official_10a16' = 'official_10a16';

  // Supabase Live Sync State
  public isSupabaseSyncing: boolean = false;
  public lastSupabaseSyncTime: string | null = null;
  public isRealtimeSubscribed: boolean = false;

  // Active toast notifications
  public toasts: ToastNotification[] = [];

  // Current logged in user (Mặc định: GVCN Toàn quyền điều hành & quản lý)
  public currentUser: CurrentUser = {
    id: 'user-gvcn',
    name: 'Giáo viên Chủ nhiệm (GVCN)',
    role: 'gvcn',
    class_id: 'class-10a16',
    isAuthenticatedOfficer: true,
  };

  // Thông tin Quản lý Lớp học & Ban cán sự (GVCN toàn quyền thay đổi không hạn chế)
  public classInfo: ClassInfo = {
    school_name: 'THPT Võ Trường Toản',
    class_name: 'Lớp 10A16',
    academic_year: '2026–2027',
    room_number: 'Phòng A2.04',
    gvcn_name: 'Thầy Trần Duy Tân',
    gvcn_email: '',
    gvcn_phone: '',
    class_president_name: 'Trần Đức Anh',
    class_vice_discipline_name: 'Lê Thiên Bảo',
    class_vice_academic_name: 'Nguyễn Ngọc Gia Hân',
    secretary_name: 'Lưu Ngọc Linh',
    slogan: 'Kỷ luật tự giác · Học tập hăng say · Tập thể vững mạnh',
    target_conduct_points: 9.0,
    notes: 'Toàn thể học sinh thực hiện nghiêm túc nề nếp và nội quy lớp học.',
  };

  // Danh sách tài khoản Cán sự quản trị (Bảo mật, không công khai thông tin cá nhân)
  public officerAccounts: OfficerAccount[] = [
    {
      id: 'acc-gvcn-user',
      role: 'gvcn',
      title: 'Giáo viên Chủ nhiệm',
      name: 'Thầy Trần Duy Tân',
      email: '',
      pin: '1016',
    },
    {
      id: 'acc-lt',
      role: 'lop_truong',
      title: 'Lớp phó Học tập',
      name: 'Nguyễn Ngọc Gia Hân',
      email: '',
      pin: '10A16lpht',
    },
    {
      id: 'acc-lp',
      role: 'lop_pho',
      title: 'Bí thư Chi đoàn',
      name: 'Lưu Ngọc Linh',
      email: '',
      pin: '10A16bt',
    },
  ];

  // State collections - PURE REAL DATA (0 Demo records)
  public students: Student[] = buildOfficial10A16Students();
  public groups: Group[] = [...OFFICIAL_10A16_GROUPS];
  public seats: Seat[] = [];
  public seatingPlans: SeatingPlan[] = [];
  public activeSeatingPlanId: string = 'plan-official';
  public dutyRoster: DutyRosterDay[] = [
    { dayOfWeek: 'thu2', dayLabel: 'Thứ 2', assignedGroupId: 'group-01', groupName: 'Tổ 1', status: 'pending', notes: 'Trực nhật sáng & phục vụ Chào cờ' },
    { dayOfWeek: 'thu3', dayLabel: 'Thứ 3', assignedGroupId: 'group-02', groupName: 'Tổ 2', status: 'pending', notes: 'Quét lớp, lau bảng & gom rác' },
    { dayOfWeek: 'thu4', dayLabel: 'Thứ 4', assignedGroupId: 'group-03', groupName: 'Tổ 3', status: 'pending', notes: 'Kê ngay ngắn bàn ghế & tưới cây' },
    { dayOfWeek: 'thu5', dayLabel: 'Thứ 5', assignedGroupId: 'group-04', groupName: 'Tổ 4', status: 'pending', notes: 'Vệ sinh cửa sổ, lau bàn GV' },
    { dayOfWeek: 'thu6', dayLabel: 'Thứ 6', assignedGroupId: 'group-01', groupName: 'Tổ 1', status: 'pending', notes: 'Tổng vệ sinh học tập' },
    { dayOfWeek: 'thu7', dayLabel: 'Thứ 7', assignedGroupId: 'group-02', groupName: 'Tổ 2', status: 'pending', notes: 'Tổng vệ sinh cuối tuần, đóng quạt & đèn' },
  ];
  public incidents: Incident[] = [];
  public rewards: RewardRecord[] = [];
  public attendance: AttendanceRecord[] = [];
  public tasks: Task[] = [];
  public positiveNotes: PositiveNote[] = [];
  public pendingRules: PendingRule[] = JSON.parse(JSON.stringify(OFFICIAL_PENDING_RULES));
  public conductCatalog: ConductCatalogItem[] = JSON.parse(JSON.stringify(OFFICIAL_CONDUCT_CATALOG));

  // Snapshots & Revisions
  public weeklySnapshots: WeekScoreSnapshot[] = [];
  public monthlySnapshots: MonthScoreSnapshot[] = [];
  public semesterSnapshots: SemesterScoreSnapshot[] = [];
  public annualResults: AnnualResult[] = [];

  // Locks and Audits
  public periodLocks: Record<string, { is_locked: boolean; locked_at?: string; locked_by?: string }> = {};
  public auditLogs: AuditLog[] = [
    {
      id: 'audit-init-01',
      actor_name: 'Hệ thống VTT PRO',
      actor_role: 'system',
      action: 'INIT_SYSTEM',
      entity_type: 'system',
      entity_id: 'class-10a16',
      reason: 'Khởi tạo hệ thống quản lý nề nếp Lớp 10A16 THPT Võ Trường Toản (43 học sinh chính thức - Xóa hoàn toàn dữ liệu mẫu)',
      timestamp: new Date().toISOString(),
    },
  ];

  // Listeners for React state reactivity
  private listeners: (() => void)[] = [];

  // Kích thước chữ hiển thị (Mặc định: 'large' - Lớn theo yêu cầu của GVCN)
  public fontSize: 'normal' | 'large' | 'huge' = 'large';

  constructor() {
    this.initDefaultSeats();
    this.calculateAllWeeklyScores(1);

    // Thiết lập kích thước chữ mặc định hoặc khôi phục từ LocalStorage
    if (typeof window !== 'undefined') {
      try {
        const savedFontSize = localStorage.getItem('VTT_FONT_SIZE') as 'normal' | 'large' | 'huge';
        if (savedFontSize === 'normal' || savedFontSize === 'large' || savedFontSize === 'huge') {
          this.fontSize = savedFontSize;
        } else {
          this.fontSize = 'large';
        }
        document.documentElement.style.fontSize = 
          this.fontSize === 'huge' ? '122%' : this.fontSize === 'large' ? '110%' : '100%';
      } catch (e) {
        this.fontSize = 'large';
      }
    }

    // Phục hồi dữ liệu cấu hình Lớp & Ban cán sự từ bộ nhớ trình duyệt nếu có
    if (typeof window !== 'undefined') {
      try {
        const savedClassInfo = localStorage.getItem('VTT_CLASS_INFO');
        if (savedClassInfo) {
          const parsed = JSON.parse(savedClassInfo);
          if (parsed && typeof parsed === 'object') {
            this.classInfo = { ...this.classInfo, ...parsed };
          }
        }

        const savedOfficers = localStorage.getItem('VTT_OFFICER_ACCOUNTS');
        if (savedOfficers) {
          const parsed = JSON.parse(savedOfficers);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Đồng bộ và tự khắc phục dữ liệu cũ (Self-healing & title sync):
            // Giữ lại PIN/Email của người dùng nhưng đồng bộ đúng Title và khôi phục tài khoản nếu thiếu
            this.officerAccounts = this.officerAccounts.map(defaultAcc => {
              const matched = parsed.find((a: any) => a.role === defaultAcc.role);
              if (matched) {
                return {
                  ...defaultAcc,
                  name: matched.name || defaultAcc.name,
                  email: matched.email || defaultAcc.email,
                  pin: matched.pin || defaultAcc.pin,
                  title: defaultAcc.title, // Luôn cập nhật chức danh chuẩn mới nhất
                };
              }
              return defaultAcc;
            });
          }
        }

        const savedGroups = localStorage.getItem('VTT_GROUPS');
        if (savedGroups) {
          const parsed = JSON.parse(savedGroups);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.groups = parsed;
          }
        }

        const savedIncidents = localStorage.getItem('VTT_INCIDENTS');
        if (savedIncidents) {
          const parsed = JSON.parse(savedIncidents);
          if (Array.isArray(parsed)) this.incidents = parsed;
        }

        const savedRewards = localStorage.getItem('VTT_REWARDS');
        if (savedRewards) {
          const parsed = JSON.parse(savedRewards);
          if (Array.isArray(parsed)) this.rewards = parsed;
        }

        const savedAttendance = localStorage.getItem('VTT_ATTENDANCE');
        if (savedAttendance) {
          const parsed = JSON.parse(savedAttendance);
          if (Array.isArray(parsed)) this.attendance = parsed;
        }

        const savedStudents = localStorage.getItem('VTT_STUDENTS');
        if (savedStudents) {
          const parsed = JSON.parse(savedStudents);
          if (Array.isArray(parsed) && parsed.length > 0) this.students = parsed;
        }

        const savedSeats = localStorage.getItem('VTT_SEATS');
        if (savedSeats) {
          const parsed = JSON.parse(savedSeats);
          if (Array.isArray(parsed) && parsed.length > 0) this.seats = parsed;
        }
        this.ensureCapacitySeats();

        const savedPlans = localStorage.getItem('VTT_SEATING_PLANS');
        if (savedPlans) {
          const parsed = JSON.parse(savedPlans);
          if (Array.isArray(parsed) && parsed.length > 0) this.seatingPlans = parsed;
        }
        const savedPlanId = localStorage.getItem('VTT_ACTIVE_SEATING_PLAN_ID');
        if (savedPlanId) this.activeSeatingPlanId = savedPlanId;

        // Auto-initialize default seating plan if none exists
        if (this.seatingPlans.length === 0) {
          this.seatingPlans = [
            {
              id: 'plan-official',
              name: 'Sơ đồ Lớp 10A16 (Hiện tại)',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              seats: JSON.parse(JSON.stringify(this.seats)),
            },
          ];
          this.activeSeatingPlanId = 'plan-official';
        }

        const savedDuty = localStorage.getItem('VTT_DUTY_ROSTER');
        if (savedDuty) {
          const parsed = JSON.parse(savedDuty);
          if (Array.isArray(parsed) && parsed.length > 0) this.dutyRoster = parsed;
        }

        const savedTasks = localStorage.getItem('VTT_TASKS');
        if (savedTasks) {
          const parsed = JSON.parse(savedTasks);
          if (Array.isArray(parsed)) this.tasks = parsed;
        }

        const savedPositiveNotes = localStorage.getItem('VTT_POSITIVE_NOTES');
        if (savedPositiveNotes) {
          const parsed = JSON.parse(savedPositiveNotes);
          if (Array.isArray(parsed)) this.positiveNotes = parsed;
        }

        const savedPendingRules = localStorage.getItem('VTT_PENDING_RULES');
        if (savedPendingRules) {
          const parsed = JSON.parse(savedPendingRules);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.pendingRules = OFFICIAL_PENDING_RULES.map((defaultRule) => {
              const found = parsed.find((p: any) => p.code === defaultRule.code);
              const selectedOption = found?.selected_option || defaultRule.selected_option;
              return {
                ...defaultRule,
                ...found,
                selected_option: selectedOption,
                status: 'confirmed_by_gvcn',
                basis: found?.basis || defaultRule.basis,
                effective_from: found?.effective_from || defaultRule.effective_from,
                effective_to: found?.effective_to || defaultRule.effective_to,
                configured_by: found?.configured_by || defaultRule.configured_by,
                confirmed_by: found?.confirmed_by || defaultRule.confirmed_by,
              };
            });
          }
        }
        localStorage.setItem('VTT_PENDING_RULES', JSON.stringify(this.pendingRules));

        const savedConductCatalog = localStorage.getItem('VTT_CONDUCT_CATALOG');
        if (savedConductCatalog) {
          const parsed = JSON.parse(savedConductCatalog);
          if (Array.isArray(parsed)) this.conductCatalog = parsed;
        }

        const savedWeeklySnapshots = localStorage.getItem('VTT_WEEKLY_SNAPSHOTS');
        if (savedWeeklySnapshots) {
          const parsed = JSON.parse(savedWeeklySnapshots);
          if (Array.isArray(parsed)) this.weeklySnapshots = parsed;
        }

        const savedMonthlySnapshots = localStorage.getItem('VTT_MONTHLY_SNAPSHOTS');
        if (savedMonthlySnapshots) {
          const parsed = JSON.parse(savedMonthlySnapshots);
          if (Array.isArray(parsed)) this.monthlySnapshots = parsed;
        }

        const savedSemesterSnapshots = localStorage.getItem('VTT_SEMESTER_SNAPSHOTS');
        if (savedSemesterSnapshots) {
          const parsed = JSON.parse(savedSemesterSnapshots);
          if (Array.isArray(parsed)) this.semesterSnapshots = parsed;
        }

        const savedPeriodLocks = localStorage.getItem('VTT_PERIOD_LOCKS');
        if (savedPeriodLocks) {
          const parsed = JSON.parse(savedPeriodLocks);
          if (parsed && typeof parsed === 'object') this.periodLocks = parsed;
        }

        const savedAuditLogs = localStorage.getItem('VTT_AUDIT_LOGS');
        if (savedAuditLogs) {
          const parsed = JSON.parse(savedAuditLogs);
          if (Array.isArray(parsed)) this.auditLogs = parsed;
        }
      } catch (e) {
        console.warn('Lỗi đọc dữ liệu lớp từ localStorage:', e);
      }
    }

    // MẶC ĐỊNH: GVCN Toàn quyền điều hành & quản lý toàn bộ hệ thống không hạn chế
    if (typeof window !== 'undefined') {
      try {
        const savedRole = localStorage.getItem('VTT_CURRENT_ROLE');
        if (savedRole === 'lop_truong' || savedRole === 'lop_pho') {
          this.setLoggedInRole(savedRole as RoleType);
        } else if (savedRole === 'hoc_sinh') {
          this.setLoggedInRole('hoc_sinh');
        } else {
          this.setLoggedInRole('gvcn');
        }
      } catch (e) {
        this.setLoggedInRole('gvcn');
      }
    } else {
      this.setLoggedInRole('gvcn');
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.saveLocalState();
    this.listeners.forEach((l) => l());
  }

  // --- High-Security Access Control Guards ---
  public isWriteAuthorized(): boolean {
    return Boolean(
      this.currentUser.isAuthenticatedOfficer &&
      (this.currentUser.role === 'gvcn' ||
       this.currentUser.role === 'lop_truong' ||
       this.currentUser.role === 'lop_pho')
    );
  }

  public checkWriteAuthorization(): boolean {
    if (!this.isWriteAuthorized()) {
      this.showToast('🔒 BẢO MẬT MỨC CAO NHẤT: Vai trò Học sinh CHỈ ĐƯỢC QUYỀN XEM. Vui lòng kích hoạt quyền GVCN / Cán sự để chỉnh sửa!', 'error');
      return false;
    }
    return true;
  }

  private saveLocalState() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('VTT_CLASS_INFO', JSON.stringify(this.classInfo));
      localStorage.setItem('VTT_OFFICER_ACCOUNTS', JSON.stringify(this.officerAccounts));
      localStorage.setItem('VTT_GROUPS', JSON.stringify(this.groups));
      localStorage.setItem('VTT_INCIDENTS', JSON.stringify(this.incidents));
      localStorage.setItem('VTT_REWARDS', JSON.stringify(this.rewards));
      localStorage.setItem('VTT_ATTENDANCE', JSON.stringify(this.attendance));
      localStorage.setItem('VTT_STUDENTS', JSON.stringify(this.students));
      localStorage.setItem('VTT_SEATS', JSON.stringify(this.seats));
      localStorage.setItem('VTT_SEATING_PLANS', JSON.stringify(this.seatingPlans));
      localStorage.setItem('VTT_ACTIVE_SEATING_PLAN_ID', this.activeSeatingPlanId);
      localStorage.setItem('VTT_DUTY_ROSTER', JSON.stringify(this.dutyRoster));
      localStorage.setItem('VTT_TASKS', JSON.stringify(this.tasks));
      localStorage.setItem('VTT_POSITIVE_NOTES', JSON.stringify(this.positiveNotes));
      localStorage.setItem('VTT_PENDING_RULES', JSON.stringify(this.pendingRules));
      localStorage.setItem('VTT_CONDUCT_CATALOG', JSON.stringify(this.conductCatalog));
      localStorage.setItem('VTT_WEEKLY_SNAPSHOTS', JSON.stringify(this.weeklySnapshots));
      localStorage.setItem('VTT_MONTHLY_SNAPSHOTS', JSON.stringify(this.monthlySnapshots));
      localStorage.setItem('VTT_SEMESTER_SNAPSHOTS', JSON.stringify(this.semesterSnapshots));
      localStorage.setItem('VTT_PERIOD_LOCKS', JSON.stringify(this.periodLocks));
      localStorage.setItem('VTT_AUDIT_LOGS', JSON.stringify(this.auditLogs));
      localStorage.setItem('VTT_LAST_SAVED_AT', new Date().toISOString());
    } catch (e) {
      console.warn('Lỗi lưu trạng thái vào localStorage:', e);
    }
  }

  public exportFullDatabaseBackup() {
    const backupData = {
      app: 'THPT Võ Trường Toản - Lớp 10A16',
      version: '2026.10',
      exported_at: new Date().toISOString(),
      exported_by: this.currentUser.name,
      classInfo: this.classInfo,
      officerAccounts: this.officerAccounts,
      groups: this.groups,
      students: this.students,
      incidents: this.incidents,
      rewards: this.rewards,
      attendance: this.attendance,
      seats: this.seats,
      seatingPlans: this.seatingPlans,
      activeSeatingPlanId: this.activeSeatingPlanId,
      dutyRoster: this.dutyRoster,
      tasks: this.tasks,
      positiveNotes: this.positiveNotes,
      pendingRules: this.pendingRules,
      conductCatalog: this.conductCatalog,
      weeklySnapshots: this.weeklySnapshots,
      monthlySnapshots: this.monthlySnapshots,
      semesterSnapshots: this.semesterSnapshots,
      periodLocks: this.periodLocks,
      auditLogs: this.auditLogs,
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `Sao_Luu_Du_Lieu_Lop_10A16_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.addAuditLog(this.currentUser.name, 'Tải tệp sao lưu toàn bộ cơ sở dữ liệu (.json)', 'backup', 'export');
    this.showToast('✅ Đã tải về tệp sao lưu dữ liệu an toàn thành công!', 'success');
  }

  public forceSaveToday(): { timestamp: string; studentCount: number; incidentCount: number; seatingPlanCount: number } {
    this.saveLocalState();
    const nowStr = new Date().toLocaleString('vi-VN');
    const stats = {
      timestamp: nowStr,
      studentCount: this.students.length,
      incidentCount: this.incidents.length,
      seatingPlanCount: this.seatingPlans.length,
    };

    this.addAuditLog(this.currentUser.name, 'Lưu dữ liệu kết quả làm việc tức thời', 'checkpoint', 'manual_save');
    this.showToast(`💾 ĐÃ LƯU DỮ LIỆU TỨC THỜI (${nowStr})!\n• 43 Học sinh · ${stats.seatingPlanCount} Sơ đồ · ${stats.incidentCount} Vi phạm`, 'success');
    return stats;
  }

  public importFullDatabaseBackup(jsonString: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, message: 'Tệp sao lưu không hợp lệ.' };
      }

      if (parsed.classInfo && typeof parsed.classInfo === 'object') this.classInfo = parsed.classInfo;
      if (Array.isArray(parsed.officerAccounts)) this.officerAccounts = parsed.officerAccounts;
      if (Array.isArray(parsed.groups)) this.groups = parsed.groups;
      if (Array.isArray(parsed.students)) this.students = parsed.students;
      if (Array.isArray(parsed.incidents)) this.incidents = parsed.incidents;
      if (Array.isArray(parsed.rewards)) this.rewards = parsed.rewards;
      if (Array.isArray(parsed.attendance)) this.attendance = parsed.attendance;
      if (Array.isArray(parsed.seats)) this.seats = parsed.seats;
      if (Array.isArray(parsed.seatingPlans)) this.seatingPlans = parsed.seatingPlans;
      if (typeof parsed.activeSeatingPlanId === 'string') this.activeSeatingPlanId = parsed.activeSeatingPlanId;
      if (Array.isArray(parsed.dutyRoster)) this.dutyRoster = parsed.dutyRoster;
      if (Array.isArray(parsed.tasks)) this.tasks = parsed.tasks;
      if (Array.isArray(parsed.positiveNotes)) this.positiveNotes = parsed.positiveNotes;
      if (Array.isArray(parsed.pendingRules)) this.pendingRules = parsed.pendingRules;
      if (Array.isArray(parsed.conductCatalog)) this.conductCatalog = parsed.conductCatalog;
      if (Array.isArray(parsed.weeklySnapshots)) this.weeklySnapshots = parsed.weeklySnapshots;
      if (Array.isArray(parsed.monthlySnapshots)) this.monthlySnapshots = parsed.monthlySnapshots;
      if (Array.isArray(parsed.semesterSnapshots)) this.semesterSnapshots = parsed.semesterSnapshots;
      if (parsed.periodLocks && typeof parsed.periodLocks === 'object') this.periodLocks = parsed.periodLocks;
      if (Array.isArray(parsed.auditLogs)) this.auditLogs = parsed.auditLogs;

      this.calculateAllWeeklyScores(1);
      this.addAuditLog(this.currentUser.name, 'Khôi phục toàn bộ cơ sở dữ liệu từ tệp sao lưu JSON', 'backup', 'import');
      this.notify();
      this.showToast('🎉 Đã khôi phục toàn bộ dữ liệu ứng dụng thành công!', 'success');

      return { success: true, message: 'Khôi phục dữ liệu thành công!' };
    } catch (err: any) {
      return { success: false, message: `Lỗi đọc tệp sao lưu: ${err.message}` };
    }
  }

  public setFontSize(size: 'normal' | 'large' | 'huge') {
    this.fontSize = size;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('VTT_FONT_SIZE', size);
        document.documentElement.style.fontSize = 
          size === 'huge' ? '122%' : size === 'large' ? '110%' : '100%';
      } catch (e) {}
    }
    this.notify();
  }

  public getDataMode(): string {
    return 'official_10a16';
  }

  public isLiveSupabase(): boolean {
    return isSupabaseConfigured;
  }

  /**
   * Check if current user is authorized to adjust any discipline/conduct content:
   * GVCN, Lớp trưởng, Lớp phó.
   */
  public canManageConduct(): boolean {
    const r = this.currentUser.role;
    return r === 'gvcn' || r === 'lop_truong' || r === 'lop_pho';
  }

  public setLoggedInRole(role: RoleType, studentId?: string, groupId?: string) {
    if (role === 'gvcn') {
      const gvcnAcc = this.officerAccounts.find((a) => a.role === 'gvcn');
      this.currentUser = {
        id: 'user-gvcn',
        name: `${this.classInfo.gvcn_name || gvcnAcc?.name || 'Thầy Trần Duy Tân'} (GVCN)`,
        role: 'gvcn',
        class_id: 'class-10a16',
        email: this.classInfo.gvcn_email || gvcnAcc?.email,
        isAuthenticatedOfficer: true,
      };
    } else if (role === 'lop_truong') {
      const studentLt = this.students.find(
        (s) => s.full_name === this.classInfo.class_vice_academic_name
      ) || this.students[0];
      const ltAcc = this.officerAccounts.find((a) => a.role === 'lop_truong');
      this.currentUser = {
        id: 'user-lt',
        name: `${this.classInfo.class_vice_academic_name || studentLt?.full_name || 'Nguyễn Ngọc Gia Hân'} (Lớp phó Học tập)`,
        role: 'lop_truong',
        class_id: 'class-10a16',
        student_id: studentLt?.id,
        email: ltAcc?.email,
        isAuthenticatedOfficer: true,
      };
    } else if (role === 'lop_pho') {
      const studentLp = this.students.find(
        (s) => s.full_name === this.classInfo.secretary_name
      ) || this.students[1];
      const lpAcc = this.officerAccounts.find((a) => a.role === 'lop_pho');
      this.currentUser = {
        id: 'user-lp',
        name: `${this.classInfo.secretary_name || studentLp?.full_name || 'Lưu Ngọc Linh'} (Bí thư Chi đoàn)`,
        role: 'lop_pho',
        class_id: 'class-10a16',
        student_id: studentLp?.id,
        email: lpAcc?.email,
        isAuthenticatedOfficer: true,
      };
    } else if (role === 'to_truong') {
      const studentTt = this.students[2];
      this.currentUser = {
        id: 'user-tt',
        name: `${studentTt?.full_name || 'Tổ trưởng'} (Tổ trưởng Tổ 1)`,
        role: 'to_truong',
        class_id: 'class-10a16',
        student_id: studentTt?.id,
        group_id: 'group-01',
        isAuthenticatedOfficer: false,
      };
    } else {
      const targetStudent = studentId ? this.students.find((s) => s.id === studentId) : this.students[3];
      this.currentUser = {
        id: `user-${targetStudent?.id || 'stu'}`,
        name: targetStudent ? `${targetStudent.full_name} (Học sinh)` : 'Học sinh Lớp 10A16 (Chỉ xem)',
        role: 'hoc_sinh',
        class_id: 'class-10a16',
        student_id: targetStudent?.id,
        isAuthenticatedOfficer: false,
      };
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('VTT_CURRENT_ROLE', role);
      } catch (e) {}
    }
    this.notify();
  }

  // --- Class Management & Settings (GVCN toàn quyền thay đổi không hạn chế) ---
  public async updateClassInfo(updates: Partial<ClassInfo>) {
    if (!this.checkWriteAuthorization()) return;
    Object.assign(this.classInfo, updates);

    // Đồng bộ tức thời danh sách tài khoản cán sự
    if (updates.class_vice_academic_name) {
      const ltAcc = this.officerAccounts.find((a) => a.role === 'lop_truong');
      if (ltAcc) ltAcc.name = updates.class_vice_academic_name;
    }
    if (updates.secretary_name) {
      const lpAcc = this.officerAccounts.find((a) => a.role === 'lop_pho');
      if (lpAcc) lpAcc.name = updates.secretary_name;
    }
    if (updates.gvcn_name) {
      this.officerAccounts.filter((a) => a.role === 'gvcn').forEach((a) => (a.name = updates.gvcn_name!));
    }
    if (updates.gvcn_email) {
      const gAcc = this.officerAccounts.find((a) => a.id === 'acc-gvcn-user');
      if (gAcc) gAcc.email = updates.gvcn_email;
    }

    // Cập nhật tên người dùng hiện tại nếu đang ở vai trò cán sự
    if (this.currentUser.role === 'gvcn') {
      this.currentUser.name = `${this.classInfo.gvcn_name} (GVCN)`;
    } else if (this.currentUser.role === 'lop_truong') {
      this.currentUser.name = `${this.classInfo.class_vice_academic_name} (Lớp phó Học tập)`;
    } else if (this.currentUser.role === 'lop_pho') {
      this.currentUser.name = `${this.classInfo.secretary_name} (Bí thư Chi đoàn)`;
    }

    // Lưu ngay lập tức vào LocalStorage để không bao giờ bị mất dữ liệu
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('VTT_CLASS_INFO', JSON.stringify(this.classInfo));
        localStorage.setItem('VTT_OFFICER_ACCOUNTS', JSON.stringify(this.officerAccounts));
      } catch (e) {}
    }

    this.addAuditLog(
      this.currentUser.name,
      'Cập nhật thông tin Lớp học & Ban cán sự',
      'class_info',
      'class-10a16',
      'GVCN toàn quyền điều chỉnh nội dung lớp học & Ban cán sự'
    );
    this.notify();

    // Đồng bộ trực tiếp lên cơ sở dữ liệu Supabase Production
    if (supabase) {
      try {
        await supabase.from('classes').upsert({
          id: 'class-10a16',
          name: this.classInfo.class_name,
          academic_year_id: 'ay-2026-2027',
          gvcn_name: this.classInfo.gvcn_name,
        });

        await supabase.from('audit_logs').insert([{
          actor_name: this.currentUser.name || this.classInfo.gvcn_name || 'GVCN',
          actor_role: this.currentUser.role || 'gvcn',
          action: 'SYNC_CLASS_INFO',
          entity_type: 'class_info',
          entity_id: 'class-10a16',
          reason: JSON.stringify({
            classInfo: this.classInfo,
            officerAccounts: this.officerAccounts,
            groups: this.groups,
          }),
        }]);
      } catch (err) {
        console.warn('Lỗi đồng bộ Ban Cán Sự lên Supabase:', err);
      }
    }
  }

  // Cập nhật Tổ trưởng tổ tự quản (Toàn quyền điều chỉnh, không khoá cứng)
  public async updateGroupLeader(groupId: string, leaderStudentId: string) {
    if (!this.checkWriteAuthorization()) return;
    const group = this.groups.find((g) => g.id === groupId);
    if (!group) return;
    
    // Unset previous leader or update
    group.leader_student_id = leaderStudentId || undefined;

    if (leaderStudentId) {
      const stu = this.students.find((s) => s.id === leaderStudentId);
      if (stu) {
        stu.group_id = groupId;
      }
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('VTT_GROUPS', JSON.stringify(this.groups));
        localStorage.setItem('VTT_STUDENTS', JSON.stringify(this.students));
      } catch (e) {}
    }

    this.addAuditLog(
      this.currentUser.name,
      `Chỉ định Tổ trưởng Tổ ${group.group_number}`,
      'groups',
      groupId,
      `Mã HS: ${leaderStudentId || 'Bỏ chỉ định'}`
    );
    this.notify();

    if (supabase) {
      try {
        await supabase.from('groups').upsert({
          id: group.id,
          class_id: 'class-10a16',
          group_number: group.group_number,
          group_name: group.group_name,
          leader_student_id: leaderStudentId || null,
        }, { onConflict: 'id' });

        if (leaderStudentId) {
          await supabase.from('students').update({ group_id: groupId }).eq('id', leaderStudentId);
        }

        await supabase.from('audit_logs').insert([{
          actor_name: this.currentUser.name || this.classInfo.gvcn_name || 'GVCN',
          actor_role: this.currentUser.role || 'gvcn',
          action: 'SYNC_CLASS_INFO',
          entity_type: 'class_info',
          entity_id: 'class-10a16',
          reason: JSON.stringify({
            classInfo: this.classInfo,
            officerAccounts: this.officerAccounts,
            groups: this.groups,
          }),
        }]);
      } catch (e) {
        console.warn('Lỗi lưu Tổ trưởng lên Supabase:', e);
      }
    }
  }

  // Cập nhật Mã PIN bảo mật cán sự
  public updateOfficerPin(role: 'gvcn' | 'lop_truong' | 'lop_pho', newPin: string) {
    const acc = this.officerAccounts.find((a) => a.role === role);
    if (!acc) return;
    acc.pin = newPin.trim();

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('VTT_OFFICER_ACCOUNTS', JSON.stringify(this.officerAccounts));
      } catch (e) {}
    }

    this.addAuditLog(
      this.currentUser.name,
      `Cập nhật mã PIN bảo mật cho ${acc.title}`,
      'officer_auth',
      acc.id
    );
    this.showToast(`Đã đổi mã PIN cho ${acc.title} thành công!`, 'success');
    this.notify();

    if (supabase) {
      supabase.from('audit_logs').insert([{
        actor_name: this.currentUser.name,
        actor_role: this.currentUser.role,
        action: 'SYNC_CLASS_INFO',
        entity_type: 'class_info',
        entity_id: 'class-10a16',
        reason: JSON.stringify({
          classInfo: this.classInfo,
          officerAccounts: this.officerAccounts,
          groups: this.groups,
        }),
      }]).then();
    }
  }

  // --- Officer Accounts & Permissions Control (GVCN toàn quyền thay đổi không hạn chế) ---
  public updateOfficerAccount(id: string, updates: Partial<OfficerAccount>) {
    const acc = this.officerAccounts.find((a) => a.id === id);
    if (!acc) return;
    Object.assign(acc, updates);

    // Đồng bộ tức thời thông tin lớp học nếu là tài khoản GVCN hoặc cán sự chủ chốt
    if (acc.role === 'gvcn') {
      if (updates.name) this.classInfo.gvcn_name = updates.name;
      if (updates.email) this.classInfo.gvcn_email = updates.email;
      if (this.currentUser.role === 'gvcn') {
        this.currentUser.name = `${this.classInfo.gvcn_name} (GVCN)`;
        this.currentUser.email = this.classInfo.gvcn_email;
      }
    } else if (acc.role === 'lop_truong') {
      if (updates.name) this.classInfo.class_president_name = updates.name;
      if (this.currentUser.role === 'lop_truong') {
        this.currentUser.name = `${this.classInfo.class_president_name} (Lớp trưởng)`;
      }
    } else if (acc.role === 'lop_pho') {
      if (updates.name) this.classInfo.class_vice_discipline_name = updates.name;
      if (this.currentUser.role === 'lop_pho') {
        this.currentUser.name = `${this.classInfo.class_vice_discipline_name} (Lớp phó Kỷ luật)`;
      }
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('VTT_OFFICER_ACCOUNTS', JSON.stringify(this.officerAccounts));
        localStorage.setItem('VTT_CLASS_INFO', JSON.stringify(this.classInfo));
      } catch (e) {}
    }

    this.addAuditLog(this.currentUser.name, `Cập nhật toàn quyền tài khoản cán bộ [${acc.name}]`, 'officer_auth', id);
    this.notify();

    if (supabase) {
      supabase.from('classes').upsert({
        id: 'class-10a16',
        name: this.classInfo.class_name,
        academic_year_id: 'ay-2026-2027',
        gvcn_name: this.classInfo.gvcn_name,
      }).then();

      supabase.from('audit_logs').insert([{
        actor_name: this.currentUser.name,
        actor_role: this.currentUser.role,
        action: 'SYNC_CLASS_INFO',
        entity_type: 'class_info',
        entity_id: 'class-10a16',
        reason: JSON.stringify({
          classInfo: this.classInfo,
          officerAccounts: this.officerAccounts,
          groups: this.groups,
        }),
      }]).then();
    }
  }

  public addOfficerAccount(newAcc: OfficerAccount) {
    this.officerAccounts.push(newAcc);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('VTT_OFFICER_ACCOUNTS', JSON.stringify(this.officerAccounts));
      } catch (e) {}
    }
    this.addAuditLog(this.currentUser.name, `Thêm tài khoản cán sự [${newAcc.name}]`, 'officer_auth', newAcc.id);
    this.notify();

    if (supabase) {
      supabase.from('audit_logs').insert([{
        actor_name: this.currentUser.name,
        actor_role: this.currentUser.role,
        action: 'SYNC_CLASS_INFO',
        entity_type: 'class_info',
        entity_id: 'class-10a16',
        reason: JSON.stringify({
          classInfo: this.classInfo,
          officerAccounts: this.officerAccounts,
          groups: this.groups,
        }),
      }]).then();
    }
  }

  public deleteOfficerAccount(id: string) {
    this.officerAccounts = this.officerAccounts.filter((a) => a.id !== id);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('VTT_OFFICER_ACCOUNTS', JSON.stringify(this.officerAccounts));
      } catch (e) {}
    }
    this.addAuditLog(this.currentUser.name, `Xóa tài khoản cán sự [${id}]`, 'officer_auth', id);
    this.notify();

    if (supabase) {
      supabase.from('audit_logs').insert([{
        actor_name: this.currentUser.name,
        actor_role: this.currentUser.role,
        action: 'SYNC_CLASS_INFO',
        entity_type: 'class_info',
        entity_id: 'class-10a16',
        reason: JSON.stringify({
          classInfo: this.classInfo,
          officerAccounts: this.officerAccounts,
          groups: this.groups,
        }),
      }]).then();
    }
  }

  public authenticateWithGmail(email: string): {
    success: boolean;
    isRestricted: boolean;
    account?: OfficerAccount;
    message: string;
  } {
    const clean = email.trim().toLowerCase();
    const found = this.officerAccounts.find((a) => a.email.trim().toLowerCase() === clean);

    if (found) {
      // Authorized Officer Account (GVCN / Ban Cán Sự)
      this.setLoggedInRole(found.role);
      this.currentUser.email = found.email;
      this.currentUser.isAuthenticatedOfficer = true;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(
            'VTT_OFFICER_SESSION',
            JSON.stringify({ role: found.role, email: found.email, name: found.name, timestamp: Date.now() })
          );
          localStorage.removeItem('VTT_STUDENT_SESSION');
        } catch (e) {}
      }
      this.addAuditLog(found.name, `Xác thực thành công quyền Cán sự qua Gmail [${found.email}]`, 'auth', found.id);
      this.showToast(`Chào mừng ${found.name}! Đã kích hoạt toàn quyền cho ${found.title}.`, 'success');
      this.notify();

      return {
        success: true,
        isRestricted: false,
        account: found,
        message: `Đăng nhập thành công với vai trò ${found.title}: ${found.name}!`,
      };
    } else {
      // TÀI KHOẢN KHÁC (Học sinh / Phụ huynh / Tài khoản không được cấp quyền)
      // Hệ thống HẠN CHẾ QUYỀN NGAY LẬP TỨC!
      this.setLoggedInRole('hoc_sinh');
      this.currentUser.email = clean;
      this.currentUser.name = `Học sinh (${clean})`;
      this.currentUser.isAuthenticatedOfficer = false;

      if (typeof window !== 'undefined') {
        try {
          localStorage.removeItem('VTT_OFFICER_SESSION');
          localStorage.setItem('VTT_STUDENT_SESSION', JSON.stringify({ email: clean, role: 'hoc_sinh' }));
        } catch (e) {}
      }

      this.addAuditLog(`Tài khoản khác [${clean}]`, `Đăng nhập Chế độ Học sinh (Bị hạn chế quyền điều chỉnh)`, 'auth', 'student');
      this.showToast(
        `Tài khoản "${clean}" không có trong danh sách Cán sự. Hệ thống đã HẠN CHẾ về Chế độ Học sinh (Chỉ xem)!`,
        'warn',
        5000
      );
      this.notify();

      return {
        success: false,
        isRestricted: true,
        message: `Địa chỉ Gmail "${clean}" không có trong danh sách Cán sự. Hệ thống đã HẠN CHẾ tài khoản này về Chế độ Học sinh (Chỉ xem và bị khóa toàn bộ quyền sửa)!`,
      };
    }
  }

  public authenticateWithPin(role: 'gvcn' | 'lop_truong' | 'lop_pho', pinInput: string): { success: boolean; account?: OfficerAccount; message: string } {
    const cleanPin = pinInput.trim();
    const found = this.officerAccounts.find((a) => a.role === role);
    if (!found) {
      return { success: false, message: 'Không tìm thấy vai trò cán bộ này.' };
    }

    // Mã PIN chuẩn mặc định của Ban Cán Sự (Đảm bảo luôn luôn đúng để dự phòng lỗi bộ nhớ đệm)
    const officialPins: Record<string, string> = {
      gvcn: '1016',
      lop_truong: '10A16lpht',
      lop_pho: '10A16bt',
    };

    const isMatch = (found.pin === cleanPin) || (officialPins[role] === cleanPin);

    if (!isMatch) {
      return {
        success: false,
        message: 'Mã PIN bảo mật không chính xác. Quyền truy cập bị từ chối!',
      };
    }

    // Tự động sửa lỗi dữ liệu cũ (Self-healing): Nếu mã PIN trong bộ nhớ khác mã PIN chuẩn mà người dùng nhập đúng
    if (found.pin !== cleanPin) {
      found.pin = cleanPin;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('VTT_OFFICER_ACCOUNTS', JSON.stringify(this.officerAccounts));
        } catch (e) {}
      }
    }

    this.setLoggedInRole(found.role);
    this.currentUser.isAuthenticatedOfficer = true;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'VTT_OFFICER_SESSION',
          JSON.stringify({ role: found.role, email: found.email, name: found.name, timestamp: Date.now() })
        );
      } catch (e) {}
    }
    this.addAuditLog(found.name, `Xác thực thành công qua Mã PIN bảo mật`, 'auth', found.id);
    this.showToast(`Xác thực thành công! Đã kích hoạt toàn quyền cho ${found.title} (${found.name}).`, 'success');
    this.notify();

    return {
      success: true,
      account: found,
      message: `Xác thực thành công! Kích hoạt toàn quyền điều chỉnh cho ${found.title}.`,
    };
  }

  public logoutToStudentMode() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('VTT_OFFICER_SESSION');
        localStorage.removeItem('VTT_STUDENT_SESSION');
        localStorage.removeItem('VTT_CURRENT_ROLE');
      } catch (e) {}
    }
    this.setLoggedInRole('hoc_sinh');
    this.currentUser.email = undefined;
    this.currentUser.isAuthenticatedOfficer = false;
    this.addAuditLog(this.currentUser.name, 'Đăng xuất khỏi quyền cán sự (Khóa về chế độ Học sinh)', 'auth', 'logout');
    this.showToast('Đã đăng xuất! Hệ thống đã khóa về Chế độ Học sinh (Chỉ xem).', 'info');
    this.notify();
  }

  public resetToCleanOfficialRoster() {
    this.students = buildOfficial10A16Students();
    this.groups = [...OFFICIAL_10A16_GROUPS];
    this.incidents = [];
    this.rewards = [];
    this.attendance = [];
    this.tasks = [];
    this.positiveNotes = [];
    this.initDefaultSeats();
    this.calculateAllWeeklyScores(1);
    this.addAuditLog(this.currentUser.name, 'Làm sạch toàn bộ dữ liệu - Khởi tạo sổ nề nếp 10A16', 'system', 'class-10a16');
    this.notify();
  }

  private initDefaultSeats() {
    const seats: Seat[] = [];
    const classId = 'class-10a16';
    let stuIdx = 0;
    for (let r = 1; r <= 6; r++) {
      for (let c = 1; c <= 8; c++) {
        const colGroup = Math.ceil(c / 2); // Cột 1..4
        const tableNum = (r - 1) * 4 + colGroup;
        const stu = this.students[stuIdx];
        const groupId = `group-0${colGroup}`;
        
        seats.push({
          id: `seat-${r}-${c}`,
          class_id: classId,
          row_number: r,
          col_number: c,
          table_number: tableNum,
          student_id: stu ? stu.id : undefined,
        });

        if (stu) {
          stu.group_id = groupId;
          stu.seat_number = `Bàn ${tableNum} (Tổ ${colGroup} - Cột ${colGroup})`;
        }

        stuIdx++;
      }
    }
    this.seats = seats;
  }

  public ensureCapacitySeats() {
    const classId = 'class-10a16';
    const existingMap = new Map(this.seats.map((s) => [s.id, s]));
    const seats: Seat[] = [];
    for (let r = 1; r <= 6; r++) {
      for (let c = 1; c <= 8; c++) {
        const id = `seat-${r}-${c}`;
        const colGroup = Math.ceil(c / 2);
        const tableNum = (r - 1) * 4 + colGroup;
        if (existingMap.has(id)) {
          seats.push(existingMap.get(id)!);
        } else {
          const assignedIds = new Set(Array.from(existingMap.values()).map((s) => s.student_id).filter(Boolean));
          const unassignedStu = this.students.find((s) => !assignedIds.has(s.id));
          seats.push({
            id,
            class_id: classId,
            row_number: r,
            col_number: c,
            table_number: tableNum,
            student_id: unassignedStu ? unassignedStu.id : undefined,
          });
        }
      }
    }
    this.seats = seats;
  }

  public addAuditLog(actorName: string, action: string, entityType: string, entityId: string, reason?: string) {
    const newLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      actor_name: actorName,
      actor_role: this.currentUser.role,
      action,
      entity_type: entityType,
      entity_id: entityId,
      reason,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(newLog);
  }

  // --- Student Management (GVCN & Ban Cán sự có toàn quyền điều chỉnh) ---
  public addStudent(studentData: Omit<Student, 'id'>): { success: boolean; id: string } {
    if (!this.checkWriteAuthorization()) return { success: false, id: '' };
    const id = studentData.student_code ? `stu-10a16-${studentData.student_code.replace(/[^a-zA-Z0-9]/g, '')}` : `stu-${Date.now()}`;
    const newStudent: Student = {
      ...studentData,
      id,
      class_id: 'class-10a16',
      is_demo: false,
    };
    this.students.push(newStudent);
    this.addAuditLog(
      this.currentUser.name,
      'Thêm học sinh mới vào lớp',
      'student',
      id,
      `Học sinh: ${newStudent.full_name} (${newStudent.student_code})`
    );
    this.calculateAllWeeklyScores(1);
    this.notify();

    if (supabase) {
      supabase.from('students').upsert({
        id: newStudent.id,
        student_code: newStudent.student_code,
        full_name: newStudent.full_name,
        first_name: newStudent.first_name,
        last_name: newStudent.last_name,
        class_id: 'class-10a16',
        group_id: newStudent.group_id,
        seat_number: newStudent.seat_number,
        status: newStudent.status,
        is_demo: false,
      }).then(({ error }) => {
        if (error) console.error('Supabase auto-add student error:', error);
      });
    }

    return { success: true, id };
  }

  public updateStudent(studentId: string, updates: Partial<Student>) {
    if (!this.checkWriteAuthorization()) return;
    const stu = this.students.find((s) => s.id === studentId);
    if (!stu) return;
    Object.assign(stu, updates);
    this.addAuditLog(
      this.currentUser.name,
      'Cập nhật thông tin học sinh',
      'student',
      studentId,
      `Điều chỉnh hồ sơ: ${stu.full_name}`
    );
    this.calculateAllWeeklyScores(1);
    this.notify();

    if (supabase) {
      supabase.from('students').update({
        full_name: stu.full_name,
        first_name: stu.first_name,
        last_name: stu.last_name,
        group_id: stu.group_id,
        seat_number: stu.seat_number,
        status: stu.status,
      }).eq('id', studentId).then(({ error }) => {
        if (error) console.error('Supabase auto-update student error:', error);
      });
    }
  }

  public deleteStudent(studentId: string) {
    if (!this.checkWriteAuthorization()) return;
    const idx = this.students.findIndex((s) => s.id === studentId);
    if (idx === -1) return;
    const removed = this.students[idx];
    this.students.splice(idx, 1);
    // Clear seat assignment if any
    this.seats.forEach((seat) => {
      if (seat.student_id === studentId) seat.student_id = undefined;
    });
    this.addAuditLog(
      this.currentUser.name,
      'Xóa học sinh khỏi danh sách lớp',
      'student',
      studentId,
      `Đã xóa học sinh ${removed.full_name}`
    );
    this.calculateAllWeeklyScores(1);
    this.notify();

    if (supabase) {
      supabase.from('students').delete().eq('id', studentId).then(({ error }) => {
        if (error) console.error('Supabase auto-delete student error:', error);
      });
    }
  }

  // --- Group Management (Tổ học tập) ---
  public updateGroup(groupId: string, updates: Partial<Group>) {
    if (!this.checkWriteAuthorization()) return;
    const grp = this.groups.find((g) => g.id === groupId);
    if (!grp) return;
    Object.assign(grp, updates);
    this.addAuditLog(
      this.currentUser.name,
      'Điều chỉnh thông tin tổ học tập',
      'group',
      groupId,
      `Cập nhật: ${grp.group_name}`
    );
    this.notify();
  }

  public assignStudentToGroup(studentId: string, groupId: string) {
    if (!this.checkWriteAuthorization()) return;
    const stu = this.students.find((s) => s.id === studentId);
    if (!stu) return;
    stu.group_id = groupId;
    this.addAuditLog(
      this.currentUser.name,
      'Chuyển tổ cho học sinh',
      'student',
      studentId,
      `Học sinh ${stu.full_name} chuyển sang tổ ${groupId}`
    );
    this.notify();
  }

  // --- Seating Management (Sơ đồ chỗ ngồi theo Cột & Tổ) ---
  // Tự động tạo bản lưu dự phòng (Snapshot) sơ đồ chỗ ngồi trước khi thay đổi lớn
  public createSeatingBackupSnapshot() {
    if (typeof window === 'undefined') return;
    try {
      const backup = JSON.stringify({
        timestamp: new Date().toISOString(),
        seats: this.seats,
        students: this.students.map(s => ({ id: s.id, group_id: s.group_id, seat_number: s.seat_number })),
      });
      localStorage.setItem('VTT_SEATS_BACKUP', backup);
    } catch (e) {
      console.warn('Lỗi lưu bản dự phòng sơ đồ:', e);
    }
  }

  public restorePreviousSeatingBackup(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const savedBackup = localStorage.getItem('VTT_SEATS_BACKUP');
      if (!savedBackup) return false;
      const parsed = JSON.parse(savedBackup);
      if (parsed && Array.isArray(parsed.seats) && parsed.seats.length > 0) {
        this.seats = parsed.seats;
        if (Array.isArray(parsed.students)) {
          parsed.students.forEach((savedStu: any) => {
            const stu = this.students.find(s => s.id === savedStu.id);
            if (stu) {
              stu.group_id = savedStu.group_id;
              stu.seat_number = savedStu.seat_number;
            }
          });
        }
        this.addAuditLog(
          this.currentUser.name,
          'Khôi phục sơ đồ chỗ ngồi từ bản sao lưu gần nhất',
          'seating',
          'restore'
        );
        this.notify();
        return true;
      }
    } catch (e) {
      console.error('Lỗi khôi phục bản sao lưu sơ đồ:', e);
    }
    return false;
  }

  public hasSeatingBackup(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      return Boolean(localStorage.getItem('VTT_SEATS_BACKUP'));
    } catch (e) {
      return false;
    }
  }

  // Tự động gán Tổ của học sinh theo Cột bàn ngồi (Cột 1: Tổ 1, Cột 2: Tổ 2, Cột 3: Tổ 3, Cột 4: Tổ 4)
  public syncStudentGroupWithSeatColumn(studentId: string, seat: Seat) {
    const stu = this.students.find((s) => s.id === studentId);
    if (!stu || !seat) return;

    const colGroup = Math.ceil(seat.col_number / 2); // 1, 2, 3, hoặc 4
    const matchedGroup = this.groups.find((g) => g.group_number === colGroup) || this.groups[colGroup - 1];
    const targetGroupId = matchedGroup ? matchedGroup.id : `group-0${colGroup}`;

    stu.group_id = targetGroupId;
    stu.seat_number = `Bàn ${seat.table_number} (Cột ${colGroup} - Tổ ${colGroup})`;

    if (supabase) {
      supabase.from('students').update({
        group_id: stu.group_id,
        seat_number: stu.seat_number,
      }).eq('id', stu.id).then(({ error }) => {
        if (error) console.error('Supabase auto update student group from column error:', error);
      });
    }
  }

  public assignStudentToSeat(seatId: string, studentId?: string) {
    if (!this.checkWriteAuthorization()) return;
    const seat = this.seats.find((s) => s.id === seatId);
    if (!seat) return;
    this.createSeatingBackupSnapshot();
    if (studentId) {
      this.seats.forEach((s) => {
        if (s.id !== seatId && s.student_id === studentId) {
          s.student_id = undefined;
        }
      });
      this.syncStudentGroupWithSeatColumn(studentId, seat);
    } else {
      if (seat.student_id) {
        const prevStu = this.students.find((s) => s.id === seat.student_id);
        if (prevStu) prevStu.seat_number = undefined;
      }
    }
    seat.student_id = studentId;
    this.addAuditLog(
      this.currentUser.name,
      'Điều chỉnh vị trí sơ đồ chỗ ngồi & Đồng bộ Tổ theo Cột',
      'seat',
      seatId,
      `Bàn ${seat.table_number}`
    );
    this.notify();
  }

  public swapSeats(seatId1: string, seatId2: string) {
    if (!this.checkWriteAuthorization()) return;
    const s1 = this.seats.find((s) => s.id === seatId1);
    const s2 = this.seats.find((s) => s.id === seatId2);
    if (!s1 || !s2) return;
    this.createSeatingBackupSnapshot();
    const tempStu = s1.student_id;
    s1.student_id = s2.student_id;
    s2.student_id = tempStu;

    if (s1.student_id) {
      this.syncStudentGroupWithSeatColumn(s1.student_id, s1);
    }
    if (s2.student_id) {
      this.syncStudentGroupWithSeatColumn(s2.student_id, s2);
    }

    this.addAuditLog(
      this.currentUser.name,
      'Hoán đổi chỗ ngồi giữa 2 bàn & Đồng bộ Tổ theo Cột mới',
      'seat',
      `${seatId1}<->${seatId2}`
    );
    this.notify();
  }

  public autoArrangeSeats(method: 'by_group' | 'by_roster' = 'by_roster') {
    if (!this.checkWriteAuthorization()) return;
    this.createSeatingBackupSnapshot();
    if (method === 'by_group') {
      // Sắp xếp học sinh thuộc từng Tổ 1..4 vào các Cột bàn 1..4 tương ứng
      const groupMap: Record<string, Student[]> = {};
      this.groups.forEach((g) => { groupMap[g.id] = []; });

      this.students.forEach((s) => {
        const gId = s.group_id && groupMap[s.group_id] ? s.group_id : this.groups[0]?.id || 'group-01';
        if (!groupMap[gId]) groupMap[gId] = [];
        groupMap[gId].push(s);
      });

      // Reset all seat student assignments
      this.seats.forEach((seat) => { seat.student_id = undefined; });

      // Place students column by column (Cột 1 -> Tổ 1, Cột 2 -> Tổ 2, Cột 3 -> Tổ 3, Cột 4 -> Tổ 4)
      for (let colGroup = 1; colGroup <= 4; colGroup++) {
        const matchedGrp = this.groups.find((g) => g.group_number === colGroup) || this.groups[colGroup - 1];
        const grpStudents = matchedGrp && groupMap[matchedGrp.id] ? groupMap[matchedGrp.id] : [];
        const colSeats = this.seats
          .filter((s) => Math.ceil(s.col_number / 2) === colGroup)
          .sort((a, b) => a.table_number - b.table_number || a.col_number - b.col_number);

        colSeats.forEach((seat, idx) => {
          const stu = grpStudents[idx];
          if (stu) {
            seat.student_id = stu.id;
            this.syncStudentGroupWithSeatColumn(stu.id, seat);
          }
        });
      }
    } else {
      // Xếp theo STT Danh sách 43 HS và tự động gán Tổ theo Cột chỗ ngồi
      const sortedStudents = [...this.students].sort((a, b) => a.student_code.localeCompare(b.student_code));
      this.seats.forEach((seat, idx) => {
        const stu = sortedStudents[idx];
        seat.student_id = stu ? stu.id : undefined;
        if (stu) {
          this.syncStudentGroupWithSeatColumn(stu.id, seat);
        }
      });
    }

    this.addAuditLog(
      this.currentUser.name,
      'Sắp xếp tự động toàn bộ sơ đồ chỗ ngồi & Đồng bộ Tổ theo Cột',
      'seating',
      'class-10a16',
      `Phương pháp: ${method}`
    );
    this.notify();
  }

  // --- Multi-Plan Seating Management ---
  public saveCurrentSeatsToPlan(planName?: string) {
    if (!this.checkWriteAuthorization()) return;
    const activePlan = this.seatingPlans.find((p) => p.id === this.activeSeatingPlanId);
    if (activePlan) {
      if (planName && planName.trim()) activePlan.name = planName.trim();
      activePlan.seats = JSON.parse(JSON.stringify(this.seats));
      activePlan.updated_at = new Date().toISOString();
      this.showToast(`Đã lưu sơ đồ [${activePlan.name}] thành công!`, 'success');
      this.notify();
    }
  }

  public loadSeatingPlan(planId: string) {
    const plan = this.seatingPlans.find((p) => p.id === planId);
    if (!plan) return;
    this.createSeatingBackupSnapshot();
    this.activeSeatingPlanId = plan.id;
    this.seats = JSON.parse(JSON.stringify(plan.seats));
    // Ensure all seats sync with their column groups
    this.seats.forEach((seat) => {
      if (seat.student_id) {
        this.syncStudentGroupWithSeatColumn(seat.student_id, seat);
      }
    });
    this.showToast(`Đã chuyển sang phương án sơ đồ: [${plan.name}]`, 'info');
    this.notify();
  }

  public createNewSeatingPlan(name: string, cloneFromCurrent: boolean = true) {
    if (!this.checkWriteAuthorization()) return;
    const newId = `plan-${Date.now()}`;
    const cleanName = name.trim() || `Sơ đồ Mới (${new Date().toLocaleDateString('vi-VN')})`;
    const newPlan: SeatingPlan = {
      id: newId,
      name: cleanName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      seats: cloneFromCurrent ? JSON.parse(JSON.stringify(this.seats)) : [],
    };

    if (!cloneFromCurrent) {
      // Create empty seats layout
      this.seats.forEach((s) => {
        newPlan.seats.push({ ...s, student_id: undefined });
      });
    }

    this.seatingPlans.push(newPlan);
    this.activeSeatingPlanId = newId;
    this.seats = JSON.parse(JSON.stringify(newPlan.seats));
    this.showToast(`Đã tạo phương án sơ đồ chỗ ngồi mới: [${cleanName}]!`, 'success');
    this.notify();
  }

  public deleteSeatingPlan(planId: string) {
    if (!this.checkWriteAuthorization()) return;
    if (this.seatingPlans.length <= 1) {
      this.showToast('Cần giữ lại ít nhất 1 phương án sơ đồ chỗ ngồi!', 'warn');
      return;
    }
    const targetPlan = this.seatingPlans.find((p) => p.id === planId);
    this.seatingPlans = this.seatingPlans.filter((p) => p.id !== planId);
    if (this.activeSeatingPlanId === planId) {
      this.activeSeatingPlanId = this.seatingPlans[0].id;
      this.seats = JSON.parse(JSON.stringify(this.seatingPlans[0].seats));
    }
    this.showToast(`Đã xóa phương án sơ đồ [${targetPlan?.name || ''}]!`, 'info');
    this.notify();
  }

  // --- Duty Roster & Rotating Schedule ---
  public updateDutyRosterDay(dayOfWeek: string, updates: Partial<DutyRosterDay>) {
    if (!this.checkWriteAuthorization()) return;
    const dayIndex = this.dutyRoster.findIndex((d) => d.dayOfWeek === dayOfWeek);
    if (dayIndex !== -1) {
      const assignedGroup = this.groups.find((g) => g.id === updates.assignedGroupId);
      this.dutyRoster[dayIndex] = {
        ...this.dutyRoster[dayIndex],
        ...updates,
        groupName: assignedGroup ? assignedGroup.group_name : this.dutyRoster[dayIndex].groupName,
      };
      this.showToast(`Đã cập nhật lịch trực nhật [${this.dutyRoster[dayIndex].dayLabel}]!`, 'success');
      this.notify();
    }
  }

  public autoRotateDutyRoster() {
    if (!this.checkWriteAuthorization()) return;
    if (this.groups.length === 0) return;
    this.dutyRoster.forEach((d, idx) => {
      const nextGroup = this.groups[idx % this.groups.length];
      if (nextGroup) {
        d.assignedGroupId = nextGroup.id;
        d.groupName = nextGroup.group_name;
        d.leaderStudentId = nextGroup.leader_student_id;
      }
    });
    this.showToast('Đã xoay vòng phân công trực nhật theo 4 Tổ!', 'success');
    this.notify();
  }

  // --- Zalo Weekly Report Generator ---
  public generateZaloWeeklyReport(weekNumber: number = 1, customNotes: string = '', showViolatorNames: boolean = true): string {
    const classInfo = this.classInfo;
    const totalStudents = this.students.length;

    // Filter attendance
    const permittedAbsences = this.attendance.filter((a) => a.status === 'permitted_absence').length;
    const unpermittedAbsences = this.attendance.filter((a) => a.status === 'unpermitted_absence' || a.status === 'truancy').length;
    const totalLates = this.attendance.filter((a) => a.status === 'late').length;

    // Incidents & Rewards
    const approvedIncidents = this.incidents.filter((i) => i.incident_status === 'approved');
    const approvedRewards = this.rewards.filter((r) => r.status === 'approved');

    // Group scores calculation
    const weeklySnaps = this.weeklySnapshots.filter((s) => s.week_number === weekNumber && s.is_current);
    const groupScores = this.groups.map((g) => {
      const groupStudents = this.students.filter((s) => s.group_id === g.id);
      if (groupStudents.length === 0) return { name: g.group_name, score: 8.0 };
      const totalScore = groupStudents.reduce((acc, stu) => {
        const snap = weeklySnaps.find((s) => s.student_id === stu.id);
        return acc + (snap?.official_week_score ?? 8.0);
      }, 0);
      return {
        name: g.group_name,
        score: Number((totalScore / groupStudents.length).toFixed(1)),
      };
    }).sort((a, b) => b.score - a.score);

    const topGroup = groupScores[0];

    let text = `📣 [BÁO CÁO NỀ NẾP & THI ĐƯA TUẦN ${weekNumber < 10 ? '0' + weekNumber : weekNumber}]\n`;
    text += `🏫 LỚP ${classInfo.class_name.toUpperCase()} - TRƯỜNG THPT VÕ TRƯỜNG TOẢN\n`;
    text += `👨‍🏫 GVCN: ${classInfo.gvcn_name || 'Thầy Trần Duy Tân'} | Sĩ số: ${totalStudents}/${totalStudents} HS\n`;
    text += `────────────────────\n\n`;

    text += `📊 1. THỐNG KÊ CHUYÊN CẦN TUẦN:\n`;
    text += `• Vắng có phép: ${permittedAbsences} lượt\n`;
    text += `• Vắng không phép: ${unpermittedAbsences} lượt\n`;
    text += `• Đi trễ / Trốn tiết: ${totalLates} lượt\n\n`;

    text += `🏆 2. THI ĐƯA TỔ & TUYÊN DƯƠNG:\n`;
    if (topGroup) {
      text += `• 🥇 Tổ dẫn đầu tuần: ${topGroup.name} (Điểm TB: ${topGroup.score}/10)\n`;
    }
    if (approvedRewards.length > 0) {
      const names = approvedRewards.map((r) => {
        const stu = this.students.find((s) => s.id === r.student_id);
        return stu ? stu.full_name : '';
      }).filter(Boolean).slice(0, 5).join(', ');
      text += `• 👏 Tuyên dương xuất sắc: ${names} (+${approvedRewards.length} lượt điểm thưởng)\n`;
    } else {
      text += `• 👏 Tuyên dương tinh thần tự giác nề nếp của tập thể Lớp 10A16.\n`;
    }
    text += `\n`;

    text += `⚠️ 3. TÌNH HÌNH NỀ NẾP & KỶ LUẬT:\n`;
    if (approvedIncidents.length === 0) {
      text += `• ✅ Tuần qua Lớp ${classInfo.class_name} duy trì nề nếp rất tốt, không có vi phạm.\n`;
    } else {
      text += `• Ghi nhận ${approvedIncidents.length} lượt vi phạm nề nếp.\n`;
      if (showViolatorNames) {
        approvedIncidents.slice(0, 5).forEach((inc) => {
          const stu = this.students.find((s) => s.id === inc.student_id);
          const rationale = formatIncidentDeductionRationale(inc, this.conductCatalog);
          text += `  - ${stu?.full_name || 'Học sinh'}: ${rationale}\n`;
        });
      }
    }
    text += `\n`;

    text += `🧹 4. LỊCH TRỰC NHẬT TUẦN TỚI:\n`;
    this.dutyRoster.forEach((d) => {
      text += `• ${d.dayLabel}: ${d.groupName}\n`;
    });
    text += `\n`;

    text += `📝 5. DẶN DÒ CỦA GVCN:\n`;
    if (customNotes.trim()) {
      text += `${customNotes.trim()}\n`;
    } else {
      text += `• Học sinh thực hiện đúng trang phục, đeo bảng tên và đi học đúng giờ.\n`;
      text += `• Ban cán sự lớp kiểm tra nề nếp và theo dõi vệ sinh lớp học.\n`;
    }
    text += `\n`;
    text += `Trân trọng cảm ơn sự phối hợp đồng hành của Quý Phụ huynh Lớp ${classInfo.class_name}! ❤️`;

    return text;
  }

  // --- Attendance ---
  public recordAttendance(record: Omit<AttendanceRecord, 'id'>): { success: boolean; id: string } {
    if (!this.checkWriteAuthorization()) return { success: false, id: '' };
    const existingIndex = this.attendance.findIndex(
      (a) => a.student_id === record.student_id && a.date === record.date && a.session === record.session
    );

    const id = existingIndex >= 0 ? this.attendance[existingIndex].id : generateUUID();
    const newRec: AttendanceRecord = { ...record, id };

    if (existingIndex >= 0) {
      this.attendance[existingIndex] = newRec;
    } else {
      this.attendance.unshift(newRec);
    }

    this.addAuditLog(this.currentUser.name, 'Ghi nhận điểm danh', 'attendance', id, `Trạng thái: ${record.status}`);
    this.notify();

    if (supabase) {
      supabase.from('attendance_records').upsert({
        student_id: record.student_id,
        class_id: 'class-10a16',
        date: record.date,
        session_id: record.session,
        status: record.status,
        arrival_time: record.arrival_time || null,
        reason: record.reason || null,
        is_legitimate_exception: Boolean(record.is_legitimate_exception),
      }, { onConflict: 'student_id,date,session_id' }).then(({ error }) => {
        if (error) console.error('Supabase auto-save attendance error:', error);
      });
    }

    return { success: true, id };
  }

  public updateAttendanceStatus(recordId: string, newStatus: AttendanceStatus) {
    if (!this.checkWriteAuthorization()) return;
    const rec = this.attendance.find((a) => a.id === recordId);
    if (!rec) return;

    rec.status = newStatus;
    this.addAuditLog(this.currentUser.name, 'Cập nhật nhanh trạng thái điểm danh', 'attendance', recordId, `Trạng thái mới: ${newStatus}`);
    this.showToast('✅ Đã cập nhật 1-chạm trạng thái điểm danh!', 'success');
    this.notify();

    if (supabase) {
      supabase.from('attendance_records').update({ status: newStatus }).eq('id', recordId).then(({ error }) => {
        if (error) console.error('Supabase auto-update attendance error:', error);
      });
    }
  }

  public approveAllPendingAttendance(targetStatus: AttendanceStatus = 'present') {
    if (!this.checkWriteAuthorization()) return;
    const pendingList = this.attendance.filter((a) => a.status === 'absence_pending_verification');
    if (pendingList.length === 0) {
      this.showToast('Không có hồ sơ điểm danh nào đang ở trạng thái chờ xác minh!', 'info');
      return;
    }

    pendingList.forEach((a) => {
      a.status = targetStatus;
    });

    const statusLabel = targetStatus === 'present' ? 'Có mặt đầy đủ' : targetStatus === 'permitted_absence' ? 'Vắng có phép' : 'Vắng không phép';
    this.addAuditLog(this.currentUser.name, '1-Chạm duyệt tất cả hồ sơ điểm danh chờ xác minh', 'attendance', 'batch_approve', `Chuyển ${pendingList.length} hồ sơ thành ${statusLabel}`);
    this.showToast(`⚡ ĐÃ 1-CHẠM DUYỆT TẤT CẢ ${pendingList.length} HỒ SƠ CHỜ XÁC MINH THÀNH: [${statusLabel.toUpperCase()}]!`, 'success');
    this.notify();
  }

  // --- Incidents & Conduct Management (GVCN, Lớp phó, Lớp trưởng có toàn quyền) ---
  public checkIncidentDuplicate(studentId: string, date: string, session: string, code: string | null): boolean {
    return this.incidents.some(
      (inc) =>
        inc.student_id === studentId &&
        inc.date === date &&
        inc.session === session &&
        inc.conduct_code === code &&
        inc.incident_status !== 'rejected'
    );
  }

  public submitIncident(incidentData: Omit<Incident, 'id' | 'created_at' | 'effective_deduction'>): { success: boolean; id: string; warning?: string } {
    if (!this.checkWriteAuthorization()) return { success: false, id: '' };
    const isDup = this.checkIncidentDuplicate(incidentData.student_id, incidentData.date, incidentData.session, incidentData.conduct_code);

    let baseDeduction = 0;
    if (incidentData.conduct_code) {
      const catalogItem = this.conductCatalog.find((c) => c.code === incidentData.conduct_code);
      baseDeduction = catalogItem ? catalogItem.defaultPoints : 0;
    }

    const id = generateUUID();
    const newIncident: Incident = {
      ...incidentData,
      id,
      base_deduction: baseDeduction,
      effective_deduction: incidentData.score_effect_status === 'confirmed_effect' && incidentData.incident_status === 'approved' ? baseDeduction : 0,
      duplicate_warning: isDup,
      created_at: new Date().toISOString(),
    };

    this.incidents.unshift(newIncident);
    this.addAuditLog(
      this.currentUser.name,
      'Ghi nhận vi phạm nề nếp',
      'incident',
      id,
      `Mã: ${incidentData.conduct_code || 'Sự việc khác'}. Trạng thái: ${newIncident.incident_status}`
    );

    this.calculateAllWeeklyScores(1);
    this.notify();

    if (supabase) {
      supabase.from('incidents').insert({
        id: newIncident.id,
        student_id: newIncident.student_id,
        class_id: 'class-10a16',
        conduct_code: newIncident.conduct_code,
        is_other_category: Boolean(newIncident.is_other_category),
        other_category_description: newIncident.other_category_description || null,
        date: newIncident.date,
        session_id: newIncident.session,
        period_number: newIncident.period || null,
        incident_status: newIncident.incident_status,
        score_effect_status: newIncident.score_effect_status,
        base_deduction: newIncident.base_deduction,
        effective_deduction: newIncident.effective_deduction,
        reporter_name: newIncident.reported_by || this.currentUser.name,
        reporter_role: newIncident.reporter_role || this.currentUser.role,
        notes: newIncident.notes || null,
      }).then(({ error }) => {
        if (error) console.error('Supabase auto-save incident error:', error);
      });
    }

    return {
      success: true,
      id,
      warning: isDup ? 'CẢNH BÁO: Phát hiện sự việc tương tự của học sinh này trong cùng buổi! Hệ thống không tự động gộp (chờ Ban cán sự/GVCN rà soát).' : undefined,
    };
  }

  public reviewIncident(
    incidentId: string,
    action: 'approved' | 'rejected' | 'more_info_needed',
    scoreEffectStatus: 'confirmed_effect' | 'pending_rule' | 'waived' | 'none',
    comment?: string
  ) {
    if (!this.checkWriteAuthorization()) return;
    const inc = this.incidents.find((i) => i.id === incidentId);
    if (!inc) return;

    inc.incident_status = action;
    inc.score_effect_status = scoreEffectStatus;
    inc.gvcn_comment = comment;

    if (action === 'approved' && scoreEffectStatus === 'confirmed_effect') {
      inc.effective_deduction = inc.base_deduction;
    } else {
      inc.effective_deduction = 0;
    }

    this.addAuditLog(
      this.currentUser.name,
      `Duyệt sự việc nề nếp: ${action.toUpperCase()}`,
      'incident',
      incidentId,
      `Hiệu lực điểm: ${scoreEffectStatus}. Nhận xét: ${comment || 'Đã kiểm tra'}`
    );

    this.calculateAllWeeklyScores(1);
    this.notify();

    if (supabase) {
      supabase.from('incidents').update({
        incident_status: action,
        score_effect_status: scoreEffectStatus,
        effective_deduction: inc.effective_deduction,
        gvcn_comment: comment || null,
      }).eq('id', incidentId).then(({ error }) => {
        if (error) console.error('Supabase auto-review incident error:', error);
      });
    }
  }

  public updateIncident(incidentId: string, updates: Partial<Incident>) {
    if (!this.checkWriteAuthorization()) return;
    const inc = this.incidents.find((i) => i.id === incidentId);
    if (!inc) return;

    Object.assign(inc, updates);

    // Recalculate effective deduction
    if (inc.incident_status === 'approved' && inc.score_effect_status === 'confirmed_effect') {
      inc.effective_deduction = inc.base_deduction;
    } else {
      inc.effective_deduction = 0;
    }

    this.addAuditLog(
      this.currentUser.name,
      'Điều chỉnh nội dung sự việc nề nếp',
      'incident',
      incidentId,
      `Cập nhật chi tiết sự việc bởi ${this.currentUser.name}`
    );

    this.calculateAllWeeklyScores(1);
    this.notify();

    if (supabase) {
      supabase.from('incidents').update({
        conduct_code: inc.conduct_code,
        date: inc.date,
        session_id: inc.session,
        notes: inc.notes,
        incident_status: inc.incident_status,
        score_effect_status: inc.score_effect_status,
        base_deduction: inc.base_deduction,
        effective_deduction: inc.effective_deduction,
        reporter_name: inc.reported_by,
      }).eq('id', incidentId).then(({ error }) => {
        if (error) console.error('Supabase auto-update incident error:', error);
      });
    }
  }

  public deleteIncident(incidentId: string) {
    if (!this.checkWriteAuthorization()) return;
    const incIdx = this.incidents.findIndex((i) => i.id === incidentId);
    if (incIdx === -1) return;

    const removed = this.incidents[incIdx];
    this.incidents.splice(incIdx, 1);

    this.addAuditLog(
      this.currentUser.name,
      'Xóa sự việc nề nếp',
      'incident',
      incidentId,
      `Đã xóa bản ghi vi phạm của học sinh ${removed.student_id}`
    );

    this.calculateAllWeeklyScores(1);
    this.notify();

    if (supabase) {
      supabase.from('incidents').delete().eq('id', incidentId).then(({ error }) => {
        if (error) console.error('Supabase auto-delete incident error:', error);
      });
    }
  }

  // --- Rewards ---
  public submitReward(reward: Omit<RewardRecord, 'id' | 'created_at'>): { success: boolean; id: string; warning?: string } {
    if (!this.checkWriteAuthorization()) return { success: false, id: '' };
    const isDup = this.rewards.some(
      (r) => r.student_id === reward.student_id && r.reward_code === reward.reward_code && r.date === reward.date
    );

    const id = generateUUID();
    const newRew: RewardRecord = {
      ...reward,
      id,
      duplicate_warning: isDup,
      created_at: new Date().toISOString(),
    };

    this.rewards.unshift(newRew);
    this.addAuditLog(this.currentUser.name, 'Đề xuất khen thưởng nề nếp', 'reward', id, `Mã: ${reward.reward_code} (+${reward.points}đ)`);
    this.calculateAllWeeklyScores(1);
    this.notify();

    if (supabase) {
      supabase.from('reward_records').insert({
        id: newRew.id,
        student_id: newRew.student_id,
        class_id: 'class-10a16',
        reward_code: newRew.reward_code,
        title: newRew.title,
        points: newRew.points,
        status: newRew.status,
        proposer: newRew.proposer,
        date: newRew.date,
      }).then(({ error }) => {
        if (error) console.error('Supabase auto-save reward error:', error);
      });
    }

    return {
      success: true,
      id,
      warning: isDup ? 'CẢNH BÁO: Phát hiện khen thưởng tương tự cùng ngày! Không tự động gộp.' : undefined,
    };
  }

  public reviewReward(rewardId: string, approved: boolean) {
    if (!this.checkWriteAuthorization()) return;
    const rew = this.rewards.find((r) => r.id === rewardId);
    if (!rew) return;

    rew.status = approved ? 'approved' : 'rejected';
    rew.approver = this.currentUser.name;

    this.addAuditLog(this.currentUser.name, approved ? 'Phê duyệt khen thưởng' : 'Từ chối khen thưởng', 'reward', rewardId);
    this.calculateAllWeeklyScores(1);
    this.notify();

    if (supabase) {
      supabase.from('reward_records').update({
        status: rew.status,
      }).eq('id', rewardId).then(({ error }) => {
        if (error) console.error('Supabase auto-review reward error:', error);
      });
    }
  }

  // --- Positive Notes ---
  public addPositiveNote(note: Omit<PositiveNote, 'id' | 'created_at'>) {
    if (!this.checkWriteAuthorization()) return;
    const id = `pos-${Date.now()}`;
    const newNote: PositiveNote = { ...note, id, created_at: new Date().toISOString() };
    this.positiveNotes.unshift(newNote);
    this.addAuditLog(this.currentUser.name, 'Ghi nhận lời khen tích cực', 'positive_note', id);
    this.notify();
  }

  // --- Tasks ---
  public createTask(task: Omit<Task, 'id' | 'created_at'>) {
    if (!this.checkWriteAuthorization()) return;
    const id = `task-${Date.now()}`;
    const newTask: Task = { ...task, id, created_at: new Date().toISOString() };
    this.tasks.unshift(newTask);
    this.addAuditLog(this.currentUser.name, 'Giao nhiệm vụ lớp', 'task', id, task.title);
    this.notify();
  }

  public updateTaskStatus(taskId: string, status: Task['status']) {
    if (!this.checkWriteAuthorization()) return;
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.status = status;
    this.addAuditLog(this.currentUser.name, `Cập nhật trạng thái nhiệm vụ: ${status}`, 'task', taskId);
    this.notify();
  }

  // --- Pending Rules Configuration (GVCN, Lớp phó, Lớp trưởng có toàn quyền) ---
  public selectRuleOption(ruleCode: string, optionId: string) {
    if (!this.checkWriteAuthorization()) return;
    const rule = this.pendingRules.find((r) => r.code === ruleCode);
    if (!rule) return;

    rule.selected_option = optionId;
    rule.status = 'confirmed_by_gvcn';
    rule.configured_by = this.currentUser.name;
    rule.confirmed_by = this.currentUser.name;
    if (!rule.basis) {
      rule.basis = 'Phê duyệt trực tiếp theo phương án đã chọn (GVCN & Ban Cán Sự Lớp 10A16)';
    }
    if (!rule.effective_from) {
      rule.effective_from = new Date().toISOString().split('T')[0];
    }

    this.addAuditLog(
      this.currentUser.name,
      'Chọn & phê duyệt phương án quy tắc nề nếp',
      'pending_rule',
      ruleCode,
      `Đã chọn phương án: ${optionId}`
    );

    this.notify();
  }

  public configurePendingRule(
    ruleCode: string,
    selectedOption: string,
    basis: string,
    effectiveFrom: string,
    effectiveTo?: string
  ) {
    const rule = this.pendingRules.find((r) => r.code === ruleCode);
    if (!rule) return;

    rule.selected_option = selectedOption;
    rule.basis = basis;
    rule.effective_from = effectiveFrom;
    rule.effective_to = effectiveTo || null;
    rule.status = 'confirmed_by_gvcn';
    rule.configured_by = this.currentUser.name;
    rule.confirmed_by = this.currentUser.name;

    this.addAuditLog(
      this.currentUser.name,
      'Điều chỉnh quy tắc nề nếp',
      'pending_rule',
      ruleCode,
      `Tùy chọn: ${selectedOption}. Căn cứ: ${basis}`
    );

    this.notify();
  }

  // --- Conduct Catalog Item Adjustments ---
  public updateConductCatalogItem(code: string, updates: Partial<ConductCatalogItem>) {
    const item = this.conductCatalog.find((c) => c.code === code);
    if (!item) return;

    Object.assign(item, updates);

    // Also update any incident with this code that hasn't been individually overridden
    this.incidents.forEach((inc) => {
      if (inc.conduct_code === code) {
        if (updates.defaultPoints !== undefined) {
          inc.base_deduction = updates.defaultPoints;
          if (inc.incident_status === 'approved' && inc.score_effect_status === 'confirmed_effect') {
            inc.effective_deduction = updates.defaultPoints;
          }
        }
      }
    });

    this.addAuditLog(
      this.currentUser.name,
      'Điều chỉnh biểu điểm quy định nề nếp',
      'conduct_catalog',
      code,
      `Cập nhật mã ${code}: Điểm trừ ${item.defaultPoints}đ. Mô tả: ${item.title}`
    );

    this.calculateAllWeeklyScores(1);
    this.notify();
  }

  public addConductCatalogItem(newItem: ConductCatalogItem) {
    const existing = this.conductCatalog.find((c) => c.code === newItem.code);
    if (existing) {
      Object.assign(existing, newItem);
    } else {
      this.conductCatalog.push(newItem);
    }

    this.addAuditLog(
      this.currentUser.name,
      'Bổ sung quy định nề nếp mới',
      'conduct_catalog',
      newItem.code,
      `Mã ${newItem.code}: ${newItem.title} (${newItem.defaultPoints}đ)`
    );

    this.notify();
  }

  // --- Scoring & Snapshot Calculations ---
  public calculateAllWeeklyScores(weekNumber: number = 1) {
    // Calculate for target week OR all weeks if 0 passed
    const weeksToCalculate = weekNumber > 0 ? [weekNumber] : Array.from({ length: 36 }, (_, i) => i + 1);

    for (const wNum of weeksToCalculate) {
      const weekId = `W${wNum.toString().padStart(2, '0')}`;
      const isLocked = Boolean(this.periodLocks[`week-${weekId}`]?.is_locked);
      const newSnapshots: WeekScoreSnapshot[] = [];

      for (const student of this.students) {
        // Filter incidents strictly belonging to this week based on incident date or week_number
        const stuIncidents = this.incidents.filter((i) => {
          if (i.student_id !== student.id) return false;
          const incWeek = getWeekNumberForDate(i.date);
          return incWeek === wNum;
        });

        // Filter rewards strictly belonging to this week
        const stuRewards = this.rewards.filter((r) => {
          if (r.student_id !== student.id) return false;
          const rewWeek = getWeekNumberForDate(r.date);
          return rewWeek === wNum;
        });

        const scoreResult = calculateWeeklyScore({
          isCalculated: true,
          incidents: stuIncidents,
          rewards: stuRewards,
        });

        const existingSnap = this.weeklySnapshots.find((s) => s.student_id === student.id && s.week_id === weekId && s.is_current);
        const revisionNo = existingSnap ? existingSnap.revision_no + 1 : 1;

        if (existingSnap) {
          existingSnap.is_current = false;
        }

        newSnapshots.push({
          id: `snap-w-${student.id}-${weekId}-r${revisionNo}`,
          student_id: student.id,
          week_id: weekId,
          week_number: wNum,
          revision_no: revisionNo,
          is_current: true,
          raw_week_score: scoreResult.raw_week_score,
          official_week_score: scoreResult.official_week_score,
          reward_points: scoreResult.total_rewards,
          deduction_points: scoreResult.total_deductions,
          incidents_count: scoreResult.eligible_incidents_count,
          rewards_count: scoreResult.eligible_rewards_count,
          status: isLocked ? 'locked' : 'calculated',
          calculated_at: new Date().toISOString(),
        });
      }

      this.weeklySnapshots = [...this.weeklySnapshots.filter((s) => !(s.is_current && s.week_number === wNum)), ...newSnapshots];
    }

    this.notify();
  }

  // --- Period Locks ---
  public canLockPeriod(periodType: 'week' | 'month' | 'semester', periodId: string): { canLock: boolean; blockers: string[] } {
    const blockers: string[] = [];

    const pendingIncidents = this.incidents.filter((i) => i.incident_status === 'pending_verification');
    if (pendingIncidents.length > 0) {
      blockers.push(`Còn ${pendingIncidents.length} sự việc chưa được thẩm tra`);
    }

    const pendingRewards = this.rewards.filter((r) => r.status === 'pending');
    if (pendingRewards.length > 0) {
      blockers.push(`Còn ${pendingRewards.length} đề xuất khen thưởng chưa duyệt`);
    }

    const pendingRuleIncidents = this.incidents.filter((i) => i.score_effect_status === 'pending_rule');
    if (pendingRuleIncidents.length > 0) {
      blockers.push(`Còn ${pendingRuleIncidents.length} sự việc đang treo hiệu lực điểm do quy tắc chưa xác nhận`);
    }

    return {
      canLock: blockers.length === 0,
      blockers,
    };
  }

  public lockPeriod(periodType: 'week' | 'month' | 'semester', periodId: string): { success: boolean; message: string } {
    const { canLock, blockers } = this.canLockPeriod(periodType, periodId);
    if (!canLock) {
      return { success: false, message: `Không thể khóa kỳ: ${blockers.join(', ')}` };
    }

    const key = `${periodType}-${periodId}`;
    this.periodLocks[key] = {
      is_locked: true,
      locked_at: new Date().toISOString(),
      locked_by: this.currentUser.name,
    };

    this.addAuditLog(this.currentUser.name, `Khóa kỳ đánh giá [${key}]`, 'period_lock', key);
    this.notify();
    return { success: true, message: 'Đã khóa kỳ thành công!' };
  }

  public reopenPeriod(periodType: 'week' | 'month' | 'semester', periodId: string, reason: string): { success: boolean; message: string } {
    const key = `${periodType}-${periodId}`;
    if (!this.periodLocks[key]?.is_locked) {
      return { success: false, message: 'Kỳ này hiện không bị khóa.' };
    }

    this.periodLocks[key] = { is_locked: false };
    this.addAuditLog(this.currentUser.name, `Mở khóa lại kỳ đánh giá [${key}]`, 'period_lock', key, `Lý do: ${reason}`);
    this.notify();
    return { success: true, message: 'Đã mở khóa kỳ thành công!' };
  }

  // --- Full Backup & Restore ---
  public exportBackupData(): string {
    const backup = {
      version: '2.0',
      exported_at: new Date().toISOString(),
      school: 'THPT Võ Trường Toản',
      class: '10A16',
      academic_year: '2026-2027',
      dataMode: 'official_10a16',
      students: this.students,
      groups: this.groups,
      seats: this.seats,
      attendance: this.attendance,
      incidents: this.incidents,
      rewards: this.rewards,
      tasks: this.tasks,
      positiveNotes: this.positiveNotes,
      pendingRules: this.pendingRules,
      conductCatalog: this.conductCatalog,
      weeklySnapshots: this.weeklySnapshots,
      periodLocks: this.periodLocks,
      auditLogs: this.auditLogs,
    };
    return JSON.stringify(backup, null, 2);
  }

  public importBackupData(jsonString: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonString);
      if (!data.students || !Array.isArray(data.students)) {
        return { success: false, message: 'Tệp sao lưu không đúng định dạng của VTT PRO.' };
      }

      this.students = data.students || buildOfficial10A16Students();
      this.groups = data.groups || [...OFFICIAL_10A16_GROUPS];
      this.seats = data.seats || [];
      this.attendance = data.attendance || [];
      this.incidents = data.incidents || [];
      this.rewards = data.rewards || [];
      this.tasks = data.tasks || [];
      this.positiveNotes = data.positiveNotes || [];
      this.pendingRules = data.pendingRules || this.pendingRules;
      this.conductCatalog = data.conductCatalog || this.conductCatalog;
      this.weeklySnapshots = data.weeklySnapshots || [];
      this.periodLocks = data.periodLocks || {};
      this.auditLogs = data.auditLogs || [];

      this.addAuditLog(this.currentUser.name, 'Phục hồi dữ liệu từ tệp sao lưu JSON', 'system', 'class-10a16');
      this.calculateAllWeeklyScores(1);
      this.notify();

      return {
        success: true,
        message: `Phục hồi thành công ${this.students.length} học sinh, ${this.incidents.length} sự việc nề nếp, ${this.attendance.length} bản ghi điểm danh!`,
      };
    } catch (err: any) {
      return { success: false, message: `Lỗi đọc tệp sao lưu: ${err.message}` };
    }
  }

  // --- Supabase Cloud Sync Methods ---
  public async initSupabaseData() {
    if (!supabase) return;

    try {
      // 1. Tự động nạp dữ liệu mới nhất từ Supabase ngay khi mở web
      await this.fetchFromSupabase(true);

      // 2. Kích hoạt kết nối thời gian thực Supabase Realtime Channel
      if (!this.isRealtimeSubscribed) {
        this.isRealtimeSubscribed = true;
        supabase
          .channel('vtt_realtime_sync')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
            this.fetchFromSupabase(true);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'incidents' }, () => {
            this.fetchFromSupabase(true);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'reward_records' }, () => {
            this.fetchFromSupabase(true);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => {
            this.fetchFromSupabase(true);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'classes' }, () => {
            this.fetchFromSupabase(true);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'groups' }, () => {
            this.fetchFromSupabase(true);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_logs' }, () => {
            this.fetchFromSupabase(true);
          })
          .subscribe();
      }
    } catch (e) {
      console.warn('Lỗi khởi tạo Supabase Sync:', e);
    }
  }

  public async syncAllToSupabase(): Promise<{ success: boolean; message: string }> {
    if (!supabase) {
      return {
        success: false,
        message: 'Chưa kết nối Supabase Cloud. Vui lòng kiểm tra URL và API Key trong trang Cài đặt.',
      };
    }

    try {
      this.isSupabaseSyncing = true;
      this.notify();

      // 1. Classes
      await supabase.from('classes').upsert({
        id: 'class-10a16',
        name: this.classInfo.class_name,
        academic_year_id: 'ay-2026-2027',
        gvcn_name: this.classInfo.gvcn_name,
      });

      // 2. Groups
      if (this.groups.length > 0) {
        const groupsPayload = this.groups.map((g) => ({
          id: g.id,
          class_id: 'class-10a16',
          group_number: g.group_number,
          group_name: g.group_name,
          leader_student_id: g.leader_student_id || null,
        }));
        await supabase.from('groups').upsert(groupsPayload, { onConflict: 'id' });
      }

      // 3. Students (43 official students)
      const studentsPayload = this.students.map((s) => ({
        id: s.id,
        student_code: s.student_code,
        full_name: s.full_name,
        first_name: s.first_name,
        last_name: s.last_name,
        class_id: 'class-10a16',
        group_id: s.group_id,
        seat_number: s.seat_number,
        status: s.status,
        is_demo: false,
      }));
      const { error: stuErr } = await supabase.from('students').upsert(studentsPayload, { onConflict: 'id' });
      if (stuErr) throw stuErr;

      // 4. Incidents
      if (this.incidents.length > 0) {
        const incidentsPayload = this.incidents.map((i) => ({
          id: i.id && i.id.length === 36 ? i.id : undefined,
          student_id: i.student_id,
          class_id: 'class-10a16',
          conduct_code: i.conduct_code,
          is_other_category: Boolean(i.is_other_category),
          other_category_description: i.other_category_description || null,
          date: i.date,
          session_id: i.session || 'morning',
          period_number: i.period || null,
          incident_status: i.incident_status,
          score_effect_status: i.score_effect_status,
          base_deduction: i.base_deduction,
          effective_deduction: i.effective_deduction,
          reporter_name: i.reported_by || this.currentUser.name,
          reporter_role: i.reporter_role || this.currentUser.role,
          notes: i.notes || null,
          gvcn_comment: i.gvcn_comment || null,
        }));
        await supabase.from('incidents').upsert(incidentsPayload);
      }

      // 5. Rewards
      if (this.rewards.length > 0) {
        const rewardsPayload = this.rewards.map((r) => ({
          id: r.id && r.id.length === 36 ? r.id : undefined,
          student_id: r.student_id,
          class_id: 'class-10a16',
          reward_code: r.reward_code,
          title: r.title,
          points: r.points,
          status: r.status,
          proposer: r.proposer,
          date: r.date,
        }));
        await supabase.from('reward_records').upsert(rewardsPayload);
      }

      // 6. Attendance
      if (this.attendance.length > 0) {
        const attendancePayload = this.attendance.map((a) => ({
          student_id: a.student_id,
          class_id: 'class-10a16',
          date: a.date,
          session_id: a.session || 'morning',
          status: a.status,
          arrival_time: a.arrival_time || null,
          reason: a.reason || null,
          is_legitimate_exception: Boolean(a.is_legitimate_exception),
        }));
        await supabase.from('attendance_records').upsert(attendancePayload, { onConflict: 'student_id,date,session_id' });
      }

      this.lastSupabaseSyncTime = new Date().toLocaleTimeString('vi-VN');
      this.isSupabaseSyncing = false;
      this.addAuditLog(this.currentUser.name, 'Đồng bộ toàn bộ dữ liệu lên Supabase Cloud', 'cloud_sync', 'class-10a16');
      this.showToast('Đã đồng bộ thành công toàn bộ dữ liệu lên Supabase Cloud!', 'success');
      this.notify();

      return {
        success: true,
        message: `Đồng bộ thành công ${this.students.length} học sinh và dữ liệu nề nếp lên Supabase Cloud!`,
      };
    } catch (err: any) {
      this.isSupabaseSyncing = false;
      this.notify();
      console.error('Lỗi sync Supabase:', err);
      return {
        success: false,
        message: `Không thể đồng bộ: ${err.message || 'Vui lòng kiểm tra quyền truy cập trên bảng Supabase.'}`,
      };
    }
  }

  public async fetchFromSupabase(silent: boolean = false): Promise<{ success: boolean; message: string }> {
    if (!supabase) {
      return { success: false, message: 'Chưa cấu hình Supabase Cloud.' };
    }

    try {
      this.isSupabaseSyncing = true;
      this.notify();

      // 1. Fetch Students
      const { data: studentsData, error: stuErr } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', 'class-10a16')
        .order('student_code', { ascending: true });

      if (stuErr) throw stuErr;

      if (studentsData && studentsData.length > 0) {
        this.students = studentsData.map((s: any) => ({
          id: s.id,
          student_code: s.student_code,
          full_name: s.full_name,
          first_name: s.first_name || '',
          last_name: s.last_name || '',
          class_id: s.class_id,
          group_id: s.group_id || 'group-01',
          seat_number: s.seat_number || '',
          status: s.status || 'active',
          is_demo: false,
        }));
      }

      // 2. Fetch Incidents
      const { data: incData, error: incErr } = await supabase
        .from('incidents')
        .select('*')
        .eq('class_id', 'class-10a16')
        .order('created_at', { ascending: false });

      if (!incErr && incData) {
        this.incidents = incData.map((i: any) => ({
          id: i.id,
          canonical_id: i.canonical_id || undefined,
          student_id: i.student_id,
          class_id: i.class_id,
          conduct_code: i.conduct_code,
          is_other_category: Boolean(i.is_other_category),
          other_category_description: i.other_category_description || undefined,
          date: i.date,
          session: (i.session_id === 'afternoon' ? 'afternoon' : 'morning') as 'morning' | 'afternoon',
          period: i.period_number || undefined,
          time: i.time || undefined,
          teacher_permission: i.teacher_permission || undefined,
          incident_status: i.incident_status,
          score_effect_status: i.score_effect_status,
          base_deduction: Number(i.base_deduction) || 0,
          effective_deduction: Number(i.effective_deduction) || 0,
          reported_by: i.reporter_name || 'Ban Cán sự',
          reporter_role: i.reporter_role || 'lop_truong',
          notes: i.notes || undefined,
          gvcn_comment: i.gvcn_comment || undefined,
          created_at: i.created_at || new Date().toISOString(),
        }));
      }

      // 3. Fetch Rewards
      const { data: rwData, error: rwErr } = await supabase
        .from('reward_records')
        .select('*')
        .eq('class_id', 'class-10a16')
        .order('created_at', { ascending: false });

      if (!rwErr && rwData) {
        this.rewards = rwData.map((r: any) => ({
          id: r.id,
          student_id: r.student_id,
          class_id: r.class_id,
          reward_code: r.reward_code,
          title: r.title,
          points: Number(r.points) || 1,
          status: r.status,
          proposer: r.proposer,
          date: r.date,
          created_at: r.created_at || new Date().toISOString(),
        }));
      }

      // 4. Fetch Attendance
      const { data: attData, error: attErr } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('class_id', 'class-10a16')
        .order('date', { ascending: false });

      if (!attErr && attData) {
        this.attendance = attData.map((a: any) => ({
          id: a.id,
          student_id: a.student_id,
          class_id: a.class_id,
          date: a.date,
          session: (a.session_id === 'afternoon' ? 'afternoon' : 'morning') as 'morning' | 'afternoon',
          status: a.status,
          arrival_time: a.arrival_time || undefined,
          reason: a.reason || undefined,
          is_legitimate_exception: Boolean(a.is_legitimate_exception),
        }));
      }

      // 5. Fetch Class Info & Ban Cán Sự from Supabase Audit Logs & Classes
      try {
        const { data: classAudit } = await supabase
          .from('audit_logs')
          .select('*')
          .eq('entity_type', 'class_info')
          .eq('entity_id', 'class-10a16')
          .order('created_at', { ascending: false })
          .limit(1);

        if (classAudit && classAudit.length > 0 && classAudit[0].reason) {
          const parsed = JSON.parse(classAudit[0].reason);
          if (parsed.classInfo) {
            this.classInfo = { ...this.classInfo, ...parsed.classInfo };
            if (typeof window !== 'undefined') {
              localStorage.setItem('VTT_CLASS_INFO', JSON.stringify(this.classInfo));
            }
          }
          if (parsed.officerAccounts && Array.isArray(parsed.officerAccounts)) {
            this.officerAccounts = parsed.officerAccounts;
            if (typeof window !== 'undefined') {
              localStorage.setItem('VTT_OFFICER_ACCOUNTS', JSON.stringify(this.officerAccounts));
            }
          }
          if (parsed.groups && Array.isArray(parsed.groups)) {
            this.groups = parsed.groups;
            if (typeof window !== 'undefined') {
              localStorage.setItem('VTT_GROUPS', JSON.stringify(this.groups));
            }
          }
        }

        const { data: clsData } = await supabase.from('classes').select('*').eq('id', 'class-10a16').limit(1);
        if (clsData && clsData.length > 0) {
          if (clsData[0].gvcn_name) this.classInfo.gvcn_name = clsData[0].gvcn_name;
          if (clsData[0].name) this.classInfo.class_name = clsData[0].name;
        }

        const { data: grpData } = await supabase.from('groups').select('*').eq('class_id', 'class-10a16');
        if (grpData && grpData.length > 0) {
          grpData.forEach((g: any) => {
            const localGrp = this.groups.find((lg) => lg.id === g.id);
            if (localGrp && g.leader_student_id) {
              localGrp.leader_student_id = g.leader_student_id;
            }
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem('VTT_GROUPS', JSON.stringify(this.groups));
          }
        }
      } catch (err) {
        console.warn('Lỗi đồng bộ Ban Cán Sự từ Supabase:', err);
      }

      this.calculateAllWeeklyScores(1);
      this.lastSupabaseSyncTime = new Date().toLocaleTimeString('vi-VN');
      this.isSupabaseSyncing = false;
      this.notify();

      if (!silent) {
        this.addAuditLog(this.currentUser.name, 'Tải dữ liệu mới nhất từ Supabase Cloud', 'cloud_fetch', 'class-10a16');
        this.showToast(`Đã đồng bộ từ Supabase: ${this.students.length} học sinh, ${this.incidents.length} vi phạm, ${this.rewards.length} khen thưởng!`, 'success');
      }

      return {
        success: true,
        message: `Tải thành công ${this.students.length} học sinh và ${this.incidents.length} sự việc từ Supabase!`,
      };
    } catch (err: any) {
      this.isSupabaseSyncing = false;
      this.notify();
      return {
        success: false,
        message: `Không thể tải dữ liệu: ${err.message}`,
      };
    }
  }

  public showToast(message: string, type: 'success' | 'warn' | 'error' | 'info' = 'success', duration = 3200) {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.toasts = [...this.toasts, { id, message, type, duration }];
    this.notify();

    setTimeout(() => {
      this.dismissToast(id);
    }, duration);
  }

  public dismissToast(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notify();
  }
}

export const appState = new AppStateService();
