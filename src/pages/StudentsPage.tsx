import React, { useState } from 'react';
import { appState } from '../services/appStateService';
import { Student } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { tallyAttendance } from '../domain/attendance/attendanceRules';
import { formatIncidentDeductionRationale } from '../domain/incidents/conductCatalog';
import {
  Search,
  User,
  Shield,
  Award,
  AlertTriangle,
  Heart,
  X,
  FileSpreadsheet,
  Lock,
  CalendarCheck,
  Plus,
  Edit3,
  Trash2,
  Check,
  Users,
} from 'lucide-react';

export const StudentsPage: React.FC = () => {
  const students = appState.students;
  const groups = appState.groups;
  const currentUser = appState.currentUser;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // Modal tab: 'profile' | 'edit'
  const [modalTab, setModalTab] = useState<'profile' | 'edit'>('profile');

  // Add Student Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLastName, setAddLastName] = useState('');
  const [addFirstName, setAddFirstName] = useState('');
  const [addStudentCode, setAddStudentCode] = useState('');
  const [addGroupId, setAddGroupId] = useState('group-01');
  const [addSeatNumber, setAddSeatNumber] = useState('');

  // Edit Student Form state
  const [editLastName, setEditLastName] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editStudentCode, setEditStudentCode] = useState('');
  const [editGroupId, setEditGroupId] = useState('group-01');
  const [editSeatNumber, setEditSeatNumber] = useState('');
  const [editStatus, setEditStatus] = useState<Student['status']>('active');

  // Permission: GVCN, Lớp phó, Lớp trưởng có toàn quyền điều chỉnh hồ sơ học sinh
  const canManageStudents =
    currentUser.role === 'gvcn' ||
    currentUser.role === 'lop_truong' ||
    currentUser.role === 'lop_pho';

  // RBAC Filter: If role is hoc_sinh, only show themselves
  const filteredStudents = students.filter((s) => {
    if (currentUser.role === 'hoc_sinh' && currentUser.student_id && s.id !== currentUser.student_id) {
      return false; // Student A cannot see Student B
    }
    if (selectedGroupFilter !== 'all' && s.group_id !== selectedGroupFilter) {
      return false;
    }
    const matchName = s.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCode = s.student_code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchName || matchCode;
  });

  const handleOpenStudent = (stu: Student, mode: 'profile' | 'edit' = 'profile') => {
    setSelectedStudent(stu);
    setModalTab(mode);
    setEditLastName(stu.last_name);
    setEditFirstName(stu.first_name);
    setEditStudentCode(stu.student_code);
    setEditGroupId(stu.group_id || 'group-01');
    setEditSeatNumber(stu.seat_number || '');
    setEditStatus(stu.status);
  };

  const handleOpenAddStudent = () => {
    const nextIndex = (students.length + 1).toString().padStart(2, '0');
    setAddStudentCode(`10A16.${nextIndex}`);
    setAddLastName('');
    setAddFirstName('');
    setAddGroupId('group-01');
    setAddSeatNumber(`Bàn ${Math.floor(students.length / 2) + 1}`);
    setShowAddModal(true);
  };

  const handleSaveAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFirstName.trim() || !addStudentCode.trim()) return;

    const fullName = `${addLastName.trim()} ${addFirstName.trim()}`.trim();
    appState.addStudent({
      student_code: addStudentCode.trim(),
      full_name: fullName,
      first_name: addFirstName.trim(),
      last_name: addLastName.trim(),
      class_id: 'class-10a16',
      is_demo: false,
      group_id: addGroupId,
      seat_number: addSeatNumber.trim() || undefined,
      status: 'active',
    });

    appState.showToast(`Đã thêm học sinh ${fullName} vào Lớp 10A16!`, 'success');
    setShowAddModal(false);
  };

  const handleSaveEditStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !editFirstName.trim() || !editStudentCode.trim()) return;

    const updatedFullName = `${editLastName.trim()} ${editFirstName.trim()}`.trim();
    appState.updateStudent(selectedStudent.id, {
      student_code: editStudentCode.trim(),
      full_name: updatedFullName,
      first_name: editFirstName.trim(),
      last_name: editLastName.trim(),
      group_id: editGroupId,
      seat_number: editSeatNumber.trim() || undefined,
      status: editStatus,
    });

    appState.showToast(`Đã cập nhật hồ sơ học sinh ${updatedFullName}!`, 'success');
    setSelectedStudent(null);
  };

  const handleDeleteStudent = (stu: Student) => {
    if (confirm(`Bạn có chắc chắn muốn xóa học sinh "${stu.full_name}" khỏi danh sách Lớp 10A16 không?`)) {
      appState.deleteStudent(stu.id);
      appState.showToast(`Đã xóa học sinh ${stu.full_name}!`, 'info');
      setSelectedStudent(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">Học sinh Lớp 10A16</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
              Sĩ số: {students.length}
            </span>
            {canManageStudents && (
              <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-800 hidden sm:inline">
                GVCN: Toàn quyền điều chỉnh
              </span>
            )}
          </div>
          <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
            {appState.classInfo.school_name} • Năm học {appState.classInfo.academic_year} • GVCN: {appState.classInfo.gvcn_name}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc mã số..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs pl-9 pr-3 py-2 border rounded-xl border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 w-full sm:w-56"
            />
          </div>

          {canManageStudents && (
            <button
              onClick={handleOpenAddStudent}
              className="px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm học sinh</span>
            </button>
          )}

          <span className="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 shrink-0 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            43 HS Chính thức
          </span>
        </div>
      </div>

      {/* Group Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => setSelectedGroupFilter('all')}
          className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
            selectedGroupFilter === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          Tất cả ({students.length})
        </button>
        {groups.map((grp) => {
          const count = students.filter((s) => s.group_id === grp.id).length;
          return (
            <button
              key={grp.id}
              onClick={() => setSelectedGroupFilter(grp.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer whitespace-nowrap ${
                selectedGroupFilter === grp.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              Tổ {grp.group_number} ({count})
            </button>
          );
        })}
      </div>

      {currentUser.role === 'hoc_sinh' && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs flex items-center gap-2">
          <Lock className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            <strong>Bảo mật hồ sơ cá nhân:</strong> Bạn đang đăng nhập với tư cách học sinh. Theo chính sách phân quyền (RLS), bạn chỉ có thể xem dữ liệu rèn luyện của chính mình.
          </span>
        </div>
      )}

      {/* Mobile Card List (visible on screens < 768px) */}
      <div className="md:hidden space-y-2.5">
        {filteredStudents.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            Không tìm thấy học sinh nào.
          </div>
        ) : (
          filteredStudents.map((stu, index) => {
            const group = groups.find((g) => g.id === stu.group_id);
            const snap = appState.weeklySnapshots.find((s) => s.student_id === stu.id && s.is_current);
            return (
              <div
                key={stu.id}
                onClick={() => handleOpenStudent(stu, 'profile')}
                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between active:scale-[0.99] transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-100">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <span>{stu.full_name}</span>
                      <span className="font-mono text-[10px] text-blue-600 font-semibold">({stu.student_code})</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {group?.group_name || 'Chưa xếp tổ'} • {stu.seat_number || 'Chưa gán bàn'}
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                  <div className="font-mono font-black text-xs text-blue-700">
                    {snap?.official_week_score ?? '8.0'}đ
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenStudent(stu, 'profile');
                      }}
                      className="text-[11px] text-blue-700 font-bold bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition"
                    >
                      Hồ sơ
                    </button>
                    {canManageStudents && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenStudent(stu, 'edit');
                        }}
                        className="text-[11px] text-amber-900 font-bold bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Sửa</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Student List Table (visible on screens >= 768px) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">STT</th>
                <th className="py-3 px-4">Mã số</th>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Tổ</th>
                <th className="py-3 px-4">Chỗ ngồi</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400">
                    Không tìm thấy học sinh nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((stu, index) => {
                  const group = groups.find((g) => g.id === stu.group_id);
                  return (
                    <tr key={stu.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 text-slate-500 font-mono">{index + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">{stu.student_code}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{stu.full_name}</div>
                        <div className="text-[10px] text-emerald-600 font-semibold">
                          Chính thức Lớp 10A16
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">{group?.group_name || 'Chưa xếp tổ'}</td>
                      <td className="py-3 px-4 text-slate-600">{stu.seat_number || 'Chưa gán'}</td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          type={stu.status === 'active' ? 'Đã duyệt' : 'Từ chối'}
                          label={stu.status === 'active' ? 'Đang học' : stu.status}
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenStudent(stu, 'profile')}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg transition cursor-pointer"
                          >
                            Xem hồ sơ
                          </button>
                          {canManageStudents && (
                            <button
                              onClick={() => handleOpenStudent(stu, 'edit')}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-semibold rounded-lg transition cursor-pointer flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Sửa</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Profile / Edit Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-base text-white">
                  {selectedStudent.first_name ? selectedStudent.first_name.slice(0, 1) : 'H'}
                </div>
                <div>
                  <h3 className="font-bold text-base">{selectedStudent.full_name}</h3>
                  <div className="text-xs text-slate-300 font-mono">
                    Mã số: {selectedStudent.student_code} • Lớp 10A16
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canManageStudents && modalTab === 'profile' && (
                  <button
                    type="button"
                    onClick={() => setModalTab('edit')}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Sửa hồ sơ</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs for Managers */}
            {canManageStudents && (
              <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-200 bg-slate-50 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setModalTab('profile')}
                  className={`pb-2.5 px-3 border-b-2 transition cursor-pointer ${
                    modalTab === 'profile'
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Hồ sơ rèn luyện
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('edit')}
                  className={`pb-2.5 px-3 border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                    modalTab === 'edit'
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Điều chỉnh thông tin</span>
                </button>
              </div>
            )}

            {/* Content: TAB 1 - Profile Details */}
            {modalTab === 'profile' && (
              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                {/* Attendance tally */}
                {(() => {
                  const stuAttendance = appState.attendance.filter((a) => a.student_id === selectedStudent.id);
                  const tally = tallyAttendance(stuAttendance);
                  return (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                        <CalendarCheck className="w-4 h-4 text-blue-600" />
                        Thống kê Chuyên cần (QĐ 525)
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <div className="text-slate-400 text-[10px]">Vắng có phép</div>
                          <div className="font-bold text-sm text-blue-700">{tally.permittedAbsenceCount} buổi</div>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <div className="text-slate-400 text-[10px]">Vắng không phép</div>
                          <div className="font-bold text-sm text-rose-700">{tally.unpermittedAbsenceCount} buổi</div>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <div className="text-slate-400 text-[10px]">Đi học trễ</div>
                          <div className="font-bold text-sm text-amber-700">{tally.lateCount} lần</div>
                        </div>
                        <div className="p-2 bg-white rounded-lg border border-slate-200">
                          <div className="text-slate-400 text-[10px]">Ngưỡng cảnh báo 45</div>
                          <div className="font-bold text-sm text-slate-800">{tally.warning45RuleCount} / 45</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Weekly score snapshot */}
                {(() => {
                  const snap = appState.weeklySnapshots.find((s) => s.student_id === selectedStudent.id && s.is_current);
                  return (
                    <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-blue-950 text-xs">Điểm rèn luyện tuần hiện tại</div>
                        <div className="text-slate-500 text-[11px]">
                          Điểm thô: {snap?.raw_week_score ?? 'Chưa tính'} • Điểm trừ: {snap?.deduction_points ?? 0} • Thưởng: +{snap?.reward_points ?? 0}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-black text-blue-700">
                          {snap?.official_week_score ?? '8.0'}
                        </div>
                        <div className="text-[10px] text-slate-500">Thang điểm 10 (Gốc 8)</div>
                      </div>
                    </div>
                  );
                })()}

                {/* Incidents involving student */}
                <div>
                  <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Lịch sử sự việc vi phạm ({appState.incidents.filter((i) => i.student_id === selectedStudent.id).length})
                  </h4>
                  <div className="space-y-1.5">
                    {appState.incidents.filter((i) => i.student_id === selectedStudent.id).length === 0 ? (
                      <div className="p-3 bg-slate-50 rounded-lg text-slate-500 text-center">
                        Không có vi phạm nào được ghi nhận.
                      </div>
                    ) : (
                      appState.incidents
                        .filter((i) => i.student_id === selectedStudent.id)
                        .map((inc) => (
                          <div key={inc.id} className="p-2.5 bg-rose-50/40 border border-rose-200 rounded-xl space-y-1">
                            <div className="font-bold text-rose-950 text-xs">
                              {formatIncidentDeductionRationale(inc, appState.conductCatalog)}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-rose-100">
                              <span>Ngày: {inc.date} · Buổi: {inc.session === 'morning' ? 'Sáng' : 'Chiều'} (Tiết {inc.period || 1})</span>
                              <div className="flex items-center gap-1.5">
                                <span>Báo bởi: {inc.reported_by}</span>
                                <StatusBadge type={inc.incident_status} />
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Rewards */}
                <div>
                  <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-emerald-600" />
                    Khen thưởng ({appState.rewards.filter((r) => r.student_id === selectedStudent.id).length})
                  </h4>
                  <div className="space-y-1.5">
                    {appState.rewards.filter((r) => r.student_id === selectedStudent.id).length === 0 ? (
                      <div className="p-3 bg-slate-50 rounded-lg text-slate-500 text-center">
                        Chưa có ghi nhận khen thưởng.
                      </div>
                    ) : (
                      appState.rewards
                        .filter((r) => r.student_id === selectedStudent.id)
                        .map((rew) => (
                          <div key={rew.id} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-slate-800">{rew.title}</div>
                              <div className="text-[10px] text-slate-500">Mã: {rew.reward_code} • Ngày: {rew.date}</div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-1">
                              <StatusBadge type={rew.status === 'approved' ? 'Đã duyệt' : 'Chờ xác minh'} />
                              <span className="font-bold text-emerald-600">+{rew.points}đ</span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {/* Positive notes */}
                <div>
                  <h4 className="font-bold text-slate-800 text-xs mb-2 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-pink-600" />
                    Ghi nhận tích cực (Lời khen phi điểm số)
                  </h4>
                  <div className="space-y-1.5">
                    {appState.positiveNotes.filter((n) => n.student_id === selectedStudent.id).length === 0 ? (
                      <div className="p-3 bg-slate-50 rounded-lg text-slate-500 text-center">
                        Chưa có lời khen ghi nhận.
                      </div>
                    ) : (
                      appState.positiveNotes
                        .filter((n) => n.student_id === selectedStudent.id)
                        .map((note) => (
                          <div key={note.id} className="p-2.5 bg-pink-50/50 border border-pink-200 rounded-lg">
                            <p className="text-slate-800 font-medium">&ldquo;{note.note_content}&rdquo;</p>
                            <div className="text-[10px] text-slate-500 mt-1">
                              — {note.teacher_name} ({note.date})
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

                {canManageStudents && (
                  <div className="pt-2 flex justify-between items-center border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleDeleteStudent(selectedStudent)}
                      className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa học sinh</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalTab('edit')}
                      className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Chỉnh sửa thông tin học sinh</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Content: TAB 2 - Edit Form (GVCN có toàn quyền điều chỉnh) */}
            {modalTab === 'edit' && canManageStudents && (
              <form onSubmit={handleSaveEditStudent} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                  <strong>Quyền hạn GVCN & Ban Cán sự:</strong> Thầy/cô có thể điều chỉnh toàn bộ họ tên, mã số, tổ sinh hoạt, vị trí chỗ ngồi và trạng thái học tập của học sinh.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Họ và tên đệm</label>
                    <input
                      type="text"
                      required
                      value={editLastName}
                      onChange={(e) => setEditLastName(e.target.value)}
                      placeholder="Ví dụ: Trần Đức"
                      className="w-full p-2.5 border rounded-xl border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tên</label>
                    <input
                      type="text"
                      required
                      value={editFirstName}
                      onChange={(e) => setEditFirstName(e.target.value)}
                      placeholder="Ví dụ: Anh"
                      className="w-full p-2.5 border rounded-xl border-slate-300 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Mã số học sinh</label>
                    <input
                      type="text"
                      required
                      value={editStudentCode}
                      onChange={(e) => setEditStudentCode(e.target.value)}
                      placeholder="Ví dụ: 10A16.01"
                      className="w-full p-2.5 border rounded-xl border-slate-300 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Tổ sinh hoạt</label>
                    <select
                      value={editGroupId}
                      onChange={(e) => setEditGroupId(e.target.value)}
                      className="w-full p-2.5 border rounded-xl border-slate-300 text-xs"
                    >
                      {groups.map((grp) => (
                        <option key={grp.id} value={grp.id}>
                          Tổ {grp.group_number} ({grp.group_name})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Vị trí chỗ ngồi</label>
                    <input
                      type="text"
                      value={editSeatNumber}
                      onChange={(e) => setEditSeatNumber(e.target.value)}
                      placeholder="Ví dụ: Bàn 1 (Dãy 1)"
                      className="w-full p-2.5 border rounded-xl border-slate-300 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Trạng thái học tập</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as any)}
                      className="w-full p-2.5 border rounded-xl border-slate-300 text-xs"
                    >
                      <option value="active">Đang học (Hoạt động)</option>
                      <option value="suspended">Tạm đình chỉ</option>
                      <option value="transferred">Chuyển lớp / Chuyển trường</option>
                      <option value="deferred">Bảo lưu</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => handleDeleteStudent(selectedStudent)}
                    className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 rounded-xl font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa học sinh</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModalTab('profile')}
                      className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Lưu thông tin học sinh</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Thêm học sinh mới vào Lớp 10A16</h3>
                <p className="text-xs text-slate-300">Nhập thông tin học sinh chính thức</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddStudent} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Họ và tên đệm *</label>
                  <input
                    type="text"
                    required
                    value={addLastName}
                    onChange={(e) => setAddLastName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn"
                    className="w-full p-2.5 border rounded-xl border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên *</label>
                  <input
                    type="text"
                    required
                    value={addFirstName}
                    onChange={(e) => setAddFirstName(e.target.value)}
                    placeholder="Ví dụ: An"
                    className="w-full p-2.5 border rounded-xl border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mã số học sinh *</label>
                  <input
                    type="text"
                    required
                    value={addStudentCode}
                    onChange={(e) => setAddStudentCode(e.target.value)}
                    placeholder="Ví dụ: 10A16.44"
                    className="w-full p-2.5 border rounded-xl border-slate-300 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tổ học tập</label>
                  <select
                    value={addGroupId}
                    onChange={(e) => setAddGroupId(e.target.value)}
                    className="w-full p-2.5 border rounded-xl border-slate-300 text-xs"
                  >
                    {groups.map((grp) => (
                      <option key={grp.id} value={grp.id}>
                        Tổ {grp.group_number} ({grp.group_name})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vị trí chỗ ngồi bàn học</label>
                <input
                  type="text"
                  value={addSeatNumber}
                  onChange={(e) => setAddSeatNumber(e.target.value)}
                  placeholder="Ví dụ: Bàn 5 (Dãy 1)"
                  className="w-full p-2.5 border rounded-xl border-slate-300 text-xs"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Xác nhận thêm học sinh</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
