import React, { useState } from 'react';
import { appState } from '../services/appStateService';
import { Task } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  CheckSquare,
  Plus,
  ShieldAlert,
  X,
  Brush,
  RefreshCw,
  Users,
  Sparkles,
  Calendar,
  UserCheck,
} from 'lucide-react';
import { getWeekDateRange } from '../domain/scoring/scoringEngine';

export const TasksPage: React.FC = () => {
  const tasks = appState.tasks;
  const students = appState.students;
  const groups = appState.groups;
  const dutyRoster = appState.dutyRoster;
  const currentUser = appState.currentUser;

  const [activeTab, setActiveTab] = useState<'tasks' | 'duty'>('duty');
  const [selectedDutyWeek, setSelectedDutyWeek] = useState<number>(1);

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

  const selectedWeekRange = getWeekDateRange(selectedDutyWeek);
  const selectedDutyInfo = appState.getWeeklyDutyGroup(selectedDutyWeek);

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
            Trực nhật xoay vòng theo TUẦN (Mỗi tuần 1 Tổ phụ trách từ Thứ 2 đến Thứ 7: Tuần 1 ➔ Tổ 1, Tuần 2 ➔ Tổ 2...)
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
              🧹 Lịch Trực Nhật Theo Tuần
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

      {/* TAB 1: DUTY ROSTER (LỊCH TRỰC NHẬT XOAY VÒNG THEO TUẦN) */}
      {activeTab === 'duty' && (
        <div className="space-y-5">
          {/* Duty Control Bar */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-5 rounded-2xl border border-slate-800 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
            <div className="space-y-1">
              <div className="text-xs font-extrabold text-blue-400 flex items-center gap-1.5 uppercase tracking-wide">
                <Sparkles className="w-4 h-4 text-blue-400" />
                LỊCH PHÂN CÔNG TRỰC NHẬT XOAY VÒNG THEO TUẦN (XOAY THEO TỔ)
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Quy tắc xoay vòng: Mỗi tuần do <strong>1 Tổ phụ trách trực nhật cả tuần</strong> (từ Thứ 2 đến Thứ 7).
                Lần lượt: Tuần 1 ➔ Tổ 1 | Tuần 2 ➔ Tổ 2 | Tuần 3 ➔ Tổ 3 | Tuần 4 ➔ Tổ 4 | Tuần 5 ➔ Lặp lại Tổ 1...
              </p>
            </div>
            <button
              onClick={() => appState.resetWeeklyDutyRotation()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer shrink-0"
            >
              <RefreshCw className="w-4 h-4" />
              Đặt Lại Xoay Vòng Mặc Định (Tổ 1 ➔ 4)
            </button>
          </div>

          {/* Selected Week Detail Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-blue-700 shrink-0" />
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase">Xem phân công trực nhật theo tuần:</label>
                  <select
                    value={selectedDutyWeek}
                    onChange={(e) => setSelectedDutyWeek(Number(e.target.value))}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-black text-blue-900 text-sm cursor-pointer focus:ring-2 focus:ring-blue-500 mt-0.5"
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
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-semibold bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                  🗓️ {selectedWeekRange.fullRangeText}
                </span>
              </div>
            </div>

            {/* Active Week Duty Card Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Box 1: Assigned Group */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 p-4 rounded-xl border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-blue-700">Tổ Phụ Trách Tuần {selectedDutyWeek}</span>
                  {selectedDutyInfo.isOverridden && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-extrabold rounded-full border border-amber-300">
                      Tùy chỉnh thủ công
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black text-blue-950">
                    {selectedDutyInfo.group?.group_name || `Tổ ${selectedDutyInfo.groupIndex}`}
                  </h3>
                  <select
                    value={selectedDutyInfo.group?.id || ''}
                    onChange={(e) => appState.setWeeklyDutyGroup(selectedDutyWeek, e.target.value)}
                    className="px-2.5 py-1 bg-white border border-blue-300 rounded-lg text-xs font-bold text-blue-900 cursor-pointer shadow-2xs"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.group_name}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-xs text-blue-800 leading-snug">
                  Chịu trách nhiệm trực nhật toàn bộ từ <strong>Thứ 2 đến Thứ 7</strong> ({selectedWeekRange.shortRange}).
                </p>
              </div>

              {/* Box 2: Leader */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-500">Tổ Trưởng Phụ Trách Trực Nhật</span>
                <div className="flex items-center gap-2.5 pt-1">
                  <div className="p-2 bg-blue-100 text-blue-800 rounded-lg font-bold">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      {selectedDutyInfo.leader ? selectedDutyInfo.leader.full_name : 'Đang cập nhật tổ trưởng'}
                    </h4>
                    <span className="text-xs text-slate-500">
                      Mã HS: {selectedDutyInfo.leader?.student_code || '---'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Box 3: Group Roster Count */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-500">Phân Công Nhân Sự Sĩ Số</span>
                <div className="flex items-center gap-2.5 pt-1">
                  <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg font-bold">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      {selectedDutyInfo.members.length} Học Sinh
                    </h4>
                    <span className="text-xs text-emerald-700 font-semibold">
                      Toàn bộ thành viên {selectedDutyInfo.group?.group_name} cùng trực
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* List of Students in Assigned Group */}
            <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-700" />
                Danh sách học sinh {selectedDutyInfo.group?.group_name} phụ trách trực nhật Tuần {selectedDutyWeek}:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {selectedDutyInfo.members.map((stu) => (
                  <span
                    key={stu.id}
                    className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                      stu.id === selectedDutyInfo.leader?.id
                        ? 'bg-blue-600 text-white border-blue-700 shadow-2xs'
                        : 'bg-white text-slate-800 border-slate-300'
                    }`}
                  >
                    {stu.full_name} {stu.id === selectedDutyInfo.leader?.id && '👑 (Tổ trưởng)'}
                  </span>
                ))}
              </div>
            </div>

            {/* Daily Routine checklist for the week */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-extrabold text-slate-900 uppercase tracking-tight block">
                📋 Nội dung công việc trực nhật theo ngày trong Tuần {selectedDutyWeek} ({selectedDutyInfo.group?.group_name}):
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dutyRoster.map((d) => (
                  <div key={d.dayOfWeek} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-black">
                        {d.dayLabel}
                      </span>
                      <span className="text-slate-600 text-[11px] font-semibold">{selectedDutyInfo.group?.group_name}</span>
                    </div>
                    <input
                      type="text"
                      value={d.notes || ''}
                      onChange={(e) => appState.updateDutyRosterDay(d.dayOfWeek, { notes: e.target.value })}
                      placeholder="Nhiệm vụ: lau bảng, quét dọn, kê ghế..."
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Full Semester Weekly Duty Rotation Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  🗓️ Bảng Phân Công Trực Nhật Xoay Vòng Tất Cả Các Tuần (Học Kỳ 1)
                </h3>
                <p className="text-xs text-slate-500">
                  Lịch trực nhật xoay vòng liên tục theo tuần (Tổ 1 ➔ Tổ 2 ➔ Tổ 3 ➔ Tổ 4 ➔ Tổ 1...)
                </p>
              </div>
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                    <th className="p-2.5 border border-slate-200 text-center">Tuần</th>
                    <th className="p-2.5 border border-slate-200">Thời gian (Từ ngày ➔ Đến ngày)</th>
                    <th className="p-2.5 border border-slate-200 text-center">Tổ Phụ Trách Trực Nhật</th>
                    <th className="p-2.5 border border-slate-200">Tổ Trưởng Chịu Trách Nhiệm</th>
                    <th className="p-2.5 border border-slate-200 text-center">Sĩ Số Tổ</th>
                    <th className="p-2.5 border border-slate-200 text-center">Tùy Chỉnh Phân Công</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 18 }, (_, i) => i + 1).map((w) => {
                    const r = getWeekDateRange(w);
                    const duty = appState.getWeeklyDutyGroup(w);
                    const isSelected = selectedDutyWeek === w;

                    return (
                      <tr
                        key={w}
                        onClick={() => setSelectedDutyWeek(w)}
                        className={`border-b border-slate-200 cursor-pointer transition ${
                          isSelected ? 'bg-blue-50/90 font-semibold' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="p-2.5 border border-slate-200 text-center font-black text-blue-900">
                          Tuần {w} {isSelected && '👈'}
                        </td>
                        <td className="p-2.5 border border-slate-200 font-mono text-slate-700">
                          {r.fullRangeText}
                        </td>
                        <td className="p-2.5 border border-slate-200 text-center">
                          <span className="px-3 py-1 bg-blue-600 text-white font-extrabold rounded-lg text-xs shadow-2xs">
                            {duty.group?.group_name || `Tổ ${duty.groupIndex}`}
                          </span>
                        </td>
                        <td className="p-2.5 border border-slate-200 font-medium text-slate-900">
                          {duty.leader ? duty.leader.full_name : '---'}
                        </td>
                        <td className="p-2.5 border border-slate-200 text-center font-mono">
                          {duty.members.length} HS
                        </td>
                        <td
                          className="p-2.5 border border-slate-200 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            value={duty.group?.id || ''}
                            onChange={(e) => appState.setWeeklyDutyGroup(w, e.target.value)}
                            className="px-2 py-1 bg-white border border-slate-300 rounded-md text-xs font-bold text-slate-800 cursor-pointer"
                          >
                            {groups.map((g) => (
                              <option key={g.id} value={g.id}>
                                {g.group_name}
                              </option>
                            ))}
                          </select>
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
