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
  PendingRule,
  WeekScoreSnapshot,
  MonthScoreSnapshot,
  SemesterScoreSnapshot,
  AnnualResult,
  AuditLog,
  RoleType,
} from '../types';
import { PRIVATE_ROSTER_10A16 } from '../lib/privateRosterLoader';
import { OFFICIAL_PENDING_RULES } from '../domain/scoring/pendingRules';
import {
  calculateWeeklyScore,
} from '../domain/scoring/scoringEngine';
import { OFFICIAL_CONDUCT_CATALOG, ConductCatalogItem } from '../domain/incidents/conductCatalog';
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

  // Current logged in user (Default: Học sinh - Chế độ Chỉ xem)
  public currentUser: CurrentUser = {
    id: 'user-guest',
    name: 'Học sinh Lớp 10A16 (Chế độ Chỉ xem)',
    role: 'hoc_sinh',
    class_id: 'class-10a16',
    isAuthenticatedOfficer: false,
  };

  // Thông tin Quản lý Lớp học & Ban cán sự (GVCN có toàn quyền điều chỉnh)
  public classInfo: ClassInfo = {
    school_name: 'THPT Võ Trường Toản',
    class_name: 'Lớp 10A16',
    academic_year: '2026–2027',
    room_number: 'Phòng A2.04',
    gvcn_name: 'Thầy Trần Duy Tân',
    gvcn_email: 'nouvo4344@gmail.com',
    gvcn_phone: '0908 123 456',
    class_president_name: 'Trần Đức Anh',
    class_vice_discipline_name: 'Lê Thiên Bảo',
    class_vice_academic_name: 'Nguyễn Gia Bảo',
    secretary_name: 'Lý Tú Uyên',
    slogan: 'Kỷ luật tự giác · Học tập hăng say · Tập thể vững mạnh',
    target_conduct_points: 9.0,
    notes: 'Toàn thể học sinh thực hiện nghiêm túc QĐ 525/QĐ-THPT.VTT và Điều 8 TT 22/2021/TT-BGDĐT.',
  };

  // Danh sách tài khoản Gmail & Mã PIN cán bộ được cấp quyền quản trị
  public officerAccounts: OfficerAccount[] = [
    {
      id: 'acc-gvcn-user',
      role: 'gvcn',
      title: 'Giáo viên Chủ nhiệm',
      name: 'Thầy Trần Duy Tân',
      email: 'nouvo4344@gmail.com',
      pin: '1016',
    },
    {
      id: 'acc-gvcn-alias',
      role: 'gvcn',
      title: 'Giáo viên Chủ nhiệm',
      name: 'Thầy Trần Duy Tân',
      email: 'tranduytan.gvcn@gmail.com',
      pin: '1016',
    },
    {
      id: 'acc-lt',
      role: 'lop_truong',
      title: 'Lớp trưởng',
      name: 'Trần Đức Anh',
      email: 'tranducanh.loptruong@gmail.com',
      pin: '10A16lt',
    },
    {
      id: 'acc-lp',
      role: 'lop_pho',
      title: 'Lớp phó Kỷ luật & Nề nếp',
      name: 'Lê Thiên Bảo',
      email: 'lethienbao.loppho@gmail.com',
      pin: '10A16lp',
    },
  ];

  // State collections - PURE REAL DATA (0 Demo records)
  public students: Student[] = buildOfficial10A16Students();
  public groups: Group[] = [...OFFICIAL_10A16_GROUPS];
  public seats: Seat[] = [];
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

  constructor() {
    this.initDefaultSeats();
    this.calculateAllWeeklyScores(1);

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
            this.officerAccounts = parsed;
          }
        }

        const savedGroups = localStorage.getItem('VTT_GROUPS');
        if (savedGroups) {
          const parsed = JSON.parse(savedGroups);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.groups = parsed;
          }
        }
      } catch (e) {
        console.warn('Lỗi đọc dữ liệu lớp từ localStorage:', e);
      }
    }

    // BẢO MẬT: Mặc định luôn là Học sinh (Chỉ xem).
    // Chỉ phục hồi quyền Cán sự nếu có phiên làm việc đã xác thực trong localStorage.
    if (typeof window !== 'undefined') {
      try {
        const sessionRaw = localStorage.getItem('VTT_OFFICER_SESSION');
        if (sessionRaw) {
          const session = JSON.parse(sessionRaw);
          if (
            session &&
            session.role &&
            (session.role === 'gvcn' || session.role === 'lop_truong' || session.role === 'lop_pho')
          ) {
            const acc = this.officerAccounts.find((a) => a.role === session.role);
            if (acc) {
              this.setLoggedInRole(session.role);
              this.currentUser.email = acc.email;
              this.currentUser.isAuthenticatedOfficer = true;
              return;
            }
          }
        }

        const studentSessionRaw = localStorage.getItem('VTT_STUDENT_SESSION');
        if (studentSessionRaw) {
          const sSession = JSON.parse(studentSessionRaw);
          if (sSession && sSession.email) {
            this.setLoggedInRole('hoc_sinh');
            this.currentUser.email = sSession.email;
            this.currentUser.name = `Học sinh (${sSession.email})`;
            this.currentUser.isAuthenticatedOfficer = false;
            return;
          }
        }
      } catch (e) {}
      // Xóa bỏ vai trò cũ chưa xác thực
      localStorage.removeItem('VTT_CURRENT_ROLE');
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
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
        (s) => s.full_name === this.classInfo.class_president_name
      ) || this.students[0];
      const ltAcc = this.officerAccounts.find((a) => a.role === 'lop_truong');
      this.currentUser = {
        id: 'user-lt',
        name: `${this.classInfo.class_president_name || studentLt?.full_name || 'Lớp trưởng'} (Lớp trưởng)`,
        role: 'lop_truong',
        class_id: 'class-10a16',
        student_id: studentLt?.id,
        email: ltAcc?.email,
        isAuthenticatedOfficer: true,
      };
    } else if (role === 'lop_pho') {
      const studentLp = this.students.find(
        (s) => s.full_name === this.classInfo.class_vice_discipline_name
      ) || this.students[1];
      const lpAcc = this.officerAccounts.find((a) => a.role === 'lop_pho');
      this.currentUser = {
        id: 'user-lp',
        name: `${this.classInfo.class_vice_discipline_name || studentLp?.full_name || 'Lớp phó'} (Lớp phó Kỷ luật)`,
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
    Object.assign(this.classInfo, updates);

    // Đồng bộ tức thời danh sách tài khoản cán sự
    if (updates.class_president_name) {
      const ltAcc = this.officerAccounts.find((a) => a.role === 'lop_truong');
      if (ltAcc) ltAcc.name = updates.class_president_name;
    }
    if (updates.class_vice_discipline_name) {
      const lpAcc = this.officerAccounts.find((a) => a.role === 'lop_pho');
      if (lpAcc) lpAcc.name = updates.class_vice_discipline_name;
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
          actor_name: this.currentUser.name || 'GVCN Thầy Tân',
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

  // Cập nhật Tổ trưởng tổ tự quản
  public async updateGroupLeader(groupId: string, leaderStudentId: string) {
    const group = this.groups.find((g) => g.id === groupId);
    if (!group) return;
    group.leader_student_id = leaderStudentId;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('VTT_GROUPS', JSON.stringify(this.groups));
      } catch (e) {}
    }

    this.addAuditLog(
      this.currentUser.name,
      `Chỉ định Tổ trưởng Tổ ${group.group_number}`,
      'groups',
      groupId,
      `Mã HS: ${leaderStudentId}`
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

        await supabase.from('audit_logs').insert([{
          actor_name: this.currentUser.name || 'GVCN Thầy Tân',
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

  // --- Officer Accounts & Permissions Control ---
  public updateOfficerAccount(id: string, updates: Partial<OfficerAccount>) {
    const acc = this.officerAccounts.find((a) => a.id === id);
    if (!acc) return;
    Object.assign(acc, updates);
    this.addAuditLog(this.currentUser.name, `Cập nhật tài khoản cán sự [${acc.name}]`, 'officer_auth', id);
    this.notify();
  }

  public addOfficerAccount(newAcc: OfficerAccount) {
    this.officerAccounts.push(newAcc);
    this.addAuditLog(this.currentUser.name, `Thêm tài khoản cán sự Gmail [${newAcc.email}]`, 'officer_auth', newAcc.id);
    this.notify();
  }

  public deleteOfficerAccount(id: string) {
    this.officerAccounts = this.officerAccounts.filter((a) => a.id !== id);
    this.addAuditLog(this.currentUser.name, `Xóa tài khoản cán sự [${id}]`, 'officer_auth', id);
    this.notify();
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

    if (found.pin !== cleanPin) {
      return {
        success: false,
        message: 'Mã PIN bảo mật không chính xác. Quyền truy cập bị từ chối!',
      };
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
      for (let c = 1; c <= 4; c++) {
        const tableNum = (r - 1) * 2 + (c <= 2 ? 1 : 2);
        const stu = this.students[stuIdx];
        seats.push({
          id: `seat-${r}-${c}`,
          class_id: classId,
          row_number: r,
          col_number: c,
          table_number: tableNum,
          student_id: stu ? stu.id : undefined,
        });
        stuIdx++;
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

  // --- Seating Management (Sơ đồ chỗ ngồi) ---
  public assignStudentToSeat(seatId: string, studentId?: string) {
    const seat = this.seats.find((s) => s.id === seatId);
    if (!seat) return;
    if (studentId) {
      this.seats.forEach((s) => {
        if (s.id !== seatId && s.student_id === studentId) {
          s.student_id = undefined;
        }
      });
      const stu = this.students.find((s) => s.id === studentId);
      if (stu) {
        stu.seat_number = `Bàn ${seat.table_number} (Dãy ${seat.col_number <= 2 ? 1 : 2})`;
      }
    } else {
      if (seat.student_id) {
        const prevStu = this.students.find((s) => s.id === seat.student_id);
        if (prevStu) prevStu.seat_number = undefined;
      }
    }
    seat.student_id = studentId;
    this.addAuditLog(
      this.currentUser.name,
      'Điều chỉnh vị trí sơ đồ chỗ ngồi',
      'seat',
      seatId,
      `Bàn ${seat.table_number}`
    );
    this.notify();
  }

  public swapSeats(seatId1: string, seatId2: string) {
    const s1 = this.seats.find((s) => s.id === seatId1);
    const s2 = this.seats.find((s) => s.id === seatId2);
    if (!s1 || !s2) return;
    const tempStu = s1.student_id;
    s1.student_id = s2.student_id;
    s2.student_id = tempStu;

    if (s1.student_id) {
      const stu1 = this.students.find((s) => s.id === s1.student_id);
      if (stu1) stu1.seat_number = `Bàn ${s1.table_number} (Dãy ${s1.col_number <= 2 ? 1 : 2})`;
    }
    if (s2.student_id) {
      const stu2 = this.students.find((s) => s.id === s2.student_id);
      if (stu2) stu2.seat_number = `Bàn ${s2.table_number} (Dãy ${s2.col_number <= 2 ? 1 : 2})`;
    }

    this.addAuditLog(this.currentUser.name, 'Hoán đổi chỗ ngồi giữa 2 bàn', 'seat', `${seatId1}<->${seatId2}`);
    this.notify();
  }

  public autoArrangeSeats(method: 'by_group' | 'by_roster' = 'by_roster') {
    const sortedStudents = [...this.students];
    if (method === 'by_group') {
      sortedStudents.sort((a, b) => (a.group_id || '').localeCompare(b.group_id || ''));
    }
    this.seats.forEach((seat, idx) => {
      const stu = sortedStudents[idx];
      seat.student_id = stu ? stu.id : undefined;
      if (stu) {
        stu.seat_number = `Bàn ${seat.table_number} (Dãy ${seat.col_number <= 2 ? 1 : 2})`;
      }
    });
    this.addAuditLog(
      this.currentUser.name,
      'Sắp xếp tự động lại toàn bộ sơ đồ chỗ ngồi',
      'seating',
      'class-10a16',
      `Phương pháp: ${method}`
    );
    this.notify();
  }

  // --- Attendance ---
  public recordAttendance(record: Omit<AttendanceRecord, 'id'>): { success: boolean; id: string } {
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
    const id = `pos-${Date.now()}`;
    const newNote: PositiveNote = { ...note, id, created_at: new Date().toISOString() };
    this.positiveNotes.unshift(newNote);
    this.addAuditLog(this.currentUser.name, 'Ghi nhận lời khen tích cực', 'positive_note', id);
    this.notify();
  }

  // --- Tasks ---
  public createTask(task: Omit<Task, 'id' | 'created_at'>) {
    const id = `task-${Date.now()}`;
    const newTask: Task = { ...task, id, created_at: new Date().toISOString() };
    this.tasks.unshift(newTask);
    this.addAuditLog(this.currentUser.name, 'Giao nhiệm vụ lớp', 'task', id, task.title);
    this.notify();
  }

  public updateTaskStatus(taskId: string, status: Task['status']) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task) return;
    task.status = status;
    this.addAuditLog(this.currentUser.name, `Cập nhật trạng thái nhiệm vụ: ${status}`, 'task', taskId);
    this.notify();
  }

  // --- Pending Rules Configuration (GVCN, Lớp phó, Lớp trưởng có toàn quyền) ---
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
    const weekId = `W${weekNumber.toString().padStart(2, '0')}`;
    const isLocked = Boolean(this.periodLocks[`week-${weekId}`]?.is_locked);

    const newSnapshots: WeekScoreSnapshot[] = [];

    for (const student of this.students) {
      const stuIncidents = this.incidents.filter((i) => i.student_id === student.id);
      const stuRewards = this.rewards.filter((r) => r.student_id === student.id);

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
        week_number: weekNumber,
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

    this.weeklySnapshots = [...this.weeklySnapshots.filter((s) => !s.is_current), ...newSnapshots];
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
