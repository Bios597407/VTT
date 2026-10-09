import React, { useState } from 'react';
import { appState, ClassInfo, OfficerAccount } from '../services/appStateService';
import {
  GraduationCap,
  Users,
  ShieldCheck,
  Edit3,
  Check,
  X,
  Phone,
  Mail,
  Award,
  BookOpen,
  Sparkles,
  Lock,
  ArrowRight,
  School,
  AlertCircle,
  HelpCircle,
  Flag,
  KeyRound,
  Shield,
  Save,
  RefreshCw,
  UserCheck,
  Plus,
  Trash2,
} from 'lucide-react';
import { NavTab } from '../components/Sidebar';

interface Props {
  onNavigate?: (tab: NavTab) => void;
  onOpenAuthModal?: () => void;
}

export const ClassManagementPage: React.FC<Props> = ({ onNavigate, onOpenAuthModal }) => {
  const currentUser = appState.currentUser;
  const students = appState.students;
  const groups = appState.groups;
  const classInfo = appState.classInfo;
  const officerAccounts = appState.officerAccounts;
  const isSyncing = appState.isSupabaseSyncing;

  // GVCN hoặc Ban Cán sự có toàn quyền quản lý lớp học
  const canManageClass =
    currentUser.role === 'gvcn' ||
    currentUser.role === 'lop_truong' ||
    currentUser.role === 'lop_pho';
  const isGvcn = currentUser.role === 'gvcn';

  // State: Quick PIN Login for GVCN right on page if not logged in
  const [quickPinInput, setQuickPinInput] = useState('');
  const [quickPinError, setQuickPinError] = useState('');

  // State: Modal 1 - Chỉnh sửa thông tin lớp
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editForm, setEditForm] = useState<ClassInfo>({ ...classInfo });

  // State: Modal 2 - Quản lý Toàn bộ Vai trò Ban Cán Sự (GVCN chủ động đặt tên, nội dung & bổ sung)
  const [isEditingOfficers, setIsEditingOfficers] = useState(false);
  const [officerList, setOfficerList] = useState<OfficerAccount[]>([]);
  const [gvcnName, setGvcnName] = useState(classInfo.gvcn_name);
  const [customNameMode, setCustomNameMode] = useState<Record<string, boolean>>({});
  const [groupLeaders, setGroupLeaders] = useState<Record<number, string>>({
    1: groups.find((g) => g.group_number === 1)?.leader_student_id || '',
    2: groups.find((g) => g.group_number === 2)?.leader_student_id || '',
    3: groups.find((g) => g.group_number === 3)?.leader_student_id || '',
    4: groups.find((g) => g.group_number === 4)?.leader_student_id || '',
  });

  // State: Modal 3 - Bổ sung nhanh vai trò mới
  const [isAddRoleModal, setIsAddRoleModal] = useState(false);
  const [newRoleForm, setNewRoleForm] = useState({
    title: '',
    name: '',
    student_id: '',
    duties: '',
    badge: 'Ban Cán Sự',
    pin: '',
    isCustomName: false,
  });

  const handleQuickGvcnLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setQuickPinError('');
    const res = appState.authenticateWithPin('gvcn', quickPinInput);
    if (!res.success) {
      setQuickPinError(res.message);
    } else {
      setQuickPinInput('');
    }
  };

  const handleOpenEditInfo = () => {
    setEditForm({ ...appState.classInfo });
    setIsEditingInfo(true);
  };

  const handleSaveEditInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    await appState.updateClassInfo(editForm);
    appState.showToast('Đã lưu thay đổi thông tin quản lý Lớp 10A16 thành công!', 'success');
    setIsEditingInfo(false);
  };

  const handleOpenEditOfficers = () => {
    setGvcnName(classInfo.gvcn_name);
    const nonGvcn = officerAccounts
      .filter((a) => a.role !== 'gvcn')
      .map((a) => ({ ...a }));
    setOfficerList(nonGvcn);

    const modeMap: Record<string, boolean> = {};
    nonGvcn.forEach((a) => {
      const match = students.some((s) => s.full_name === a.name);
      modeMap[a.id] = !match;
    });
    setCustomNameMode(modeMap);

    setGroupLeaders({
      1: groups.find((g) => g.group_number === 1)?.leader_student_id || '',
      2: groups.find((g) => g.group_number === 2)?.leader_student_id || '',
      3: groups.find((g) => g.group_number === 3)?.leader_student_id || '',
      4: groups.find((g) => g.group_number === 4)?.leader_student_id || '',
    });
    setIsEditingOfficers(true);
  };

  const handleAddNewRoleToModalList = () => {
    const newId = `acc-custom-${Date.now()}`;
    const defaultStudent = students[0];
    const newAcc: OfficerAccount = {
      id: newId,
      role: 'lop_pho',
      title: 'Cán sự Lớp mới',
      name: defaultStudent ? defaultStudent.full_name : 'Học sinh 10A16',
      student_id: defaultStudent ? defaultStudent.id : undefined,
      email: '',
      pin: '10A16cs',
      duties: 'Phụ trách công việc theo phân công của GVCN',
      badge: 'Ban Cán Sự',
      canManage: true,
    };
    setOfficerList([...officerList, newAcc]);
    setCustomNameMode({ ...customNameMode, [newId]: false });
  };

  const handleRemoveRoleFromModalList = (id: string) => {
    setOfficerList(officerList.filter((a) => a.id !== id));
  };

  const handleDeleteOfficer = (acc: OfficerAccount) => {
    if (acc.role === 'gvcn') {
      appState.showToast('Không thể xóa tài khoản Giáo viên Chủ nhiệm!', 'warn');
      return;
    }
    if (window.confirm(`Thầy/Cô có chắc chắn muốn xóa vai trò [${acc.title}: ${acc.name}] không?`)) {
      appState.deleteOfficerAccount(acc.id);
      appState.showToast(`Đã xóa vai trò [${acc.title}] thành công!`, 'info');
    }
  };

  const handleCreateNewRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleForm.title.trim() || !newRoleForm.name.trim()) {
      appState.showToast('Vui lòng nhập đầy đủ Tên chức danh và Họ tên cán sự!', 'warn');
      return;
    }
    const newOfficer: OfficerAccount = {
      id: `acc-custom-${Date.now()}`,
      role: 'lop_pho',
      title: newRoleForm.title.trim(),
      name: newRoleForm.name.trim(),
      student_id: newRoleForm.student_id || undefined,
      email: '',
      pin: newRoleForm.pin.trim() || '10A16cs',
      duties: newRoleForm.duties.trim() || 'Thực hiện nhiệm vụ theo phân công của GVCN',
      badge: newRoleForm.badge.trim() || 'Ban Cán Sự',
      canManage: true,
    };
    appState.addOfficerAccount(newOfficer);
    appState.showToast(`✅ Đã bổ sung vai trò mới [${newOfficer.title}: ${newOfficer.name}] thành công!`, 'success');
    setIsAddRoleModal(false);
    setNewRoleForm({
      title: '',
      name: '',
      student_id: '',
      duties: '',
      badge: 'Ban Cán Sự',
      pin: '',
      isCustomName: false,
    });
  };

  const handleSaveOfficers = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Cập nhật GVCN
    const gvcnAcc = officerAccounts.find((a) => a.role === 'gvcn');
    if (gvcnAcc && gvcnName.trim()) {
      appState.updateOfficerAccount(gvcnAcc.id, { name: gvcnName.trim() });
    }

    // 2. Cập nhật từng vai trò trong officerList
    let presName = classInfo.class_president_name;
    let viceDiscName = classInfo.class_vice_discipline_name;
    let viceAcadName = classInfo.class_vice_academic_name;
    let secName = classInfo.secretary_name;

    for (const off of officerList) {
      const existing = officerAccounts.find((a) => a.id === off.id);
      if (existing) {
        appState.updateOfficerAccount(off.id, {
          title: off.title.trim(),
          name: off.name.trim(),
          student_id: off.student_id,
          duties: off.duties?.trim(),
          badge: off.badge?.trim(),
          pin: off.pin?.trim() || existing.pin,
        });
      } else {
        appState.addOfficerAccount(off);
      }

      if (off.id === 'acc-lt-truong' || off.role === 'lop_truong' || off.title.includes('Lớp trưởng')) {
        presName = off.name.trim();
      } else if (off.id === 'acc-lp-kyluat' || off.title.includes('Kỷ luật')) {
        viceDiscName = off.name.trim();
      } else if (off.id === 'acc-lp-hoctap' || off.id === 'acc-lt' || off.title.includes('Học tập')) {
        viceAcadName = off.name.trim();
      } else if (off.id === 'acc-bt-chidoan' || off.id === 'acc-lp' || off.title.includes('Bí thư')) {
        secName = off.name.trim();
      }
    }

    // Xóa những tài khoản đã bị gỡ khỏi danh sách trong modal (ngoại trừ GVCN)
    for (const cur of officerAccounts) {
      if (cur.role !== 'gvcn' && !officerList.some((o) => o.id === cur.id)) {
        appState.deleteOfficerAccount(cur.id);
      }
    }

    // 3. Đồng bộ vào classInfo
    await appState.updateClassInfo({
      gvcn_name: gvcnName.trim(),
      class_president_name: presName,
      class_vice_discipline_name: viceDiscName,
      class_vice_academic_name: viceAcadName,
      secretary_name: secName,
    });

    // 4. Cập nhật 4 Tổ trưởng tổ tự quản
    for (let i = 1; i <= 4; i++) {
      const grp = groups.find((g) => g.group_number === i);
      if (grp) {
        await appState.updateGroupLeader(grp.id, groupLeaders[i] || '');
      }
    }

    appState.showToast('✅ Đã lưu và đồng bộ toàn quyền Ban Cán Sự Lớp 10A16 lên hệ thống!', 'success');
    setIsEditingOfficers(false);
  };

  // handleSavePins has been replaced by Quản trị Nhân sự inline edits

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Quản lý Lớp học & Ban Cán sự
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
              {classInfo.class_name} · Sĩ số {students.length}
            </span>
            {canManageClass ? (
              <span className="text-[11px] px-2.5 py-0.5 rounded-md font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>GVCN: Toàn quyền điều chỉnh</span>
              </span>
            ) : (
              <span className="text-[11px] px-2.5 py-0.5 rounded-md font-bold bg-amber-100 text-amber-900 flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-700" />
                <span>Chế độ xem công khai</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {classInfo.school_name} • Năm học {classInfo.academic_year} • Phòng: {classInfo.room_number} • GVCN: <strong>{classInfo.gvcn_name}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManageClass ? (
            <>
              <button
                onClick={handleOpenEditInfo}
                className="px-3.5 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Sửa thông tin lớp</span>
              </button>
              <button
                onClick={handleOpenEditOfficers}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Chỉ định Ban Cán Sự</span>
              </button>
            </>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="px-4 py-2 text-xs font-black bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4 text-slate-950" />
              <span>Đăng nhập GVCN để chỉnh sửa</span>
            </button>
          )}
        </div>
      </div>

      {/* Authority Banner / Fast PIN Login when in view-only mode */}
      {!canManageClass && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-black text-xs sm:text-sm text-amber-950">
                📋 Danh mục Ban Cán Sự đang mở chế độ xem công khai
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                Đồng bộ tự động
              </span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Học sinh và phụ huynh có thể tra cứu thông tin lớp và ban cán sự ở ngoài. Thầy/cô GVCN muốn <strong>toàn quyền thay đổi không hạn chế</strong>, vui lòng xác thực nhanh bằng mã PIN bên dưới hoặc qua nút đăng nhập.
            </p>
          </div>

          <form onSubmit={handleQuickGvcnLogin} className="flex items-center gap-2.5 shrink-0">
            <div className="relative">
              <KeyRound className="w-4 h-4 text-amber-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="Nhập mã PIN GVCN..."
                value={quickPinInput}
                onChange={(e) => setQuickPinInput(e.target.value)}
                className="pl-9 pr-3.5 py-2.5 text-sm font-mono border-2 rounded-xl border-amber-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 w-52 text-slate-900"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 text-sm font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-xs transition active:scale-95 cursor-pointer shrink-0"
            >
              Mở quyền GVCN
            </button>
          </form>
          {quickPinError && (
            <p className="text-sm text-rose-600 font-bold col-span-full">{quickPinError}</p>
          )}
        </div>
      )}

      {/* Main Grid: Class Information & Officers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Columns: Official Class Information & Statistics */}
        <div className="lg:col-span-2 space-y-5">
          {/* Class Identity Card */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <School className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Hồ sơ Pháp lý Lớp học</h3>
              </div>
              {canManageClass && (
                <button
                  onClick={handleOpenEditInfo}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Sửa thông tin</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Trường THPT
                </span>
                <span className="font-bold text-slate-800 text-sm">{classInfo.school_name}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Lớp & Niên khóa
                </span>
                <span className="font-bold text-slate-800 text-sm">
                  {classInfo.class_name} · Năm học {classInfo.academic_year}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Phòng học chính
                </span>
                <span className="font-bold text-slate-800 text-sm">{classInfo.room_number}</span>
              </div>
            </div>

            {/* Slogan and Conduct Target */}
            <div className="p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 rounded-xl border border-blue-200/80 space-y-2">
              <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Khẩu hiệu & Mục tiêu rèn luyện lớp:</span>
              </div>
              <div className="text-xs font-semibold text-blue-950 italic">
                &ldquo;{classInfo.slogan}&rdquo;
              </div>
              <div className="text-[11px] text-blue-800 flex items-center gap-1.5 pt-1">
                <Award className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  Chỉ tiêu điểm rèn luyện tuần tối thiểu: <strong>{classInfo.target_conduct_points}/10 điểm</strong>
                </span>
              </div>
            </div>

            {/* Teacher Notes & Directives */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                <BookOpen className="w-4 h-4 text-slate-600" />
                <span>Căn cứ pháp lý & Ghi chú chỉ đạo của GVCN:</span>
              </div>
              <p className="text-slate-600 leading-relaxed">{classInfo.notes}</p>
            </div>
          </div>

          {/* 4 Groups & Team Leaders Card */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">4 Tổ Tự Quản & Phân Công Tổ Trưởng</h3>
              </div>
              {canManageClass && (
                <button
                  onClick={handleOpenEditOfficers}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Phân công lại</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {groups.map((g) => {
                const leader = students.find((s) => s.id === g.leader_student_id);
                const memberCount = students.filter((s) => s.group_id === g.id).length;
                return (
                  <div key={g.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">Tổ {g.group_number}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                        {memberCount} học sinh
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center justify-between">
                      <span>Tổ trưởng phụ trách:</span>
                      <strong className="text-slate-900">{leader ? leader.full_name : 'Chưa chỉ định'}</strong>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Nhiệm vụ: Chấm chéo sổ theo dõi & báo cáo nề nếp buổi sinh hoạt
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Officers & Accounts Management has been successfully moved back to SettingsPage.tsx under Cài đặt & Cơ sở dữ liệu */}
        </div>

        {/* Right Column: Class Officers Card (Ban Cán Sự & Đội ngũ Cán bộ) */}
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Ban Cán Sự & Cán Bộ Lớp 10A16</h3>
                  <p className="text-[11px] text-slate-500 font-normal">GVCN chủ động đặt tên vai trò, ghi nội dung & bổ sung</p>
                </div>
              </div>
              {canManageClass && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setIsAddRoleModal(true)}
                    className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1 cursor-pointer transition"
                    title="Bổ sung thêm chức danh mới"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Thêm vai trò</span>
                  </button>
                  <button
                    onClick={handleOpenEditOfficers}
                    className="text-xs font-bold text-blue-600 hover:text-white bg-blue-50 hover:bg-blue-600 px-2.5 py-1.5 rounded-xl border border-blue-200 flex items-center gap-1 cursor-pointer transition"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Quản lý</span>
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3.5 text-sm">
              {/* GVCN */}
              <div className="p-4 bg-blue-50/80 rounded-2xl border-2 border-blue-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-blue-700">
                    Giáo viên Chủ nhiệm (GVCN)
                  </div>
                  <div className="font-black text-slate-900 text-lg sm:text-xl mt-1">{classInfo.gvcn_name}</div>
                  <div className="text-sm text-slate-600 mt-1 flex items-center gap-2 font-medium">
                    <School className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{classInfo.room_number} · THPT Võ Trường Toản</span>
                  </div>
                  <div className="text-xs text-blue-800 font-semibold mt-1">
                    Chỉ đạo toàn diện nề nếp & giáo dục toàn lớp
                  </div>
                </div>
                <span className="px-3 py-1 text-xs font-black bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
                  Toàn quyền
                </span>
              </div>

              {/* Dynamic Officer List from officerAccounts (Lớp trưởng, Lớp phó, and all custom roles!) */}
              {officerAccounts
                .filter((a) => a.role !== 'gvcn')
                .map((acc) => {
                  const isLt = acc.title.includes('Lớp trưởng') || acc.role === 'lop_truong';
                  const isKl = acc.title.includes('Kỷ luật');
                  const isHt = acc.title.includes('Học tập');
                  const isBt = acc.title.includes('Bí thư');

                  return (
                    <div
                      key={acc.id}
                      className="p-4 bg-slate-50/90 rounded-2xl border-2 border-slate-200 flex items-start justify-between gap-3 group hover:border-slate-300 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-black uppercase tracking-wider ${
                              isLt
                                ? 'text-slate-800'
                                : isKl
                                ? 'text-rose-700'
                                : isHt
                                ? 'text-indigo-700'
                                : isBt
                                ? 'text-amber-800'
                                : 'text-emerald-700'
                            }`}
                          >
                            {acc.title}
                          </span>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                              isLt || isKl
                                ? 'bg-emerald-100 text-emerald-800'
                                : isHt
                                ? 'bg-indigo-50 text-indigo-800'
                                : isBt
                                ? 'bg-amber-50 text-amber-800'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            {acc.badge || 'Ban Cán Sự'}
                          </span>
                        </div>
                        <div className="font-black text-slate-900 text-base sm:text-lg mt-1 truncate">
                          {acc.name}
                        </div>
                        <div className="text-xs text-slate-600 font-medium mt-1 leading-relaxed">
                          {acc.duties || 'Phụ trách công việc theo phân công của GVCN'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        {canManageClass && (
                          <button
                            type="button"
                            onClick={() => handleDeleteOfficer(acc)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            title={`Xóa vai trò [${acc.title}]`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

              {/* Nút Bổ sung Vai trò Cán bộ Mới */}
              {canManageClass && (
                <button
                  type="button"
                  onClick={() => setIsAddRoleModal(true)}
                  className="w-full py-3 px-4 border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50/40 rounded-2xl text-blue-700 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
                >
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>+ Bổ sung Vai trò Cán bộ Mới (Thủ quỹ, Lớp phó Lao động, Cán sự bộ môn...)</span>
                </button>
              )}

              {/* 4 Tổ trưởng */}
              <div className="p-4 bg-slate-50/90 rounded-2xl border-2 border-slate-200 space-y-2">
                <div className="text-xs font-black uppercase tracking-wider text-slate-700 mb-1 flex items-center justify-between">
                  <span>4 Tổ trưởng Tự quản:</span>
                  <span className="text-[10px] text-slate-500 font-normal">Chấm chéo & Báo cáo</span>
                </div>
                {groups.map((g) => {
                  const leader = students.find((s) => s.id === g.leader_student_id);
                  return (
                    <div key={g.id} className="flex items-center justify-between text-sm py-1 border-b border-slate-200/60 last:border-0">
                      <span className="font-bold text-slate-600">Tổ {g.group_number}:</span>
                      <span className="font-black text-slate-900">{leader ? leader.full_name : g.leader_student_id || 'Chưa gán'}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Đồng bộ Supabase Cloud</span>
              <span className="text-emerald-600 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Realtime 2 chiều
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal 1: Edit Class Info */}
      {isEditingInfo && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Chỉnh sửa Thông tin Lớp học</h3>
                <p className="text-xs text-slate-300">GVCN có toàn quyền điều chỉnh mọi nội dung</p>
              </div>
              <button
                onClick={() => setIsEditingInfo(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditInfo} className="p-5 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên trường</label>
                  <input
                    type="text"
                    required
                    value={editForm.school_name}
                    onChange={(e) => setEditForm({ ...editForm, school_name: e.target.value })}
                    className="w-full p-2.5 border rounded-xl border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên lớp</label>
                  <input
                    type="text"
                    required
                    value={editForm.class_name}
                    onChange={(e) => setEditForm({ ...editForm, class_name: e.target.value })}
                    className="w-full p-2.5 border rounded-xl border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Năm học</label>
                  <input
                    type="text"
                    required
                    value={editForm.academic_year}
                    onChange={(e) => setEditForm({ ...editForm, academic_year: e.target.value })}
                    className="w-full p-2.5 border rounded-xl border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phòng học</label>
                  <input
                    type="text"
                    required
                    value={editForm.room_number}
                    onChange={(e) => setEditForm({ ...editForm, room_number: e.target.value })}
                    className="w-full p-2.5 border rounded-xl border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Khẩu hiệu / Slogan lớp</label>
                <input
                  type="text"
                  required
                  value={editForm.slogan}
                  onChange={(e) => setEditForm({ ...editForm, slogan: e.target.value })}
                  className="w-full p-2.5 border rounded-xl border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chỉ tiêu điểm rèn luyện tuần</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  required
                  value={editForm.target_conduct_points}
                  onChange={(e) => setEditForm({ ...editForm, target_conduct_points: parseFloat(e.target.value) || 9.0 })}
                  className="w-full p-2.5 border rounded-xl border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú chỉ đạo của GVCN</label>
                <textarea
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full p-2.5 border rounded-xl border-slate-300"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingInfo(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu thay đổi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Officers (TOÀN QUYỀN THAY ĐỔI KHÔNG HẠN CHẾ) */}
      {isEditingOfficers && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base">Chỉ định Ban Cán Sự & Tổ Trưởng</h3>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950">
                    Toàn quyền GVCN
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Phân công nhân sự điều hành lớp • Đồng bộ tức thời lên Supabase Production & LocalStorage
                </p>
              </div>
              <button
                onClick={() => setIsEditingOfficers(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOfficers} className="p-5 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {/* PHẦN 1: THÔNG TIN GVCN */}
              <div className="p-4 bg-blue-50/80 rounded-2xl border-2 border-blue-200 text-blue-900 space-y-2">
                <div className="font-black text-sm flex items-center gap-2">
                  <School className="w-5 h-5 text-blue-700" />
                  <span>1. Thông tin Giáo viên Chủ nhiệm (GVCN):</span>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên GVCN (Toàn quyền thay đổi):</label>
                  <input
                    type="text"
                    required
                    value={gvcnName}
                    onChange={(e) => setGvcnName(e.target.value)}
                    className="w-full p-3 border-2 rounded-xl bg-white border-slate-300 text-base font-black text-slate-900 focus:border-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* PHẦN 2: BAN CÁN SỰ & ĐỘI NGŨ CÁN BỘ (KHÔNG KHOÁ CỨNG, GVCN CHỦ ĐỘNG GHI NỘI DUNG & BỔ SUNG) */}
              <div className="space-y-3">
                <div className="font-black text-xs text-slate-900 flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>2. Ban Cán Sự & Cán Bộ Lớp 10A16 ({officerList.length} chức danh):</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddNewRoleToModalList}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] shadow-xs flex items-center gap-1 cursor-pointer transition active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Thêm vai trò mới</span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  💡 Thầy/Cô có toàn quyền chủ động đặt tên chức danh, ghi nội dung nhiệm vụ và bổ sung thêm các vai trò mới (Thủ quỹ, Lớp phó Lao động, Cán sự Văn thể mỹ...) không bị hạn chế.
                </p>

                <div className="space-y-3">
                  {officerList.map((off, idx) => {
                    const isCustom = customNameMode[off.id];

                    return (
                      <div
                        key={off.id}
                        className="p-3.5 bg-slate-50 rounded-2xl border-2 border-slate-200 hover:border-blue-300 transition space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                          <span className="font-black text-xs text-blue-900">
                            #{idx + 1}. Vai trò / Chức danh:
                          </span>
                          {officerList.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRoleFromModalList(off.id)}
                              className="text-rose-600 hover:bg-rose-50 p-1 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                              title="Xóa vai trò này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Xóa</span>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {/* Tên vai trò / Chức danh do GVCN chủ động ghi */}
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                              Tên vai trò / Chức danh (GVCN tự do ghi):
                            </label>
                            <input
                              type="text"
                              required
                              value={off.title}
                              onChange={(e) => {
                                const val = e.target.value;
                                setOfficerList(
                                  officerList.map((o) => (o.id === off.id ? { ...o, title: val } : o))
                                );
                              }}
                              placeholder="VD: Lớp trưởng, Lớp phó Kỷ luật, Thủ quỹ..."
                              className="w-full p-2.5 border-2 rounded-xl bg-white border-slate-300 text-xs font-black text-slate-900 focus:border-blue-500 focus:outline-hidden"
                            />
                          </div>

                          {/* Người đảm nhận */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-bold text-slate-700">Người đảm nhận:</label>
                              <button
                                type="button"
                                onClick={() =>
                                  setCustomNameMode({ ...customNameMode, [off.id]: !isCustom })
                                }
                                className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                              >
                                {isCustom ? '↩ Chọn danh sách 43 HS' : '✏️ Tự gõ họ tên'}
                              </button>
                            </div>

                            {isCustom ? (
                              <input
                                type="text"
                                required
                                value={off.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setOfficerList(
                                    officerList.map((o) => (o.id === off.id ? { ...o, name: val } : o))
                                  );
                                }}
                                placeholder="Nhập họ và tên cán sự tự do..."
                                className="w-full p-2.5 border rounded-xl border-blue-400 bg-blue-50/20 font-bold text-xs"
                              />
                            ) : (
                              <select
                                value={off.name}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const stu = students.find((s) => s.full_name === val);
                                  setOfficerList(
                                    officerList.map((o) =>
                                      o.id === off.id
                                        ? { ...o, name: val, student_id: stu?.id }
                                        : o
                                    )
                                  );
                                }}
                                className="w-full p-2.5 border rounded-xl border-slate-300 bg-white font-medium text-xs"
                              >
                                {students.map((s) => (
                                  <option key={s.id} value={s.full_name}>
                                    {s.student_code} - {s.full_name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>

                        {/* Nội dung vai trò & Phân công nhiệm vụ do GVCN ghi */}
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Nội dung vai trò & Nhiệm vụ được phân công (GVCN chủ động ghi nội dung):
                          </label>
                          <input
                            type="text"
                            value={off.duties || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              setOfficerList(
                                officerList.map((o) => (o.id === off.id ? { ...o, duties: val } : o))
                              );
                            }}
                            placeholder="VD: Điều hành chung toàn lớp, ghi nhận vi phạm, quản lý quỹ..."
                            className="w-full p-2 border rounded-xl bg-white border-slate-300 text-xs text-slate-800"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 pt-1">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                              Nhãn phân loại (Badge):
                            </label>
                            <input
                              type="text"
                              value={off.badge || 'Ban Cán Sự'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setOfficerList(
                                  officerList.map((o) => (o.id === off.id ? { ...o, badge: val } : o))
                                );
                              }}
                              placeholder="VD: Ban Cán Sự, Học vụ, Đoàn TN, Đời sống..."
                              className="w-full p-2 border rounded-xl bg-white border-slate-300 text-xs font-medium"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">
                              Mã PIN cán sự:
                            </label>
                            <input
                              type="text"
                              value={off.pin || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setOfficerList(
                                  officerList.map((o) => (o.id === off.id ? { ...o, pin: val } : o))
                                );
                              }}
                              placeholder="VD: 10A16cs"
                              className="w-full p-2 border rounded-xl bg-white border-slate-300 text-xs font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PHẦN 3: 4 TỔ TRƯỞNG TỔ TỰ QUẢN */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="font-black text-xs text-slate-900 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>3. Chỉ định 4 Tổ Trưởng Tổ Tự Quản:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Tổ trưởng Tổ 1:</label>
                    <select
                      value={groupLeaders[1]}
                      onChange={(e) => setGroupLeaders({ ...groupLeaders, 1: e.target.value })}
                      className="w-full p-2 border rounded-xl border-slate-300 bg-white"
                    >
                      <option value="">-- Chưa gán --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.student_code} - {s.full_name} (Tổ {s.group_id?.replace('group-0', '')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Tổ trưởng Tổ 2:</label>
                    <select
                      value={groupLeaders[2]}
                      onChange={(e) => setGroupLeaders({ ...groupLeaders, 2: e.target.value })}
                      className="w-full p-2 border rounded-xl border-slate-300 bg-white"
                    >
                      <option value="">-- Chưa gán --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.student_code} - {s.full_name} (Tổ {s.group_id?.replace('group-0', '')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Tổ trưởng Tổ 3:</label>
                    <select
                      value={groupLeaders[3]}
                      onChange={(e) => setGroupLeaders({ ...groupLeaders, 3: e.target.value })}
                      className="w-full p-2 border rounded-xl border-slate-300 bg-white"
                    >
                      <option value="">-- Chưa gán --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.student_code} - {s.full_name} (Tổ {s.group_id?.replace('group-0', '')})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Tổ trưởng Tổ 4:</label>
                    <select
                      value={groupLeaders[4]}
                      onChange={(e) => setGroupLeaders({ ...groupLeaders, 4: e.target.value })}
                      className="w-full p-2 border rounded-xl border-slate-300 bg-white"
                    >
                      <option value="">-- Chưa gán --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.student_code} - {s.full_name} (Tổ {s.group_id?.replace('group-0', '')})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <span className="text-[11px] text-slate-500 italic">
                  * Dữ liệu tự động đồng bộ tức thì lên Supabase Production và lưu vĩnh viễn trên máy.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingOfficers(false)}
                    className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Lưu Ban Cán Sự & Tổ Trưởng</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Bổ sung nhanh vai trò mới (GVCN toàn quyền thêm chức danh, đặt tên & ghi nội dung) */}
      {isAddRoleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base">Bổ sung Vai trò Cán bộ Mới</h3>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950">
                    GVCN chủ động
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Không khóa cứng vai trò • GVCN tự do đặt tên chức danh & phân công nội dung
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddRoleModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewRole} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  1. Tên vai trò / Chức danh mới (GVCN tự do đặt tên):
                </label>
                <input
                  type="text"
                  required
                  value={newRoleForm.title}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, title: e.target.value })}
                  placeholder="VD: Thủ quỹ lớp, Lớp phó Lao động, Cán sự Văn thể mỹ, Cán sự Tin học..."
                  className="w-full p-2.5 border-2 rounded-xl bg-white border-slate-300 text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">2. Học sinh đảm nhận:</label>
                  <button
                    type="button"
                    onClick={() => setNewRoleForm({ ...newRoleForm, isCustomName: !newRoleForm.isCustomName })}
                    className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    {newRoleForm.isCustomName ? '↩ Chọn danh sách 43 HS' : '✏️ Tự gõ họ tên'}
                  </button>
                </div>
                {newRoleForm.isCustomName ? (
                  <input
                    type="text"
                    required
                    value={newRoleForm.name}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                    placeholder="Nhập họ và tên học sinh đảm nhận..."
                    className="w-full p-2.5 border-2 rounded-xl border-blue-400 bg-blue-50/20 font-bold text-xs"
                  />
                ) : (
                  <select
                    value={newRoleForm.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      const stu = students.find((s) => s.full_name === val);
                      setNewRoleForm({
                        ...newRoleForm,
                        name: val,
                        student_id: stu?.id || '',
                      });
                    }}
                    className="w-full p-2.5 border rounded-xl border-slate-300 bg-white font-medium text-xs"
                  >
                    <option value="">-- Chọn học sinh từ danh sách Lớp 10A16 --</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.full_name}>
                        {s.student_code} - {s.full_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  3. Nội dung vai trò & Phân công nhiệm vụ (GVCN chủ động ghi nội dung):
                </label>
                <textarea
                  rows={2}
                  value={newRoleForm.duties}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, duties: e.target.value })}
                  placeholder="VD: Quản lý thu chi quỹ lớp công khai minh bạch, đôn đốc lao động vệ sinh phòng học..."
                  className="w-full p-2.5 border rounded-xl bg-white border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Nhãn phân loại (Badge):
                  </label>
                  <input
                    type="text"
                    value={newRoleForm.badge}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, badge: e.target.value })}
                    placeholder="VD: Ban Cán Sự, Đời sống, Lao động..."
                    className="w-full p-2 border rounded-xl border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    Mã PIN cán sự (Tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={newRoleForm.pin}
                    onChange={(e) => setNewRoleForm({ ...newRoleForm, pin: e.target.value })}
                    placeholder="Mặc định: 10A16cs"
                    className="w-full p-2 border rounded-xl border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddRoleModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Bổ sung vai trò</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
