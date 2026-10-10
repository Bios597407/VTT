import React, { useState, useEffect } from 'react';
import { appState } from '../services/appStateService';
import { QualitativeComment, SupportPlan } from '../types';
import {
  MessageSquare,
  Plus,
  User,
  Edit3,
  Trash2,
  X,
  Check,
  ShieldAlert,
  Heart,
  Calendar,
  Sparkles,
  FileText,
  Target,
} from 'lucide-react';

export const QualitativePage: React.FC = () => {
  const [, setTick] = useState(0);
  useEffect(() => {
    return appState.subscribe(() => setTick((t) => t + 1));
  }, []);

  const students = appState.students;
  const currentUser = appState.currentUser;
  const comments = appState.qualitativeComments;
  const plans = appState.supportPlans;

  const [activeTab, setActiveTab] = useState<'teacher' | 'self' | 'group' | 'parent' | 'support'>('teacher');

  // Comment Form State
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [commentText, setCommentText] = useState('');
  const [commentDate, setCommentDate] = useState(new Date().toISOString().split('T')[0]);

  // Support Plan Form State
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [planStudentId, setPlanStudentId] = useState(students[0]?.id || '');
  const [planObjective, setPlanObjective] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planStatus, setPlanStatus] = useState<SupportPlan['status']>('Đang thực hiện');
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);

  // Edit Comment Modal State
  const [editingComment, setEditingComment] = useState<QualitativeComment | null>(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [editCommentStudentId, setEditCommentStudentId] = useState('');
  const [editCommentDate, setEditCommentDate] = useState('');

  // Edit Support Plan Modal State
  const [editingPlan, setEditingPlan] = useState<SupportPlan | null>(null);
  const [editPlanStudentId, setEditPlanStudentId] = useState('');
  const [editPlanObjective, setEditPlanObjective] = useState('');
  const [editPlanDescription, setEditPlanDescription] = useState('');
  const [editPlanStatus, setEditPlanStatus] = useState<SupportPlan['status']>('Đang thực hiện');

  const canManage = true; // Cho phép thực hiện đầy đủ thao tác quản trị và đánh giá

  // Handlers for Comment
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    let authorName = currentUser.name;
    if (activeTab === 'self') authorName = 'Học sinh Tự đánh giá';
    if (activeTab === 'group') authorName = `Tổ trưởng / Tổ đánh giá`;
    if (activeTab === 'parent') authorName = 'Phụ huynh học sinh';

    appState.addQualitativeComment({
      studentId: selectedStudentId,
      author: authorName,
      authorRole: currentUser.role,
      category: activeTab === 'support' ? 'teacher' : activeTab,
      content: commentText.trim(),
      date: commentDate,
    });

    setCommentText('');
    appState.showToast('Đã lưu đánh giá nhận xét thành công!', 'success');
  };

  const handleOpenEditComment = (comment: QualitativeComment) => {
    setEditingComment(comment);
    setEditCommentStudentId(comment.studentId);
    setEditCommentContent(comment.content);
    setEditCommentDate(comment.date || new Date().toISOString().split('T')[0]);
  };

  const handleSaveEditComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingComment || !editCommentContent.trim()) return;

    appState.updateQualitativeComment(editingComment.id, {
      studentId: editCommentStudentId,
      content: editCommentContent.trim(),
      date: editCommentDate,
    });

    setEditingComment(null);
    appState.showToast('Đã cập nhật nhận xét thành công!', 'success');
  };

  const handleDeleteComment = (id: string) => {
    appState.deleteQualitativeComment(id);
    appState.showToast('Đã xóa nhận xét thành công!', 'info');
  };

  // Handlers for Support Plan
  const handleAddSupportPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planObjective.trim() || !planDescription.trim()) return;

    appState.addSupportPlan({
      studentId: planStudentId,
      objective: planObjective.trim(),
      plan: planDescription.trim(),
      status: planStatus,
      teacher_name: currentUser.name,
      date: planDate,
    });

    setShowAddPlanModal(false);
    setPlanObjective('');
    setPlanDescription('');
    appState.showToast('Đã lưu kế hoạch hỗ trợ sư phạm!', 'success');
  };

  const handleOpenEditPlan = (plan: SupportPlan) => {
    setEditingPlan(plan);
    setEditPlanStudentId(plan.studentId);
    setEditPlanObjective(plan.objective);
    setEditPlanDescription(plan.plan);
    setEditPlanStatus(plan.status);
  };

  const handleSaveEditPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan || !editPlanObjective.trim() || !editPlanDescription.trim()) return;

    appState.updateSupportPlan(editingPlan.id, {
      studentId: editPlanStudentId,
      objective: editPlanObjective.trim(),
      plan: editPlanDescription.trim(),
      status: editPlanStatus,
    });

    setEditingPlan(null);
    appState.showToast('Đã cập nhật kế hoạch hỗ trợ thành công!', 'success');
  };

  const handleDeletePlan = (id: string) => {
    appState.deleteSupportPlan(id);
    appState.showToast('Đã xóa kế hoạch hỗ trợ thành công!', 'info');
  };

  // Filtered comment list for active evaluation category
  const filteredComments = comments.filter(
    (c) => c.category === (activeTab === 'support' ? 'teacher' : activeTab)
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Đánh giá Định tính & Kế hoạch Hỗ trợ
          </h2>
          <p className="text-xs text-slate-500">
            Kết hợp tự đánh giá, nhận xét tổ, tiếng nói phụ huynh và kế hoạch đồng hành sư phạm
          </p>
        </div>

        {activeTab === 'support' && canManage && (
          <button
            onClick={() => setShowAddPlanModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Lập kế hoạch hỗ trợ mới
          </button>
        )}
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold">
        {[
          { id: 'teacher', label: 'Nhận xét của Giáo viên', count: comments.filter((c) => c.category === 'teacher').length },
          { id: 'self', label: 'Học sinh Tự đánh giá', count: comments.filter((c) => c.category === 'self').length },
          { id: 'group', label: 'Đánh giá của Tổ', count: comments.filter((c) => c.category === 'group').length },
          { id: 'parent', label: 'Phản hồi Phụ huynh', count: comments.filter((c) => c.category === 'parent').length },
          { id: 'support', label: 'Kế hoạch Hỗ trợ (5+ HS)', count: plans.length },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === t.id
                ? 'bg-blue-600 text-white font-black shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{t.label}</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeTab === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Evaluations Tabs (teacher, self, group, parent) */}
      {(activeTab === 'teacher' || activeTab === 'self' || activeTab === 'group' || activeTab === 'parent') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Add Form */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Ghi nhận xét / Đánh giá mới
            </h3>

            <form onSubmit={handleAddComment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chọn học sinh</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full p-2 border rounded-xl border-slate-300 font-semibold focus:ring-2 focus:ring-blue-500"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.student_code} - {s.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ngày ghi nhận</label>
                <input
                  type="date"
                  value={commentDate}
                  onChange={(e) => setCommentDate(e.target.value)}
                  className="w-full p-2 border rounded-xl border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung nhận xét & đánh giá</label>
                <textarea
                  rows={4}
                  required
                  placeholder={
                    activeTab === 'teacher'
                      ? 'Nhận xét về thái độ, sự tiến bộ, tinh thần rèn luyện...'
                      : activeTab === 'self'
                      ? 'Học sinh tự nhận xét sự cố gắng và khó khăn trong tuần qua...'
                      : activeTab === 'group'
                      ? 'Tổ đánh giá tinh thần hợp tác, làm việc nhóm và nề nếp...'
                      : 'Ý kiến phản hồi từ cha mẹ học sinh về sinh hoạt và học tập...'
                  }
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full p-2.5 border rounded-xl border-slate-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
              >
                Lưu nhận xét
              </button>
            </form>
          </div>

          {/* List of Comments */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-bold text-sm text-slate-800 flex items-center justify-between">
              <span>
                Danh sách nhận xét đã ghi ({filteredComments.length})
              </span>
              <span className="text-xs font-normal text-slate-400">
                Được lưu vĩnh viễn vào hệ thống
              </span>
            </h3>

            {filteredComments.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2 text-slate-400 text-xs">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p>Chưa có ghi nhận đánh giá nào cho mục này.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredComments.map((c) => {
                  const stu = students.find((s) => s.id === c.studentId);
                  return (
                    <div
                      key={c.id}
                      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2 text-xs hover:border-slate-300 transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs">
                            {stu?.first_name.slice(0, 1)}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-900">{stu?.full_name}</span>
                            <span className="font-mono text-[11px] text-blue-700 font-semibold ml-1.5">
                              ({stu?.student_code})
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {c.date}
                          </span>

                          {/* Edit & Delete Buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditComment(c)}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                              title="Chỉnh sửa nội dung"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(c.id)}
                              className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Xóa nhận xét"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <p className="text-slate-700 italic bg-slate-50/80 p-3 rounded-xl border border-slate-100 leading-relaxed">
                        &ldquo;{c.content}&rdquo;
                      </p>

                      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                        <span>Người ghi nhận: {c.author}</span>
                        <span className="font-semibold text-slate-500 uppercase text-[9px] bg-slate-100 px-1.5 py-0.5 rounded">
                          Phân loại: {c.category}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Support Plans Tab */}
      {activeTab === 'support' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-slate-100">
            <div>
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Kế hoạch Hỗ trợ Học sinh cần Cải thiện
              </h3>
              <p className="text-xs text-slate-500">
                Chương trình đồng hành sư phạm giúp học sinh khắc phục khuyết điểm nề nếp và tiến bộ
              </p>
            </div>
          </div>

          {plans.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs space-y-2">
              <p>Chưa có kế hoạch hỗ trợ nào được lập.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plans.map((sp) => {
                const stu = students.find((s) => s.id === sp.studentId);
                const statusColors =
                  sp.status === 'Hoàn thành'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : sp.status === 'Cần điều chỉnh'
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-blue-100 text-blue-800 border-blue-200';

                return (
                  <div key={sp.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs relative group">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 text-sm">
                        {stu?.full_name} ({stu?.student_code})
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${statusColors}`}>
                          {sp.status}
                        </span>

                        {/* Edit & Delete Action Buttons */}
                        <button
                          onClick={() => handleOpenEditPlan(sp)}
                          className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded-lg transition"
                          title="Chỉnh sửa kế hoạch"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeletePlan(sp.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition"
                          title="Xóa kế hoạch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="font-bold text-slate-700">🎯 Mục tiêu: </span>
                        <span className="text-slate-900 font-semibold">{sp.objective}</span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">🛠️ Biện pháp đồng hành: </span>
                        <span className="text-slate-600 leading-relaxed">{sp.plan}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 font-mono">
                      <span>GV Phụ trách: {sp.teacher_name || 'GVCN'}</span>
                      <span>Ngày lập: {sp.date || '2026-10-05'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Edit Comment Modal */}
      {editingComment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Chỉnh sửa Nhận xét Đánh giá</h3>
              <button onClick={() => setEditingComment(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditComment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Học sinh</label>
                <select
                  value={editCommentStudentId}
                  onChange={(e) => setEditCommentStudentId(e.target.value)}
                  className="w-full p-2 border rounded-xl border-slate-300 font-semibold"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.student_code} - {s.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ngày đánh giá</label>
                <input
                  type="date"
                  value={editCommentDate}
                  onChange={(e) => setEditCommentDate(e.target.value)}
                  className="w-full p-2 border rounded-xl border-slate-300 font-semibold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nội dung nhận xét</label>
                <textarea
                  rows={4}
                  required
                  value={editCommentContent}
                  onChange={(e) => setEditCommentContent(e.target.value)}
                  className="w-full p-2.5 border rounded-xl border-slate-300"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingComment(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-extrabold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-md"
                >
                  Cập nhật & Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Support Plan Modal */}
      {showAddPlanModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Lập Kế hoạch Hỗ trợ Mới</h3>
              <button onClick={() => setShowAddPlanModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSupportPlan} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Học sinh cần hỗ trợ</label>
                <select
                  value={planStudentId}
                  onChange={(e) => setPlanStudentId(e.target.value)}
                  className="w-full p-2 border rounded-xl border-slate-300 font-semibold"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.student_code} - {s.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mục tiêu rèn luyện / cải thiện</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Khắc phục đi trễ, đeo bảng tên đầy đủ..."
                  value={planObjective}
                  onChange={(e) => setPlanObjective(e.target.value)}
                  className="w-full p-2 border rounded-xl border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Biện pháp đồng hành sư phạm</label>
                <textarea
                  rows={3}
                  required
                  placeholder="VD: Phối hợp phụ huynh nhắc nhở, xếp ngồi cạnh cán sự lớp..."
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                  className="w-full p-2 border rounded-xl border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Trạng thái</label>
                  <select
                    value={planStatus}
                    onChange={(e) => setPlanStatus(e.target.value as any)}
                    className="w-full p-2 border rounded-xl border-slate-300 font-semibold"
                  >
                    <option value="Đang thực hiện">Đang thực hiện</option>
                    <option value="Hoàn thành">Hoàn thành</option>
                    <option value="Cần điều chỉnh">Cần điều chỉnh</option>
                    <option value="Tạm dừng">Tạm dừng</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày lập</label>
                  <input
                    type="date"
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className="w-full p-2 border rounded-xl border-slate-300"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPlanModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-sm"
                >
                  Lưu kế hoạch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Support Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Chỉnh sửa Kế hoạch Hỗ trợ</h3>
              <button onClick={() => setEditingPlan(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPlan} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Học sinh</label>
                <select
                  value={editPlanStudentId}
                  onChange={(e) => setEditPlanStudentId(e.target.value)}
                  className="w-full p-2 border rounded-xl border-slate-300 font-semibold"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.student_code} - {s.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mục tiêu rèn luyện</label>
                <input
                  type="text"
                  required
                  value={editPlanObjective}
                  onChange={(e) => setEditPlanObjective(e.target.value)}
                  className="w-full p-2 border rounded-xl border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Biện pháp đồng hành</label>
                <textarea
                  rows={3}
                  required
                  value={editPlanDescription}
                  onChange={(e) => setEditPlanDescription(e.target.value)}
                  className="w-full p-2 border rounded-xl border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Trạng thái tiến độ</label>
                <select
                  value={editPlanStatus}
                  onChange={(e) => setEditPlanStatus(e.target.value as any)}
                  className="w-full p-2 border rounded-xl border-slate-300 font-semibold"
                >
                  <option value="Đang thực hiện">Đang thực hiện</option>
                  <option value="Hoàn thành">Hoàn thành</option>
                  <option value="Cần điều chỉnh">Cần điều chỉnh</option>
                  <option value="Tạm dừng">Tạm dừng</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-md"
                >
                  Cập nhật & Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
