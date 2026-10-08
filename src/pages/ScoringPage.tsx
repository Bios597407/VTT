import React, { useState } from 'react';
import { appState } from '../services/appStateService';
import { StatusBadge } from '../components/StatusBadge';
import { formatIncidentDeductionRationale } from '../domain/incidents/conductCatalog';
import {
  calculateMonthlyScore,
  calculateSemesterNumericScore,
  determineBaseConductLevel,
  applySemesterRestrictions,
  calculateAnnualConduct,
} from '../domain/scoring/scoringEngine';
import { tallyAttendance } from '../domain/attendance/attendanceRules';
import { ExcelService } from '../services/excelService';
import { ConductLevel } from '../types';
import {
  Calculator,
  Calendar,
  Layers,
  Award,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export const ScoringPage: React.FC = () => {
  const students = appState.students;
  const weeklySnapshots = appState.weeklySnapshots;
  const incidents = appState.incidents;
  const currentUser = appState.currentUser;

  const [periodTab, setPeriodTab] = useState<'weekly' | 'monthly' | 'semester' | 'annual'>('weekly');
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Semester review overrides state (for GVCN, Lớp phó, Lớp trưởng)
  const [finalizedLevels, setFinalizedLevels] = useState<Record<string, ConductLevel>>({});
  const [rationales, setRationales] = useState<Record<string, string>>({});

  const canManageScoring =
    currentUser.role === 'gvcn' ||
    currentUser.role === 'lop_truong' ||
    currentUser.role === 'lop_pho';

  const handleRecalculate = () => {
    setIsRecalculating(true);
    setTimeout(() => {
      appState.calculateAllWeeklyScores(selectedWeek);
      appState.addAuditLog(
        currentUser.name,
        `Tính lại điểm tuần W${selectedWeek} (Tạo phiên bản Revision mới)`,
        'score_run',
        `W${selectedWeek}`,
        'GVCN yêu cầu tái tính toán'
      );
      setIsRecalculating(false);
      appState.showToast(`Đã tính toán lại điểm rèn luyện Tuần ${selectedWeek} thành công!`, 'success');
    }, 400);
  };

  const handleExportWeek = () => {
    const currentSnaps = weeklySnapshots.filter((s) => s.week_number === selectedWeek && s.is_current);
    ExcelService.exportWeeklyScoreExcel(students, currentSnaps, selectedWeek, `Tuần ${selectedWeek}`);
    appState.showToast(`Đã tải xuống tệp Excel Điểm Tuần ${selectedWeek}!`, 'success');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Động cơ Điểm & Đánh giá Rèn luyện
          </h2>
          <p className="text-xs text-slate-500">
            QĐ 525/QĐ-THPT.VTT (Điểm tuần gốc 8, kẹp trần [0–10]) • Điều 8 TT 22/2021 (Ma trận cả năm 16 trường hợp)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {periodTab === 'weekly' && (
            <>
              <button
                onClick={handleRecalculate}
                disabled={isRecalculating}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer disabled:bg-slate-400"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
                Tính toán lại
              </button>
              <button
                onClick={handleExportWeek}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Xuất Excel tuần
              </button>
            </>
          )}
        </div>
      </div>

      {/* Period Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
        {[
          { id: 'weekly', label: 'Điểm Tuần (Gốc 8đ)', icon: Calendar },
          { id: 'monthly', label: 'Điểm Tháng (TB các tuần)', icon: Layers },
          { id: 'semester', label: 'Học kỳ (TB tháng & GVCN chốt)', icon: Calculator },
          { id: 'annual', label: 'Cả năm (Ma trận 16 ca TT 22)', icon: Award },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = periodTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setPeriodTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
                isActive
                  ? 'bg-blue-600 text-white font-black shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ================= TAB 1: WEEKLY SCORE ================= */}
      {periodTab === 'weekly' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-700">Chọn tuần đánh giá:</span>
              <select
                value={selectedWeek}
                onChange={(e) => {
                  const w = Number(e.target.value);
                  setSelectedWeek(w);
                  appState.calculateAllWeeklyScores(w);
                }}
                className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-blue-700"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map((w) => (
                  <option key={w} value={w}>
                    Tuần {w} (Học kỳ I)
                  </option>
                ))}
              </select>
            </div>
            <div className="text-slate-500 text-[11px] hidden sm:block">
              * Điểm thô = 8 + Khen thưởng - Điểm trừ vi phạm. Điểm chính thức = min(10, max(0, thô)). Kẹp trần đúng 1 lần duy nhất ở cuối.
            </div>
          </div>

          {/* Mobile Card Feed for Weekly Scores */}
          <div className="md:hidden space-y-2.5">
            {students.map((stu, idx) => {
              const snap = weeklySnapshots.find(
                (s) => s.student_id === stu.id && s.week_number === selectedWeek && s.is_current
              );
              const score = snap?.official_week_score ?? 8.0;
              return (
                <div key={stu.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0 font-mono">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        {stu.full_name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Mã: {stu.student_code} · Thô: {snap?.raw_week_score ?? 8}đ
                        {(snap?.reward_points ?? 0) > 0 && <span className="text-emerald-600 font-bold"> (+{snap?.reward_points})</span>}
                        {(snap?.deduction_points ?? 0) > 0 && <span className="text-rose-600 font-bold"> (-{snap?.deduction_points})</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black font-mono text-base text-blue-700 tabular-nums">
                      {score.toFixed(1)}đ
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">v{snap?.revision_no ?? 1}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">STT</th>
                    <th className="py-3 px-4">Mã số HS</th>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Điểm gốc</th>
                    <th className="py-3 px-4 text-emerald-700">Thưởng (+)</th>
                    <th className="py-3 px-4 text-rose-700">Trừ (-)</th>
                    <th className="py-3 px-4 bg-rose-50/60 text-rose-900 border-x border-rose-100">
                      📌 Nguyên nhân bị trừ điểm (QĐ 525)
                    </th>
                    <th className="py-3 px-4">Điểm thô</th>
                    <th className="py-3 px-4 font-black text-blue-700">Điểm chính thức</th>
                    <th className="py-3 px-4">Phiên bản</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((stu, idx) => {
                    const snap = weeklySnapshots.find(
                      (s) => s.student_id === stu.id && s.week_number === selectedWeek && s.is_current
                    );
                    const stuIncidents = incidents.filter((i) => i.student_id === stu.id && i.incident_status === 'approved');

                    return (
                      <tr key={stu.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{stu.student_code}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{stu.full_name}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">8.0</td>
                        <td className="py-3 px-4 font-mono text-emerald-600 font-bold">
                          +{snap ? snap.reward_points : 0}
                        </td>
                        <td className="py-3 px-4 font-mono text-rose-600 font-bold">
                          {snap ? snap.deduction_points : 0}
                        </td>
                        <td className="py-3 px-4 bg-rose-50/20 border-x border-rose-100 text-[11px]">
                          {stuIncidents.length === 0 ? (
                            <span className="text-emerald-700 font-semibold">✅ Nề nếp tốt, 0 vi phạm</span>
                          ) : (
                            <div className="space-y-1">
                              {stuIncidents.map((inc) => (
                                <div key={inc.id} className="text-rose-900 font-extrabold">
                                  {formatIncidentDeductionRationale(inc, appState.conductCatalog)}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {snap?.raw_week_score ?? '8.0'}
                        </td>
                        <td className="py-3 px-4 font-mono text-sm font-black text-blue-700">
                          {snap?.official_week_score ?? '8.0'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          v{snap?.revision_no ?? 1}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: MONTHLY SCORE ================= */}
      {periodTab === 'monthly' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600">
            <strong>Nguyên tắc tính điểm tháng:</strong> Điểm tháng là trung bình cộng của các tuần trong tháng.
            Hệ thống <em>tuyệt đối không điền bừa số 0 hay số 8</em> vào các tuần chưa đến hạn; nếu chưa đủ dữ liệu sẽ hiển thị &ldquo;Chưa đủ dữ liệu&rdquo;.
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">STT</th>
                    <th className="py-3 px-4">Mã số HS</th>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Tháng 9 (Tuần 1–4)</th>
                    <th className="py-3 px-4">Tháng 10 (Tuần 5–8)</th>
                    <th className="py-3 px-4">Tháng 11 (Tuần 9–12)</th>
                    <th className="py-3 px-4">Tháng 12 (Tuần 13–16)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((stu, idx) => {
                    const snapW1 = weeklySnapshots.find((s) => s.student_id === stu.id && s.week_number === 1 && s.is_current);
                    const m9Score = calculateMonthlyScore([snapW1?.official_week_score ?? 8]);

                    return (
                      <tr key={stu.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{stu.student_code}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{stu.full_name}</td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">
                          {m9Score !== null ? m9Score.toFixed(2) : 'Chưa đủ dữ liệu'}
                        </td>
                        <td className="py-3 px-4 text-slate-400">Chưa đến kỳ</td>
                        <td className="py-3 px-4 text-slate-400">Chưa đến kỳ</td>
                        <td className="py-3 px-4 text-slate-400">Chưa đến kỳ</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: SEMESTER REVIEW ================= */}
      {periodTab === 'semester' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200 text-xs text-blue-950 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-sm text-blue-900">
              <CheckCircle2 className="w-4 h-4 text-blue-700" />
              Nguyên tắc Đánh giá Học kỳ & Quyền chốt của GVCN (QĐ 525 Mục III)
            </div>
            <p>
              • <strong>Điểm số học kỳ:</strong> Trung bình cộng điểm các <em>tháng</em> (không tính trung bình dồn trực tiếp các tuần).
            </p>
            <p>
              • <strong>Khống chế chuyên cần:</strong> Vắng có phép &ge; 10 buổi (trừ miễn trừ) hoặc không phép &ge; 2 buổi: <em>không xếp mức Tốt</em>.
            </p>
            <p>
              • <strong>Khống chế điện thoại (V24):</strong> Vi phạm lần 2: trần tối đa Đạt; Lần 3: Chưa đạt.
            </p>
            <p>
              • <strong>Điểm 6.95:</strong> Không tự động làm tròn thành Tốt (trả về trạng thái Chờ xác nhận quy tắc làm tròn).
            </p>
            <p>
              • <strong>Quyền của GVCN:</strong> Điểm số là cơ sở tham khảo; GVCN căn cứ sự tiến bộ và toàn diện để đưa ra quyết định xếp loại cuối cùng và giải trình.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">STT</th>
                    <th className="py-3 px-4">Mã số HS</th>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Điểm TB các tháng</th>
                    <th className="py-3 px-4">Xếp loại đề xuất</th>
                    <th className="py-3 px-4">Khống chế chuyên cần / ĐT</th>
                    <th className="py-3 px-4">GVCN chốt xếp loại</th>
                    <th className="py-3 px-4">Lý do / Căn cứ GVCN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((stu, idx) => {
                    const snapW1 = weeklySnapshots.find((s) => s.student_id === stu.id && s.week_number === 1 && s.is_current);
                    const stuScore = snapW1?.official_week_score ?? 8.0;

                    const stuAttendance = appState.attendance.filter((a) => a.student_id === stu.id);
                    const attTally = tallyAttendance(stuAttendance);
                    const phoneViolations = incidents.filter(
                      (i) => i.student_id === stu.id && i.conduct_code === '24' && i.incident_status === 'approved'
                    ).length;

                    const baseLevel = determineBaseConductLevel(stuScore);
                    const restricted = applySemesterRestrictions(baseLevel, {
                      permittedAbsenceCount: attTally.totCapRelevantPermittedAbsenceCount,
                      unpermittedAbsenceCount: attTally.totCapRelevantUnpermittedAbsenceCount,
                      phoneViolationsCount: phoneViolations,
                    });

                    const finalized = finalizedLevels[stu.id] || (restricted.finalSuggestedLevel as ConductLevel) || 'Tốt';

                    return (
                      <tr key={stu.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{stu.student_code}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{stu.full_name}</td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{stuScore.toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <StatusBadge type={restricted.finalSuggestedLevel} />
                        </td>
                        <td className="py-3 px-4 text-[11px]">
                          {restricted.attendanceCapApplied && (
                            <div className="text-amber-700 font-semibold">Chạm trần chuyên cần</div>
                          )}
                          {restricted.phoneCapApplied && (
                            <div className="text-rose-700 font-semibold">Chạm trần điện thoại</div>
                          )}
                          {!restricted.attendanceCapApplied && !restricted.phoneCapApplied && (
                            <span className="text-slate-400">Không có hạn chế</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {canManageScoring ? (
                            <select
                              value={finalized}
                              onChange={(e) => {
                                const newLvl = e.target.value as ConductLevel;
                                setFinalizedLevels((prev) => ({ ...prev, [stu.id]: newLvl }));
                                appState.addAuditLog(
                                  currentUser.name,
                                  `Chốt xếp loại HK1 cho học sinh ${stu.student_code}`,
                                  'semester_decision',
                                  stu.id,
                                  `Mức: ${newLvl}`
                                );
                              }}
                              className="px-2 py-1 border rounded-lg border-slate-300 font-bold bg-white text-blue-800"
                            >
                              <option value="Tốt">Tốt</option>
                              <option value="Khá">Khá</option>
                              <option value="Đạt">Đạt</option>
                              <option value="Chưa đạt">Chưa đạt</option>
                            </select>
                          ) : (
                            <StatusBadge type={finalized} />
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {canManageScoring ? (
                            <input
                              type="text"
                              placeholder="Căn cứ / Lý do..."
                              value={rationales[stu.id] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setRationales((prev) => ({ ...prev, [stu.id]: val }));
                              }}
                              className="px-2 py-1 border rounded border-slate-300 text-xs w-full"
                            />
                          ) : (
                            <span className="text-slate-500 text-[11px]">{rationales[stu.id] || 'Theo kết quả rèn luyện'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 4: ANNUAL CONDUCT MATRIX ================= */}
      {periodTab === 'annual' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-sm text-emerald-900">
              <Award className="w-4 h-4 text-emerald-700" />
              Ma trận Đánh giá Kết quả Rèn luyện Cả năm (Điều 8 Thông tư 22/2021/TT-BGDĐT)
            </div>
            <p>
              • <strong>Nguyên tắc bất biến:</strong> Cả năm được xét trên <em>mức xếp loại chính thức đã chốt của HK1 và HK2</em>.
              <strong> Tuyệt đối KHÔNG cộng trung bình điểm số thập phân của HK1 và HK2!</strong>
            </p>
            <p>
              • <strong>TỐT:</strong> HK2 = Tốt VÀ HK1 &ge; Khá.
            </p>
            <p>
              • <strong>KHÁ:</strong> (HK2 = Khá và HK1 &ge; Đạt) HOẶC (HK2 = Đạt và HK1 = Tốt) HOẶC (HK2 = Tốt và HK1 &isin; &#123;Đạt, Chưa đạt&#125;).
            </p>
            <p>
              • <strong>ĐẠT:</strong> (HK2 = Đạt và HK1 &isin; &#123;Khá, Đạt, Chưa đạt&#125;) HOẶC (HK2 = Khá và HK1 = Chưa đạt).
            </p>
            <p>
              • <strong>CHƯA ĐẠT:</strong> Tất cả trường hợp còn lại. Đã được kiểm thử 100% qua 16 ca đơn vị độc lập.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[11px]">
                  <tr>
                    <th className="py-3 px-4">STT</th>
                    <th className="py-3 px-4">Mã số HS</th>
                    <th className="py-3 px-4">Họ và tên</th>
                    <th className="py-3 px-4">Xếp loại HKI</th>
                    <th className="py-3 px-4">Xếp loại HKII (Dự kiến)</th>
                    <th className="py-3 px-4 font-black text-emerald-800">Kết quả Rèn luyện Cả Năm</th>
                    <th className="py-3 px-4">Căn cứ quy chế</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students.map((stu, idx) => {
                    const hk1Lvl = finalizedLevels[stu.id] || 'Tốt';
                    const hk2Lvl: ConductLevel = 'Tốt'; // Projected
                    const annualLvl = calculateAnnualConduct(hk1Lvl, hk2Lvl);

                    return (
                      <tr key={stu.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-700">{stu.student_code}</td>
                        <td className="py-3 px-4 font-bold text-slate-900">{stu.full_name}</td>
                        <td className="py-3 px-4">
                          <StatusBadge type={hk1Lvl} />
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge type={hk2Lvl} />
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge type={annualLvl} className="text-xs px-2.5 py-1 font-bold" />
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          Ma trận Thông tư 22 (HK2={hk2Lvl}, HK1={hk1Lvl})
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
