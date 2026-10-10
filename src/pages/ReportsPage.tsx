import React, { useState } from 'react';
import { appState } from '../services/appStateService';
import { ExcelService } from '../services/excelService';
import { FileSpreadsheet, Printer, Download, FileText, CheckCircle2, MessageCircle, FileCheck, Sparkles, Calendar } from 'lucide-react';
import { ZaloReportModal } from '../components/ZaloReportModal';
import { StudentReportCardModal } from '../components/StudentReportCardModal';
import { formatIncidentDeductionRationale } from '../domain/incidents/conductCatalog';
import { getWeekDateRange, formatStudentWeeklyAttendance, getWeekNumberForDate } from '../domain/scoring/scoringEngine';

export const ReportsPage: React.FC = () => {
  const students = appState.students;
  const weeklySnapshots = appState.weeklySnapshots;
  const attendance = appState.attendance;
  const incidents = appState.incidents;

  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [printPreview, setPrintPreview] = useState(false);
  const [showZaloModal, setShowZaloModal] = useState(false);
  const [showCardsModal, setShowCardsModal] = useState(false);

  const range = getWeekDateRange(selectedWeek);

  const handleExportWeek = () => {
    const currentSnaps = weeklySnapshots.filter((s) => s.week_number === selectedWeek && s.is_current);
    ExcelService.exportWeeklyScoreExcel(
      students,
      currentSnaps,
      selectedWeek,
      range.optionLabel,
      attendance,
      range.fullRangeText
    );
    appState.showToast(`Đã tải xuống bảng điểm rèn luyện Tuần ${selectedWeek} (${range.shortRange})!`, 'success');
  };

  const handleExportAttendance = () => {
    ExcelService.exportAttendanceExcel(attendance, students);
    appState.showToast('Đã tải xuống sổ theo dõi điểm danh (.xlsx)!', 'success');
  };

  const handleExportIncidents = () => {
    ExcelService.exportIncidentsExcel(incidents, students);
    appState.showToast('Đã tải xuống nhật ký vi phạm nội quy (.xlsx)!', 'success');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Xuất Báo cáo Excel & Bản In Sư phạm
          </h2>
          <p className="text-xs text-slate-500">
            Xuất file định dạng .xlsx thực thụ, báo cáo Zalo 1-click và Phiếu đánh giá rèn luyện 43 học sinh
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowZaloModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            Báo cáo Zalo Phụ Huynh
          </button>
          <button
            onClick={() => setShowCardsModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
          >
            <FileCheck className="w-4 h-4" />
            In Phiếu Rèn Luyện (43 HS)
          </button>
          <button
            onClick={() => setPrintPreview(!printPreview)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            {printPreview ? 'Đóng chế độ in' : 'Xem mẫu in biên bản'}
          </button>
        </div>
      </div>

      {/* Feature Highlight Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Zalo Report Banner Card */}
        <div className="bg-gradient-to-br from-blue-900 to-indigo-950 p-5 rounded-2xl border border-blue-800 text-white shadow-md flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 bg-blue-500/20 text-blue-200 border border-blue-400/30 text-[10px] font-bold uppercase rounded-full tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-blue-300" /> Nâng Cấp Nổi Bật 1
              </span>
              <span className="text-xs font-bold text-blue-300">1-Click Copy</span>
            </div>
            <h3 className="font-extrabold text-base text-white">
              📱 Mẫu Báo Cáo Tổng Kết 1-Click Gửi Nhóm Zalo Phụ Huynh
            </h3>
            <p className="text-xs text-blue-100/80 leading-relaxed">
              Tự động tổng hợp chuyên cần, nề nếp, điểm thưởng thi đua, danh sách trực nhật và dặn dò của GVCN thành văn bản Zalo đẹp mắt.
            </p>
          </div>
          <button
            onClick={() => setShowZaloModal(true)}
            className="w-full py-2.5 px-4 bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition cursor-pointer active:scale-98"
          >
            <MessageCircle className="w-4 h-4" />
            Tạo Báo Cáo Zalo Ngay
          </button>
        </div>

        {/* Student Report Cards Banner Card */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 p-5 rounded-2xl border border-slate-800 text-white shadow-md flex flex-col justify-between space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-bold uppercase rounded-full tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" /> Nâng Cấp Nổi Bật 4
              </span>
              <span className="text-xs font-bold text-emerald-400">Chuẩn BGD&ĐT</span>
            </div>
            <h3 className="font-extrabold text-base text-white">
              📄 In Phiếu Đánh Giá Rèn Luyện / Sổ Liên Lạc Cá Nhân (43 HS)
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Xuất bản in phiếu đánh giá kết quả rèn luyện cho toàn bộ 43 học sinh Lớp 10A16. Định dạng chuẩn Thông tư 22 kèm chữ ký xác nhận 3 bên.
            </p>
          </div>
          <button
            onClick={() => setShowCardsModal(true)}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition cursor-pointer active:scale-98"
          >
            <FileCheck className="w-4 h-4" />
            In Phiếu Rèn Luyện 43 Học Sinh
          </button>
        </div>
      </div>

      {/* Week Selector Bar */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-blue-700 shrink-0" />
          <span className="font-bold text-slate-800">Chọn tuần để xuất báo cáo / in biên bản:</span>
          <select
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(Number(e.target.value))}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-blue-800 shadow-xs cursor-pointer focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => {
              const r = getWeekDateRange(w);
              return (
                <option key={w} value={w}>
                  {r.optionLabel}
                </option>
              );
            })}
          </select>
        </div>
        <div className="text-slate-600 font-semibold font-mono text-[11px] bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
          🗓️ {range.fullRangeText}
        </div>
      </div>

      {/* Excel Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Weekly Conduct Excel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl w-fit">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Bảng Điểm Rèn luyện Tuần (.xlsx)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Xuất danh sách điểm gốc 8, điểm thưởng, điểm phạt và điểm chính thức của toàn bộ học sinh lớp 10A16.
            </p>
          </div>
          <button
            onClick={handleExportWeek}
            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Tải tệp Excel Tuần
          </button>
        </div>

        {/* Card 2: Attendance History Excel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-xl w-fit">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Sổ Theo dõi Điểm danh (.xlsx)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Dữ liệu chuyên cần sáng/chiều, phân loại vắng có phép/không phép, mã tham chiếu VnEdu và lý do miễn trừ.
            </p>
          </div>
          <button
            onClick={handleExportAttendance}
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Tải tệp Excel Điểm danh
          </button>
        </div>

        {/* Card 3: Incidents Log Excel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl w-fit">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Nhật ký Vi phạm Nội quy (.xlsx)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Tổng hợp sự việc theo mã lỗi 01–24 QĐ 525, trạng thái thẩm tra và kết quả phê duyệt của GVCN.
            </p>
          </div>
          <button
            onClick={handleExportIncidents}
            className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Tải tệp Excel Sự việc
          </button>
        </div>
      </div>

      {/* Printable Report View */}
      {printPreview && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-8 space-y-6 max-w-4xl mx-auto print:m-0 print:border-none print:shadow-none print:max-w-none print:w-full">
          <div className="flex justify-between items-center border-b pb-4 border-slate-200 print:hidden">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Mẫu in Biên bản Sinh hoạt Lớp — Sĩ số 43/43 Học sinh</h3>
              <p className="text-xs text-slate-500">Xem trước toàn bộ 43 học sinh và chuẩn bị xuất in chính thức</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-sm transition active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                In Biên Bản / Tải PDF
              </button>
            </div>
          </div>

          <div className="text-center space-y-1 border-b pb-4 border-slate-300">
            <div className="text-xs font-semibold uppercase text-slate-700">
              SỞ GIÁO DỤC VÀ ĐÀO TẠO THÀNH PHỐ HỒ CHÍ MINH
            </div>
            <div className="text-sm font-black uppercase text-slate-900">
              TRƯỜNG THPT VÕ TRƯỜNG TOẢN — LỚP 10A16
            </div>
            <h2 className="text-base sm:text-lg font-black text-blue-900 pt-2 uppercase tracking-wide">
              BIÊN BẢN ĐÁNH GIÁ KẾT QUẢ RÈN LUYỆN VÀ NỀ NẾP TUẦN {selectedWeek}
            </h2>
            <div className="text-xs font-bold text-slate-800 uppercase tracking-tight">
              ({range.fullRangeText.toUpperCase()})
            </div>
            <div className="text-xs text-slate-600 italic">
              Năm học {appState.classInfo.academic_year} • Sĩ số: 43 học sinh • Giáo viên chủ nhiệm: {appState.classInfo.gvcn_name}
            </div>
          </div>

          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
                  <th className="p-2 border border-slate-300 text-center">STT</th>
                  <th className="p-2 border border-slate-300">Mã số</th>
                  <th className="p-2 border border-slate-300">Họ và tên</th>
                  <th className="p-2 border border-slate-300 text-center">Gốc</th>
                  <th className="p-2 border border-slate-300 text-center">Thưởng</th>
                  <th className="p-2 border border-slate-300 text-center text-rose-800">Trừ</th>
                  <th className="p-2 border border-slate-300 text-center font-bold">Điểm số</th>
                  <th className="p-2 border border-slate-300">📋 Chuyên cần</th>
                  <th className="p-2 border border-slate-300 min-w-[200px]">📌 Lý giải nguyên nhân trừ điểm (QĐ 525)</th>
                </tr>
              </thead>
              <tbody>
                {students.map((stu, idx) => {
                  const snap = weeklySnapshots.find((s) => s.student_id === stu.id && s.week_number === selectedWeek && s.is_current);
                  const stuIncidents = incidents.filter((inc) => {
                    if (inc.student_id !== stu.id || inc.incident_status !== 'approved') return false;
                    const incWeek = getWeekNumberForDate(inc.date);
                    return incWeek === selectedWeek;
                  });
                  const attSummary = formatStudentWeeklyAttendance(stu.id, selectedWeek, attendance);

                  // Format reasons string according to QĐ 525
                  let rationaleDisplay = '✅ Nề nếp tốt, không bị trừ điểm';
                  if (stuIncidents.length > 0) {
                    rationaleDisplay = stuIncidents
                      .map((inc) => formatIncidentDeductionRationale(inc, appState.conductCatalog))
                      .join(' | ');
                  }

                  return (
                    <tr key={stu.id} className="border-b border-slate-200 hover:bg-slate-50">
                      <td className="p-1.5 border border-slate-300 text-center font-mono text-slate-600">{idx + 1}</td>
                      <td className="p-1.5 border border-slate-300 font-mono text-slate-700">{stu.student_code}</td>
                      <td className="p-1.5 border border-slate-300 font-semibold text-slate-900">{stu.full_name}</td>
                      <td className="p-1.5 border border-slate-300 text-center">8.0</td>
                      <td className="p-1.5 border border-slate-300 text-center text-emerald-700 font-medium">
                        +{snap?.reward_points ?? 0}
                      </td>
                      <td className="p-1.5 border border-slate-300 text-center text-rose-700 font-bold font-mono">
                        -{snap?.deduction_points ?? 0}
                      </td>
                      <td className="p-1.5 border border-slate-300 text-center font-black text-blue-900 font-mono text-xs">
                        {snap?.official_week_score ?? '8.0'}
                      </td>
                      <td className="p-1.5 border border-slate-300 text-slate-800 font-medium text-[11px] whitespace-nowrap">
                        {attSummary.displayText}
                      </td>
                      <td className="p-1.5 border border-slate-300 text-slate-700 text-[11px] leading-snug">
                        {rationaleDisplay}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-end pt-8 text-xs font-semibold text-slate-800 print:break-inside-avoid">
            <div className="text-center">
              <div>ĐẠI DIỆN BAN CÁN SỰ LỚP</div>
              <div className="text-[11px] text-slate-500 mt-0.5">(Ký và ghi rõ họ tên)</div>
              <div className="h-16"></div>
              <div>{appState.classInfo.class_president_name || 'Hoàng Trọng Minh'}</div>
            </div>

            <div className="text-center">
              <div>Thành phố Hồ Chí Minh, ngày ...... tháng ...... năm 2026</div>
              <div className="font-bold mt-1">GIÁO VIÊN CHỦ NHIỆM</div>
              <div className="text-[11px] text-slate-500 mt-0.5">(Ký và ghi rõ họ tên)</div>
              <div className="h-16"></div>
              <div>{appState.classInfo.gvcn_name || 'Thầy Trần Duy Tân'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ZaloReportModal isOpen={showZaloModal} onClose={() => setShowZaloModal(false)} />
      <StudentReportCardModal isOpen={showCardsModal} onClose={() => setShowCardsModal(false)} />
    </div>
  );
};
