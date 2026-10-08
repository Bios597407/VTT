import React, { useState, useMemo } from 'react';
import { appState } from '../services/appStateService';
import { Student, Seat } from '../types';
import {
  Search,
  Zap,
  Sparkles,
  LayoutGrid,
  RotateCcw,
  UserPlus,
  Trash2,
  Check,
  X,
  ArrowRightLeft,
  Edit3,
  UserCheck,
  Crown,
  ShieldCheck,
  BookOpen,
  Flag,
  Filter,
  Eye,
  Printer,
  ChevronDown,
  DoorOpen,
  Users,
  CheckCircle2,
  Info,
  History,
  FileDown,
} from 'lucide-react';

const unaccent = (str: string) => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
};

export const SeatingPage: React.FC = () => {
  const seats = appState.seats;
  const students = appState.students;
  const currentUser = appState.currentUser;
  const classInfo = appState.classInfo;
  const groups = appState.groups;

  // Permission: GVCN, Lớp phó, Lớp trưởng có toàn quyền điều chỉnh sơ đồ chỗ ngồi
  const canManageSeating =
    currentUser.role === 'gvcn' ||
    currentUser.role === 'lop_truong' ||
    currentUser.role === 'lop_pho';

  // Display modes: 'standard' (Xem đầy đủ), 'compact' (Thu gọn), 'print' (Bản in)
  const [viewMode, setViewMode] = useState<'standard' | 'compact' | 'print'>('standard');

  // Toggle quick inline typing mode
  const [isQuickTypeMode, setIsQuickTypeMode] = useState(true);

  // Group filter for viewing specific team
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');

  // Seat Action Modal state
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [seatActionTab, setSeatActionTab] = useState<'inspect' | 'assign' | 'swap'>('inspect');
  const [selectedStudentForSeat, setSelectedStudentForSeat] = useState<string>('');
  const [targetSwapSeatId, setTargetSwapSeatId] = useState<string>('');

  // Group Leaders Quick Assignment Modal state
  const [showLeadersModal, setShowLeadersModal] = useState(false);
  const [leadersForm, setLeadersForm] = useState({
    group1: groups.find((g) => g.group_number === 1)?.leader_student_id || '',
    group2: groups.find((g) => g.group_number === 2)?.leader_student_id || '',
    group3: groups.find((g) => g.group_number === 3)?.leader_student_id || '',
    group4: groups.find((g) => g.group_number === 4)?.leader_student_id || '',
  });

  // Quick inline typing query per seat ID
  const [inlineInputs, setInlineInputs] = useState<Record<string, string>>({});
  const [activeInlineSeatId, setActiveInlineSeatId] = useState<string | null>(null);

  // Global quick search bar state
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [selectedTableForGlobal, setSelectedTableForGlobal] = useState<number>(1);
  const [selectedSlotForGlobal, setSelectedSlotForGlobal] = useState<'left' | 'right'>('left');

  // Unseated students drawer state
  const [showUnseatedDrawer, setShowUnseatedDrawer] = useState(false);

  // Helper to find officer role badge for a student
  const getOfficerRoleBadge = (stu: Student) => {
    if (!stu) return null;
    const name = stu.full_name.trim();

    if (name === classInfo.class_president_name?.trim()) {
      return { label: 'Lớp trưởng', color: 'bg-amber-500 text-slate-950 font-black', icon: Crown };
    }
    if (name === classInfo.class_vice_discipline_name?.trim()) {
      return { label: 'LP Kỷ luật', color: 'bg-rose-600 text-white font-bold', icon: ShieldCheck };
    }
    if (name === classInfo.class_vice_academic_name?.trim()) {
      return { label: 'LP Học tập', color: 'bg-blue-600 text-white font-bold', icon: BookOpen };
    }
    if (name === classInfo.secretary_name?.trim()) {
      return { label: 'Bí thư', color: 'bg-purple-600 text-white font-bold', icon: Flag };
    }

    // Check if group leader
    const grp = groups.find((g) => g.leader_student_id === stu.id);
    if (grp) {
      return { label: `Tổ trưởng T${grp.group_number}`, color: 'bg-emerald-600 text-white font-bold', icon: Crown };
    }

    return null;
  };

  // Group seats into Tables (Mỗi Bàn 2 Ngồi - Chia Đôi Bàn)
  const tables = useMemo(() => {
    const map = new Map<number, { row: number; colGroup: number; left?: Seat; right?: Seat }>();

    seats.forEach((seat) => {
      const tNum = seat.table_number;
      if (!map.has(tNum)) {
        map.set(tNum, {
          row: seat.row_number,
          colGroup: Math.ceil(seat.col_number / 2),
        });
      }
      const entry = map.get(tNum)!;
      if (seat.col_number % 2 === 1) {
        entry.left = seat;
      } else {
        entry.right = seat;
      }
    });

    return Array.from(map.entries())
      .map(([tableNumber, data]) => ({
        tableNumber,
        rowNumber: data.row,
        colGroupNumber: data.colGroup,
        leftSeat: data.left,
        rightSeat: data.right,
      }))
      .sort((a, b) => a.tableNumber - b.tableNumber);
  }, [seats]);

  // Group Tables by Row Number (4 Bàn trên 1 Hàng)
  const rowsMap = useMemo(() => {
    const map = new Map<number, typeof tables>();
    tables.forEach((t) => {
      if (!map.has(t.rowNumber)) map.set(t.rowNumber, []);
      map.get(t.rowNumber)!.push(t);
    });
    return Array.from(map.entries())
      .map(([rowNumber, rowTables]) => ({
        rowNumber,
        tables: rowTables.sort((a, b) => a.colGroupNumber - b.colGroupNumber),
      }))
      .sort((a, b) => a.rowNumber - b.rowNumber);
  }, [tables]);

  // Unseated students
  const unseatedStudents = useMemo(() => {
    const seatedIds = new Set(seats.map((s) => s.student_id).filter(Boolean));
    return students.filter((s) => !seatedIds.has(s.id));
  }, [seats, students]);

  const handleOpenSeatModal = (seat: Seat) => {
    setSelectedSeat(seat);
    const stu = students.find((s) => s.id === seat.student_id);
    if (stu) {
      setSeatActionTab('inspect');
    } else {
      setSeatActionTab('assign');
    }
    const unseated = students.find((s) => !seats.some((st) => st.student_id === s.id));
    setSelectedStudentForSeat(unseated?.id || students[0]?.id || '');
    const otherSeat = seats.find((s) => s.id !== seat.id);
    setTargetSwapSeatId(otherSeat?.id || '');
  };

  const handleAssignStudent = (seatId: string, studentId?: string) => {
    appState.assignStudentToSeat(seatId, studentId);
    const seat = seats.find((s) => s.id === seatId);
    const stu = students.find((s) => s.id === studentId);
    if (studentId && stu && seat) {
      appState.showToast(
        `🎉 Đã xếp ${stu.full_name} vào Bàn ${seat.table_number} (${seat.col_number % 2 === 1 ? 'Ghế Trái' : 'Ghế Phải'})!`,
        'success'
      );
    } else if (seat) {
      appState.showToast(`Đã làm trống vị trí tại Bàn ${seat.table_number}!`, 'info');
    }
    setSelectedSeat(null);
    setActiveInlineSeatId(null);
  };

  const handleInlineSelect = (seat: Seat, student: Student) => {
    handleAssignStudent(seat.id, student.id);
    setInlineInputs((prev) => ({ ...prev, [seat.id]: '' }));
    setActiveInlineSeatId(null);
  };

  const handleInlineClear = (seat: Seat) => {
    handleAssignStudent(seat.id, undefined);
    setInlineInputs((prev) => ({ ...prev, [seat.id]: '' }));
    setActiveInlineSeatId(null);
  };

  const handleSwapSeats = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSeat || !targetSwapSeatId) return;

    const targetSeat = seats.find((s) => s.id === targetSwapSeatId);
    appState.swapSeats(selectedSeat.id, targetSwapSeatId);
    appState.showToast(
      `Đã hoán đổi vị trí giữa Bàn ${selectedSeat.table_number} và Bàn ${targetSeat?.table_number}!`,
      'success'
    );
    setSelectedSeat(null);
  };

  const handleAutoArrange = (method: 'by_group' | 'by_roster') => {
    if (
      confirm(
        `Bạn có chắc muốn tự động sắp xếp lại chỗ ngồi ${
          method === 'by_group' ? 'theo Tổ học tập' : 'theo STT Danh sách'
        } không? (Hệ thống đã tự động lưu bản dự phòng trước đó để bạn có thể khôi phục bất cứ lúc nào)`
      )
    ) {
      appState.autoArrangeSeats(method);
      appState.showToast(
        `Đã tự động sắp xếp lại sơ đồ chỗ ngồi ${
          method === 'by_group' ? 'theo 4 Tổ' : 'theo danh sách 43 HS'
        }!`,
        'success'
      );
    }
  };

  const handleResetAllSeats = () => {
    if (confirm('⚠️ XÁC NHẬN: Bạn có chắc muốn LÀM TRỐNG TOÀN BỘ sơ đồ chỗ ngồi để xếp mới không?\n\nLưu ý: Hệ thống đã lưu sẵn Bản Dự Phòng. Nếu lỡ tay xóa, bạn chỉ cần bấm "↩️ Khôi phục Sơ đồ vừa làm" để quay lại ngay lập tức.')) {
      appState.createSeatingBackupSnapshot();
      seats.forEach((seat) => appState.assignStudentToSeat(seat.id, undefined));
      appState.showToast('Đã làm trống toàn bộ sơ đồ chỗ ngồi! Bạn có thể bấm "↩️ Khôi phục Sơ đồ vừa làm" nếu muốn quay lại.', 'info');
    }
  };

  const handleRestoreSeatingBackup = () => {
    const success = appState.restorePreviousSeatingBackup();
    if (success) {
      appState.showToast('↺ Đã khôi phục thành công sơ đồ chỗ ngồi về trạng thái trước đó!', 'success');
    } else {
      appState.showToast('Chưa có bản sao lưu sơ đồ chỗ ngồi trước đó!', 'warn');
    }
  };

  const handleOpenLeadersModal = () => {
    setLeadersForm({
      group1: groups.find((g) => g.group_number === 1)?.leader_student_id || '',
      group2: groups.find((g) => g.group_number === 2)?.leader_student_id || '',
      group3: groups.find((g) => g.group_number === 3)?.leader_student_id || '',
      group4: groups.find((g) => g.group_number === 4)?.leader_student_id || '',
    });
    setShowLeadersModal(true);
  };

  const handleSaveGroupLeaders = async (e: React.FormEvent) => {
    e.preventDefault();
    const g1 = groups.find((g) => g.group_number === 1);
    if (g1) await appState.updateGroupLeader(g1.id, leadersForm.group1);

    const g2 = groups.find((g) => g.group_number === 2);
    if (g2) await appState.updateGroupLeader(g2.id, leadersForm.group2);

    const g3 = groups.find((g) => g.group_number === 3);
    if (g3) await appState.updateGroupLeader(g3.id, leadersForm.group3);

    const g4 = groups.find((g) => g.group_number === 4);
    if (g4) await appState.updateGroupLeader(g4.id, leadersForm.group4);

    appState.showToast('👑 Đã cập nhật và đồng bộ phân công Tổ trưởng 4 Tổ thành công!', 'success');
    setShowLeadersModal(false);
  };

  // Filter matching students for quick search
  const getMatchingStudents = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const qUnaccent = unaccent(q);
    return students.filter((s) => {
      const nameMatch = unaccent(s.full_name.toLowerCase()).includes(qUnaccent);
      const codeMatch = s.student_code.toLowerCase().includes(q);
      const sttMatch = s.id.endsWith(`-${q}`) || s.id === `stu-${q.padStart(2, '0')}`;
      return nameMatch || codeMatch || sttMatch;
    });
  };

  const seatedStudentsCount = seats.filter((s) => s.student_id).length;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print View Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #seating-print-area, #seating-print-area * {
            visibility: visible;
          }
          #seating-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* DATA SAFETY & AUTO-SAVE PERMANENT GUARANTEE BANNER */}
      <div className="bg-emerald-950/90 border border-emerald-500/30 p-3.5 rounded-2xl text-white text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md no-print">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3.5 w-3.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
          </span>
          <div>
            <div className="font-black text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
              <span>🟢 TỰ ĐỘNG LƯU DỮ LIỆU TỨC THÌ (LƯU VĨNH VIỄN VÀO BỘ NHỚ LỚP)</span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Mọi thay đổi vị trí, gõ tên hay chuyển tổ đều được hệ thống tự động lưu 100% ngay khi thực hiện. Bạn không bao giờ sợ mất dữ liệu.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {appState.hasSeatingBackup() && (
            <button
              onClick={handleRestoreSeatingBackup}
              className="px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold rounded-xl text-xs shadow-xs transition active:scale-95 flex items-center gap-1.5 cursor-pointer"
              title="Khôi phục sơ đồ chỗ ngồi về trạng thái trước thao tác vừa rồi"
            >
              <History className="w-4 h-4 text-slate-950" />
              <span>↩️ Khôi phục Sơ đồ vừa làm</span>
            </button>
          )}
          <button
            onClick={() => appState.exportFullDatabaseBackup()}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Tải về tệp sao lưu dữ liệu (.json) để cất giữ an toàn tuyệt đối"
          >
            <FileDown className="w-4 h-4 text-blue-400" />
            <span>Tải Sao Lưu (.json)</span>
          </button>
        </div>
      </div>

      {/* Header & Controls Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 no-print">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Sơ đồ Chỗ ngồi Lớp 10A16</h2>
            <span className="text-xs px-3 py-1 rounded-full font-bold bg-blue-100 text-blue-900 border border-blue-200">
              Mỗi bàn 2 người · 4 Bàn/Hàng · {tables.length} Bàn ({seatedStudentsCount}/{students.length} HS)
            </span>
            {canManageSeating && (
              <span className="text-xs px-2.5 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                GVCN / Ban Cán sự: Toàn quyền điều hành
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Bố trí 2 học sinh/bàn chuẩn lớp học THPT Võ Trường Toản • Phục vụ điểm danh nề nếp & vi phạm Mã V06
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setViewMode('standard')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'standard'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chuẩn
            </button>
            <button
              onClick={() => setViewMode('compact')}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewMode === 'compact'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Thu gọn
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg transition text-slate-700 hover:bg-slate-200 flex items-center gap-1 font-bold"
              title="In hoặc Xuất sơ đồ chỗ ngồi ra PDF"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>In Sơ đồ</span>
            </button>
          </div>

          {/* Quick Unseated Student Drawer Toggle */}
          {unseatedStudents.length > 0 && (
            <button
              onClick={() => setShowUnseatedDrawer(!showUnseatedDrawer)}
              className="px-3 py-1.5 text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl border border-amber-300 transition flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5 text-amber-700" />
              <span>{unseatedStudents.length} HS Chưa xếp bàn</span>
            </button>
          )}

          {canManageSeating && (
            <>
              <button
                onClick={() => setIsQuickTypeMode(!isQuickTypeMode)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                  isQuickTypeMode
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-black'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                title="Bật/Tắt ô gõ trực tiếp tên học sinh ngay trên sơ đồ"
              >
                <Zap className="w-4 h-4 text-amber-900 fill-amber-300" />
                <span>{isQuickTypeMode ? 'Đang bật Gõ Tên Nhanh' : 'Gõ Tên Trực Tiếp'}</span>
              </button>

              <button
                onClick={handleOpenLeadersModal}
                className="px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1.5 font-black"
                title="Đổi/Bố trí lại Tổ trưởng cho Tổ 1, Tổ 2, Tổ 3, Tổ 4"
              >
                <Crown className="w-3.5 h-3.5 text-slate-950 fill-amber-300" />
                <span>Bố trí Tổ trưởng</span>
              </button>

              <button
                onClick={() => handleAutoArrange('by_group')}
                className="px-3 py-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                title="Sắp xếp tự động học sinh theo Tổ 1, Tổ 2, Tổ 3, Tổ 4"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Xếp theo Tổ</span>
              </button>

              <button
                onClick={() => handleAutoArrange('by_roster')}
                className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                title="Sắp xếp tự động học sinh theo số thứ tự danh sách lớp"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Xếp theo STT</span>
              </button>

              <button
                onClick={handleResetAllSeats}
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition cursor-pointer flex items-center gap-1"
                title="Làm trống toàn bộ bàn"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Trống bàn</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter & Quick Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 no-print">
        {/* Filter by Group */}
        <div className="md:col-span-4 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-bold text-slate-700 shrink-0">Lọc theo Tổ:</span>
          <select
            value={selectedGroupFilter}
            onChange={(e) => setSelectedGroupFilter(e.target.value)}
            className="w-full text-xs font-semibold bg-slate-50 p-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Tất cả các Tổ (Hiển thị đầy đủ sơ đồ)</option>
            <option value="group-01">Tổ 1 (Màu Xanh Dương)</option>
            <option value="group-02">Tổ 2 (Màu Xanh Lá)</option>
            <option value="group-03">Tổ 3 (Màu Hổ Phách)</option>
            <option value="group-04">Tổ 4 (Màu Tím)</option>
            <option value="unseated">Học sinh chưa xếp bàn</option>
          </select>
        </div>

        {/* Global Instant Search Bar */}
        <div className="md:col-span-8 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-3 rounded-2xl shadow-xs text-white flex flex-col sm:flex-row items-center gap-2">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={globalSearchQuery}
              onChange={(e) => setGlobalSearchQuery(e.target.value)}
              placeholder="Gõ tên hoặc mã học sinh để tìm vị trí ngồi tức thời (Ví dụ: Bảo, Anh, 10A16.05)..."
              className="w-full pl-9 pr-8 py-1.5 bg-white text-slate-900 font-medium rounded-xl text-xs outline-none focus:ring-2 focus:ring-amber-400"
            />
            {globalSearchQuery && (
              <button
                onClick={() => setGlobalSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Auto Suggest Popover */}
            {globalSearchQuery.trim() && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 z-50 max-h-60 overflow-y-auto p-1 divide-y divide-slate-100">
                {getMatchingStudents(globalSearchQuery).length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-500 italic">
                    Không tìm thấy học sinh "{globalSearchQuery}"
                  </div>
                ) : (
                  getMatchingStudents(globalSearchQuery).map((s) => {
                    const curSeat = seats.find((st) => st.student_id === s.id);
                    const targetTable = tables.find((t) => t.tableNumber === selectedTableForGlobal);
                    const targetSeat =
                      selectedSlotForGlobal === 'left' ? targetTable?.leftSeat : targetTable?.rightSeat;

                    return (
                      <div
                        key={s.id}
                        className="p-2.5 hover:bg-blue-50 rounded-lg transition flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{s.full_name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            Mã: {s.student_code} · {curSeat ? `Đang ở Bàn ${curSeat.table_number}` : 'Chưa xếp bàn'}
                          </div>
                        </div>

                        {canManageSeating && targetSeat && (
                          <button
                            type="button"
                            onClick={() => {
                              handleAssignStudent(targetSeat.id, s.id);
                              setGlobalSearchQuery('');
                            }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[10px] shrink-0"
                          >
                            Xếp vào Bàn {selectedTableForGlobal} ({selectedSlotForGlobal === 'left' ? 'Ghế Trái' : 'Ghế Phải'})
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {canManageSeating && (
            <div className="flex items-center gap-1 text-xs shrink-0 w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-slate-300 font-semibold text-[11px]">Đích xếp:</span>
              <select
                value={selectedTableForGlobal}
                onChange={(e) => setSelectedTableForGlobal(Number(e.target.value))}
                className="bg-white text-slate-900 font-bold p-1.5 rounded-lg text-xs outline-none"
              >
                {tables.map((t) => (
                  <option key={t.tableNumber} value={t.tableNumber}>
                    Bàn {t.tableNumber} (Hà.{t.rowNumber}-Dã.{t.colGroupNumber})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setSelectedSlotForGlobal(selectedSlotForGlobal === 'left' ? 'right' : 'left')}
                className="px-2 py-1 bg-amber-400 text-slate-950 font-extrabold rounded-lg text-xs"
              >
                {selectedSlotForGlobal === 'left' ? 'Ghế Trái' : 'Ghế Phải'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drawer for Unseated Students */}
      {showUnseatedDrawer && unseatedStudents.length > 0 && (
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-3 no-print">
          <div className="flex items-center justify-between border-b border-amber-200 pb-2">
            <div className="flex items-center gap-2 font-bold text-amber-900 text-xs">
              <Users className="w-4 h-4 text-amber-700" />
              <span>DANH SÁCH {unseatedStudents.length} HỌC SINH CHƯA ĐƯỢC XẾP VÀO BÀN</span>
            </div>
            <button
              onClick={() => setShowUnseatedDrawer(false)}
              className="text-amber-700 hover:text-amber-900 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {unseatedStudents.map((stu) => {
              const emptySeat = seats.find((s) => !s.student_id);
              return (
                <div
                  key={stu.id}
                  className="bg-white p-2 rounded-xl border border-amber-200 shadow-2xs flex flex-col justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-[11px] truncate">{stu.full_name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{stu.student_code}</div>
                  </div>
                  {canManageSeating && emptySeat && (
                    <button
                      type="button"
                      onClick={() => handleAssignStudent(emptySeat.id, stu.id)}
                      className="mt-1.5 w-full py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] rounded-lg transition"
                    >
                      + Xếp Bàn {emptySeat.table_number}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MAIN SEATING CHART AREA (INCLUDED IN PRINT AREA) */}
      <div id="seating-print-area" className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        {/* Printable Header Info */}
        <div className="text-center border-b border-slate-200 pb-4 space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {classInfo.school_name} — NĂM HỌC {classInfo.academic_year}
          </div>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
            SƠ ĐỒ CHỖ NGỒI LỚP {classInfo.class_name.toUpperCase()}
          </h1>
          <p className="text-xs text-slate-600 font-medium">
            GVCN: <strong>{classInfo.gvcn_name}</strong> · Phòng học: <strong>{classInfo.room_number}</strong> · Tổng số: <strong>{students.length} Học sinh</strong> (2 người/bàn)
          </p>
        </div>

        {/* COLUMN TO GROUP DIRECTIVE BANNER */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-3 rounded-xl text-white text-xs font-semibold flex flex-col sm:flex-row items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-amber-400 text-slate-950 font-black rounded-md text-[11px] uppercase">⚡ Quy tắc Cột = Tổ</span>
            <span className="text-slate-200 text-[11px]">4 Cột bàn từ trái sang phải tương ứng đúng 4 Tổ (Cột 1 = Tổ 1, Cột 2 = Tổ 2, Cột 3 = Tổ 3, Cột 4 = Tổ 4)</span>
          </div>
          <span className="text-[11px] text-amber-300 font-bold italic shrink-0">
            🔄 Khi thay đổi vị trí chỗ ngồi sang cột khác, Tổ của học sinh sẽ tự động chuyển theo!
          </span>
        </div>

        {/* TOP CLASSROOM PODIUM & ENVIRONMENT FRAME */}
        <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-700">
          {/* Left Door Indicator */}
          <div className="col-span-3 sm:col-span-2 p-2 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 text-slate-600 text-[11px]">
            <DoorOpen className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="truncate">CỬA RA VÀO (Dãy 1)</span>
          </div>

          {/* Blackboard & Teacher Podium */}
          <div className="col-span-6 sm:col-span-8 bg-slate-900 text-white rounded-xl p-3 text-center border border-slate-800 shadow-inner space-y-0.5">
            <div className="text-xs font-black uppercase tracking-widest text-amber-400">
              BẢNG LỚP HỌC & BỤC GIẢNG GIÁO VIÊN
            </div>
            <div className="text-[10px] text-slate-300 font-medium">
              (Bàn Giáo viên đặt ở giữa bục giảng · Nhìn xuống học sinh)
            </div>
          </div>

          {/* Right Windows Indicator */}
          <div className="col-span-3 sm:col-span-2 p-2 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 text-slate-600 text-[11px]">
            <span className="truncate">CỬA SỔ & ÁNH SÁNG (Dãy 4)</span>
          </div>
        </div>

        {/* ROWS OF TABLES GRID */}
        <div className="space-y-6 max-w-7xl mx-auto">
          {rowsMap.map((row) => {
            const rowStudentCount = row.tables.reduce(
              (acc, t) => acc + (t.leftSeat?.student_id ? 1 : 0) + (t.rightSeat?.student_id ? 1 : 0),
              0
            );

            return (
              <div
                key={row.rowNumber}
                className="bg-slate-50/80 p-3 sm:p-4 rounded-2xl border border-slate-200 space-y-3"
              >
                {/* Row Title */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white bg-slate-900 px-3 py-1 rounded-lg font-mono">
                      HÀNG {row.rowNumber}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
                      (Gồm 4 bàn: Dãy 1 · Dãy 2  ||  Dãy 3 · Dãy 4)
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 font-mono">
                    {rowStudentCount} / {row.tables.length * 2} HS
                  </div>
                </div>

                {/* 4 Tables Split into Left Block & Right Block with Central Aisle */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
                  {/* LEFT SIDE: Dãy 1 & Dãy 2 */}
                  <div className="md:col-span-6 grid grid-cols-2 gap-3">
                    {row.tables.slice(0, 2).map((table) => (
                      <TableCard
                        key={table.tableNumber}
                        table={table}
                        students={students}
                        seats={seats}
                        groups={groups}
                        canManage={canManageSeating}
                        isQuickTypeMode={isQuickTypeMode}
                        viewMode={viewMode}
                        selectedGroupFilter={selectedGroupFilter}
                        globalSearchQuery={globalSearchQuery}
                        inlineInputs={inlineInputs}
                        activeInlineSeatId={activeInlineSeatId}
                        getOfficerRoleBadge={getOfficerRoleBadge}
                        getMatchingStudents={getMatchingStudents}
                        onInputChange={(seatId, val) => {
                          setInlineInputs((prev) => ({ ...prev, [seatId]: val }));
                          setActiveInlineSeatId(seatId);
                        }}
                        onSelectStudent={(seat, stu) => handleInlineSelect(seat, stu)}
                        onClearSeat={(seat) => handleInlineClear(seat)}
                        onOpenModal={(seat) => handleOpenSeatModal(seat)}
                      />
                    ))}
                  </div>

                  {/* CENTRAL AISLE (LỐI ĐI CHÍNH Ở GIỮA LỚP) */}
                  <div className="hidden md:flex md:col-span-1 items-center justify-center">
                    <div className="h-full w-full py-2 bg-slate-200/50 rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-[10px] font-extrabold text-slate-400 tracking-wider uppercase select-none">
                      <span>LỐI</span>
                      <span>ĐI</span>
                      <span>GIỮA</span>
                    </div>
                  </div>

                  {/* RIGHT SIDE: Dãy 3 & Dãy 4 */}
                  <div className="md:col-span-5 grid grid-cols-2 gap-3">
                    {row.tables.slice(2, 4).map((table) => (
                      <TableCard
                        key={table.tableNumber}
                        table={table}
                        students={students}
                        seats={seats}
                        groups={groups}
                        canManage={canManageSeating}
                        isQuickTypeMode={isQuickTypeMode}
                        viewMode={viewMode}
                        selectedGroupFilter={selectedGroupFilter}
                        globalSearchQuery={globalSearchQuery}
                        inlineInputs={inlineInputs}
                        activeInlineSeatId={activeInlineSeatId}
                        getOfficerRoleBadge={getOfficerRoleBadge}
                        getMatchingStudents={getMatchingStudents}
                        onInputChange={(seatId, val) => {
                          setInlineInputs((prev) => ({ ...prev, [seatId]: val }));
                          setActiveInlineSeatId(seatId);
                        }}
                        onSelectStudent={(seat, stu) => handleInlineSelect(seat, stu)}
                        onClearSeat={(seat) => handleInlineClear(seat)}
                        onOpenModal={(seat) => handleOpenSeatModal(seat)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Printable Footer Signatures */}
        <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs text-slate-800">
          <div>
            <div className="font-bold uppercase">BAN CÁN SỰ LỚP 10A16</div>
            <div className="text-[10px] text-slate-500 italic mt-0.5">(Ký & ghi rõ họ tên)</div>
            <div className="mt-12 font-bold">{classInfo.class_president_name}</div>
          </div>
          <div>
            <div className="font-bold uppercase">GIÁO VIÊN CHỦ NHIỆM</div>
            <div className="text-[10px] text-slate-500 italic mt-0.5">(Đã phê duyệt & chốt sơ đồ)</div>
            <div className="mt-12 font-bold">{classInfo.gvcn_name}</div>
          </div>
        </div>
      </div>

      {/* Group Leaders Quick Assignment Modal */}
      {showLeadersModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400 fill-amber-300" />
                  <span>Bố trí & Chỉ định Tổ trưởng (4 Tổ Lớp 10A16)</span>
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Toàn quyền điều chỉnh linh hoạt không khoá cứng • Đồng bộ vĩnh viễn
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLeadersModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroupLeaders} className="p-5 space-y-4 text-xs">
              {/* Group 1 */}
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1">
                <label className="block font-bold text-blue-900">Tổ trưởng Tổ 1 (Màu Xanh Dương):</label>
                <select
                  value={leadersForm.group1}
                  onChange={(e) => setLeadersForm({ ...leadersForm, group1: e.target.value })}
                  className="w-full p-2 border rounded-xl border-blue-300 bg-white font-medium"
                >
                  <option value="">-- Chưa chỉ định --</option>
                  {students.map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.student_code} - {stu.full_name} (Tổ {groups.find((g) => g.id === stu.group_id)?.group_number || '?'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Group 2 */}
              <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1">
                <label className="block font-bold text-emerald-900">Tổ trưởng Tổ 2 (Màu Xanh Lá):</label>
                <select
                  value={leadersForm.group2}
                  onChange={(e) => setLeadersForm({ ...leadersForm, group2: e.target.value })}
                  className="w-full p-2 border rounded-xl border-emerald-300 bg-white font-medium"
                >
                  <option value="">-- Chưa chỉ định --</option>
                  {students.map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.student_code} - {stu.full_name} (Tổ {groups.find((g) => g.id === stu.group_id)?.group_number || '?'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Group 3 */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1">
                <label className="block font-bold text-amber-900">Tổ trưởng Tổ 3 (Màu Hổ Phách):</label>
                <select
                  value={leadersForm.group3}
                  onChange={(e) => setLeadersForm({ ...leadersForm, group3: e.target.value })}
                  className="w-full p-2 border rounded-xl border-amber-300 bg-white font-medium"
                >
                  <option value="">-- Chưa chỉ định --</option>
                  {students.map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.student_code} - {stu.full_name} (Tổ {groups.find((g) => g.id === stu.group_id)?.group_number || '?'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Group 4 */}
              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200 space-y-1">
                <label className="block font-bold text-purple-900">Tổ trưởng Tổ 4 (Màu Tím):</label>
                <select
                  value={leadersForm.group4}
                  onChange={(e) => setLeadersForm({ ...leadersForm, group4: e.target.value })}
                  className="w-full p-2 border rounded-xl border-purple-300 bg-white font-medium"
                >
                  <option value="">-- Chưa chỉ định --</option>
                  {students.map((stu) => (
                    <option key={stu.id} value={stu.id}>
                      {stu.student_code} - {stu.full_name} (Tổ {groups.find((g) => g.id === stu.group_id)?.group_number || '?'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                <span className="text-[11px] text-slate-500 italic">
                  * Tự động điều chỉnh tổ cho học sinh được chọn làm Tổ trưởng
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLeadersModal(false)}
                    className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 text-slate-950" />
                    <span>Lưu Phân Công Tổ Trưởng</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      {selectedSeat && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  Bàn {selectedSeat.table_number} ({selectedSeat.col_number % 2 === 1 ? 'Ghế Trái' : 'Ghế Phải'})
                </h3>
                <p className="text-xs text-slate-300">
                  {students.find((s) => s.id === selectedSeat.student_id)
                    ? `Hiện tại: ${students.find((s) => s.id === selectedSeat.student_id)?.full_name}`
                    : 'Vị trí này đang để trống'}
                </p>
              </div>
              <button
                onClick={() => setSelectedSeat(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            {canManageSeating && (
              <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-200 bg-slate-50 text-xs font-bold">
                {students.some((s) => s.id === selectedSeat.student_id) && (
                  <button
                    type="button"
                    onClick={() => setSeatActionTab('inspect')}
                    className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${
                      seatActionTab === 'inspect'
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Xem hồ sơ
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSeatActionTab('assign')}
                  className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${
                    seatActionTab === 'assign'
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {students.some((s) => s.id === selectedSeat.student_id) ? 'Đổi học sinh' : 'Xếp học sinh vào bàn'}
                </button>
                {students.some((s) => s.id === selectedSeat.student_id) && (
                  <button
                    type="button"
                    onClick={() => setSeatActionTab('swap')}
                    className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1 ${
                      seatActionTab === 'swap'
                        ? 'border-blue-600 text-blue-700'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Hoán đổi chỗ</span>
                  </button>
                )}
              </div>
            )}

            {/* TAB 1: Inspect */}
            {seatActionTab === 'inspect' && students.find((s) => s.id === selectedSeat.student_id) && (
              <div className="p-5 space-y-3 text-xs">
                {(() => {
                  const seatStudent = students.find((s) => s.id === selectedSeat.student_id)!;
                  const snap = appState.weeklySnapshots.find((s) => s.student_id === seatStudent.id && s.is_current);
                  const badge = getOfficerRoleBadge(seatStudent);

                  return (
                    <>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-900 text-sm">{seatStudent.full_name}</span>
                            {badge && (
                              <span className={`px-1.5 py-0.5 rounded text-[10px] ${badge.color}`}>
                                {badge.label}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">Mã số: {seatStudent.student_code}</div>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-blue-700 text-base font-mono">
                            {snap?.official_week_score ?? 8.0}đ
                          </span>
                          <div className="text-[10px] text-slate-400">Điểm tuần</div>
                        </div>
                      </div>

                      {canManageSeating && (
                        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => handleAssignStudent(selectedSeat.id, undefined)}
                            className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hủy gán (Làm trống)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSeatActionTab('assign')}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-2xs transition cursor-pointer"
                          >
                            Đổi học sinh ngồi bàn này
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* TAB 2: Assign Student */}
            {seatActionTab === 'assign' && canManageSeating && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAssignStudent(selectedSeat.id, selectedStudentForSeat || undefined);
                }}
                className="p-5 space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Chọn học sinh xếp vào Bàn {selectedSeat.table_number} ({selectedSeat.col_number % 2 === 1 ? 'Ghế Trái' : 'Ghế Phải'}):
                  </label>
                  <select
                    value={selectedStudentForSeat}
                    onChange={(e) => setSelectedStudentForSeat(e.target.value)}
                    className="w-full p-2.5 border rounded-xl border-slate-300 text-xs"
                  >
                    <option value="">-- Để trống vị trí này --</option>
                    {students.map((stu) => {
                      const curSeat = seats.find((s) => s.student_id === stu.id);
                      return (
                        <option key={stu.id} value={stu.id}>
                          {stu.student_code} - {stu.full_name} {curSeat ? `(Đang ở Bàn ${curSeat.table_number})` : '(Chưa xếp bàn)'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedSeat(null)}
                    className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Lưu xếp chỗ</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 3: Swap Seats */}
            {seatActionTab === 'swap' && canManageSeating && (
              <form onSubmit={handleSwapSeats} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Hoán đổi Bàn {selectedSeat.table_number} với:
                  </label>
                  <select
                    value={targetSwapSeatId}
                    onChange={(e) => setTargetSwapSeatId(e.target.value)}
                    className="w-full p-2.5 border rounded-xl border-slate-300 text-xs"
                  >
                    {seats
                      .filter((s) => s.id !== selectedSeat.id)
                      .map((s) => {
                        const targetStu = students.find((st) => st.id === s.student_id);
                        return (
                          <option key={s.id} value={s.id}>
                            Bàn {s.table_number} ({s.col_number % 2 === 1 ? 'Ghế Trái' : 'Ghế Phải'}) - {targetStu ? targetStu.full_name : '(Chỗ trống)'}
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedSeat(null)}
                    className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-2xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>Xác nhận hoán đổi chỗ</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Component for Table Card holding 2 Students
interface TableCardProps {
  table: { tableNumber: number; rowNumber: number; colGroupNumber: number; leftSeat?: Seat; rightSeat?: Seat };
  students: Student[];
  seats: Seat[];
  groups: any[];
  canManage: boolean;
  isQuickTypeMode: boolean;
  viewMode: 'standard' | 'compact' | 'print';
  selectedGroupFilter: string;
  globalSearchQuery: string;
  inlineInputs: Record<string, string>;
  activeInlineSeatId: string | null;
  getOfficerRoleBadge: (stu: Student) => { label: string; color: string; icon: any } | null;
  getMatchingStudents: (q: string) => Student[];
  onInputChange: (seatId: string, val: string) => void;
  onSelectStudent: (seat: Seat, stu: Student) => void;
  onClearSeat: (seat: Seat) => void;
  onOpenModal: (seat: Seat) => void;
}

const TableCard: React.FC<TableCardProps> = ({
  table,
  students,
  seats,
  groups,
  canManage,
  isQuickTypeMode,
  viewMode,
  selectedGroupFilter,
  globalSearchQuery,
  inlineInputs,
  activeInlineSeatId,
  getOfficerRoleBadge,
  getMatchingStudents,
  onInputChange,
  onSelectStudent,
  onClearSeat,
  onOpenModal,
}) => {
  const leftSeat = table.leftSeat;
  const rightSeat = table.rightSeat;

  const leftStudent = leftSeat ? students.find((s) => s.id === leftSeat.student_id) : null;
  const rightStudent = rightSeat ? students.find((s) => s.id === rightSeat.student_id) : null;

  // Filter out table if filter by group doesn't match
  if (selectedGroupFilter !== 'all') {
    if (selectedGroupFilter === 'unseated') {
      if (leftStudent || rightStudent) return null;
    } else {
      const leftGroupMatch = leftStudent?.group_id === selectedGroupFilter;
      const rightGroupMatch = rightStudent?.group_id === selectedGroupFilter;
      if (!leftGroupMatch && !rightGroupMatch) return null;
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-blue-400 shadow-2xs hover:shadow-md transition overflow-hidden">
      {/* Table Top Header */}
      <div className="bg-slate-100 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-bold text-slate-800">
          <span className="bg-slate-900 text-white font-mono px-2 py-0.5 rounded text-[11px]">
            BÀN {table.tableNumber}
          </span>
          <span className="text-[10px] text-blue-900 bg-blue-100 font-bold px-1.5 py-0.5 rounded border border-blue-200 font-mono">
            Cột {table.colGroupNumber} · Tổ {table.colGroupNumber}
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">(2 HS/Bàn)</span>
      </div>

      {/* Table Split Surface (Ghế Trái & Ghế Phải) */}
      <div className="grid grid-cols-2 divide-x divide-slate-200">
        <SeatSlot
          seat={leftSeat}
          student={leftStudent}
          slotLabel="Ghế 1 (Trái)"
          canManage={canManage}
          isQuickTypeMode={isQuickTypeMode}
          viewMode={viewMode}
          globalSearchQuery={globalSearchQuery}
          inputValue={leftSeat ? inlineInputs[leftSeat.id] || '' : ''}
          isActive={leftSeat ? activeInlineSeatId === leftSeat.id : false}
          getOfficerRoleBadge={getOfficerRoleBadge}
          onInputChange={(val) => leftSeat && onInputChange(leftSeat.id, val)}
          onSelectStudent={(stu) => leftSeat && onSelectStudent(leftSeat, stu)}
          onClearSeat={() => leftSeat && onClearSeat(leftSeat)}
          onOpenModal={() => leftSeat && onOpenModal(leftSeat)}
          matchingStudents={getMatchingStudents(leftSeat ? inlineInputs[leftSeat.id] || '' : '')}
        />

        <SeatSlot
          seat={rightSeat}
          student={rightStudent}
          slotLabel="Ghế 2 (Phải)"
          canManage={canManage}
          isQuickTypeMode={isQuickTypeMode}
          viewMode={viewMode}
          globalSearchQuery={globalSearchQuery}
          inputValue={rightSeat ? inlineInputs[rightSeat.id] || '' : ''}
          isActive={rightSeat ? activeInlineSeatId === rightSeat.id : false}
          getOfficerRoleBadge={getOfficerRoleBadge}
          onInputChange={(val) => rightSeat && onInputChange(rightSeat.id, val)}
          onSelectStudent={(stu) => rightSeat && onSelectStudent(rightSeat, stu)}
          onClearSeat={() => rightSeat && onClearSeat(rightSeat)}
          onOpenModal={() => rightSeat && onOpenModal(rightSeat)}
          matchingStudents={getMatchingStudents(rightSeat ? inlineInputs[rightSeat.id] || '' : '')}
        />
      </div>
    </div>
  );
};

// Individual Seat Slot
interface SeatSlotProps {
  seat?: Seat;
  student?: Student | null;
  slotLabel: string;
  canManage: boolean;
  isQuickTypeMode: boolean;
  viewMode: 'standard' | 'compact' | 'print';
  globalSearchQuery: string;
  inputValue: string;
  isActive: boolean;
  getOfficerRoleBadge: (stu: Student) => { label: string; color: string; icon: any } | null;
  onInputChange: (val: string) => void;
  onSelectStudent: (stu: Student) => void;
  onClearSeat: () => void;
  onOpenModal: () => void;
  matchingStudents: Student[];
}

const SeatSlot: React.FC<SeatSlotProps> = ({
  seat,
  student,
  slotLabel,
  canManage,
  isQuickTypeMode,
  viewMode,
  globalSearchQuery,
  inputValue,
  isActive,
  getOfficerRoleBadge,
  onInputChange,
  onSelectStudent,
  onClearSeat,
  onOpenModal,
  matchingStudents,
}) => {
  if (!seat) {
    return <div className="p-2 text-center text-xs text-slate-400 italic">Trống</div>;
  }

  const snap = student
    ? appState.weeklySnapshots.find((s) => s.student_id === student.id && s.is_current)
    : null;
  const group = student ? appState.groups.find((g) => g.id === student.group_id) : null;
  const badge = student ? getOfficerRoleBadge(student) : null;

  // Highlight logic when searching globally
  const isMatchSearch =
    globalSearchQuery.trim() &&
    student &&
    (unaccent(student.full_name.toLowerCase()).includes(unaccent(globalSearchQuery.toLowerCase())) ||
      student.student_code.toLowerCase().includes(globalSearchQuery.toLowerCase()));

  // Group Badge Color map
  const getGroupBadgeClass = (gNo?: number) => {
    switch (gNo) {
      case 1:
        return 'bg-blue-100 text-blue-900 border-blue-200';
      case 2:
        return 'bg-emerald-100 text-emerald-900 border-emerald-200';
      case 3:
        return 'bg-amber-100 text-amber-900 border-amber-200';
      case 4:
        return 'bg-purple-100 text-purple-900 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div
      className={`p-2.5 flex flex-col justify-between min-h-[100px] relative transition ${
        isMatchSearch ? 'bg-amber-100/90 ring-2 ring-amber-400' : 'hover:bg-blue-50/40'
      }`}
    >
      {/* Slot Label & Score Badge */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-1">
        <span>{slotLabel}</span>
        {student && snap && (
          <span className="font-extrabold text-blue-700 font-mono bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
            {snap.official_week_score}đ
          </span>
        )}
      </div>

      {/* Student Details or Empty Slot */}
      {student ? (
        <div className="space-y-1">
          <div
            onClick={onOpenModal}
            className="font-bold text-slate-900 text-xs hover:text-blue-700 cursor-pointer flex items-center justify-between group"
            title="Nhấp để xem thông tin hoặc chỉnh sửa chỗ ngồi"
          >
            <span className="truncate">{student.full_name}</span>
            <Edit3 className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0 opacity-0 group-hover:opacity-100 transition" />
          </div>

          <div className="flex items-center justify-between gap-1 text-[10px]">
            <span className="font-mono text-slate-500 font-medium">{student.student_code}</span>
            {group && (
              <span className={`px-1.5 py-0.2 rounded font-bold border ${getGroupBadgeClass(group.group_number)}`}>
                Tổ {group.group_number}
              </span>
            )}
          </div>

          {/* Role Badge if officer */}
          {badge && (
            <div className="pt-0.5">
              <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider ${badge.color}`}>
                {badge.label}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={onOpenModal}
          className="my-auto py-2 text-center text-slate-400 text-xs italic flex items-center justify-center gap-1 cursor-pointer hover:text-blue-600"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Chỗ trống</span>
        </div>
      )}

      {/* Quick Direct Input Field */}
      {canManage && (isQuickTypeMode || inputValue.trim()) && (
        <div className="mt-1.5 pt-1 border-t border-slate-100 relative no-print">
          <div className="relative flex items-center gap-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              placeholder={student ? 'Đổi tên...' : 'Nhập tên/STT...'}
              className="w-full px-1.5 py-0.5 text-[10px] bg-white border border-slate-300 rounded outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
            />
            {student && (
              <button
                type="button"
                onClick={onClearSeat}
                className="p-0.5 text-slate-400 hover:text-rose-600 rounded shrink-0 cursor-pointer"
                title="Làm trống"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Direct Input Suggestion List */}
          {inputValue.trim() && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-slate-300 z-50 max-h-48 overflow-y-auto divide-y divide-slate-100 p-1 text-xs">
              {matchingStudents.length === 0 ? (
                <div className="p-2 text-center text-[10px] text-slate-400 italic">Không có kết quả</div>
              ) : (
                matchingStudents.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => onSelectStudent(s)}
                    className="p-1.5 hover:bg-blue-50 rounded cursor-pointer transition flex items-center justify-between text-[11px]"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{s.full_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{s.student_code}</div>
                    </div>
                    <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
