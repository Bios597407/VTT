import React, { useState } from 'react';
import { appState } from '../services/appStateService';
import { StatusBadge } from '../components/StatusBadge';
import { tallyAttendance, OFFICIAL_SESSIONS, ABSENCE_PROCEDURES } from '../domain/attendance/attendanceRules';
import { AttendanceStatus } from '../types';
import {
  CalendarCheck,
  Plus,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Search,
  Filter,
  FileText,
  Zap,
  Check,
  CheckCircle2,
  X,
} from 'lucide-react';

interface Props {
  onOpenQuickAttendance: () => void;
}

export const AttendancePage: React.FC<Props> = ({ onOpenQuickAttendance }) => {
  const attendance = appState.attendance;
  const students = appState.students;
  const currentUser = appState.currentUser;

  const canManageAttendance =
    Boolean(currentUser.isAuthenticatedOfficer) &&
    (currentUser.role === 'gvcn' ||
      currentUser.role === 'lop_truong' ||
      currentUser.role === 'lop_pho');

  const [dateFilter, setDateFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const pendingList = attendance.filter((a) => a.status === 'absence_pending_verification');

  const filtered = attendance.filter((a) => {
    if (dateFilter && a.date !== dateFilter) return false;
    if (sessionFilter !== 'all' && a.session !== sessionFilter) return false;
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    return true;
  });

  const tally = tallyAttendance(attendance);

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Quản lý Điểm danh & Theo dõi VnEdu
          </h2>
          <p className="text-xs text-slate-500">
            Hồ sơ sự thật chuyên cần lớp 10A16 • Căn cứ theo QĐ số 525/QĐ-THPT.VTT
          </p>
        </div>
        <button
          onClick={onOpenQuickAttendance}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Điểm danh buổi học
        </button>
      </div>

      {/* KPI Tally Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500">Tổng buổi vắng thực tế</div>
          <div className="text-2xl font-black text-slate-800 mt-1">{tally.actualTotalAbsenceSessions}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Số liệu thực tế ghi nhận</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500">Vắng có phép (VnEdu)</div>
          <div className="text-2xl font-black text-blue-600 mt-1">{tally.permittedAbsenceCount}</div>
          <div className="text-[10px] text-blue-700 mt-0.5">Trần khống chế Tốt: &ge; 10 buổi</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500">Vắng không phép</div>
          <div className="text-2xl font-black text-rose-600 mt-1">{tally.unpermittedAbsenceCount}</div>
          <div className="text-[10px] text-rose-700 mt-0.5">Trần khống chế Tốt: &ge; 2 buổi</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500">Đi học trễ mốc quy định</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{tally.lateCount}</div>
          <div className="text-[10px] text-amber-700 mt-0.5">Sau 06:50 / Sau 12:50</div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500">Cảnh báo quy tắc 45 buổi</div>
          <div className="text-2xl font-black text-purple-600 mt-1">
            {tally.warning45RuleCount} <span className="text-xs text-slate-400 font-normal">/ 45</span>
          </div>
          <div className="text-[10px] text-purple-700 mt-0.5">Theo dõi cảnh báo độc lập</div>
        </div>
      </div>

      {/* Official Procedures Warning Box */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
        <div className="font-bold text-slate-800 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-blue-600" />
          Quy định thủ tục xin phép & Nguyên tắc an toàn dữ liệu chuyên cần
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-600 text-[11px]">
          <div>
            • <strong>Vắng 1–3 ngày:</strong> Phụ huynh nộp đơn xin phép có minh chứng trên VnEdu. Ứng dụng này theo dõi tiến trình và đối chiếu, <em>không thay thế VnEdu</em>.
          </div>
          <div>
            • <strong>Vắng 4 ngày trở lên:</strong> Bắt buộc phụ huynh phải đến làm việc trực tiếp tại trường.
          </div>
          <div>
            • <strong>Tính điểm rèn luyện:</strong> Điểm danh là hồ sơ sự thật chuyên cần, <em>tuyệt đối không tự động trừ điểm trực tiếp</em>. Vắng không phép sẽ đề xuất lập vi phạm Mã 14 để GVCN xem xét.
          </div>
          <div>
            • <strong>Miễn trừ chính đáng:</strong> Nằm viện, tang chế gia đình, thi IELTS, thi ĐGNL được trừ khỏi bộ đếm khống chế xếp loại Tốt.
          </div>
        </div>
      </div>

      {/* 1-TOUCH PENDING VERIFICATION ACTION BANNER */}
      {pendingList.length > 0 && canManageAttendance && (
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-slate-950 p-4 sm:p-5 rounded-2xl shadow-md border border-amber-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-black shrink-0 shadow-xs">
              <Zap className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="font-black text-sm text-slate-950 tracking-tight flex items-center gap-2">
                <span>Phát hiện {pendingList.length} hồ sơ điểm danh đang ở trạng thái "Chờ xác minh"!</span>
              </div>
              <p className="text-xs font-semibold text-slate-900 mt-0.5">
                Bấm 1-chạm bên phải để duyệt tức thời chuyển tất cả thành Có mặt hoặc Vắng có phép!
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => appState.approveAllPendingAttendance('present')}
              className="flex-1 sm:flex-none px-4 py-2 bg-slate-950 hover:bg-slate-900 text-white font-black text-xs rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>⚡ 1-Chạm: Duyệt Tất Cả Có Mặt</span>
            </button>
            <button
              type="button"
              onClick={() => appState.approveAllPendingAttendance('permitted_absence')}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-white hover:bg-amber-50 text-slate-950 font-bold text-xs rounded-xl border border-slate-300 shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>🔵 Vắng có phép</span>
            </button>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
          <Filter className="w-3.5 h-3.5" />
          Bộ lọc:
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="border rounded-lg px-2.5 py-1.5 text-xs border-slate-300"
        />
        <select
          value={sessionFilter}
          onChange={(e) => setSessionFilter(e.target.value)}
          className="border rounded-lg px-2.5 py-1.5 text-xs border-slate-300"
        >
          <option value="all">Tất cả buổi học</option>
          <option value="morning">Buổi sáng</option>
          <option value="afternoon">Buổi chiều</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-2.5 py-1.5 text-xs border-slate-300"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="permitted_absence">Vắng có phép</option>
          <option value="unpermitted_absence">Vắng không phép</option>
          <option value="late">Đi học trễ</option>
          <option value="absence_pending_verification">Chờ xác minh phép</option>
        </select>
        {(dateFilter || sessionFilter !== 'all' || statusFilter !== 'all') && (
          <button
            onClick={() => {
              setDateFilter('');
              setSessionFilter('all');
              setStatusFilter('all');
            }}
            className="text-blue-600 hover:underline font-semibold ml-auto"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Attendance Mobile Card Feed */}
      <div className="md:hidden space-y-2.5">
        {filtered.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            Không có bản ghi điểm danh nào phù hợp với bộ lọc.
          </div>
        ) : (
          filtered.map((record) => {
            const student = students.find((s) => s.id === record.student_id);
            return (
              <div
                key={record.id}
                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-900">{student?.full_name || 'N/A'}</span>
                    <span className="font-mono text-[11px] text-blue-700 font-semibold ml-1.5">
                      ({student?.student_code || record.student_id})
                    </span>
                  </div>
                  <StatusBadge
                    type={
                      record.status === 'present'
                        ? 'present'
                        : record.status === 'permitted_absence'
                        ? 'tot'
                        : record.status === 'unpermitted_absence'
                        ? 'rejected'
                        : record.status === 'late'
                        ? 'dat'
                        : 'pending_verification'
                    }
                    label={
                      record.status === 'present'
                        ? 'Có mặt'
                        : record.status === 'permitted_absence'
                        ? 'Vắng có phép'
                        : record.status === 'unpermitted_absence'
                        ? 'Vắng K.phép'
                        : record.status === 'late'
                        ? 'Đi trễ'
                        : record.status === 'truancy'
                        ? 'Trốn tiết'
                        : 'Chờ xác minh'
                    }
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>
                    {record.date} · {record.session === 'morning' ? 'Sáng' : 'Chiều'}
                  </span>
                  <span>
                    {record.arrival_time ? `Đến: ${record.arrival_time}` : record.reason || '—'}
                  </span>
                </div>

                {canManageAttendance && (
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-500">1-Chạm duyệt:</span>
                    <button
                      type="button"
                      onClick={() => appState.updateAttendanceStatus(record.id, 'present')}
                      className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold shadow-2xs"
                    >
                      ✓ Có mặt
                    </button>
                    <button
                      type="button"
                      onClick={() => appState.updateAttendanceStatus(record.id, 'permitted_absence')}
                      className="px-2 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold shadow-2xs"
                    >
                      🔵 Vắng phép
                    </button>
                    <button
                      type="button"
                      onClick={() => appState.updateAttendanceStatus(record.id, 'unpermitted_absence')}
                      className="px-2 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold shadow-2xs"
                    >
                      🔴 K.Phép
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Attendance History Table (Desktop) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Ngày</th>
                <th className="py-3 px-4">Buổi</th>
                <th className="py-3 px-4">Mã số</th>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Trạng thái hiện tại</th>
                <th className="py-3 px-4 bg-amber-50/60 text-slate-900 border-x border-amber-200">
                  ⚡ 1-Chạm Duyệt &amp; Đổi Trạng Thái
                </th>
                <th className="py-3 px-4">Giờ đến / Chi tiết</th>
                <th className="py-3 px-4">Mã VnEdu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-400">
                    Không có bản ghi điểm danh nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                filtered.map((record) => {
                  const student = students.find((s) => s.id === record.student_id);
                  const isPending = record.status === 'absence_pending_verification';

                  return (
                    <tr key={record.id} className={`hover:bg-slate-50/80 ${isPending ? 'bg-amber-50/30' : ''}`}>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">{record.date}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-700">
                          {record.session === 'morning' ? 'Sáng' : 'Chiều'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {student?.student_code || record.student_id}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">{student?.full_name || 'N/A'}</td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          type={
                            record.status === 'present'
                              ? 'present'
                              : record.status === 'permitted_absence'
                              ? 'tot'
                              : record.status === 'unpermitted_absence'
                              ? 'rejected'
                              : record.status === 'late'
                              ? 'dat'
                              : 'pending_verification'
                          }
                          label={
                            record.status === 'present'
                              ? 'Có mặt'
                              : record.status === 'permitted_absence'
                              ? 'Vắng có phép'
                              : record.status === 'unpermitted_absence'
                              ? 'Vắng K.phép'
                              : record.status === 'late'
                              ? 'Đi trễ'
                              : record.status === 'truancy'
                              ? 'Trốn tiết'
                              : 'Chờ xác minh'
                          }
                        />
                      </td>

                      {/* 1-TOUCH DIRECT ACTION BUTTONS CELL */}
                      <td className="py-2.5 px-4 bg-amber-50/20 border-x border-amber-200">
                        {canManageAttendance ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => appState.updateAttendanceStatus(record.id, 'present')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition shadow-2xs cursor-pointer active:scale-95 ${
                                record.status === 'present'
                                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-400'
                                  : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                              }`}
                              title="1-Chạm xác nhận Có mặt đầy đủ"
                            >
                              ✓ Có mặt
                            </button>
                            <button
                              type="button"
                              onClick={() => appState.updateAttendanceStatus(record.id, 'permitted_absence')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition shadow-2xs cursor-pointer active:scale-95 ${
                                record.status === 'permitted_absence'
                                  ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                                  : 'bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300'
                              }`}
                              title="1-Chạm xác nhận Vắng có phép"
                            >
                              🔵 Có phép
                            </button>
                            <button
                              type="button"
                              onClick={() => appState.updateAttendanceStatus(record.id, 'unpermitted_absence')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition shadow-2xs cursor-pointer active:scale-95 ${
                                record.status === 'unpermitted_absence'
                                  ? 'bg-rose-600 text-white ring-2 ring-rose-400'
                                  : 'bg-rose-100 hover:bg-rose-200 text-rose-900 border border-rose-300'
                              }`}
                              title="1-Chạm chuyển Vắng không phép"
                            >
                              🔴 K.Phép
                            </button>
                            <button
                              type="button"
                              onClick={() => appState.updateAttendanceStatus(record.id, 'late')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition shadow-2xs cursor-pointer active:scale-95 ${
                                record.status === 'late'
                                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                                  : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                              }`}
                              title="1-Chạm chuyển Đi trễ"
                            >
                              🟡 Trễ
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium italic">Chỉ xem</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-600">
                        {record.arrival_time && (
                          <span className="font-mono font-semibold text-amber-700 mr-2">
                            Lúc {record.arrival_time}
                          </span>
                        )}
                        <span>{record.reason || '—'}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {record.vnedu_ref_number || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
