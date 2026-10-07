import React, { useState } from 'react';
import { appState, ClassInfo } from '../services/appStateService';
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

  // State: Modal 2 - Chỉ định Ban Cán Sự & Tổ trưởng (Toàn quyền thay đổi không hạn chế)
  const [isEditingOfficers, setIsEditingOfficers] = useState(false);
  const [isCustomPresident, setIsCustomPresident] = useState(false);
  const [isCustomViceDiscipline, setIsCustomViceDiscipline] = useState(false);
  const [isCustomViceAcademic, setIsCustomViceAcademic] = useState(false);
  const [isCustomSecretary, setIsCustomSecretary] = useState(false);

  const [officerForm, setOfficerForm] = useState({
    gvcn_name: classInfo.gvcn_name,
    gvcn_email: classInfo.gvcn_email,
    gvcn_phone: classInfo.gvcn_phone,
    class_president_name: classInfo.class_president_name,
    class_vice_discipline_name: classInfo.class_vice_discipline_name,
    class_vice_academic_name: classInfo.class_vice_academic_name,
    secretary_name: classInfo.secretary_name,
    group1_leader: groups.find((g) => g.group_number === 1)?.leader_student_id || '',
    group2_leader: groups.find((g) => g.group_number === 2)?.leader_student_id || '',
    group3_leader: groups.find((g) => g.group_number === 3)?.leader_student_id || '',
    group4_leader: groups.find((g) => g.group_number === 4)?.leader_student_id || '',
  });

  // State: Modal 3 - Quản lý Mã PIN cán bộ bảo mật
  const [isEditingPins, setIsEditingPins] = useState(false);
  const [pinForm, setPinForm] = useState({
    gvcnPin: officerAccounts.find((a) => a.role === 'gvcn')?.pin || '1016',
    ltPin: officerAccounts.find((a) => a.role === 'lop_truong')?.pin || '10A16lt',
    lpPin: officerAccounts.find((a) => a.role === 'lop_pho')?.pin || '10A16lp',
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
    setOfficerForm({
      gvcn_name: classInfo.gvcn_name,
      gvcn_email: classInfo.gvcn_email,
      gvcn_phone: classInfo.gvcn_phone,
      class_president_name: classInfo.class_president_name,
      class_vice_discipline_name: classInfo.class_vice_discipline_name,
      class_vice_academic_name: classInfo.class_vice_academic_name,
      secretary_name: classInfo.secretary_name,
      group1_leader: groups.find((g) => g.group_number === 1)?.leader_student_id || '',
      group2_leader: groups.find((g) => g.group_number === 2)?.leader_student_id || '',
      group3_leader: groups.find((g) => g.group_number === 3)?.leader_student_id || '',
      group4_leader: groups.find((g) => g.group_number === 4)?.leader_student_id || '',
    });
    setIsEditingOfficers(true);
  };

  const handleSaveOfficers = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Cập nhật thông tin Ban Cán sự & GVCN
    await appState.updateClassInfo({
      gvcn_name: officerForm.gvcn_name.trim(),
      gvcn_email: officerForm.gvcn_email.trim(),
      gvcn_phone: officerForm.gvcn_phone.trim(),
      class_president_name: officerForm.class_president_name.trim(),
      class_vice_discipline_name: officerForm.class_vice_discipline_name.trim(),
      class_vice_academic_name: officerForm.class_vice_academic_name.trim(),
      secretary_name: officerForm.secretary_name.trim(),
    });

    // 2. Cập nhật 4 Tổ trưởng tổ tự quản
    const g1 = groups.find((g) => g.group_number === 1);
    if (g1) await appState.updateGroupLeader(g1.id, officerForm.group1_leader);

    const g2 = groups.find((g) => g.group_number === 2);
    if (g2) await appState.updateGroupLeader(g2.id, officerForm.group2_leader);

    const g3 = groups.find((g) => g.group_number === 3);
    if (g3) await appState.updateGroupLeader(g3.id, officerForm.group3_leader);

    const g4 = groups.find((g) => g.group_number === 4);
    if (g4) await appState.updateGroupLeader(g4.id, officerForm.group4_leader);

    appState.showToast('✅ Đã lưu và đồng bộ toàn quyền Ban Cán Sự Lớp 10A16 lên hệ thống!', 'success');
    setIsEditingOfficers(false);
  };

  const handleSavePins = (e: React.FormEvent) => {
    e.preventDefault();
    appState.updateOfficerPin('gvcn', pinForm.gvcnPin);
    appState.updateOfficerPin('lop_truong', pinForm.ltPin);
    appState.updateOfficerPin('lop_pho', pinForm.lpPin);
    setIsEditingPins(false);
  };

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

          <form onSubmit={handleQuickGvcnLogin} className="flex items-center gap-2 shrink-0">
            <div className="relative">
              <KeyRound className="w-4 h-4 text-amber-600 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="Mã PIN GVCN (1016)..."
                value={quickPinInput}
                onChange={(e) => setQuickPinInput(e.target.value)}
                className="pl-9 pr-3 py-2 text-xs font-mono border rounded-xl border-amber-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500 w-44"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-xs transition active:scale-95 cursor-pointer shrink-0"
            >
              Mở quyền GVCN
            </button>
          </form>
          {quickPinError && (
            <p className="text-xs text-rose-600 font-bold col-span-full">{quickPinError}</p>
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

          {/* Security & PIN Manager for GVCN */}
          {canManageClass && (
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-emerald-600" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Quản lý Mã PIN & Tài khoản Cán bộ (Bảo mật GVCN)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      GVCN có toàn quyền thay đổi mã PIN đăng nhập của bản thân và các cán sự
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditingPins(true)}
                  className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Đổi mã PIN</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {officerAccounts.map((acc) => (
                  <div key={acc.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        {acc.title}
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-slate-200 px-1.5 py-0.5 rounded">
                        PIN: {acc.pin}
                      </span>
                    </div>
                    <div className="font-bold text-slate-900 truncate">{acc.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">{acc.email}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Class Officers Card (Ban Cán Sự) */}
        <div className="space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900">Ban Cán Sự Lớp 10A16</h3>
              </div>
              {canManageClass && (
                <button
                  onClick={handleOpenEditOfficers}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Chỉ định</span>
                </button>
              )}
            </div>

            <div className="space-y-3 text-xs">
              {/* GVCN */}
              <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700">
                    Giáo viên Chủ nhiệm (GVCN)
                  </div>
                  <div className="font-black text-slate-900 text-sm mt-0.5">{classInfo.gvcn_name}</div>
                  <div className="text-[11px] text-slate-600 font-mono mt-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-blue-600" />
                      <span>{classInfo.gvcn_email}</span>
                    </div>
                    {classInfo.gvcn_phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-emerald-600" />
                        <span>{classInfo.gvcn_phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-extrabold bg-blue-600 text-white rounded-md shadow-xs">
                  Toàn quyền
                </span>
              </div>

              {/* Lớp trưởng */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    Lớp trưởng
                  </div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {classInfo.class_president_name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Phụ trách chung toàn lớp</div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-md">
                  Ban Cán Sự
                </span>
              </div>

              {/* Lớp phó Kỷ luật */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600">
                    Lớp phó Kỷ luật & Nề nếp
                  </div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {classInfo.class_vice_discipline_name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Quản lý vi phạm & chấm điểm nề nếp</div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-md">
                  Ban Cán Sự
                </span>
              </div>

              {/* Lớp phó Học tập */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">
                    Lớp phó Học tập
                  </div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {classInfo.class_vice_academic_name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Theo dõi học vụ & bài tập</div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 rounded-md">
                  Học vụ
                </span>
              </div>

              {/* Bí thư */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">
                    Bí thư Chi đoàn
                  </div>
                  <div className="font-bold text-slate-900 text-sm mt-0.5">
                    {classInfo.secretary_name}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Phong trào Đoàn thanh niên</div>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-800 rounded-md">
                  Đoàn TN
                </span>
              </div>

              {/* 4 Tổ trưởng */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                  4 Tổ trưởng Tự quản:
                </div>
                {groups.map((g) => {
                  const leader = students.find((s) => s.id === g.leader_student_id);
                  return (
                    <div key={g.id} className="flex items-center justify-between text-xs py-0.5 border-b border-slate-100 last:border-0">
                      <span className="font-semibold text-slate-700">Tổ {g.group_number}:</span>
                      <span className="font-bold text-slate-900">{leader ? leader.full_name : 'Chưa gán'}</span>
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
              <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-blue-900 space-y-2.5">
                <div className="font-black text-xs flex items-center gap-1.5">
                  <School className="w-4 h-4 text-blue-700" />
                  <span>1. Thông tin Giáo viên Chủ nhiệm (GVCN):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Họ và tên GVCN</label>
                    <input
                      type="text"
                      required
                      value={officerForm.gvcn_name}
                      onChange={(e) => setOfficerForm({ ...officerForm, gvcn_name: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white border-slate-300 text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Email GVCN (Gmail)</label>
                    <input
                      type="email"
                      required
                      value={officerForm.gvcn_email}
                      onChange={(e) => setOfficerForm({ ...officerForm, gvcn_email: e.target.value })}
                      className="w-full p-2 border rounded-lg bg-white border-slate-300 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Số điện thoại GVCN</label>
                    <input
                      type="text"
                      value={officerForm.gvcn_phone}
                      onChange={(e) => setOfficerForm({ ...officerForm, gvcn_phone: e.target.value })}
                      placeholder="0908 xxx xxx"
                      className="w-full p-2 border rounded-lg bg-white border-slate-300 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* PHẦN 2: BAN CÁN SỰ (CHỌN TỪ DANH SÁCH HOẶC GÕ TỰ DO KHÔNG HẠN CHẾ) */}
              <div className="space-y-3">
                <div className="font-black text-xs text-slate-900 flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>2. Ban Cán Sự Lớp 10A16 (Toàn quyền chọn hoặc tự gõ tên):</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Thầy/cô có thể chọn từ 43 học sinh hoặc tự do gõ tên bất kỳ
                  </span>
                </div>

                {/* Lớp trưởng */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800">Lớp trưởng (Điều hành chung toàn lớp):</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomPresident(!isCustomPresident)}
                      className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      {isCustomPresident ? '↩ Chọn từ danh sách' : '✏️ Tự gõ họ tên tự do'}
                    </button>
                  </div>
                  {isCustomPresident ? (
                    <input
                      type="text"
                      required
                      value={officerForm.class_president_name}
                      onChange={(e) => setOfficerForm({ ...officerForm, class_president_name: e.target.value })}
                      placeholder="Nhập họ và tên Lớp trưởng tự do..."
                      className="w-full p-2.5 border rounded-xl border-blue-400 bg-blue-50/20 font-bold"
                    />
                  ) : (
                    <select
                      value={officerForm.class_president_name}
                      onChange={(e) => setOfficerForm({ ...officerForm, class_president_name: e.target.value })}
                      className="w-full p-2.5 border rounded-xl border-slate-300 bg-white font-medium"
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.full_name}>
                          {s.student_code} - {s.full_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Lớp phó Kỷ luật */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800">Lớp phó Kỷ luật & Nề nếp (Quản lý vi phạm & chấm điểm):</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomViceDiscipline(!isCustomViceDiscipline)}
                      className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      {isCustomViceDiscipline ? '↩ Chọn từ danh sách' : '✏️ Tự gõ họ tên tự do'}
                    </button>
                  </div>
                  {isCustomViceDiscipline ? (
                    <input
                      type="text"
                      required
                      value={officerForm.class_vice_discipline_name}
                      onChange={(e) => setOfficerForm({ ...officerForm, class_vice_discipline_name: e.target.value })}
                      placeholder="Nhập họ và tên Lớp phó Kỷ luật tự do..."
                      className="w-full p-2.5 border rounded-xl border-rose-400 bg-rose-50/20 font-bold"
                    />
                  ) : (
                    <select
                      value={officerForm.class_vice_discipline_name}
                      onChange={(e) => setOfficerForm({ ...officerForm, class_vice_discipline_name: e.target.value })}
                      className="w-full p-2.5 border rounded-xl border-slate-300 bg-white font-medium"
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.full_name}>
                          {s.student_code} - {s.full_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Lớp phó Học tập */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800">Lớp phó Học tập (Học vụ & Bài vở):</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomViceAcademic(!isCustomViceAcademic)}
                      className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      {isCustomViceAcademic ? '↩ Chọn từ danh sách' : '✏️ Tự gõ họ tên tự do'}
                    </button>
                  </div>
                  {isCustomViceAcademic ? (
                    <input
                      type="text"
                      required
                      value={officerForm.class_vice_academic_name}
                      onChange={(e) => setOfficerForm({ ...officerForm, class_vice_academic_name: e.target.value })}
                      placeholder="Nhập họ và tên Lớp phó Học tập tự do..."
                      className="w-full p-2.5 border rounded-xl border-indigo-400 bg-indigo-50/20 font-bold"
                    />
                  ) : (
                    <select
                      value={officerForm.class_vice_academic_name}
                      onChange={(e) => setOfficerForm({ ...officerForm, class_vice_academic_name: e.target.value })}
                      className="w-full p-2.5 border rounded-xl border-slate-300 bg-white font-medium"
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.full_name}>
                          {s.student_code} - {s.full_name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Bí thư Chi đoàn */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800">Bí thư Chi đoàn (Phong trào thanh niên):</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomSecretary(!isCustomSecretary)}
                      className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      {isCustomSecretary ? '↩ Chọn từ danh sách' : '✏️ Tự gõ họ tên tự do'}
                    </button>
                  </div>
                  {isCustomSecretary ? (
                    <input
                      type="text"
                      required
                      value={officerForm.secretary_name}
                      onChange={(e) => setOfficerForm({ ...officerForm, secretary_name: e.target.value })}
                      placeholder="Nhập họ và tên Bí thư tự do..."
                      className="w-full p-2.5 border rounded-xl border-amber-400 bg-amber-50/20 font-bold"
                    />
                  ) : (
                    <select
                      value={officerForm.secretary_name}
                      onChange={(e) => setOfficerForm({ ...officerForm, secretary_name: e.target.value })}
                      className="w-full p-2.5 border rounded-xl border-slate-300 bg-white font-medium"
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
                      value={officerForm.group1_leader}
                      onChange={(e) => setOfficerForm({ ...officerForm, group1_leader: e.target.value })}
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
                      value={officerForm.group2_leader}
                      onChange={(e) => setOfficerForm({ ...officerForm, group2_leader: e.target.value })}
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
                      value={officerForm.group3_leader}
                      onChange={(e) => setOfficerForm({ ...officerForm, group3_leader: e.target.value })}
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
                      value={officerForm.group4_leader}
                      onChange={(e) => setOfficerForm({ ...officerForm, group4_leader: e.target.value })}
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

      {/* Modal 3: Quản lý Mã PIN Cán bộ Bảo Mật */}
      {isEditingPins && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Cấu hình Mã PIN Bảo Mật Cán Sự</h3>
                <p className="text-xs text-slate-300">Đổi mã PIN nhanh cho GVCN và Ban Cán sự</p>
              </div>
              <button
                onClick={() => setIsEditingPins(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePins} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Mã PIN GVCN (Thầy Tân)</label>
                <input
                  type="text"
                  required
                  value={pinForm.gvcnPin}
                  onChange={(e) => setPinForm({ ...pinForm, gvcnPin: e.target.value })}
                  className="w-full p-2.5 border rounded-xl border-slate-300 font-mono font-bold tracking-wider"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Mã PIN Lớp trưởng ({classInfo.class_president_name})</label>
                <input
                  type="text"
                  required
                  value={pinForm.ltPin}
                  onChange={(e) => setPinForm({ ...pinForm, ltPin: e.target.value })}
                  className="w-full p-2.5 border rounded-xl border-slate-300 font-mono font-bold tracking-wider"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Mã PIN Lớp phó Kỷ luật ({classInfo.class_vice_discipline_name})</label>
                <input
                  type="text"
                  required
                  value={pinForm.lpPin}
                  onChange={(e) => setPinForm({ ...pinForm, lpPin: e.target.value })}
                  className="w-full p-2.5 border rounded-xl border-slate-300 font-mono font-bold tracking-wider"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingPins(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu Mã PIN Mới</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
