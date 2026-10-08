import React, { useState } from 'react';
import { appState } from '../services/appStateService';
import { Printer, X, Users, User, CheckCircle2, Award, AlertTriangle, FileText } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialStudentId?: string;
}

export const StudentReportCardModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialStudentId,
}) => {
  const students = appState.students;
  const groups = appState.groups;
  const classInfo = appState.classInfo;
  const weeklySnapshots = appState.weeklySnapshots;
  const incidents = appState.incidents;
  const rewards = appState.rewards;
  const attendance = appState.attendance;

  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialStudentId || 'all'
  );

  if (!isOpen) return null;

  const filteredStudents =
    selectedStudentId === 'all'
      ? students
      : students.filter((s) => s.id === selectedStudentId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6 max-h-[92vh] flex flex-col">
        {/* Header - Screen Only */}
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                In Phiếu Đánh Giá Rèn Luyện & Sổ Liên Lạc Cá Nhân
              </div>
              <h3 className="text-base font-black tracking-tight">
                Mẫu Chuẩn Bộ GD&ĐT · Lớp 10A16 ({filteredStudents.length} Học Sinh)
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              In / Xuất PDF ({filteredStudents.length} HS)
            </button>
            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Toolbar - Screen Only */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Users className="w-4 h-4 text-slate-500" />
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Chọn Học sinh:</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="flex-1 sm:w-80 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 shadow-xs cursor-pointer focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">🖨️ Tất cả 43 Học sinh lớp 10A16 (In hàng loạt)</option>
              {students.map((stu) => (
                <option key={stu.id} value={stu.id}>
                  {stu.student_code} - {stu.full_name}
                </option>
              ))}
            </select>
          </div>
          <div className="text-[11px] text-slate-500 italic">
            * Mẫu in tự động ngắt trang (`page-break`) cho từng học sinh khi xuất in.
          </div>
        </div>

        {/* Report Cards Preview & Print Container */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1 bg-slate-100 print:p-0 print:bg-white print:space-y-0">
          {filteredStudents.map((stu, index) => {
            const group = groups.find((g) => g.id === stu.group_id);
            const snap = weeklySnapshots.find((s) => s.student_id === stu.id && s.is_current);
            const stuIncidents = incidents.filter((i) => i.student_id === stu.id && i.incident_status === 'approved');
            const stuRewards = rewards.filter((r) => r.student_id === stu.id && r.status === 'approved');
            const stuAttendance = attendance.filter((a) => a.student_id === stu.id);

            const totalAbsencesPermitted = stuAttendance.filter((a) => a.status === 'permitted_absence').length;
            const totalAbsencesUnpermitted = stuAttendance.filter((a) => a.status === 'unpermitted_absence' || a.status === 'truancy').length;
            const totalLates = stuAttendance.filter((a) => a.status === 'late').length;

            const officialScore = snap?.official_week_score ?? 8.0;
            let conductRank = 'Tốt';
            if (officialScore < 5.0) conductRank = 'Chưa đạt';
            else if (officialScore < 6.5) conductRank = 'Đạt';
            else if (officialScore < 8.0) conductRank = 'Khá';

            return (
              <div
                key={stu.id}
                className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md max-w-3xl mx-auto space-y-6 print:shadow-none print:border-none print:p-6 print:rounded-none print:w-full print:max-w-none print:break-after-page"
              >
                {/* Official School Header */}
                <div className="border-b pb-4 border-slate-300 grid grid-cols-2 text-xs text-slate-800">
                  <div className="text-left font-semibold">
                    <div>SỞ GD&ĐT TP. HỒ CHÍ MINH</div>
                    <div className="font-extrabold text-slate-900">TRƯỜNG THPT VÕ TRƯỜNG TOẢN</div>
                    <div className="italic text-[11px] text-slate-600">Lớp 10A16 · Năm học {classInfo.academic_year}</div>
                  </div>
                  <div className="text-right font-semibold">
                    <div className="font-bold uppercase text-slate-900">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div className="italic text-[11px] text-slate-600">Độc lập - Tự do - Hạnh phúc</div>
                  </div>
                </div>

                {/* Report Card Title */}
                <div className="text-center space-y-1">
                  <h2 className="text-base font-black text-blue-950 uppercase tracking-tight">
                    PHIẾU ĐÁNH GIÁ KẾT QUẢ RÈN LUYỆN & NỀ NẾP HỌC SINH
                  </h2>
                  <div className="text-xs text-slate-600 font-medium italic">
                    (Căn cứ Thông tư 22/2021/TT-BGDĐT & Nội quy THPT Võ Trường Toản)
                  </div>
                </div>

                {/* Student Personal Info Box */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500">Họ và tên học sinh:</span>
                    <div className="font-extrabold text-sm text-slate-900">{stu.full_name}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Mã số học sinh:</span>
                    <div className="font-mono font-bold text-slate-800">{stu.student_code}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Tổ học tập:</span>
                    <div className="font-bold text-blue-800">{group?.group_name || 'Tổ 1'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Sơ đồ chỗ ngồi:</span>
                    <div className="font-medium text-slate-800">{stu.seat_number || 'Bàn học chính'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Giáo viên chủ nhiệm:</span>
                    <div className="font-bold text-slate-900">{classInfo.gvcn_name || 'Thầy Trần Duy Tân'}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Sĩ số lớp:</span>
                    <div className="font-bold text-slate-800">43 / 43 Học sinh</div>
                  </div>
                </div>

                {/* Performance & Score Table */}
                <div className="space-y-2 text-xs">
                  <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    1. ĐÁNH GIÁ ĐIỂM SỐ RÈN LUYỆN & XẾP LOẠI:
                  </div>
                  <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 font-bold">
                        <th className="p-2 border border-slate-300 text-center">Điểm Gốc</th>
                        <th className="p-2 border border-slate-300 text-center">Điểm Thưởng (+</th>
                        <th className="p-2 border border-slate-300 text-center">Điểm Phạt (-)</th>
                        <th className="p-2 border border-slate-300 text-center font-bold text-blue-900">Điểm Chính Thức</th>
                        <th className="p-2 border border-slate-300 text-center font-bold">Xếp Loại Rèn Luyện</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-2 border border-slate-300 text-center font-mono">8.0</td>
                        <td className="p-2 border border-slate-300 text-center font-bold text-emerald-700">
                          +{snap?.reward_points ?? 0}
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-bold text-rose-700">
                          -{snap?.deduction_points ?? 0}
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-black text-sm text-blue-900 bg-blue-50">
                          {officialScore.toFixed(1)} / 10
                        </td>
                        <td className="p-2 border border-slate-300 text-center font-extrabold">
                          <span
                            className={`px-2.5 py-1 rounded-md text-xs inline-block ${
                              conductRank === 'Tốt'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : conductRank === 'Khá'
                                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {conductRank}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Attendance Breakdown */}
                <div className="space-y-2 text-xs">
                  <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    2. THỐNG KÊ CHUYÊN CẦN & CHỈ SỐ THI ĐƯA:
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <div className="text-[11px] text-slate-500">Vắng có phép</div>
                      <div className="font-extrabold text-slate-900">{totalAbsencesPermitted} buổi</div>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <div className="text-[11px] text-slate-500">Vắng không phép</div>
                      <div className={`font-extrabold ${totalAbsencesUnpermitted > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                        {totalAbsencesUnpermitted} buổi
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                      <div className="text-[11px] text-slate-500">Lượt đi trễ</div>
                      <div className="font-extrabold text-slate-900">{totalLates} lượt</div>
                    </div>
                  </div>
                </div>

                {/* Commendations & Incidents detail */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5 p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                    <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-emerald-700" />
                      Tuyên Dương & Điểm Thưởng:
                    </div>
                    {stuRewards.length === 0 ? (
                      <div className="text-slate-500 italic text-[11px]">Duy trì nề nếp ổn định.</div>
                    ) : (
                      <ul className="list-disc list-inside text-slate-800 space-y-1">
                        {stuRewards.map((r) => (
                          <li key={r.id}>{r.title} (+{r.points} điểm)</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="space-y-1.5 p-3 bg-rose-50/60 border border-rose-200 rounded-xl">
                    <div className="font-bold text-rose-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-700" />
                      Ghi Nhận Vi Phạm & Lý Giải Nguyên Nhân Trừ Điểm:
                    </div>
                    {stuIncidents.length === 0 ? (
                      <div className="text-emerald-800 font-medium text-[11px]">✅ Tuyên dương: Không có vi phạm nội quy.</div>
                    ) : (
                      <ul className="space-y-1.5 text-slate-800 text-[11px]">
                        {stuIncidents.map((inc) => {
                          const catalogItem = appState.conductCatalog.find((c) => c.code === inc.conduct_code);
                          const title = catalogItem ? catalogItem.title : (inc.conduct_code ? `Lỗi Mã ${inc.conduct_code}` : 'Sự việc khác');
                          return (
                            <li key={inc.id} className="p-1.5 bg-white rounded border border-rose-100 shadow-2xs">
                              <div className="font-bold text-rose-900 flex items-center justify-between">
                                <span>• [Mã {inc.conduct_code || 'Khác'}] {title}</span>
                                <span className="font-mono text-rose-700 font-extrabold">-{inc.effective_deduction}đ</span>
                              </div>
                              <div className="text-slate-700 text-[10px] mt-0.5 font-semibold">
                                📅 <strong>Thời gian:</strong> Ngày {inc.date} · {inc.session === 'morning' ? 'Buổi sáng' : 'Buổi chiều'}{inc.period ? ` (Tiết ${inc.period})` : ''}
                              </div>
                              <div className="text-slate-600 text-[10px] mt-0.5">
                                📝 <strong>Lý do trừ điểm:</strong> {inc.notes || inc.other_category_description || 'Nhắc nhở nề nếp lớp học'}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Teacher Qualitative Comment */}
                <div className="space-y-1.5 text-xs">
                  <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                    3. NHẬN XÉT CỦA GIÁO VIÊN CHỦ NHIỆM:
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 min-h-[60px] leading-relaxed italic">
                    {stu.full_name} có tinh thần trách nhiệm, thực hiện tốt nội quy Lớp 10A16. Tự giác trong học tập và tích cực tham gia các hoạt động tập thể của lớp.
                  </div>
                </div>

                {/* Signatures Footer Block */}
                <div className="grid grid-cols-3 text-center text-xs pt-6 border-t border-slate-300 font-semibold text-slate-900 print:break-inside-avoid">
                  <div>
                    <div>Ý KIẾN PHỤ HUYNH</div>
                    <div className="text-[10px] text-slate-500 font-normal italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                    <div className="h-16"></div>
                  </div>

                  <div>
                    <div>GIÁO VIÊN CHỦ NHIỆM</div>
                    <div className="text-[10px] text-slate-500 font-normal italic mt-0.5">(Ký và ghi rõ họ tên)</div>
                    <div className="h-16"></div>
                    <div className="font-bold text-blue-900">{classInfo.gvcn_name || 'Thầy Trần Duy Tân'}</div>
                  </div>

                  <div>
                    <div>XÁC NHẬN BAN GIÁM HIỆU</div>
                    <div className="text-[10px] text-slate-500 font-normal italic mt-0.5">(Ký tên & Đóng dấu)</div>
                    <div className="h-16"></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
