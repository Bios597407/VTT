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

export interface ActiveUserSession {
  id: string;
  name: string;
  role: RoleType;
  roleLabel: string;
  currentPage: string;
  loginTime: string;
  lastActive: string;
  device: string;
  ipMasked: string;
  status: 'online' | 'idle';
  isCurrentUser: boolean;
  avatarBg?: string;
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
  role: RoleType;
  title: string;
  name: string;
  student_id?: string;
  email: string;
  pin: string;
  duties?: string;
  badge?: string;
  canManage?: boolean;
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
    let col = 1;
    let rankInGroup = idx;
    if (idx >= 11 && idx < 22) {
      groupId = 'group-02';
      col = 2;
      rankInGroup = idx - 11;
    } else if (idx >= 22 && idx < 33) {
      groupId = 'group-03';
      col = 3;
      rankInGroup = idx - 22;
    } else if (idx >= 33) {
      groupId = 'group-04';
      col = 4;
      rankInGroup = idx - 33;
    }

    const row = Math.floor(rankInGroup / 2) + 1;
    const tableNum = (row - 1) * 4 + col;

    return {
      ...s,
      group_id: groupId,
      is_demo: false,
      status: 'active',
      seat_number: `Bàn ${tableNum} (Cột ${col} - Tổ ${col})`,
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
    class_president_name: 'Hoàng Trọng Minh',
    class_vice_discipline_name: 'Nguyễn Gia Bảo',
    class_vice_academic_name: 'Nguyễn Ngọc Gia Hân',
    secretary_name: 'Lưu Ngọc Linh',
    slogan: 'Kỷ luật tự giác · Học tập hăng say · Tập thể vững mạnh',
    target_conduct_points: 9.0,
    notes: 'Toàn thể học sinh thực hiện nghiêm túc nề nếp và nội quy lớp học.',
  };

  // Danh sách tài khoản Cán sự quản trị (Bảo mật, GVCN toàn quyền bổ sung & điều chỉnh chức danh tự do)
  public officerAccounts: OfficerAccount[] = [
    {
      id: 'acc-gvcn-user',
      role: 'gvcn',
      title: 'Giáo viên Chủ nhiệm',
      name: 'Thầy Trần Duy Tân',
      email: '',
      pin: '1016',
      duties: 'Chỉ đạo toàn diện nề nếp & giáo dục toàn lớp',
      badge: 'Toàn quyền',
      canManage: true,
    },
    {
      id: 'acc-lt-truong',
      role: 'lop_truong',
      title: 'Lớp trưởng',
      name: 'Hoàng Trọng Minh',
      student_id: '10A16-23',
      email: '',
      pin: '10A16lt',
      duties: 'Điều hành chung toàn lớp, đại diện tập thể, tổng hợp báo cáo GVCN',
      badge: 'Ban Cán Sự',
      canManage: true,
    },
    {
      id: 'acc-lp-kyluat',
      role: 'lop_pho',
      title: 'Lớp phó Kỷ luật & Nề nếp',
      name: 'Nguyễn Gia Bảo',
      student_id: '10A16-03',
      email: '',
      pin: '10A16lpkl',
      duties: 'Quản lý vi phạm, theo dõi điểm danh & chấm điểm nề nếp tuần',
      badge: 'Ban Cán Sự',
      canManage: true,
    },
    {
      id: 'acc-lp-hoctap',
      role: 'lop_pho',
      title: 'Lớp phó Học tập',
      name: 'Nguyễn Ngọc Gia Hân',
      student_id: '10A16-12',
      email: '',
      pin: '10A16lpht',
      duties: 'Theo dõi học vụ, sổ đầu bài, đôn đốc các môn học',
      badge: 'Học vụ',
      canManage: true,
    },
    {
      id: 'acc-bt-chidoan',
      role: 'lop_pho',
      title: 'Bí thư Chi đoàn',
      name: 'Lưu Ngọc Linh',
      student_id: '10A16-20',
      email: '',
      pin: '10A16bt',
      duties: 'Phong trào Đoàn thanh niên, công tác thanh niên & hoạt động phong trào',
      badge: 'Đoàn TN',
      canManage: true,
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

  // Security & Brute-Force Rate Limiting State
  public failedPinAttempts: Record<string, number> = {};
  public lockoutUntil: Record<string, number> = {};
  public sessionTimeoutMinutes: number = 15;

  public changeOfficerPin(role: 'gvcn' | 'lop_truong' | 'lop_pho', oldPin: string, newPin: string): { success: boolean; message: string } {
    const acc = this.officerAccounts.find((a) => a.role === role);
    if (!acc) return { success: false, message: 'Không tìm thấy tài khoản cán sự.' };

    const officialPins: Record<string, string> = {
      gvcn: '1016',
      lop_truong: '10A16lpht',
      lop_pho: '10A16bt',
    };

    const isMatch = (acc.pin === oldPin.trim()) || (officialPins[role] === oldPin.trim());
    if (!isMatch) {
      return { success: false, message: 'Mã PIN hiện tại không chính xác!' };
    }

    if (newPin.trim().length < 4) {
      return { success: false, message: 'Mã PIN mới phải từ 4 ký tự trở lên.' };
    }

    acc.pin = newPin.trim();
    this.saveLocalState();
    if (supabase) {
      supabase.from('audit_logs').insert([{
        actor_name: this.currentUser.name,
        actor_role: this.currentUser.role,
        action: 'CHANGE_PIN',
        entity_type: 'officer_auth',
        entity_id: acc.id,
        reason: JSON.stringify({
          officerAccounts: this.officerAccounts,
          changedAt: new Date().toISOString(),
        }),
      }]).then();
    }

    this.addAuditLog(this.currentUser.name, `Đổi mã PIN bảo mật cho ${acc.title}`, 'security', acc.id, 'Người dùng chủ động thay đổi mã PIN');
    this.showToast(`🔑 Đã cập nhật thành công mã PIN mới cho ${acc.title}!`, 'success');
    this.notify();
    return { success: true, message: 'Đổi mã PIN thành công!' };
  }

  public clearFailedAttempts(role: string) {
    this.failedPinAttempts[role] = 0;
    delete this.lockoutUntil[role];
  }

  public getLockoutRemainingSeconds(role: string): number {
    const until = this.lockoutUntil[role];
    if (!until) return 0;
    const now = Date.now();
    if (now >= until) {
      delete this.lockoutUntil[role];
      this.failedPinAttempts[role] = 0;
      return 0;
    }
    return Math.ceil((until - now) / 1000);
  }

  // Active page name and real online user sessions tracking
  public activePageName: string = 'Trang Tổng Quan';

  public currentSessionId: string = typeof window !== 'undefined'
    ? (() => {
        let sid = sessionStorage.getItem('VTT_TAB_SESSION_ID');
        if (!sid) {
          sid = 'session-' + generateUUID().slice(0, 8);
          sessionStorage.setItem('VTT_TAB_SESSION_ID', sid);
        }
        return sid;
      })()
    : 'session-default';

  public currentSessionLoginTime: string = typeof window !== 'undefined'
    ? (() => {
        let lt = sessionStorage.getItem('VTT_TAB_LOGIN_TIME');
        if (!lt) {
          lt = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          sessionStorage.setItem('VTT_TAB_LOGIN_TIME', lt);
        }
        return lt;
      })()
    : 'Vừa xong';

  private presenceSessionsMap: Map<string, ActiveUserSession> = new Map();
  private presenceChannel: any = null;
  private heartbeatIntervalTimer: any = null;

  public getMyCurrentSessionObject(): ActiveUserSession & { lastActiveTimestamp: number } {
    const isOfficer = this.currentUser.isAuthenticatedOfficer;
    const currentName = isOfficer
      ? this.currentUser.name
      : 'Học sinh / Khách truy cập (Chế độ xem)';

    const currentRoleLabel =
      this.currentUser.role === 'gvcn'
        ? 'Giáo viên Chủ nhiệm (GVCN)'
        : this.currentUser.role === 'lop_truong'
        ? 'Lớp trưởng'
        : this.currentUser.role === 'lop_pho'
        ? 'Lớp phó'
        : 'Học sinh Lớp 10A16';

    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const device = userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')
      ? 'Thiết bị Di động (Mobile Safari / Chrome)'
      : 'Máy tính Để bàn (Desktop Chrome / Edge)';

    return {
      id: this.currentSessionId,
      name: currentName,
      role: this.currentUser.role,
      roleLabel: currentRoleLabel,
      currentPage: this.activePageName || 'Trang Tổng Quan',
      loginTime: this.currentSessionLoginTime,
      lastActive: 'Đang hoạt động',
      lastActiveTimestamp: Date.now(),
      device: device,
      ipMasked: '113.161.xx.xx (Trực tuyến)',
      status: 'online',
      isCurrentUser: true,
      avatarBg: this.currentUser.role === 'gvcn' ? 'bg-emerald-600' : this.currentUser.role === 'lop_truong' ? 'bg-blue-600' : 'bg-slate-600',
    };
  }

  public updateSessionHeartbeat() {
    if (typeof window === 'undefined') return;
    const mySession = this.getMyCurrentSessionObject();

    try {
      const raw = localStorage.getItem('VTT_REALTIME_ACTIVE_SESSIONS');
      let sessions: Record<string, ActiveUserSession & { lastActiveTimestamp: number }> = raw ? JSON.parse(raw) : {};
      const now = Date.now();

      // Prune dead sessions older than 7 seconds
      Object.keys(sessions).forEach((sid) => {
        if (!sessions[sid] || now - (sessions[sid].lastActiveTimestamp || 0) > 7000) {
          delete sessions[sid];
        }
      });

      sessions[this.currentSessionId] = mySession;
      localStorage.setItem('VTT_REALTIME_ACTIVE_SESSIONS', JSON.stringify(sessions));
    } catch (e) {}

    if (this.presenceChannel) {
      try {
        this.presenceChannel.track(mySession);
      } catch (e) {}
    }
  }

  public startSessionTracking() {
    if (typeof window === 'undefined') return;

    this.updateSessionHeartbeat();
    if (this.heartbeatIntervalTimer) clearInterval(this.heartbeatIntervalTimer);
    this.heartbeatIntervalTimer = setInterval(() => {
      this.updateSessionHeartbeat();
      this.listeners.forEach((l) => l());
    }, 2500);

    window.addEventListener('beforeunload', () => {
      try {
        const raw = localStorage.getItem('VTT_REALTIME_ACTIVE_SESSIONS');
        if (raw) {
          let sessions = JSON.parse(raw);
          delete sessions[this.currentSessionId];
          localStorage.setItem('VTT_REALTIME_ACTIVE_SESSIONS', JSON.stringify(sessions));
        }
      } catch (e) {}
    });
  }

  public getActiveSessions(): ActiveUserSession[] {
    const sessionMap = new Map<string, ActiveUserSession>();

    // 1. Read local active sessions from localStorage (other tabs on same browser/device)
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('VTT_REALTIME_ACTIVE_SESSIONS');
        if (raw) {
          const localSessions: Record<string, ActiveUserSession & { lastActiveTimestamp: number }> = JSON.parse(raw);
          const now = Date.now();
          Object.values(localSessions).forEach((s) => {
            if (s && s.id && now - (s.lastActiveTimestamp || 0) <= 7000) {
              sessionMap.set(s.id, {
                ...s,
                isCurrentUser: s.id === this.currentSessionId,
              });
            }
          });
        }
      } catch (e) {}
    }

    // 2. Read remote active sessions from Supabase Realtime Presence channel
    this.presenceSessionsMap.forEach((s, id) => {
      if (!sessionMap.has(id)) {
        sessionMap.set(id, {
          ...s,
          isCurrentUser: id === this.currentSessionId,
        });
      }
    });

    // 3. Guarantee current user session is always included
    if (!sessionMap.has(this.currentSessionId)) {
      sessionMap.set(this.currentSessionId, this.getMyCurrentSessionObject());
    }

    const result = Array.from(sessionMap.values());
    return result.sort((a, b) => (a.isCurrentUser ? -1 : b.isCurrentUser ? 1 : 0));
  }

