import React, { useState } from 'react';
import { appState } from '../services/appStateService';
import { Task, DutyRosterDay } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { CheckSquare, Plus, AlertCircle, ShieldAlert, X, Check, Brush, RefreshCw, Users, Sparkles, CheckCircle2 } from 'lucide-react';

export const TasksPage: React.FC = () => {
  const tasks = appState.tasks;
  const students = appState.students;
  const groups = appState.groups;
  const dutyRoster = appState.dutyRoster;
  const currentUser = appState.currentUser;

  const [activeTab, setActiveTab] = useState<'tasks' | 'duty'>('duty');

  const canManageTasks =
    Boolean(currentUser.isAuthenticatedOfficer) &&
    (currentUser.role === 'gvcn' ||
      currentUser.role === 'lop_truong' ||
      currentUser.role === 'lop_pho');

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [assignedStudentId, setAssignedStudentId] = useState(students[0]?.id || '');

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    appState.createTask({
      class_id: 'class-10a16',
      title: title.trim(),
      description: description.trim(),
      assigned_to_type: 'student',
      assigned_student_ids: [assignedStudentId],
      due_date: dueDate,
      status: 'pending',
      created_by: currentUser.name,
    });

    appState.showToast(`Đã phân công nhiệm vụ "${title.trim()}" thành công!`, 'success');
    setShowModal(false);
    setTitle('');
    setDescription('');
  };

  return (
    <div className="space-y-5">
      {/* Header & Main Tab Switcher */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Phân Công Nhiệm Vụ & Lịch Trực Nhật</h2>
          <p className="text-xs text-slate-500">
            Quản lý công việc lớp, lịch xoay vòng trực nhật Tổ 1 ➔ Tổ 4 (Thứ 2 đến Thứ 7)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setActiveTab('duty')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'duty'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Brush className="w-4 h-4" />
              🧹 Lịch Trực Nhật Tuần
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'tasks'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              📋 Nhiệm vụ Phong trào
            </button>
          </div>

          {activeTab === 'tasks' && canManageTasks && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Giao nhiệm vụ
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: DUTY ROSTER (LỊCH TRỰC NHẬT TUẦN) */}
      {activeTab === 'duty' && (
        <div className="space-y-4">
          {/* Duty Control Bar */}
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="space-y-0.5">
              <div className="text-xs font-extrabold text-blue-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-blue-400" />
                BẢNG PHÂN CÔNG TRỰC NHẬT XOAY VÒNG THEO TỔ (THỨ 2 ➔ THỨ 7)
              </div>
              <p className="text-[11px] text-slate-300">
                Phân công rõ Tổ trưởng kiểm tra vệ sinh, lau bảng, đóng cửa sổ và kê bàn ghế.
              </p>
            </div>
            <button
              onClick={() => appState.autoRotateDutyRoster()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              Xoay Vòng Trực Nhật Tự Động (Tổ 1 ➔ 4)
            </button>
          </div>

          {/* Grid of 6 Days (Thứ 2 đến Thứ 7) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dutyRoster.map((d) => {
              const currentGroup = groups.find((g) => g.id === d.assignedGroupId) || groups[0];
              const leader = students.find((s) => s.id === currentGroup?.leader_student_id);

              return (
                <div
                  key={d.dayOfWeek}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-blue-300 transition"
                >
                  {/* Day Card Header */}
                  <div className="bg-slate-50 p-3.5 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-blue-100 text-blue-800 font-black text-xs rounded-lg">
                        {d.dayLabel}
                      </span>
                      <span className="font-extrabold text-slate-900 text-sm">{currentGroup?.group_name || d.groupName}</span>
                    </div>
                    <select
                      value={d.assignedGroupId}
                      onChange={(e) =>
                        appState.updateDutyRosterDay(d.dayOfWeek, { assignedGroupId: e.target.value })
                      }
                      className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                    >
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.group_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Duty Content & Responsibilities */}
                  <div className="p-4 space-y-3 text-xs flex-1">
                    <div className="flex items-center gap-2 p-2 bg-blue-50/60 rounded-xl border border-blue-100 text-blue-900">
                      <Users className="w-4 h-4 text-blue-700 shrink-0" />
                      <div>
                        <span className="text-[10px] text-blue-600 block uppercase font-bold">Tổ trưởng chịu trách nhiệm:</span>
                        <strong className="text-xs">{leader ? leader.full_name : 'Đang cập nhật'}</strong>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block text-[11px]">Nhiệm vụ cụ thể ngày {d.dayLabel}:</label>
                      <input
                        type="text"
                        value={d.notes || ''}
                        onChange={(e) =>
                          appState.updateDutyRosterDay(d.dayOfWeek, { notes: e.target.value })
                        }
                        placeholder="VD: Quét lớp, lau bảng, gom rác..."
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Duty Status Selector */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500">Đánh giá thực hiện:</span>
                      <select
                        value={d.status || 'pending'}
                        onChange={(e) =>
                          appState.updateDutyRosterDay(d.dayOfWeek, { status: e.target.value as any })
                        }
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer ${
                          d.status === 'completed_good'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : d.status === 'needs_improvement'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-slate-50 text-slate-700 border-slate-300'
                        }`}
                      >
                        <option value="pending">Chưa thực hiện</option>
                        <option value="completed_good">✅ Hoàn thành sạch đẹp</option>
                        <option value="completed_ok">👍 Đạt yêu cầu</option>
                        <option value="needs_improvement">⚠️ Cần nhắc nhở vệ sinh</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: GENERAL TASKS */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          {/* Mandatory V09 Safety Disclaimer */}
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 space-y-1.5 text-xs text-amber-950">
            <div className="font-bold flex items-center gap-2 text-amber-900 text-sm">
              <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0" />
              QUY TẮC AN TOÀN PHẦN MỀM: BẢO VỆ MÃ VI PHẠM 09 (V09)
            </div>
            <p className="leading-relaxed">
              Trạng thái nhiệm vụ bị trễ hạn (<code>late</code>), chưa hoàn thành (<code>not_completed</code>) hoặc hủy bỏ (<code>cancelled</code>){' '}
              <strong>TUYỆT ĐỐI KHÔNG TỰ ĐỘNG SINH MÃ V09</strong> và không tự động trừ điểm rèn luyện!
            </p>
            <p className="text-[11px] text-amber-800">
              * Căn cứ QĐ 525: Hành vi vi phạm V09 (Không thực hiện nhiệm vụ GVCN giao) phải được lập báo cáo sự việc riêng biệt, có xác minh tính chất cố tình vi phạm và được GVCN trực tiếp phê duyệt.
            </p>
          </div>

          {/* Tasks Table (Desktop) */}

      {/* Mobile Card Feed */}
      <div className="md:hidden space-y-2.5">
        {tasks.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            Chưa có nhiệm vụ nào được giao.
          </div>
        ) : (
          tasks.map((task) => {
            const assignedStudent = students.find((s) => s.id === task.assigned_student_ids[0]);
            return (
              <div key={task.id} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-slate-900">{task.title}</div>
                  <StatusBadge
                    type={
                      task.status === 'completed'
                        ? 'tot'
                        : task.status === 'late' || task.status === 'not_completed'
                        ? 'rejected'
                        : 'dat'
                    }
                    label={
                      task.status === 'completed'
                        ? 'Đã xong'
                        : task.status === 'in_progress'
                        ? 'Đang làm'
                        : task.status === 'late'
                        ? 'Trễ hạn'
                        : task.status === 'not_completed'
                        ? 'Chưa xong'
                        : 'Chờ thực hiện'
                    }
                  />
                </div>
                {task.description && (
                  <div className="text-[11px] text-slate-500">{task.description}</div>
                )}
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <span>
                    Người làm: <strong className="text-slate-800">{assignedStudent?.full_name || 'Tập thể'}</strong>
                  </span>
                  <span>Hạn: {task.due_date}</span>
                </div>
                <div className="pt-1 flex items-center justify-end">
                  <select
                    value={task.status}
                    onChange={(e) => {
                      appState.updateTaskStatus(task.id, e.target.value as any);
                      appState.showToast('Đã cập nhật trạng thái nhiệm vụ!', 'info');
                    }}
                    className="min-h-[36px] text-xs px-2.5 py-1 border rounded-lg border-slate-300 bg-white font-medium cursor-pointer"
                  >
                    <option value="pending">Chờ thực hiện</option>
                    <option value="in_progress">Đang làm</option>
                    <option value="completed">Đã hoàn thành</option>
                    <option value="late">Trễ hạn (Không trừ điểm)</option>
                    <option value="not_completed">Chưa xong (Không trừ điểm)</option>
                    <option value="cancelled">Đã hủy</option>
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Tasks Table (Desktop) */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Tên nhiệm vụ</th>
                <th className="py-3 px-4">Người thực hiện</th>
                <th className="py-3 px-4">Hạn chót</th>
                <th className="py-3 px-4">Người giao</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4 text-right">Cập nhật</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">
                    Chưa có nhiệm vụ nào được giao.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const assignedStudent = students.find((s) => s.id === task.assigned_student_ids[0]);
                  return (
                    <tr key={task.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{task.title}</div>
                        <div className="text-[11px] text-slate-500">{task.description || '—'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">
                          {assignedStudent?.full_name || 'Tập thể'}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {assignedStudent?.student_code}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{task.due_date}</td>
                      <td className="py-3 px-4 text-slate-600">{task.created_by}</td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          type={
                            task.status === 'completed'
                              ? 'tot'
                              : task.status === 'late' || task.status === 'not_completed'
                              ? 'rejected'
                              : 'dat'
                          }
                          label={
                            task.status === 'completed'
                              ? 'Đã xong'
                              : task.status === 'in_progress'
                              ? 'Đang làm'
                              : task.status === 'late'
                              ? 'Trễ hạn (Không trừ điểm)'
                              : task.status === 'not_completed'
                              ? 'Chưa xong (Không trừ điểm)'
                              : 'Chờ thực hiện'
                          }
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <select
                          value={task.status}
                          onChange={(e) => appState.updateTaskStatus(task.id, e.target.value as any)}
                          className="text-[11px] px-2 py-1 border rounded-lg border-slate-300 bg-white font-medium cursor-pointer"
                        >
                          <option value="pending">Chờ thực hiện</option>
                          <option value="in_progress">Đang làm</option>
                          <option value="completed">Đã hoàn thành</option>
                          <option value="late">Trễ hạn</option>
                          <option value="not_completed">Chưa hoàn thành</option>
                          <option value="cancelled">Đã hủy</option>
                        </select>
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
    )}

      {/* Task Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h3 className="font-bold text-base text-slate-900">Giao nhiệm vụ lớp học</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tiêu đề nhiệm vụ</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Trực nhật lớp thứ 3; Kê ghế chào cờ..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border rounded-lg border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Giao cho học sinh</label>
                <select
                  value={assignedStudentId}
                  onChange={(e) => setAssignedStudentId(e.target.value)}
                  className="w-full p-2 border rounded-lg border-slate-300 font-semibold"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.student_code} - {s.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hạn hoàn thành</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2 border rounded-lg border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô tả công việc</label>
                <textarea
                  rows={2}
                  placeholder="Chi tiết công việc..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 border rounded-lg border-slate-300"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-500"
                >
                  Lưu & Giao việc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
