import React, { useState } from 'react';
import { appState } from '../services/appStateService';
import { Incident } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { OFFICIAL_CONDUCT_CATALOG, formatIncidentDeductionRationale } from '../domain/incidents/conductCatalog';
import {
  AlertTriangle,
  Plus,
  CheckCircle,
  XCircle,
  HelpCircle,
  FileEdit,
  Trash2,
  Shield,
  Search,
  X,
  AlertOctagon,
  Award,
} from 'lucide-react';

interface Props {
  onOpenQuickIncident: () => void;
}

export const IncidentsPage: React.FC<Props> = ({ onOpenQuickIncident }) => {
  const incidents = appState.incidents;
  const students = appState.students;
  const currentUser = appState.currentUser;
  const conductCatalog = appState.conductCatalog;

  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'all'>('pending');
  const [incidentSearch, setIncidentSearch] = useState('');
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Mode in review modal: 'review' | 'edit'
  const [modalMode, setModalMode] = useState<'review' | 'edit'>('review');

  // Review form state
  const [reviewAction, setReviewAction] = useState<'approved' | 'rejected' | 'more_info_needed'>('approved');
  const [scoreEffect, setScoreEffect] = useState<'confirmed_effect' | 'pending_rule' | 'waived'>('confirmed_effect');
  const [managerComment, setManagerComment] = useState('');

  // Edit form state
  const [editStudentId, setEditStudentId] = useState('');
  const [editConductCode, setEditConductCode] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editSession, setEditSession] = useState<'morning' | 'afternoon'>('morning');
  const [editPeriod, setEditPeriod] = useState<number>(1);
  const [editPoints, setEditPoints] = useState<number>(-2);
  const [editNotes, setEditNotes] = useState('');

  // Student response modal state
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [studentResponseText, setStudentResponseText] = useState('');

  // Ban cán sự & GVCN: Toàn quyền điều chỉnh nề nếp
  const canManageIncidents =
    currentUser.role === 'gvcn' ||
    currentUser.role === 'lop_truong' ||
    currentUser.role === 'lop_pho';

  const pendingList = incidents.filter((i) => i.incident_status === 'pending_verification');
  const approvedList = incidents.filter((i) => i.incident_status === 'approved');
  const rawDisplayList = activeTab === 'pending' ? pendingList : activeTab === 'approved' ? approvedList : incidents;

  const displayList = rawDisplayList.filter((inc) => {
    if (!incidentSearch) return true;
    const stu = students.find((s) => s.id === inc.student_id);
    const searchLow = incidentSearch.toLowerCase();
    const matchName = stu?.full_name.toLowerCase().includes(searchLow);
    const matchCode = stu?.student_code.toLowerCase().includes(searchLow);
    const matchRule = inc.conduct_code?.includes(incidentSearch);
    return matchName || matchCode || matchRule;
  });

  const handleOpenIncidentModal = (inc: Incident) => {
    setSelectedIncident(inc);
    setModalMode('review');
    const initialAction =
      inc.incident_status === 'approved' || inc.incident_status === 'rejected' || inc.incident_status === 'more_info_needed'
        ? inc.incident_status
        : 'approved';
    setReviewAction(initialAction);
    setScoreEffect(inc.score_effect_status === 'none' ? 'confirmed_effect' : inc.score_effect_status);
    setManagerComment(inc.gvcn_comment || '');

    // Initialize edit fields
    setEditStudentId(inc.student_id);
    setEditConductCode(inc.conduct_code || null);
    setEditDate(inc.date);
    setEditSession(inc.session);
    setEditPeriod(inc.period || 1);
    setEditPoints(inc.base_deduction || -2);
    setEditNotes(inc.notes || inc.other_category_description || '');
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;

    appState.reviewIncident(selectedIncident.id, reviewAction, scoreEffect, managerComment);
    appState.showToast(`Đã lưu quyết định xử lý sự việc của ${currentUser.name}!`, 'success');
    setSelectedIncident(null);
  };

  const handleSaveEditIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;

    appState.updateIncident(selectedIncident.id, {
      student_id: editStudentId,
      conduct_code: editConductCode,
      date: editDate,
      session: editSession,
      period: Number(editPeriod),
      base_deduction: Number(editPoints),
      notes: editNotes,
    });

    appState.showToast('Đã cập nhật toàn bộ nội dung sự việc nề nếp!', 'success');
    setSelectedIncident(null);
  };

  const handleDeleteIncident = () => {
    if (!selectedIncident) return;
    if (confirm('Bạn có chắc chắn muốn xóa bản ghi sự việc này khỏi sổ nề nếp không?')) {
      appState.deleteIncident(selectedIncident.id);
      appState.showToast('Đã xóa sự việc khỏi sổ nề nếp!', 'info');
      setSelectedIncident(null);
    }
  };

  const handleSaveStudentResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident || !studentResponseText.trim()) return;

    appState.addAuditLog(
      currentUser.name,
      'Học sinh gửi phản hồi về sự việc',
      'incident',
      selectedIncident.id,
      studentResponseText
    );

    appState.showToast('Đã gửi phản hồi giải trình của học sinh đến Ban Cán sự & GVCN!', 'success');
    setShowResponseModal(false);
    setStudentResponseText('');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Sổ Quản Lý Sự Việc & Vi Phạm Nề Nếp
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-rose-100 text-rose-800">
              QĐ 525 (Mã 01–24)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Thẩm tra, chốt hiệu lực điểm rèn luyện và điều chỉnh nội dung nề nếp Lớp 10A16
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManageIncidents && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200">
              <Award className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Quyền điều chỉnh: GVCN, Lớp phó, Lớp trưởng</span>
            </div>
          )}
          <button
            onClick={onOpenQuickIncident}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            Báo sự việc mới
          </button>
        </div>
      </div>

      {/* Search and Tabs Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-amber-100 text-amber-900 font-extrabold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Chờ xác minh</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-200 text-amber-900">
              {pendingList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('approved')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'approved'
                ? 'bg-emerald-100 text-emerald-900 font-extrabold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Đã duyệt</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-200 text-emerald-900">
              {approvedList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-slate-200 text-slate-900 font-extrabold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>Tất cả ({incidents.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo tên học sinh, mã lỗi..."
            value={incidentSearch}
            onChange={(e) => setIncidentSearch(e.target.value)}
            className="w-full text-xs pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>
      </div>

      {/* Mobile Card Feed (visible on screens < 768px) */}
      <div className="md:hidden space-y-2.5">
        {displayList.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            Không có sự việc vi phạm nào trong mục này.
          </div>
        ) : (
          displayList.map((inc) => {
            const student = students.find((s) => s.id === inc.student_id);
            const catalogItem = conductCatalog.find((c) => c.code === inc.conduct_code);

            return (
              <div
                key={inc.id}
                onClick={() => handleOpenIncidentModal(inc)}
                className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2 active:scale-[0.99] transition cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{student?.full_name || 'N/A'}</span>
                    <span className="font-mono text-[11px] text-blue-700 font-semibold">
                      ({student?.student_code || inc.student_id})
                    </span>
                  </div>
                  <StatusBadge type={inc.incident_status} />
                </div>

                <div className="text-xs">
                  <div className="font-bold text-slate-800">
                    {inc.conduct_code ? (
                      <span className="text-rose-700">Mã {inc.conduct_code}: {catalogItem?.shortTitle || catalogItem?.title}</span>
                    ) : (
                      <span className="text-purple-700">Sự việc khác — chờ xem xét</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                    {inc.notes || inc.other_category_description || 'Không ghi chú'}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                  <span>
                    {inc.date} · {inc.session === 'morning' ? 'Sáng' : 'Chiều'} (Tiết {inc.period || 1})
                  </span>
                  <div className="flex items-center gap-2">
                    {inc.score_effect_status === 'confirmed_effect' ? (
                      <span className="font-black text-rose-600 font-mono">-{inc.effective_deduction}đ</span>
                    ) : (
                      <span className="text-slate-400 font-mono">0đ</span>
                    )}
                    <span className="text-blue-600 font-bold">
                      {canManageIncidents ? 'Duyệt & Sửa' : 'Xem'} &rarr;
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop List Table (hidden on mobile) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Ngày / Buổi</th>
                <th className="py-3 px-4">Mã số HS</th>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Mã vi phạm</th>
                <th className="py-3 px-4 min-w-[260px] bg-rose-50/50 text-rose-900 border-x border-rose-100">
                  📌 Lý giải nguyên nhân trừ điểm (QĐ 525 & Mô tả)
                </th>
                <th className="py-3 px-4">Người báo</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Điểm trừ</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-400">
                    Không có sự việc vi phạm nào trong mục này.
                  </td>
                </tr>
              ) : (
                displayList.map((inc) => {
                  const student = students.find((s) => s.id === inc.student_id);
                  const catalogItem = conductCatalog.find((c) => c.code === inc.conduct_code);

                  // Rationale / Explanation string
                  const ruleTitle = catalogItem ? catalogItem.title : (inc.conduct_code ? `Mã vi phạm ${inc.conduct_code}` : 'Sự việc khác');
                  const rationaleText = inc.notes || inc.other_category_description || 'Ghi nhận vi phạm quy định nề nếp lớp học.';

                  return (
                    <tr key={inc.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-slate-600">
                        <div>{inc.date}</div>
                        <div className="text-[10px] text-slate-400">
                          {inc.session === 'morning' ? 'Sáng' : 'Chiều'} (Tiết {inc.period || 1})
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-700">
                        {student?.student_code || inc.student_id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{student?.full_name || 'N/A'}</div>
                        {inc.duplicate_warning && (
                          <span className="text-[10px] text-amber-700 font-semibold bg-amber-50 px-1 rounded border border-amber-200">
                            Cảnh báo trùng báo cáo
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {inc.conduct_code ? (
                          <span className="font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-mono">
                            Mã {inc.conduct_code}
                          </span>
                        ) : (
                          <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            Khác
                          </span>
                        )}
                      </td>
                      {/* DEDICATED COLUMN: Lý giải nguyên nhân trừ điểm */}
                      <td className="py-3 px-4 bg-rose-50/30 border-x border-rose-100">
                        <div className="font-extrabold text-rose-900 text-xs">
                          {formatIncidentDeductionRationale(inc, conductCatalog)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 italic">
                          * Căn cứ QĐ 525/QĐ-THPT.VTT (Điểm trừ gốc: -{Math.abs(inc.base_deduction || 2)}đ)
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div>{inc.reported_by}</div>
                        <div className="text-[10px] text-slate-400 font-medium">({inc.reporter_role})</div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge type={inc.incident_status} />
                      </td>
                      <td className="py-3 px-4 font-extrabold font-mono text-rose-700">
                        {inc.score_effect_status === 'confirmed_effect' ? (
                          <span className="text-rose-600">-{Math.abs(inc.effective_deduction)}đ</span>
                        ) : inc.score_effect_status === 'pending_rule' ? (
                          <StatusBadge type="pending_rule" label="Treo quy tắc (0đ)" />
                        ) : (
                          <span className="text-slate-400 font-normal">0đ</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleOpenIncidentModal(inc)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer active:scale-95 transition"
                        >
                          {canManageIncidents ? 'Duyệt & Điều chỉnh' : 'Chi tiết'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail / Review / Edit Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {modalMode === 'edit' ? 'Chỉnh sửa nội dung sự việc' : 'Thẩm tra & Điều chỉnh sự việc'}
                </h3>
                <p className="text-xs text-slate-300 font-mono">ID: {selectedIncident.id}</p>
              </div>
              <button
                onClick={() => setSelectedIncident(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {/* Summary box */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                <div>
                  <strong>Học sinh: </strong>
                  {students.find((s) => s.id === selectedIncident.student_id)?.full_name} (
                  {students.find((s) => s.id === selectedIncident.student_id)?.student_code})
                </div>
                <div>
                  <strong>Thời gian: </strong>
                  Ngày {selectedIncident.date} • Buổi {selectedIncident.session === 'morning' ? 'Sáng' : 'Chiều'} (Tiết {selectedIncident.period || 1})
                </div>
                <div>
                  <strong>Người lập báo cáo: </strong>
                  {selectedIncident.reported_by} ({selectedIncident.reporter_role})
                </div>
                <div>
                  <strong>Nội dung báo cáo: </strong>
                  {selectedIncident.notes || selectedIncident.other_category_description || 'Không có mô tả thêm'}
                </div>
              </div>

              {/* Mode switch for Managers (Review vs Edit) */}
              {canManageIncidents && (
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <button
                    type="button"
                    onClick={() => setModalMode('review')}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                      modalMode === 'review'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Duyệt & Chốt hiệu lực điểm
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalMode('edit')}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer flex items-center gap-1 ${
                      modalMode === 'edit'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    <span>Sửa toàn bộ nội dung</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteIncident}
                    className="ml-auto px-2.5 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa sự việc</span>
                  </button>
                </div>
              )}

              {/* MODE 1: Review Form (GVCN, Lớp phó, Lớp trưởng) */}
              {modalMode === 'review' && canManageIncidents && (
                <form onSubmit={handleReviewSubmit} className="space-y-3 pt-1">
                  <div className="font-bold text-sm text-slate-900">
                    Quyết định xử lý của Ban Cán sự & GVCN:
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Xác minh sự thật (incident_status)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'approved', label: 'Xác nhận đúng', color: 'border-emerald-500' },
                        { id: 'rejected', label: 'Bác bỏ / Từ chối', color: 'border-rose-500' },
                        { id: 'more_info_needed', label: 'Yêu cầu thêm tin', color: 'border-amber-500' },
                      ].map((act) => (
                        <button
                          type="button"
                          key={act.id}
                          onClick={() => setReviewAction(act.id as any)}
                          className={`p-2 rounded-lg border text-center font-bold text-xs transition cursor-pointer ${
                            reviewAction === act.id
                              ? 'bg-blue-50 border-blue-600 text-blue-900 ring-1 ring-blue-600'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {act.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Hiệu lực điểm số (score_effect_status)
                    </label>
                    <select
                      value={scoreEffect}
                      onChange={(e) => setScoreEffect(e.target.value as any)}
                      className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300 font-semibold"
                    >
                      <option value="confirmed_effect">
                        Hiệu lực chính thức (Trừ {selectedIncident.base_deduction} điểm theo QĐ 525)
                      </option>
                      <option value="pending_rule">
                        Treo hiệu lực (Chờ xác nhận quy tắc PENDING - Tạm tính 0 điểm)
                      </option>
                      <option value="waived">
                        Miễn trừ điểm (Giáo dục nhắc nhở không trừ điểm)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Ý kiến nhận xét & Căn cứ xử lý
                    </label>
                    <textarea
                      rows={2}
                      value={managerComment}
                      onChange={(e) => setManagerComment(e.target.value)}
                      placeholder="Ghi nhận xét giáo dục hoặc căn cứ xử lý của Ban Cán sự / GVCN..."
                      className="w-full text-xs px-3 py-2 border rounded-xl border-slate-300"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedIncident(null)}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Đóng
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs cursor-pointer"
                    >
                      Lưu quyết định
                    </button>
                  </div>
                </form>
              )}

              {/* MODE 2: Edit Form (Chỉnh sửa toàn bộ nội dung sự việc) */}
              {modalMode === 'edit' && canManageIncidents && (
                <form onSubmit={handleSaveEditIncident} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Học sinh vi phạm
                    </label>
                    <select
                      value={editStudentId}
                      onChange={(e) => setEditStudentId(e.target.value)}
                      className="w-full text-xs p-2.5 border rounded-xl border-slate-300"
                    >
                      {students.map((stu) => (
                        <option key={stu.id} value={stu.id}>
                          {stu.student_code} - {stu.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Mã vi phạm
                      </label>
                      <select
                        value={editConductCode || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditConductCode(val || null);
                          const cat = conductCatalog.find((c) => c.code === val);
                          if (cat) setEditPoints(cat.defaultPoints);
                        }}
                        className="w-full text-xs p-2.5 border rounded-xl border-slate-300"
                      >
                        <option value="">Sự việc khác</option>
                        {conductCatalog.map((cat) => (
                          <option key={cat.code} value={cat.code}>
                            Mã {cat.code} - {cat.shortTitle || cat.title} ({cat.defaultPoints}đ)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Mức điểm trừ
                      </label>
                      <input
                        type="number"
                        max="0"
                        value={editPoints}
                        onChange={(e) => setEditPoints(Number(e.target.value))}
                        className="w-full text-xs p-2.5 border rounded-xl border-slate-300 font-bold text-rose-600 font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Ngày</label>
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="w-full text-xs p-2 border rounded-xl border-slate-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Buổi</label>
                      <select
                        value={editSession}
                        onChange={(e) => setEditSession(e.target.value as any)}
                        className="w-full text-xs p-2 border rounded-xl border-slate-300"
                      >
                        <option value="morning">Sáng</option>
                        <option value="afternoon">Chiều</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tiết</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={editPeriod}
                        onChange={(e) => setEditPeriod(Number(e.target.value))}
                        className="w-full text-xs p-2 border rounded-xl border-slate-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nội dung / Mô tả sự việc
                    </label>
                    <textarea
                      rows={2}
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Mô tả lại diễn biến sự việc..."
                      className="w-full text-xs p-2.5 border rounded-xl border-slate-300"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setModalMode('review')}
                      className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                    >
                      Quay lại
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs cursor-pointer"
                    >
                      Lưu nội dung đã sửa
                    </button>
                  </div>
                </form>
              )}

              {/* View only for non-managers (Students, to_truong) */}
              {!canManageIncidents && (
                <div className="space-y-3 pt-2">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs">
                    Quyền thẩm tra và điều chỉnh sự việc thuộc Ban Cán sự (GVCN, Lớp phó, Lớp trưởng).
                  </div>

                  {/* Student Response Action */}
                  <button
                    onClick={() => setShowResponseModal(true)}
                    className="w-full py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl border border-blue-200 transition cursor-pointer"
                  >
                    Gửi phản hồi / Giải trình của học sinh
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Student Response Modal */}
      {showResponseModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-3 border border-slate-200">
            <h4 className="font-bold text-sm text-slate-900">Học sinh giải trình / Phản hồi</h4>
            <p className="text-xs text-slate-500">
              Ý kiến giải trình của bạn sẽ được lưu vết vào hồ sơ kiểm toán để Ban Cán sự & GVCN đối chiếu.
            </p>
            <form onSubmit={handleSaveStudentResponse} className="space-y-3">
              <textarea
                rows={4}
                required
                value={studentResponseText}
                onChange={(e) => setStudentResponseText(e.target.value)}
                placeholder="Trình bày lý do, hoàn cảnh hoặc khiếu nại của em..."
                className="w-full text-xs p-3 border rounded-xl border-slate-300"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowResponseModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-lg cursor-pointer"
                >
                  Gửi phản hồi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