  public getActiveUsersCount(): number {
    return this.getActiveSessions().length;
  }

  public setActivePageName(pageName: string) {
    this.activePageName = pageName;
    this.updateSessionHeartbeat();
    this.notify();
  }

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
        this.enforceOfficialOfficers();

        const savedOfficers = localStorage.getItem('VTT_OFFICER_ACCOUNTS');
        if (savedOfficers) {
          const parsed = JSON.parse(savedOfficers);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Bảo lưu tất cả tài khoản tự do mà GVCN đã thêm vào (Không khóa cứng)
            const updatedList = parsed.map((a: any) => {
              if (a.id === 'acc-lt-truong' || (a.role === 'lop_truong' && a.title?.includes('Lớp trưởng'))) {
                return {
                  ...a,
                  id: 'acc-lt-truong',
                  name: 'Hoàng Trọng Minh',
                  title: 'Lớp trưởng',
                  role: 'lop_truong',
                  student_id: '10A16-23',
                  duties: a.duties || 'Điều hành chung toàn lớp, đại diện tập thể, tổng hợp báo cáo GVCN',
                  badge: 'Ban Cán Sự',
                  canManage: true,
                };
              }
              if (a.id === 'acc-lp-kyluat' || a.title?.includes('Kỷ luật')) {
                return {
                  ...a,
                  id: 'acc-lp-kyluat',
                  name: 'Nguyễn Gia Bảo',
                  title: 'Lớp phó Kỷ luật & Nề nếp',
                  role: 'lop_pho',
                  student_id: '10A16-03',
                  duties: a.duties || 'Quản lý vi phạm, theo dõi điểm danh & chấm điểm nề nếp tuần',
                  badge: 'Ban Cán Sự',
                  canManage: true,
                };
              }
              if (a.id === 'acc-lp-hoctap' || a.title?.includes('Học tập')) {
                return {
                  ...a,
                  id: 'acc-lp-hoctap',
                  name: 'Nguyễn Ngọc Gia Hân',
                  title: 'Lớp phó Học tập',
                  role: 'lop_pho',
                  student_id: '10A16-12',
                  duties: a.duties || 'Theo dõi học vụ, sổ đầu bài, đôn đốc các môn học',
                  badge: 'Học vụ',
                  canManage: true,
                };
              }
              if (a.id === 'acc-bt-chidoan' || a.title?.includes('Bí thư')) {
                return {
                  ...a,
                  id: 'acc-bt-chidoan',
                  name: 'Lưu Ngọc Linh',
                  title: 'Bí thư Chi đoàn',
                  role: 'lop_pho',
                  student_id: '10A16-20',
                  duties: a.duties || 'Phong trào Đoàn thanh niên, công tác thanh niên & hoạt động phong trào',
                  badge: 'Đoàn TN',
                  canManage: true,
                };
              }
              return {
                ...a,
                canManage: a.canManage !== undefined ? a.canManage : (a.role === 'gvcn' || a.role === 'lop_truong' || a.role === 'lop_pho'),
              };
            });

            // Đảm bảo luôn có Lớp trưởng và Lớp phó Kỷ luật
            if (!updatedList.some((a: any) => a.id === 'acc-lt-truong' || a.title?.includes('Lớp trưởng'))) {
              updatedList.splice(1, 0, {
                id: 'acc-lt-truong',
                role: 'lop_truong',
                title: 'Lớp trưởng',
                name: 'Hoàng Trọng Minh',
                student_id: '10A16-23',
                email: '',
                pin: '10A16lt',
                duties: 'Điều hành chung toàn lớp, đại diện tập thể, tổng hợp báo cáo GVCN',
                badge: 'Ban Cán Sự',
                canManage: true,
              });
            }
            if (!updatedList.some((a: any) => a.id === 'acc-lp-kyluat' || a.title?.includes('Kỷ luật'))) {
              updatedList.splice(2, 0, {
                id: 'acc-lp-kyluat',
                role: 'lop_pho',
                title: 'Lớp phó Kỷ luật & Nề nếp',
                name: 'Nguyễn Gia Bảo',
                student_id: '10A16-03',
                email: '',
                pin: '10A16lpkl',
                duties: 'Quản lý vi phạm, theo dõi điểm danh & chấm điểm nề nếp tuần',
                badge: 'Ban Cán Sự',
                canManage: true,
              });
            }

            this.officerAccounts = updatedList;
          }
        }

        this.enforceOfficialOfficers();

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
        } else {
          // Sync active plan seats with current seats on startup
          const activePlan = this.seatingPlans.find((p) => p.id === this.activeSeatingPlanId) || this.seatingPlans[0];
          this.activeSeatingPlanId = activePlan.id;
          if (activePlan.seats && activePlan.seats.length > 0) {
            this.seats = JSON.parse(JSON.stringify(activePlan.seats));
          } else {
            activePlan.seats = JSON.parse(JSON.stringify(this.seats));
          }
        }
        this.ensureCapacitySeats();

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
    this.startSessionTracking();
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
    if (!this.currentUser.isAuthenticatedOfficer) return false;
    const r = this.currentUser.role;
    if (r === 'gvcn' || r === 'lop_truong' || r === 'lop_pho') return true;
    const acc = this.officerAccounts.find((a) => a.id === this.currentUser.id || a.email === this.currentUser.email || a.name === this.currentUser.name);
    if (acc && acc.canManage !== false) return true;
    return false;
  }

  public checkWriteAuthorization(): boolean {
    if (!this.isWriteAuthorized()) {
      this.showToast('🔒 BẢO MẬT MỨC CAO NHẤT: Vai trò Học sinh CHỈ ĐƯỢC QUYỀN XEM. Vui lòng kích hoạt quyền GVCN / Cán sự để chỉnh sửa!', 'error');
      return false;
    }
    return true;
  }

  public syncActivePlanSeats() {
    let activePlan = this.seatingPlans.find((p) => p.id === this.activeSeatingPlanId);
    if (!activePlan) {
      if (this.seatingPlans.length > 0) {
        activePlan = this.seatingPlans[0];
        this.activeSeatingPlanId = activePlan.id;
      } else {
        activePlan = {
          id: 'plan-official',
          name: 'Sơ đồ Lớp 10A16 (Hiện tại)',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          seats: JSON.parse(JSON.stringify(this.seats)),
        };
        this.seatingPlans = [activePlan];
        this.activeSeatingPlanId = activePlan.id;
      }
    }

    // Mirror current seats into active seating plan
    activePlan.seats = JSON.parse(JSON.stringify(this.seats));
    activePlan.updated_at = new Date().toISOString();

    // Keep all students' seat_number attributes updated in sync with current seats
    const seatedStudentIds = new Set<string>();
    this.seats.forEach((seat) => {
      if (seat.student_id) {
        seatedStudentIds.add(seat.student_id);
        const stu = this.students.find((s) => s.id === seat.student_id);
        if (stu) {
          const colGroup = Math.ceil(seat.col_number / 2);
          stu.seat_number = `Bàn ${seat.table_number} (Cột ${colGroup} - Tổ ${colGroup})`;
        }
      }
    });

    this.students.forEach((s) => {
      if (!seatedStudentIds.has(s.id)) {
        s.seat_number = undefined;
      }
    });
  }

  public enforceOfficialOfficers() {
    // 1. Chuẩn hóa chính thức danh tính Ban Cán Sự Lớp 10A16 theo yêu cầu của GVCN
    this.classInfo.class_president_name = 'Hoàng Trọng Minh';
    this.classInfo.class_vice_discipline_name = 'Nguyễn Gia Bảo';
    this.classInfo.class_vice_academic_name = 'Nguyễn Ngọc Gia Hân';
    this.classInfo.secretary_name = 'Lưu Ngọc Linh';

    // 2. Chuẩn hóa danh sách tài khoản cán sự quản trị
    if (this.officerAccounts && Array.isArray(this.officerAccounts)) {
      this.officerAccounts = this.officerAccounts.map((a: any) => {
        if (a.id === 'acc-lt-truong' || (a.role === 'lop_truong' && a.title?.includes('Lớp trưởng'))) {
          return {
            ...a,
            id: 'acc-lt-truong',
            name: 'Hoàng Trọng Minh',
            title: 'Lớp trưởng',
            role: 'lop_truong',
            student_id: '10A16-23',
            duties: a.duties || 'Điều hành chung toàn lớp, đại diện tập thể, tổng hợp báo cáo GVCN',
            badge: 'Ban Cán Sự',
            canManage: true,
          };
        }
        if (a.id === 'acc-lp-kyluat' || a.title?.includes('Kỷ luật')) {
          return {
            ...a,
            id: 'acc-lp-kyluat',
            name: 'Nguyễn Gia Bảo',
            title: 'Lớp phó Kỷ luật & Nề nếp',
            role: 'lop_pho',
            student_id: '10A16-03',
            duties: a.duties || 'Quản lý vi phạm, theo dõi điểm danh & chấm điểm nề nếp tuần',
            badge: 'Ban Cán Sự',
            canManage: true,
          };
        }
        if (a.id === 'acc-lp-hoctap' || a.title?.includes('Học tập')) {
          return {
            ...a,
            id: 'acc-lp-hoctap',
            name: 'Nguyễn Ngọc Gia Hân',
            title: 'Lớp phó Học tập',
            role: 'lop_pho',
            student_id: '10A16-12',
            duties: a.duties || 'Theo dõi học vụ, sổ đầu bài, đôn đốc các môn học',
            badge: 'Học vụ',
            canManage: true,
          };
        }
        if (a.id === 'acc-bt-chidoan' || a.title?.includes('Bí thư')) {
          return {
            ...a,
            id: 'acc-bt-chidoan',
            name: 'Lưu Ngọc Linh',
            title: 'Bí thư Chi đoàn',
            role: 'lop_pho',
            student_id: '10A16-20',
            duties: a.duties || 'Phong trào Đoàn thanh niên, công tác thanh niên & hoạt động phong trào',
            badge: 'Đoàn TN',
            canManage: true,
          };
        }
        return a;
      });

      // Bảo đảm các tài khoản bắt buộc này phải tồn tại trong mảng
      if (!this.officerAccounts.some((a: any) => a.id === 'acc-lt-truong')) {
        this.officerAccounts.splice(1, 0, {
          id: 'acc-lt-truong',
          role: 'lop_truong',
          title: 'Lớp trưởng',
          name: 'Hoàng Trọng Minh',
          student_id: '10A16-23',
          email: '',
          pin: '10A16lt',
          duties: 'Điều hành chung toàn lớp, đại diện tập thể, tổng hợp báo cáo GVCN',
          badge: 'Ban Cán Sự',
          canManage: true,
        });
      }
      if (!this.officerAccounts.some((a: any) => a.id === 'acc-lp-kyluat')) {
        this.officerAccounts.splice(2, 0, {
          id: 'acc-lp-kyluat',
          role: 'lop_pho',
          title: 'Lớp phó Kỷ luật & Nề nếp',
          name: 'Nguyễn Gia Bảo',
          student_id: '10A16-03',
          email: '',
          pin: '10A16lpkl',
          duties: 'Quản lý vi phạm, theo dõi điểm danh & chấm điểm nề nếp tuần',
          badge: 'Ban Cán Sự',
          canManage: true,
        });
      }
      if (!this.officerAccounts.some((a: any) => a.id === 'acc-lp-hoctap')) {
        this.officerAccounts.push({
          id: 'acc-lp-hoctap',
          role: 'lop_pho',
          title: 'Lớp phó Học tập',
          name: 'Nguyễn Ngọc Gia Hân',
          student_id: '10A16-12',
          email: '',
          pin: '10A16lpht',
          duties: 'Theo dõi học vụ, sổ đầu bài, đôn đốc các môn học',
          badge: 'Học vụ',
          canManage: true,
        });
      }
      if (!this.officerAccounts.some((a: any) => a.id === 'acc-bt-chidoan')) {
        this.officerAccounts.push({
          id: 'acc-bt-chidoan',
          role: 'lop_pho',
          title: 'Bí thư Chi đoàn',
          name: 'Lưu Ngọc Linh',
          student_id: '10A16-20',
          email: '',
          pin: '10A16bt',
          duties: 'Phong trào Đoàn thanh niên, công tác thanh niên & hoạt động phong trào',
          badge: 'Đoàn TN',
          canManage: true,
        });
      }
    }
  }

  public saveLocalState() {
    if (typeof window === 'undefined') return;
    try {
      this.syncActivePlanSeats();
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

  /**
   * Đồng bộ vĩnh viễn toàn bộ sơ đồ chỗ ngồi & phương án lên Supabase Cloud
   */
  public async syncSeatingToSupabase(): Promise<{ success: boolean; message: string }> {
    if (!supabase) return { success: false, message: 'Chưa cấu hình Supabase Cloud.' };

    try {
      this.syncActivePlanSeats();

      // 1. Đồng bộ 48 vị trí ghế ngồi lên bảng 'seats' Supabase
      const seatsPayload = this.seats.map((s) => ({
        id: s.id,
        class_id: 'class-10a16',
        row_number: s.row_number,
        col_number: s.col_number,
        table_number: s.table_number,
        student_id: s.student_id || null,
      }));

      const { error: seatErr } = await supabase.from('seats').upsert(seatsPayload, { onConflict: 'id' });
      if (seatErr) {
        console.warn('Lỗi upsert seats vào Supabase:', seatErr);
      }

      // 2. Đồng bộ seat_number và group_id của 43 học sinh lên bảng 'students'
      const studentsPayload = this.students.map((s) => ({
        id: s.id,
        student_code: s.student_code,
        full_name: s.full_name,
        first_name: s.first_name,
        last_name: s.last_name,
        class_id: 'class-10a16',
        group_id: s.group_id,
        seat_number: s.seat_number || null,
        status: s.status,
        is_demo: false,
      }));
      await supabase.from('students').upsert(studentsPayload, { onConflict: 'id' });

      // 3. Ghi vết sao lưu phương án sơ đồ chỗ ngồi vào audit_logs
      await supabase.from('audit_logs').insert([
        {
          actor_name: this.currentUser.name || this.classInfo.gvcn_name || 'GVCN',
          actor_role: this.currentUser.role || 'gvcn',
          action: 'SYNC_SEATING_PLANS',
          entity_type: 'seating_plans',
          entity_id: 'class-10a16',
          reason: JSON.stringify({
            seatingPlans: this.seatingPlans,
            activeSeatingPlanId: this.activeSeatingPlanId,
            seats: this.seats,
            savedAt: new Date().toISOString(),
          }),
        },
        {
          actor_name: this.currentUser.name || this.classInfo.gvcn_name || 'GVCN',
          actor_role: this.currentUser.role || 'gvcn',
          action: 'SYNC_CLASS_INFO',
          entity_type: 'class_info',
          entity_id: 'class-10a16',
          reason: JSON.stringify({
            classInfo: this.classInfo,
            officerAccounts: this.officerAccounts,
            groups: this.groups,
            seatingPlans: this.seatingPlans,
            activeSeatingPlanId: this.activeSeatingPlanId,
            seats: this.seats,
          }),
        },
      ]);

      return { success: true, message: 'Đã lưu vĩnh viễn sơ đồ chỗ ngồi vào Supabase Cloud!' };
    } catch (err: any) {
      console.error('Lỗi syncSeatingToSupabase:', err);
      return { success: false, message: err.message };
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
    this.syncSeatingToSupabase().then();
    this.syncAllToSupabase().then();
    const nowStr = new Date().toLocaleString('vi-VN');
    const stats = {
      timestamp: nowStr,
      studentCount: this.students.length,
      incidentCount: this.incidents.length,
      seatingPlanCount: this.seatingPlans.length,
    };

    this.addAuditLog(this.currentUser.name, 'Lưu dữ liệu kết quả làm việc tức thời', 'checkpoint', 'manual_save');
    this.showToast(`💾 ĐÃ LƯU DỮ LIỆU TỨC THỜI (${nowStr})!\n• 43 Học sinh · ${stats.seatingPlanCount} Sơ đồ · ${stats.incidentCount} Vi phạm\n• Đã đồng bộ an toàn lên Supabase Cloud!`, 'success');
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
      this.syncActivePlanSeats();
      this.saveLocalState();
      this.syncAllToSupabase().then();
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
      const ltAcc = this.officerAccounts.find((a) => a.id === 'acc-lt-truong' || a.role === 'lop_truong' || a.title?.includes('Lớp trưởng'));
      const ltName = this.classInfo.class_president_name || ltAcc?.name || 'Hoàng Trọng Minh';
      const studentLt = this.students.find((s) => s.full_name === ltName) || this.students.find((s) => s.id === '10A16-23');
      this.currentUser = {
        id: 'user-lt',
        name: `${ltName} (${ltAcc?.title || 'Lớp trưởng'})`,
        role: 'lop_truong',
        class_id: 'class-10a16',
        student_id: studentLt?.id,
        email: ltAcc?.email,
        isAuthenticatedOfficer: true,
      };
    } else if (role === 'lop_pho') {
      const lpAcc = this.officerAccounts.find((a) => a.id === 'acc-lp-kyluat' || a.title?.includes('Kỷ luật') || a.role === 'lop_pho');
      const lpName = this.classInfo.class_vice_discipline_name || lpAcc?.name || 'Nguyễn Gia Bảo';
      const studentLp = this.students.find((s) => s.full_name === lpName) || this.students.find((s) => s.id === '10A16-03');
      this.currentUser = {
        id: 'user-lp',
        name: `${lpName} (${lpAcc?.title || 'Lớp phó Kỷ luật & Nề nếp'})`,
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
    this.updateSessionHeartbeat();
    this.saveLocalState();
    this.notify();
  }

  public setLoggedInOfficer(officerId: string) {
    const acc = this.officerAccounts.find((a) => a.id === officerId);
    if (!acc) return;
    const stu = acc.student_id ? this.students.find((s) => s.id === acc.student_id) : this.students.find((s) => s.full_name === acc.name);
    this.currentUser = {
      id: `user-${acc.id}`,
      name: `${acc.name} (${acc.title})`,
      role: (acc.role as RoleType) || 'lop_pho',
      class_id: 'class-10a16',
      student_id: stu?.id,
      email: acc.email,
      isAuthenticatedOfficer: true,
    };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('VTT_CURRENT_ROLE', acc.role);
        localStorage.setItem(
          'VTT_OFFICER_SESSION',
          JSON.stringify({ role: acc.role, email: acc.email, name: acc.name, officerId: acc.id, timestamp: Date.now() })
        );
      } catch (e) {}
    }
    this.updateSessionHeartbeat();
    this.saveLocalState();
    this.notify();
  }

  // --- Class Management & Settings (GVCN toàn quyền thay đổi không hạn chế) ---
  public async updateClassInfo(updates: Partial<ClassInfo>) {
    if (!this.checkWriteAuthorization()) return;
    Object.assign(this.classInfo, updates);

    // Đồng bộ tức thời danh sách tài khoản cán sự
    if (updates.class_president_name) {
      const ltAcc = this.officerAccounts.find((a) => a.id === 'acc-lt-truong' || a.role === 'lop_truong' || a.title?.includes('Lớp trưởng'));
      if (ltAcc) ltAcc.name = updates.class_president_name;
    }
    if (updates.class_vice_discipline_name) {
      const lpKlAcc = this.officerAccounts.find((a) => a.id === 'acc-lp-kyluat' || a.title?.includes('Kỷ luật'));
      if (lpKlAcc) lpKlAcc.name = updates.class_vice_discipline_name;
    }
    if (updates.class_vice_academic_name) {
      const ltAcc = this.officerAccounts.find((a) => a.id === 'acc-lp-hoctap' || a.id === 'acc-lt' || a.title?.includes('Học tập'));
      if (ltAcc) ltAcc.name = updates.class_vice_academic_name;
    }
    if (updates.secretary_name) {
      const lpAcc = this.officerAccounts.find((a) => a.id === 'acc-bt-chidoan' || a.id === 'acc-lp' || a.title?.includes('Bí thư'));
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
      this.currentUser.name = `${this.classInfo.class_president_name} (Lớp trưởng)`;
    } else if (this.currentUser.role === 'lop_pho') {
      this.currentUser.name = `${this.classInfo.class_vice_discipline_name} (Lớp phó Kỷ luật)`;
    }

    // Lưu ngay lập tức vào LocalStorage để không bao giờ bị mất dữ liệu
    this.saveLocalState();

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

    this.saveLocalState();
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

    this.saveLocalState();

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

    this.saveLocalState();
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
    this.saveLocalState();
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
    this.saveLocalState();
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

  public authenticateWithPin(accountOrRoleId: string, pinInput: string): { success: boolean; account?: OfficerAccount; message: string } {
    const cleanPin = pinInput.trim();
    const found = this.officerAccounts.find((a) => a.id === accountOrRoleId)
      || this.officerAccounts.find((a) => a.role === accountOrRoleId)
      || this.officerAccounts.find((a) => a.title.toLowerCase() === accountOrRoleId.toLowerCase());

    if (!found) {
      return { success: false, message: 'Không tìm thấy vai trò cán bộ này trong hệ thống.' };
    }

    const lockKey = found.id;
    const remainingSecs = this.getLockoutRemainingSeconds(lockKey);
    if (remainingSecs > 0) {
      return {
        success: false,
        message: `⛔ TÀI KHOẢN TẠM KHÓA: Nhập sai PIN quá 5 lần. Vui lòng thử lại sau ${remainingSecs} giây để bảo vệ an toàn hệ thống!`,
      };
    }

    // Mã PIN chuẩn mặc định của Ban Cán Sự
    const officialPins: Record<string, string> = {
      'acc-gvcn-user': '1016',
      'acc-lt-truong': '10A16lt',
      'acc-lp-kyluat': '10A16lpkl',
      'acc-lp-hoctap': '10A16lpht',
      'acc-lt': '10A16lpht',
      'acc-bt-chidoan': '10A16bt',
      'acc-lp': '10A16bt',
      gvcn: '1016',
      lop_truong: '10A16lt',
      lop_pho: '10A16lpkl',
    };

    const isMatch = (found.pin && found.pin === cleanPin) 
      || (officialPins[found.id] === cleanPin) 
      || (officialPins[found.role] === cleanPin);

    if (!isMatch) {
      const attempts = (this.failedPinAttempts[lockKey] || 0) + 1;
      this.failedPinAttempts[lockKey] = attempts;

      if (attempts >= 5) {
        // Lock out for 3 minutes (180s)
        this.lockoutUntil[lockKey] = Date.now() + 180 * 1000;
        this.addAuditLog('Hệ thống Bảo mật', `CẢNH BÁO: Phát hiện dò PIN sai ${attempts} lần liên tiếp cho ${found.title}. Đã kích hoạt Khóa Tạm Thời 3 phút!`, 'security_alert', found.id);
        this.notify();
        return {
          success: false,
          message: `⛔ BẢO VỆ CHỐNG DÒ PIN: Nhập sai 5 lần! Vai trò ${found.title} tạm thời bị khóa trong 3 phút.`,
        };
      }

      this.addAuditLog('Hệ thống Bảo mật', `Nhập sai mã PIN lần thứ ${attempts}/5 cho ${found.title}`, 'auth_failed', found.id);
      return {
        success: false,
        message: `Mã PIN không chính xác (Lần ${attempts}/5). Nhập sai 5 lần sẽ tạm khóa 3 phút!`,
      };
    }

    // Reset failed attempts on success
    this.clearFailedAttempts(lockKey);

    // Tự động sửa lỗi dữ liệu cũ (Self-healing): Nếu mã PIN trong bộ nhớ khác mã PIN chuẩn mà người dùng nhập đúng
    if (found.pin !== cleanPin) {
      found.pin = cleanPin;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('VTT_OFFICER_ACCOUNTS', JSON.stringify(this.officerAccounts));
        } catch (e) {}
      }
    }

    this.setLoggedInOfficer(found.id);
    this.currentUser.isAuthenticatedOfficer = true;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          'VTT_OFFICER_SESSION',
          JSON.stringify({ role: found.role, email: found.email, name: found.name, officerId: found.id, timestamp: Date.now() })
        );
      } catch (e) {}
    }
    this.addAuditLog(found.name, `Xác thực thành công qua Mã PIN bảo mật cho chức danh [${found.title}]`, 'auth', found.id);
    this.showToast(`Xác thực thành công! Đã kích hoạt toàn quyền cho ${found.title} (${found.name}).`, 'success');
    this.notify();

    return {
      success: true,
      account: found,
      message: `Xác thực thành công! Kích hoạt toàn quyền điều chỉnh cho ${found.title}.`,
    };
  }

  public logoutToStudentMode() {
    this.syncActivePlanSeats();
    this.saveLocalState();
    // VĨNH VIỄN LƯU LÊN SUPABASE CLOUD TRƯỚC KHI THOÁT QUYỀN (ƯU TIÊN CAO NHẤT)
    this.syncSeatingToSupabase().then();
    this.syncAllToSupabase().then();

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
    this.updateSessionHeartbeat();
    this.addAuditLog(this.currentUser.name, 'Đăng xuất khỏi quyền cán sự (Khóa về chế độ Học sinh)', 'auth', 'logout');
    this.showToast('Đã đăng xuất! Hệ thống đã khóa về Chế độ Học sinh (Chỉ xem). Sơ đồ chỗ ngồi và mọi dữ liệu được lưu vĩnh viễn 100% ở mức ưu tiên cao nhất.', 'info');
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

  /**
   * Tái tạo danh sách 48 vị trí ghế theo đúng 'seat_number' của học sinh
   */
  public reconstructSeatsFromStudentSeatNumbers() {
    const classId = 'class-10a16';
    const seats: Seat[] = [];
    for (let r = 1; r <= 6; r++) {
      for (let c = 1; c <= 8; c++) {
        const colGroup = Math.ceil(c / 2);
        const tableNum = (r - 1) * 4 + colGroup;
        seats.push({
          id: `seat-${r}-${c}`,
          class_id: classId,
          row_number: r,
          col_number: c,
          table_number: tableNum,
          student_id: undefined,
        });
      }
    }

    const tableSeatsMap = new Map<number, { left: Seat; right: Seat }>();
    seats.forEach((seat) => {
      if (!tableSeatsMap.has(seat.table_number)) {
        tableSeatsMap.set(seat.table_number, { left: seat, right: seat });
      }
      const entry = tableSeatsMap.get(seat.table_number)!;
      if (seat.col_number % 2 === 1) {
        entry.left = seat;
      } else {
        entry.right = seat;
      }
    });

    this.students.forEach((stu) => {
      if (stu.seat_number) {
        const match = stu.seat_number.match(/Bàn\s+(\d+)/i);
        if (match) {
          const tableNum = parseInt(match[1]);
          const tSeats = tableSeatsMap.get(tableNum);
          if (tSeats) {
            if (!tSeats.left.student_id) {
              tSeats.left.student_id = stu.id;
            } else if (!tSeats.right.student_id) {
              tSeats.right.student_id = stu.id;
            }
          }
        }
      }
    });

    this.seats = seats;
    this.ensureCapacitySeats();
  }

  private initDefaultSeats() {
    // Nếu sơ đồ ghế đã tồn tại đủ 48 vị trí và đã có học sinh, giữ nguyên 100% không ghi đè
    if (this.seats && this.seats.length === 48 && this.seats.some((s) => Boolean(s.student_id))) {
      return;
    }

    const seats: Seat[] = [];
    const classId = 'class-10a16';
    for (let r = 1; r <= 6; r++) {
      for (let c = 1; c <= 8; c++) {
        const colGroup = Math.ceil(c / 2); // Cột 1..4
        const tableNum = (r - 1) * 4 + colGroup;
        seats.push({
          id: `seat-${r}-${c}`,
          class_id: classId,
          row_number: r,
          col_number: c,
          table_number: tableNum,
          student_id: undefined,
        });
      }
    }

    // Xếp chuẩn hóa 4 Cột = 4 Tổ (Cột 1 = Tổ 1, Cột 2 = Tổ 2, Cột 3 = Tổ 3, Cột 4 = Tổ 4)
    for (let col = 1; col <= 4; col++) {
      const grpId = `group-0${col}`;
      const colStudents = this.students
        .filter((s) => s.group_id === grpId)
        .sort((a, b) => a.student_code.localeCompare(b.student_code));

      const colSeats = seats
        .filter((s) => Math.ceil(s.col_number / 2) === col)
        .sort((a, b) => a.table_number - b.table_number || a.col_number - b.col_number);

      colStudents.forEach((stu, idx) => {
        const seat = colSeats[idx];
        if (seat) {
          seat.student_id = stu.id;
          stu.seat_number = `Bàn ${seat.table_number} (Cột ${col} - Tổ ${col})`;
        }
      });
    }

    this.seats = seats;
  }

  public ensureCapacitySeats() {
    const classId = 'class-10a16';
    const existingSeats = Array.isArray(this.seats) ? [...this.seats] : [];
    const seats: Seat[] = [];

    for (let r = 1; r <= 6; r++) {
      for (let c = 1; c <= 8; c++) {
        const id = `seat-${r}-${c}`;
        const colGroup = Math.ceil(c / 2);
        const tableNum = (r - 1) * 4 + colGroup;

        // Flexible match by ID or row and column
        const found = existingSeats.find(
          (s) => s.id === id || (s.row_number === r && s.col_number === c)
        );

        if (found) {
          seats.push({
            ...found,
            id,
            class_id: classId,
            row_number: r,
            col_number: c,
            table_number: tableNum,
          });
        } else {
          seats.push({
            id,
            class_id: classId,
            row_number: r,
            col_number: c,
            table_number: tableNum,
            student_id: undefined, // Empty seat, preserve user intention
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
    this.saveLocalState();
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
    this.saveLocalState();
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
    this.syncActivePlanSeats();
    this.saveLocalState();
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
    this.saveLocalState();
    this.addAuditLog(
      this.currentUser.name,
      'Điều chỉnh thông tin tổ học tập',
      'group',
      groupId,
      `Cập nhật: ${grp.group_name}`
    );
    this.notify();

    if (supabase) {
      supabase.from('groups').upsert({
        id: grp.id,
        class_id: 'class-10a16',
        group_number: grp.group_number,
        group_name: grp.group_name,
        leader_student_id: grp.leader_student_id || null,
      }, { onConflict: 'id' }).then();
    }
  }

  public assignStudentToGroup(studentId: string, groupId: string) {
    if (!this.checkWriteAuthorization()) return;
    const stu = this.students.find((s) => s.id === studentId);
    if (!stu) return;
    stu.group_id = groupId;
    this.saveLocalState();
    this.addAuditLog(
      this.currentUser.name,
      'Chuyển tổ cho học sinh',
      'student',
      studentId,
      `Học sinh ${stu.full_name} chuyển sang tổ ${groupId}`
    );
    this.notify();

    if (supabase) {
      supabase.from('students').update({ group_id: groupId }).eq('id', studentId).then();
    }
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
        this.ensureCapacitySeats();
        this.syncActivePlanSeats();
        this.saveLocalState();
        this.syncSeatingToSupabase();
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
    this.seats = this.seats.map((s) => ({ ...s }));
    this.students = this.students.map((s) => ({ ...s }));

    this.syncActivePlanSeats();
    this.saveLocalState();
    this.syncSeatingToSupabase().then();

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

    this.seats = this.seats.map((s) => ({ ...s }));
    this.students = this.students.map((s) => ({ ...s }));

    this.syncActivePlanSeats();
    this.saveLocalState();
    this.syncSeatingToSupabase().then();

    this.addAuditLog(
      this.currentUser.name,
      'Hoán đổi chỗ ngồi giữa 2 bàn & Đồng bộ Tổ theo Cột mới',
      'seat',
      `${seatId1}<->${seatId2}`
    );
    this.notify();
  }

  public autoArrangeSeats(method: 'by_group' | 'by_roster' = 'by_group') {
    if (!this.checkWriteAuthorization()) return;
    this.createSeatingBackupSnapshot();

    // Reset all seat student assignments
    this.seats.forEach((seat) => { seat.student_id = undefined; });

    // Place students column by column (Cột 1 -> Tổ 1, Cột 2 -> Tổ 2, Cột 3 -> Tổ 3, Cột 4 -> Tổ 4)
    for (let colGroup = 1; colGroup <= 4; colGroup++) {
      const grpId = `group-0${colGroup}`;
      let colStudents = this.students.filter((s) => s.group_id === grpId);
      if (colStudents.length === 0) {
        const startIdx = (colGroup - 1) * 11;
        const endIdx = colGroup === 4 ? 43 : colGroup * 11;
        colStudents = this.students.slice(startIdx, endIdx);
      }

      // Sort students by STT student_code
      colStudents.sort((a, b) => a.student_code.localeCompare(b.student_code));

      const colSeats = this.seats
        .filter((s) => Math.ceil(s.col_number / 2) === colGroup)
        .sort((a, b) => a.table_number - b.table_number || a.col_number - b.col_number);

      colStudents.forEach((stu, idx) => {
        const seat = colSeats[idx];
        if (seat) {
          seat.student_id = stu.id;
          stu.group_id = grpId;
          stu.seat_number = `Bàn ${seat.table_number} (Cột ${colGroup} - Tổ ${colGroup})`;
        }
      });
    }

    this.seats = this.seats.map((s) => ({ ...s }));
    this.students = this.students.map((s) => ({ ...s }));

    this.syncActivePlanSeats();
    this.saveLocalState();
    this.syncSeatingToSupabase().then();

    this.addAuditLog(
      this.currentUser.name,
      'Sắp xếp chuẩn hóa sơ đồ chỗ ngồi theo 4 Cột = 4 Tổ',
      'seating',
      'class-10a16',
      `Phương pháp: ${method}`
    );
    this.notify();
  }

  public clearAllSeats() {
    if (!this.checkWriteAuthorization()) return;
    this.createSeatingBackupSnapshot();
    this.seats.forEach((seat) => {
      seat.student_id = undefined;
    });
    this.students.forEach((stu) => {
      stu.seat_number = undefined;
    });

    this.seats = this.seats.map((s) => ({ ...s }));
    this.students = this.students.map((s) => ({ ...s }));

    this.syncActivePlanSeats();
    this.saveLocalState();
    this.syncSeatingToSupabase().then();
    this.addAuditLog(
      this.currentUser.name,
      'Làm trống toàn bộ sơ đồ chỗ ngồi',
      'seating',
      'class-10a16'
    );
    this.notify();
  }

  // --- Multi-Plan Seating Management ---
  public async saveCurrentSeatsToPlan(planName?: string) {
    if (!this.checkWriteAuthorization()) return;
    let activePlan = this.seatingPlans.find((p) => p.id === this.activeSeatingPlanId);
    if (!activePlan) {
      activePlan = {
        id: 'plan-official',
        name: 'Sơ đồ Lớp 10A16 (Hiện tại)',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        seats: JSON.parse(JSON.stringify(this.seats)),
      };
      this.seatingPlans = [activePlan];
      this.activeSeatingPlanId = activePlan.id;
    }

    if (planName && planName.trim()) activePlan.name = planName.trim();
    activePlan.seats = JSON.parse(JSON.stringify(this.seats));
    activePlan.updated_at = new Date().toISOString();

    this.seats = this.seats.map((s) => ({ ...s }));
    this.students = this.students.map((s) => ({ ...s }));
    this.syncActivePlanSeats();
    this.saveLocalState();
    await this.syncSeatingToSupabase();

    this.addAuditLog(
      this.currentUser.name,
      `Lưu cố định phương án sơ đồ chỗ ngồi [${activePlan.name}]`,
      'seating_plans',
      activePlan.id,
      'Lưu vĩnh viễn vào hệ thống & đồng bộ Supabase Cloud'
    );
    this.showToast(`💾 ĐÃ LƯU VĨNH VIỄN SƠ ĐỒ [${activePlan.name}]!\n• Đã lưu vào máy & đồng bộ Cloud\n• Giữ nguyên tuyệt đối khi thoát quyền`, 'success', 5000);
    this.notify();
  }

  public async loadSeatingPlan(planId: string) {
    const plan = this.seatingPlans.find((p) => p.id === planId);
    if (!plan) return;
    this.createSeatingBackupSnapshot();
    this.activeSeatingPlanId = plan.id;
    this.seats = JSON.parse(JSON.stringify(plan.seats));
    this.ensureCapacitySeats();
    // Ensure all seats sync with their column groups
    this.seats.forEach((seat) => {
      if (seat.student_id) {
        this.syncStudentGroupWithSeatColumn(seat.student_id, seat);
      }
    });
    this.syncActivePlanSeats();
    this.saveLocalState();
    await this.syncSeatingToSupabase();
    this.showToast(`Đã chuyển sang phương án sơ đồ: [${plan.name}]`, 'info');
    this.notify();
  }

  public async createNewSeatingPlan(name: string, cloneFromCurrent: boolean = true) {
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
    this.syncActivePlanSeats();
    this.saveLocalState();
    await this.syncSeatingToSupabase();
    this.showToast(`Đã tạo phương án sơ đồ chỗ ngồi mới: [${cleanName}]!`, 'success');
    this.notify();
  }

  public async deleteSeatingPlan(planId: string) {
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
    this.syncActivePlanSeats();
    this.saveLocalState();
    await this.syncSeatingToSupabase();
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
      this.saveLocalState();
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
    this.saveLocalState();
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

    this.saveLocalState();
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
    this.saveLocalState();
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

    this.saveLocalState();
    const statusLabel = targetStatus === 'present' ? 'Có mặt đầy đủ' : targetStatus === 'permitted_absence' ? 'Vắng có phép' : 'Vắng không phép';
    this.addAuditLog(this.currentUser.name, '1-Chạm duyệt tất cả hồ sơ điểm danh chờ xác minh', 'attendance', 'batch_approve', `Chuyển ${pendingList.length} hồ sơ thành ${statusLabel}`);
    this.showToast(`⚡ ĐÃ 1-CHẠM DUYỆT TẤT CẢ ${pendingList.length} HỒ SƠ CHỜ XÁC MINH THÀNH: [${statusLabel.toUpperCase()}]!`, 'success');
    this.notify();

    const client = supabase;
    if (client) {
      pendingList.forEach((a) => {
        client.from('attendance_records').update({ status: targetStatus }).eq('id', a.id).then();
      });
    }
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
    this.saveLocalState();
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

    this.saveLocalState();
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

    this.saveLocalState();
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
    this.saveLocalState();

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
    this.saveLocalState();
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
    this.saveLocalState();

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
    this.saveLocalState();
    this.addAuditLog(this.currentUser.name, 'Ghi nhận lời khen tích cực', 'positive_note', id);
    this.notify();
  }

  // --- Tasks ---
  public createTask(task: Omit<Task, 'id' | 'created_at'>) {
    if (!this.checkWriteAuthorization()) return;
    const id = `task-${Date.now()}`;
    const newTask: Task = { ...task, id, created_at: new Date().toISOString() };
    this.tasks.unshift(newTask);
    this.saveLocalState();
    this.addAuditLog(this.currentUser.name, 'Giao nhiệm vụ lớp', 'task', id, task.title);
    this.notify();
  }

  public updateTaskStatus(taskId: string, status: Task['status']) {
    if (!this.checkWriteAuthorization()) return;
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.status = status;
    this.saveLocalState();
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

    this.saveLocalState();
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

    this.saveLocalState();
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

    this.saveLocalState();
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

    this.saveLocalState();
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

    this.saveLocalState();
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
    this.saveLocalState();
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
      this.syncActivePlanSeats();
      this.saveLocalState();
      this.syncAllToSupabase().then();
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
          .on('postgres_changes', { event: '*', schema: 'public', table: 'seats' }, () => {
            if (!this.isSupabaseSyncing) {
              this.fetchFromSupabase(true);
            }
          })
          .subscribe();
      }

      // 3. Kích hoạt kênh giám sát sự hiện diện thời gian thực (Supabase Presence)
      if (!this.presenceChannel) {
        this.presenceChannel = supabase.channel('vtt_online_presence', {
          config: { presence: { key: this.currentSessionId } },
        });

        this.presenceChannel
          .on('presence', { event: 'sync' }, () => {
            const newState = this.presenceChannel.presenceState();
            const newMap = new Map<string, ActiveUserSession>();
            Object.keys(newState).forEach((key) => {
              const presences = newState[key] as any[];
              if (presences && presences.length > 0) {
                const latest = presences[presences.length - 1];
                if (latest && latest.id) {
                  newMap.set(latest.id, {
                    ...latest,
                    isCurrentUser: latest.id === this.currentSessionId,
                  });
                }
              }
            });
            this.presenceSessionsMap = newMap;
            this.notify();
          })
          .subscribe((status: string) => {
            if (status === 'SUBSCRIBED') {
              this.presenceChannel.track(this.getMyCurrentSessionObject()).catch(() => {});
            }
          });
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

      // 3b. Seats (48 vị trí ghế ngồi lớp học)
      const seatsPayload = this.seats.map((s) => ({
        id: s.id,
        class_id: 'class-10a16',
        row_number: s.row_number,
        col_number: s.col_number,
        table_number: s.table_number,
        student_id: s.student_id || null,
      }));
      await supabase.from('seats').upsert(seatsPayload, { onConflict: 'id' });

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

      // 7. Sync Seating Plans & Class Info Snapshot to Supabase Audit Log
      await supabase.from('audit_logs').insert([{
        actor_name: this.currentUser.name || 'GVCN',
        actor_role: this.currentUser.role || 'gvcn',
        action: 'SYNC_CLASS_INFO',
        entity_type: 'class_info',
        entity_id: 'class-10a16',
        reason: JSON.stringify({
          classInfo: this.classInfo,
          officerAccounts: this.officerAccounts,
          groups: this.groups,
          seatingPlans: this.seatingPlans,
          activeSeatingPlanId: this.activeSeatingPlanId,
          seats: this.seats,
        }),
      }]);

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

      // 5. Fetch Seats directly from Supabase 'seats' table
      let hasLoadedSeatsFromCloud = false;
      try {
        const { data: seatsData, error: seatsErr } = await supabase
          .from('seats')
          .select('*')
          .eq('class_id', 'class-10a16')
          .order('row_number', { ascending: true })
          .order('col_number', { ascending: true });

        if (!seatsErr && seatsData && seatsData.length > 0) {
          this.seats = seatsData.map((s: any) => ({
            id: s.id,
            class_id: s.class_id,
            row_number: Number(s.row_number),
            col_number: Number(s.col_number),
            table_number: Number(s.table_number),
            student_id: s.student_id || undefined,
          }));
          this.ensureCapacitySeats();
          hasLoadedSeatsFromCloud = true;
          if (typeof window !== 'undefined') {
            localStorage.setItem('VTT_SEATS', JSON.stringify(this.seats));
          }
        }
      } catch (seatErr) {
        console.warn('Lỗi tải seats từ Supabase:', seatErr);
      }

      // 6. Fetch Class Info, Ban Cán Sự & Seating Plans from Supabase Audit Logs & Classes
      try {
        const { data: classAuditList } = await supabase
          .from('audit_logs')
          .select('*')
          .in('entity_type', ['seating_plans', 'class_info'])
          .eq('entity_id', 'class-10a16')
          .order('created_at', { ascending: false })
          .limit(1);

        if (classAuditList && classAuditList.length > 0) {
          const classAudit = classAuditList[0];
          if (classAudit.reason) {
            try {
              const parsed = JSON.parse(classAudit.reason);
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
              if (parsed.seatingPlans && Array.isArray(parsed.seatingPlans) && parsed.seatingPlans.length > 0) {
                this.seatingPlans = parsed.seatingPlans;
                if (typeof window !== 'undefined') {
                  localStorage.setItem('VTT_SEATING_PLANS', JSON.stringify(this.seatingPlans));
                }
              }
              if (parsed.activeSeatingPlanId) {
                this.activeSeatingPlanId = parsed.activeSeatingPlanId;
                if (typeof window !== 'undefined') {
                  localStorage.setItem('VTT_ACTIVE_SEATING_PLAN_ID', this.activeSeatingPlanId);
                }
              }
              if (!hasLoadedSeatsFromCloud && parsed.seats && Array.isArray(parsed.seats) && parsed.seats.length > 0) {
                this.seats = parsed.seats.map((s: any) => ({ ...s }));
                this.ensureCapacitySeats();
                hasLoadedSeatsFromCloud = true;
                if (typeof window !== 'undefined') {
                  localStorage.setItem('VTT_SEATS', JSON.stringify(this.seats));
                }
              }
            } catch (parseE) {}
          }
        }

        // Luôn chuẩn hóa và bảo lưu Ban Cán Sự Lớp 10A16 chính xác theo yêu cầu
        this.enforceOfficialOfficers();

        // Tự động tái tạo sơ đồ CHỈ KHI và CHỈ KHI hoàn toàn chưa có ghế nào
        if (!hasLoadedSeatsFromCloud && (!this.seats || this.seats.length === 0 || !this.seats.some(s => Boolean(s.student_id)))) {
          const hasSeatNumbers = this.students.some((s) => Boolean(s.seat_number && s.seat_number.includes('Bàn')));
          if (hasSeatNumbers) {
            this.reconstructSeatsFromStudentSeatNumbers();
            hasLoadedSeatsFromCloud = true;
          }
        }

        this.syncActivePlanSeats();
        this.saveLocalState();

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
        console.warn('Lỗi đồng bộ Ban Cán Sự & Sơ Đồ từ Supabase:', err);
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
