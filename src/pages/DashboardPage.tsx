import React, { useState, useEffect } from 'react';
import { appState } from '../services/appStateService';
import { StatusBadge } from '../components/StatusBadge';
import {
  Users,
  AlertTriangle,
  Award,
  HelpCircle,
  Clock,
  CheckCircle2,
  Calendar,
  Shield,
  ShieldCheck,
  FileSpreadsheet,
  ArrowRight,
  Info,
  Edit3,
  Sparkles,
  School,
  Check,
  X,
  UserCheck,
} from 'lucide-react';
import { NavTab } from '../components/Sidebar';

interface Props {
  onNavigate: (tab: NavTab) => void;
  onOpenQuickAttendance: () => void;
  onOpenQuickIncident: () => void;
  onOpenExcelImport: () => void;
  onOpenAuthModal?: () => void;
}

export const DashboardPage: React.FC<Props> = ({
  onNavigate,
  onOpenQuickAttendance,
  onOpenQuickIncident,
  onOpenExcelImport,
  onOpenAuthModal,
}) => {
  // Lắng nghe thay đổi tức thời từ appState để trang luôn cập nhật trực tiếp
  const [, setTick] = useState(0);
  useEffect(() => {
    return appState.subscribe(() => setTick((t) => t + 1));
  }, []);

  const students = appState.students;
  const groups = appState.groups;
  const incidents = appState.incidents;
  const rewards = appState.rewards;
  const pendingRules = appState.pendingRules;
  const classInfo = appState.classInfo;
  const currentUser = appState.currentUser;
  const canManageClass =
    currentUser.role === 'gvcn' ||
    currentUser.role === 'lop_truong' ||
    currentUser.role === 'lop_pho';

  // State: Modal Chỉnh sửa nhanh Ban Cán Sự ngay tại Dashboard
  const [isEditingOfficersModal, setIsEditingOfficersModal] = useState(false);
  const [isCustomPresident, setIsCustomPresident] = useState(false);
  const [isCustomViceDiscipline, setIsCustomViceDiscipline] = useState(false);
  const [isCustomViceAcademic, setIsCustomViceAcademic] = useState(false);
  const [isCustomSecretary, setIsCustomSecretary] = useState(false);

  const [officerForm, setOfficerForm] = useState({
    gvcn_name: classInfo.gvcn_name,
    class_president_name: classInfo.class_president_name,
    class_vice_discipline_name: classInfo.class_vice_discipline_name,
    class_vice_academic_name: classInfo.class_vice_academic_name,
    secretary_name: classInfo.secretary_name,
    group1_leader: groups.find((g) => g.group_number === 1)?.leader_student_id || '',
    group2_leader: groups.find((g) => g.group_number === 2)?.leader_student_id || '',
    group3_leader: groups.find((g) => g.group_number === 3)?.leader_student_id || '',
    group4_leader: groups.find((g) => g.group_number === 4)?.leader_student_id || '',
  });

  const handleOpenEditOfficers = () => {
    setOfficerForm({
      gvcn_name: classInfo.gvcn_name,
      class_president_name: classInfo.class_president_name,
      class_vice_discipline_name: classInfo.class_vice_discipline_name,
      class_vice_academic_name: classInfo.class_vice_academic_name,
      secretary_name: classInfo.secretary_name,
      group1_leader: groups.find((g) => g.group_number === 1)?.leader_student_id || '',
      group2_leader: groups.find((g) => g.group_number === 2)?.leader_student_id || '',
      group3_leader: groups.find((g) => g.group_number === 3)?.leader_student_id || '',
      group4_leader: groups.find((g) => g.group_number === 4)?.leader_student_id || '',
    });
    setIsEditingOfficersModal(true);
  };

  const handleSaveOfficers = async (e: React.FormEvent) => {
    e.preventDefault();

    await appState.updateClassInfo({
      gvcn_name: officerForm.gvcn_name.trim(),
      class_president_name: officerForm.class_president_name.trim(),
      class_vice_discipline_name: officerForm.class_vice_discipline_name.trim(),
      class_vice_academic_name: officerForm.class_vice_academic_name.trim(),
      secretary_name: officerForm.secretary_name.trim(),
    });

    const g1 = groups.find((g) => g.group_number === 1);
    if (g1) await appState.updateGroupLeader(g1.id, officerForm.group1_leader);

    const g2 = groups.find((g) => g.group_number === 2);
    if (g2) await appState.updateGroupLeader(g2.id, officerForm.group2_leader);

    const g3 = groups.find((g) => g.group_number === 3);
    if (g3) await appState.updateGroupLeader(g3.id, officerForm.group3_leader);

    const g4 = groups.find((g) => g.group_number === 4);
    if (g4) await appState.updateGroupLeader(g4.id, officerForm.group4_leader);

    appState.showToast('Đã lưu và cập nhật Ban Cán Sự Lớp học thành công!', 'success');
    setIsEditingOfficersModal(false);
  };

  const pendingIncidentsCount = incidents.filter((i) => i.incident_status === 'pending_verification').length;
  const pendingRewardsCount = rewards.filter((r) => r.status === 'pending').length;
  const unresolvedRulesCount = pendingRules.filter((r) => r.status === 'unresolved').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                NĂM HỌC {classInfo.academic_year}
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {classInfo.class_name.toUpperCase()}
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-700/60 text-slate-300 hidden sm:inline">
                {classInfo.room_number}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Hệ thống Quản lý Nề nếp & Rèn luyện {classInfo.school_name}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Áp dụng QĐ số 525/QĐ-THPT.VTT & Thông tư 22/2021/TT-BGDĐT • GVCN: {classInfo.gvcn_name}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={() => onNavigate('class_info')}
              className="min-h-[44px] px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold rounded-xl border border-slate-700 shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Quản lý Lớp & Ban cán sự</span>
            </button>
            {canManageClass && (
              <>
                <button
                  onClick={onOpenQuickAttendance}
                  className="min-h-[44px] px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Điểm danh hôm nay
                </button>
                <button
                  onClick={onOpenQuickIncident}
                  className="min-h-[44px] px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Báo sự việc vi phạm
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Security Status Banner for View-Only mode */}
      {!canManageClass && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-amber-900 shadow-xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0 text-amber-900 shadow-xs">
              <Shield className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <div className="font-black text-sm text-amber-950 flex items-center gap-2">
                <span>Chế độ Học sinh (Chỉ xem an toàn)</span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300">
                  Khóa chỉnh sửa
                </span>
              </div>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                Học sinh chỉ được tra cứu điểm và nề nếp công khai. Khi bấm vào các thẻ quản lý (Sự việc, Quy tắc, Ban cán sự...), hệ thống sẽ yêu cầu đăng nhập GVCN / Ban Cán sự.
              </p>
            </div>
          </div>
          {onOpenAuthModal && (
            <button
              onClick={onOpenAuthModal}
              className="min-h-[42px] px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 shrink-0 self-start sm:self-auto"
            >
              <Shield className="w-4 h-4 text-slate-950" />
              <span>Đăng nhập Cán sự / GVCN</span>
            </button>
          )}
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total students */}
        <div
          onClick={() => onNavigate('students')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 transition cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Sĩ số học sinh</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 tabular-nums">{students.length}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className="truncate">43 HS chính thức Lớp 10A16</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </div>
        </div>

        {/* Pending incidents */}
        <div
          onClick={() => onNavigate('incidents')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-400 transition cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Sự việc chờ duyệt</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 tabular-nums">{pendingIncidentsCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className="truncate">{pendingIncidentsCount > 0 ? 'Cần GVCN xác minh' : 'Không có sự việc treo'}</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </div>
        </div>

        {/* Pending rewards */}
        <div
          onClick={() => onNavigate('rewards')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 transition cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Khen thưởng chờ duyệt</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 tabular-nums">{pendingRewardsCount}</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className="truncate">Danh mục RW01–RW04</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </div>
        </div>

        {/* Unresolved pending rules */}
        <div
          onClick={() => onNavigate('pending_rules')}
          className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-purple-400 transition cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Quy tắc chờ GVCN</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <HelpCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-600 tabular-nums">{unresolvedRulesCount} / 9</div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span className="truncate">Hiệu lực điểm = 0</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
          </div>
        </div>
      </div>

      {/* BAN CÁN SỰ & ĐIỀU HÀNH LỚP 10A16 (CHỮ TO RÕ RÀNG, BẢO MẬT TUYỆT ĐỐI) */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-2xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="font-black text-lg sm:text-xl text-slate-900 tracking-tight">
                  Ban Cán Sự & Nhân Sự Điều Hành {classInfo.class_name}
                </h3>
                <span className="text-xs font-black px-3 py-1 rounded-full bg-blue-100 text-blue-800">
                  Năm học {classInfo.academic_year}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Công khai minh bạch toàn diện • GVCN toàn quyền chỉ định & thay đổi mọi nội dung không hạn chế
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {canManageClass && (
              <button
                type="button"
                onClick={handleOpenEditOfficers}
                className="px-4 py-2.5 text-sm font-black bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md shadow-blue-600/20 transition active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>Chỉnh sửa Ban Cán Sự</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('class_info')}
              className="px-4 py-2.5 text-sm font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition cursor-pointer flex items-center gap-2"
            >
              <span>Hồ sơ lớp</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Officers Grid - Chữ to, cao, rõ nét */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* GVCN */}
          <div className="p-5 bg-gradient-to-br from-blue-50/90 to-indigo-50/50 rounded-2xl border-2 border-blue-200 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-blue-700">
                  Giáo viên Chủ nhiệm (GVCN)
                </span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-blue-600 text-white shadow-xs">
                  Toàn quyền
                </span>
              </div>
              <div className="font-black text-slate-900 text-lg sm:text-xl tracking-tight">
                {classInfo.gvcn_name}
              </div>
              <div className="text-sm text-slate-600 mt-2 space-y-1">
                <div className="flex items-center gap-2 text-slate-700 font-semibold">
                  <School className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{classInfo.room_number} · THPT Võ Trường Toản</span>
                </div>
              </div>
            </div>
            <div className="text-xs sm:text-sm text-blue-900 font-bold mt-3 pt-2.5 border-t border-blue-200/80">
              Chỉ đạo toàn diện nề nếp & giáo dục
            </div>
          </div>

          {/* Lớp trưởng */}
          <div className="p-5 bg-slate-50/90 rounded-2xl border-2 border-slate-200 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                  Lớp trưởng
                </span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
                  Ban Cán Sự
                </span>
              </div>
              <div className="font-black text-slate-900 text-lg sm:text-xl tracking-tight">
                {classInfo.class_president_name}
              </div>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Điều hành chung mọi hoạt động lớp, tổng hợp báo cáo GVCN
              </p>
            </div>
            <div className="text-xs sm:text-sm text-slate-500 font-semibold mt-3 pt-2.5 border-t border-slate-200">
              Quyền hạn: Phê duyệt sự việc & chấm nề nếp
            </div>
          </div>

          {/* Lớp phó Kỷ luật */}
          <div className="p-5 bg-slate-50/90 rounded-2xl border-2 border-slate-200 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-rose-700">
                  Lớp phó Kỷ luật & Nề nếp
                </span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-emerald-100 text-emerald-800">
                  Ban Cán Sự
                </span>
              </div>
              <div className="font-black text-slate-900 text-lg sm:text-xl tracking-tight">
                {classInfo.class_vice_discipline_name}
              </div>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Theo dõi điểm danh, ghi nhận vi phạm nội quy, tính điểm tuần
              </p>
            </div>
            <div className="text-xs sm:text-sm text-rose-600 font-semibold mt-3 pt-2.5 border-t border-slate-200">
              Quyền hạn: Thẩm tra vi phạm & chốt hiệu lực
            </div>
          </div>

          {/* Lớp phó Học tập */}
          <div className="p-5 bg-slate-50/90 rounded-2xl border-2 border-slate-200 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-700">
                  Lớp phó Học tập
                </span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-800">
                  Học vụ
                </span>
              </div>
              <div className="font-black text-slate-900 text-lg sm:text-xl tracking-tight">
                {classInfo.class_vice_academic_name}
              </div>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Quản lý sổ đầu bài, đôn đốc bài vở 15 phút đầu giờ
              </p>
            </div>
            <div className="text-xs sm:text-sm text-indigo-600 font-semibold mt-3 pt-2.5 border-t border-slate-200">
              Đôn đốc chuẩn bị bài trước tiết học
            </div>
          </div>

          {/* Bí thư */}
          <div className="p-5 bg-slate-50/90 rounded-2xl border-2 border-slate-200 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-800">
                  Bí thư Chi đoàn
                </span>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-800">
                  Đoàn TN
                </span>
              </div>
              <div className="font-black text-slate-900 text-lg sm:text-xl tracking-tight">
                {classInfo.secretary_name}
              </div>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Phong trào Đoàn TNCS, hoạt động tình nguyện & phong trào thi đua
              </p>
            </div>
            <div className="text-xs sm:text-sm text-amber-700 font-semibold mt-3 pt-2.5 border-t border-slate-200">
              Triển khai các phong trào thi đua
            </div>
          </div>

          {/* 4 Tổ trưởng */}
          <div className="p-5 bg-slate-50/90 rounded-2xl border-2 border-slate-200 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  4 Tổ trưởng Tự quản
                </span>
                <span className="text-xs font-black px-2 py-0.5 rounded-lg bg-slate-200 text-slate-800">
                  Tổ 1–4
                </span>
              </div>
              <div className="space-y-2 mt-2">
                {groups.map((g) => {
                  const leader = students.find((s) => s.id === g.leader_student_id);
                  return (
                    <div key={g.id} className="flex items-center justify-between py-1 border-b border-slate-200/60 last:border-0 text-sm">
                      <span className="font-bold text-slate-600">Tổ {g.group_number}:</span>
                      <span className="font-black text-slate-900">
                        {leader ? leader.full_name : g.leader_student_id || 'Chưa gán'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="text-xs sm:text-sm text-slate-500 font-semibold mt-2 pt-2 border-t border-slate-200">
              Chấm chéo nề nếp tổ sinh hoạt hàng ngày
            </div>
          </div>
        </div>
      </div>

      {/* Modal Chỉnh sửa Ban Cán Sự trực tiếp ngay trên Dashboard */}
      {isEditingOfficersModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in duration-200">
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg">Chỉ định Ban Cán Sự & Tổ Trưởng</h3>
                <p className="text-xs text-slate-300 mt-0.5">GVCN có toàn quyền thay đổi mọi chức danh không hạn chế</p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingOfficersModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveOfficers} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-sm">
              <div>
                <label className="block font-bold text-slate-800 mb-1">1. Họ và tên GVCN:</label>
                <input
                  type="text"
                  required
                  value={officerForm.gvcn_name}
                  onChange={(e) => setOfficerForm({ ...officerForm, gvcn_name: e.target.value })}
                  className="w-full p-3 border-2 rounded-xl border-slate-300 font-black text-base text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Lớp trưởng */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">2. Lớp trưởng:</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomPresident(!isCustomPresident)}
                    className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    {isCustomPresident ? '↩ Chọn danh sách' : '✏️ Tự gõ họ tên'}
                  </button>
                </div>
                {isCustomPresident ? (
                  <input
                    type="text"
                    required
                    value={officerForm.class_president_name}
                    onChange={(e) => setOfficerForm({ ...officerForm, class_president_name: e.target.value })}
                    placeholder="Nhập họ tên Lớp trưởng..."
                    className="w-full p-3 border-2 rounded-xl border-blue-400 bg-blue-50/30 font-bold text-slate-900"
                  />
                ) : (
                  <select
                    value={officerForm.class_president_name}
                    onChange={(e) => setOfficerForm({ ...officerForm, class_president_name: e.target.value })}
                    className="w-full p-3 border-2 rounded-xl border-slate-300 bg-white font-bold text-slate-900"
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
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">3. Lớp phó Kỷ luật & Nề nếp:</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomViceDiscipline(!isCustomViceDiscipline)}
                    className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    {isCustomViceDiscipline ? '↩ Chọn danh sách' : '✏️ Tự gõ họ tên'}
                  </button>
                </div>
                {isCustomViceDiscipline ? (
                  <input
                    type="text"
                    required
                    value={officerForm.class_vice_discipline_name}
                    onChange={(e) => setOfficerForm({ ...officerForm, class_vice_discipline_name: e.target.value })}
                    placeholder="Nhập họ tên Lớp phó Kỷ luật..."
                    className="w-full p-3 border-2 rounded-xl border-rose-400 bg-rose-50/30 font-bold text-slate-900"
                  />
                ) : (
                  <select
                    value={officerForm.class_vice_discipline_name}
                    onChange={(e) => setOfficerForm({ ...officerForm, class_vice_discipline_name: e.target.value })}
                    className="w-full p-3 border-2 rounded-xl border-slate-300 bg-white font-bold text-slate-900"
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
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">4. Lớp phó Học tập:</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomViceAcademic(!isCustomViceAcademic)}
                    className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    {isCustomViceAcademic ? '↩ Chọn danh sách' : '✏️ Tự gõ họ tên'}
                  </button>
                </div>
                {isCustomViceAcademic ? (
                  <input
                    type="text"
                    required
                    value={officerForm.class_vice_academic_name}
                    onChange={(e) => setOfficerForm({ ...officerForm, class_vice_academic_name: e.target.value })}
                    placeholder="Nhập họ tên Lớp phó Học tập..."
                    className="w-full p-3 border-2 rounded-xl border-indigo-400 bg-indigo-50/30 font-bold text-slate-900"
                  />
                ) : (
                  <select
                    value={officerForm.class_vice_academic_name}
                    onChange={(e) => setOfficerForm({ ...officerForm, class_vice_academic_name: e.target.value })}
                    className="w-full p-3 border-2 rounded-xl border-slate-300 bg-white font-bold text-slate-900"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.full_name}>
                        {s.student_code} - {s.full_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Bí thư */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">5. Bí thư Chi đoàn:</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomSecretary(!isCustomSecretary)}
                    className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    {isCustomSecretary ? '↩ Chọn danh sách' : '✏️ Tự gõ họ tên'}
                  </button>
                </div>
                {isCustomSecretary ? (
                  <input
                    type="text"
                    required
                    value={officerForm.secretary_name}
                    onChange={(e) => setOfficerForm({ ...officerForm, secretary_name: e.target.value })}
                    placeholder="Nhập họ tên Bí thư..."
                    className="w-full p-3 border-2 rounded-xl border-amber-400 bg-amber-50/30 font-bold text-slate-900"
                  />
                ) : (
                  <select
                    value={officerForm.secretary_name}
                    onChange={(e) => setOfficerForm({ ...officerForm, secretary_name: e.target.value })}
                    className="w-full p-3 border-2 rounded-xl border-slate-300 bg-white font-bold text-slate-900"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.full_name}>
                        {s.student_code} - {s.full_name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* 4 Tổ trưởng */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="block font-bold text-slate-800">6. Chỉ định 4 Tổ trưởng:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="block text-xs font-semibold text-slate-600 mb-1">Tổ trưởng Tổ 1:</span>
                    <select
                      value={officerForm.group1_leader}
                      onChange={(e) => setOfficerForm({ ...officerForm, group1_leader: e.target.value })}
                      className="w-full p-2.5 border-2 rounded-xl border-slate-300 bg-white font-semibold text-xs"
                    >
                      <option value="">-- Chưa gán --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>{s.student_code} - {s.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-slate-600 mb-1">Tổ trưởng Tổ 2:</span>
                    <select
                      value={officerForm.group2_leader}
                      onChange={(e) => setOfficerForm({ ...officerForm, group2_leader: e.target.value })}
                      className="w-full p-2.5 border-2 rounded-xl border-slate-300 bg-white font-semibold text-xs"
                    >
                      <option value="">-- Chưa gán --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>{s.student_code} - {s.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-slate-600 mb-1">Tổ trưởng Tổ 3:</span>
                    <select
                      value={officerForm.group3_leader}
                      onChange={(e) => setOfficerForm({ ...officerForm, group3_leader: e.target.value })}
                      className="w-full p-2.5 border-2 rounded-xl border-slate-300 bg-white font-semibold text-xs"
                    >
                      <option value="">-- Chưa gán --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>{s.student_code} - {s.full_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-slate-600 mb-1">Tổ trưởng Tổ 4:</span>
                    <select
                      value={officerForm.group4_leader}
                      onChange={(e) => setOfficerForm({ ...officerForm, group4_leader: e.target.value })}
                      className="w-full p-2.5 border-2 rounded-xl border-slate-300 bg-white font-semibold text-xs"
                    >
                      <option value="">-- Chưa gán --</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>{s.student_code} - {s.full_name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditingOfficersModal(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu & Đồng bộ ngay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official School Rules Card: Session Times & Absence procedure from QĐ 525 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Session Times Official Source */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Clock className="w-4 h-4 text-blue-600" />
            Quy định Khung giờ học chính thức (QĐ 525)
          </div>
          <div className="space-y-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <div className="font-semibold text-slate-800">Buổi sáng (Chính khóa)</div>
                <div className="text-slate-500 text-[11px]">Bắt đầu: 06:45 — Kết thúc: 10:40</div>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Trễ sau: 06:50
                </span>
                <div className="text-[10px] text-slate-400 mt-0.5">Mã V08</div>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
              <div>
                <div className="font-semibold text-slate-800">Buổi chiều (Chính khóa)</div>
                <div className="text-slate-500 text-[11px]">Bắt đầu: 12:45 — Kết thúc: 16:40</div>
              </div>
              <div className="text-right">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  Trễ sau: 12:50
                </span>
                <div className="text-[10px] text-slate-400 mt-0.5">Mã V08</div>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 italic">
            * <code>session_start_time</code> và <code>late_threshold_time</code> là 2 trường dữ liệu độc lập. Tiết học được cấu hình động theo thời khóa biểu thực tế.
          </p>
        </div>

        {/* Absence Procedure Official Source */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Shield className="w-4 h-4 text-emerald-600" />
            Quy trình xin phép vắng & Ngưỡng 45 buổi
          </div>
          <div className="space-y-2 text-xs text-slate-700">
            <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-200">
              <span className="font-bold text-blue-950">Vắng từ 1 – 3 ngày: </span>
              Phụ huynh xin phép trên ứng dụng <strong>VnEdu</strong> ngay trong ngày và đính kèm minh chứng y tế/đơn thuốc. Ứng dụng chỉ ghi nhận theo dõi, không thay thế VnEdu.
            </div>
            <div className="p-2.5 bg-purple-50/60 rounded-xl border border-purple-200">
              <span className="font-bold text-purple-950">Vắng từ 4 ngày trở lên: </span>
              Phụ huynh bắt buộc đến trường làm việc trực tiếp theo thủ tục nhà trường.
            </div>
            <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-200">
              <span className="font-bold text-amber-950">Quy tắc cảnh báo 45 buổi: </span>
              Nguồn quy định không quá 45 buổi/năm theo kế hoạch 1 buổi/ngày. Hệ thống phát cảnh báo độc lập, không tự động quyết định lưu ban (PENDING-05).
            </div>
          </div>
        </div>
      </div>

      {/* Quick Access Grid to Essential Modules */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-sm text-slate-800">Các chức năng điều hành lớp học</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { id: 'students', label: 'Hồ sơ 43 HS', desc: 'Quản lý danh sách', icon: Users, color: 'text-blue-600 bg-blue-50' },
            { id: 'seating', label: 'Sơ đồ chỗ ngồi', desc: 'Bàn ghế 6 hàng x 4 cột', icon: Calendar, color: 'text-indigo-600 bg-indigo-50' },
            { id: 'incidents', label: 'Duyệt sự việc', desc: 'Hàng chờ kiểm tra', icon: AlertTriangle, color: 'text-rose-600 bg-rose-50' },
            { id: 'scoring', label: 'Bảng điểm tuần/kỳ', desc: 'Tính điểm & chốt kỳ', icon: CheckCircle2, color: 'text-teal-600 bg-teal-50' },
            { id: 'pending_rules', label: '9 Quy tắc chờ', desc: 'QĐ 525 GVCN chốt', icon: HelpCircle, color: 'text-purple-600 bg-purple-50' },
            { id: 'reports', label: 'Xuất Excel / In', desc: 'Báo cáo chính quy', icon: FileSpreadsheet, color: 'text-emerald-600 bg-emerald-50' },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as NavTab)}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-sm text-left transition cursor-pointer space-y-1 bg-white hover:bg-slate-50/60"
              >
                <div className={`p-2 rounded-lg w-fit ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="font-bold text-xs text-slate-800">{item.label}</div>
                <div className="text-[10px] text-slate-500">{item.desc}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
