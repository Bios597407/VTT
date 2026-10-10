import React, { useState } from 'react';
import { appState } from '../services/appStateService';
import { Group, Student } from '../types';
import { Users, Shield, Plus, Check, Edit3, ArrowRightLeft, UserCheck, X, Trophy, Award, Calendar, AlertCircle, ShieldCheck } from 'lucide-react';
import { getWeekDateRange } from '../domain/scoring/scoringEngine';

export const GroupsPage: React.FC = () => {
  const groups = appState.groups;
  const students = appState.students;
  const currentUser = appState.currentUser;

  const [activeGroupId, setActiveGroupId] = useState(groups[0]?.id || 'group-01');
  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  // Modals state
  const [showEditGroupModal, setShowEditGroupModal] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editLeaderId, setEditLeaderId] = useState('');

  const [showMoveMemberModal, setShowMoveMemberModal] = useState(false);
  const [movingStudent, setMovingStudent] = useState<Student | null>(null);
  const [targetGroupId, setTargetGroupId] = useState('');

  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedAddStudentId, setSelectedAddStudentId] = useState('');

  const selectedGroup = groups.find((g) => g.id === activeGroupId) || groups[0];
  const groupMembers = students.filter((s) => s.group_id === selectedGroup?.id);

  // Permission: GVCN has full authority over all groups; Tổ trưởng manages their own group
  const canManageCurrentGroup =
    currentUser.role === 'gvcn' ||
    currentUser.role === 'lop_truong' ||
    currentUser.role === 'lop_pho' ||
    (currentUser.role === 'to_truong' && currentUser.group_id === selectedGroup?.id);

  const isGvcnOrClassLeader =
    currentUser.role === 'gvcn' ||
    currentUser.role === 'lop_truong' ||
    currentUser.role === 'lop_pho';

  const handleOpenEditGroup = () => {
    if (!selectedGroup) return;
    setEditGroupName(selectedGroup.group_name);
    setEditLeaderId(selectedGroup.leader_student_id || '');
    setShowEditGroupModal(true);
  };

  const handleSaveEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup || !editGroupName.trim()) return;

    appState.updateGroup(selectedGroup.id, {
      group_name: editGroupName.trim(),
    });

    await appState.updateGroupLeader(selectedGroup.id, editLeaderId);

    appState.showToast(`Đã cập nhật thông tin ${selectedGroup.group_name} & Tổ trưởng!`, 'success');
    setShowEditGroupModal(false);
  };

  const handleOpenMoveMember = (stu: Student) => {
    setMovingStudent(stu);
    setTargetGroupId(groups.find((g) => g.id !== stu.group_id)?.id || 'group-01');
    setShowMoveMemberModal(true);
  };

  const handleSaveMoveMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!movingStudent || !targetGroupId) return;

    appState.assignStudentToGroup(movingStudent.id, targetGroupId);
    const targetGroup = groups.find((g) => g.id === targetGroupId);
    appState.showToast(`Đã chuyển học sinh ${movingStudent.full_name} sang ${targetGroup?.group_name}!`, 'success');
    setShowMoveMemberModal(false);
  };

  const handleSaveAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAddStudentId || !selectedGroup) return;

    appState.assignStudentToGroup(selectedAddStudentId, selectedGroup.id);
    const stu = students.find((s) => s.id === selectedAddStudentId);
    appState.showToast(`Đã thêm học sinh ${stu?.full_name} vào ${selectedGroup.group_name}!`, 'success');
    setShowAddMemberModal(false);
  };

  const availableStudentsForGroup = students.filter((s) => s.group_id !== selectedGroup?.id);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Tổ Học tập Lớp 10A16</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
              4 Tổ tự quản
            </span>
            {isGvcnOrClassLeader && (
              <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-emerald-100 text-emerald-800 hidden sm:inline">
                GVCN: Toàn quyền điều chỉnh
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Mô hình 4 Tổ sinh hoạt học tập, phân công nề nếp và tự quản • THPT Võ Trường Toản
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isGvcnOrClassLeader && selectedGroup && (
            <button
              onClick={handleOpenEditGroup}
              className="px-3.5 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Chỉnh sửa thông tin Tổ</span>
            </button>
          )}

          <div className="text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl border border-blue-200">
            Quyền thao tác: {canManageCurrentGroup ? 'Toàn quyền quản lý' : 'Chỉ xem'}
          </div>
        </div>
      </div>

      {/* Group selector tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {groups.map((grp) => {
          const count = students.filter((s) => s.group_id === grp.id).length;
          const isSelected = grp.id === activeGroupId;
          const leader = students.find((s) => s.id === grp.leader_student_id);

          return (
            <button
              key={grp.id}
              onClick={() => setActiveGroupId(grp.id)}
              className={`p-4 rounded-2xl border text-left transition cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-500/20'
                  : 'bg-white text-slate-800 border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                  Tổ {grp.group_number}
                </span>
                <span className="text-[11px] opacity-75 font-mono">{count} HS</span>
              </div>
              <div className="text-sm font-extrabold mt-1 truncate">{grp.group_name}</div>
              <div className="text-[11px] opacity-80 mt-1 truncate">
                Tổ trưởng: {leader ? leader.full_name : 'Chưa chỉ định'}
              </div>
            </button>
          );
        })}
      </div>

      {/* Weekly Group Competition & Ranking Board */}
      {(() => {
        const groupScores = appState.getGroupWeeklyScores(selectedWeek);
        const range = getWeekDateRange(selectedWeek);
        const topScore = groupScores[0]?.score ?? 8.0;

        return (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
                  <Trophy className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    Bảng Thi Đưa & Xếp Loại Các Tổ Trong Tuần
                  </h3>
                  <p className="text-xs text-slate-500">
                    Điểm trung bình Tổ = Tổng điểm tuần 43 học sinh / Số sĩ số mỗi Tổ. Điểm trừ vi phạm của học sinh được liên kết trực tiếp để hạ điểm thi đua của Tổ.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Tuần:</span>
                <select
                  value={selectedWeek}
                  onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-xs text-blue-800 shadow-xs cursor-pointer focus:ring-2 focus:ring-blue-500"
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

            {/* Ranking Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {groupScores.map((item) => {
                const isLeading = item.rank === 1 && item.score === topScore && item.violationsCount === 0;
                const hasViolations = item.violationsCount > 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveGroupId(item.id)}
                    className={`p-4 rounded-2xl border transition cursor-pointer relative overflow-hidden ${
                      isLeading
                        ? 'bg-gradient-to-br from-amber-500/10 via-amber-50/30 to-white border-amber-300 shadow-xs'
                        : hasViolations
                        ? 'bg-slate-50/80 border-slate-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold font-mono text-slate-500">
                        HẠNG #{item.rank}
                      </span>
                      {isLeading ? (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-extrabold rounded-full flex items-center gap-1">
                          <Trophy className="w-3 h-3 text-amber-600" /> Dẫn đầu
                        </span>
                      ) : hasViolations ? (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-600" /> Có vi phạm
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" /> Nề nếp tốt
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="font-extrabold text-sm text-slate-900">{item.group_name}</span>
                      <div className="text-right">
                        <span className="text-lg font-black font-mono text-blue-700">{item.score.toFixed(1)}</span>
                        <span className="text-xs text-slate-500 font-bold">/10</span>
                      </div>
                    </div>

                    <div className="mt-2 border-t border-slate-100 pt-2 grid grid-cols-2 gap-1 text-[11px]">
                      <div>
                        <span className="text-slate-500">Sĩ số:</span>{' '}
                        <span className="font-bold text-slate-800">{item.studentCount} HS</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500">Lượt vi phạm:</span>{' '}
                        <span className={`font-bold ${hasViolations ? 'text-rose-700 font-mono' : 'text-slate-800'}`}>
                          {item.violationsCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">Điểm thưởng:</span>{' '}
                        <span className="font-bold text-emerald-700 font-mono">+{item.rewardsCount}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500">Điểm trừ:</span>{' '}
                        <span className="font-bold text-rose-700 font-mono">-{item.totalDeduction}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Selected Group details & members */}
      {selectedGroup && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900">{selectedGroup.group_name}</h3>
                {isGvcnOrClassLeader && (
                  <button
                    onClick={handleOpenEditGroup}
                    className="p-1 text-slate-400 hover:text-blue-600 rounded transition cursor-pointer"
                    title="Chỉnh sửa tên tổ & tổ trưởng"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tổ trưởng phụ trách ghi nhận nề nếp tổ hàng ngày • GVCN có toàn quyền phân công lại
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-xs text-slate-600">
                Sĩ số: <span className="font-bold text-slate-900">{groupMembers.length} học sinh</span>
              </div>
              {isGvcnOrClassLeader && (
                <button
                  onClick={() => {
                    setSelectedAddStudentId(availableStudentsForGroup[0]?.id || '');
                    setShowAddMemberModal(true);
                  }}
                  className="px-3 py-1.5 text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition active:scale-95 cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm học sinh vào tổ</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Member Cards */}
          <div className="md:hidden space-y-2">
            {groupMembers.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                Chưa có học sinh nào được phân vào tổ này.
              </div>
            ) : (
              groupMembers.map((m, idx) => {
                const isLeader = selectedGroup.leader_student_id === m.id;
                return (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-slate-400 text-xs w-5 text-right tabular-nums">{idx + 1}</span>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{m.full_name}</span>
                          {isLeader && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              Tổ trưởng
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          Mã: {m.student_code} · {m.seat_number || 'Chưa gán bàn'}
                        </div>
                      </div>
                    </div>

                    {isGvcnOrClassLeader && (
                      <button
                        onClick={() => handleOpenMoveMember(m)}
                        className="px-2.5 py-1 text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-[11px] font-medium transition cursor-pointer flex items-center gap-1"
                      >
                        <ArrowRightLeft className="w-3 h-3 text-blue-600" />
                        <span>Chuyển tổ</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3 w-12">STT</th>
                  <th className="py-2.5 px-3 w-28">Mã số</th>
                  <th className="py-2.5 px-3">Họ và tên</th>
                  <th className="py-2.5 px-3">Vị trí chỗ ngồi</th>
                  <th className="py-2.5 px-3">Vai trò trong tổ</th>
                  {isGvcnOrClassLeader && <th className="py-2.5 px-3 text-right">Điều chỉnh</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groupMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400">
                      Chưa có học sinh nào được phân vào tổ này.
                    </td>
                  </tr>
                ) : (
                  groupMembers.map((m, idx) => {
                    const isLeader = selectedGroup.leader_student_id === m.id;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-2.5 px-3 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{m.student_code}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{m.full_name}</td>
                        <td className="py-2.5 px-3 text-slate-600">{m.seat_number || 'Chưa gán'}</td>
                        <td className="py-2.5 px-3">
                          {isLeader ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <UserCheck className="w-3 h-3" />
                              Tổ trưởng
                            </span>
                          ) : (
                            <span className="text-slate-500">Thành viên</span>
                          )}
                        </td>
                        {isGvcnOrClassLeader && (
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleOpenMoveMember(m)}
                              className="px-2.5 py-1 text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1 ml-auto"
                            >
                              <ArrowRightLeft className="w-3 h-3 text-blue-600" />
                              <span>Chuyển tổ</span>
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Group Modal (GVCN có quyền đổi tên tổ và chỉ định tổ trưởng) */}
      {showEditGroupModal && selectedGroup && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Điều chỉnh thông tin {selectedGroup.group_name}</h3>
                <p className="text-xs text-slate-300">Quyền quản trị của GVCN</p>
              </div>
              <button
                onClick={() => setShowEditGroupModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditGroup} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên tổ</label>
                <input
                  type="text"
                  required
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  placeholder="Ví dụ: Tổ 1"
                  className="w-full p-2.5 border rounded-xl border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chỉ định Tổ trưởng (Không khoá cứng, GVCN chọn tự do)</label>
                <select
                  value={editLeaderId}
                  onChange={(e) => setEditLeaderId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl border-slate-300 text-xs font-medium"
                >
                  <option value="">-- Chưa chỉ định tổ trưởng --</option>
                  <optgroup label={`Thành viên hiện tại (${selectedGroup.group_name})`}>
                    {groupMembers.map((stu) => (
                      <option key={stu.id} value={stu.id}>
                        {stu.student_code} - {stu.full_name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Học sinh khác trong Lớp 10A16">
                    {students.filter((s) => s.group_id !== selectedGroup.id).map((stu) => (
                      <option key={stu.id} value={stu.id}>
                        {stu.student_code} - {stu.full_name} (Hiện ở Tổ {groups.find((g) => g.id === stu.group_id)?.group_number || '?'})
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditGroupModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu thông tin Tổ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Member Modal */}
      {showMoveMemberModal && movingStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Chuyển tổ cho học sinh</h3>
                <p className="text-xs text-slate-300">{movingStudent.full_name}</p>
              </div>
              <button
                onClick={() => setShowMoveMemberModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMoveMember} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chọn tổ mới</label>
                <select
                  value={targetGroupId}
                  onChange={(e) => setTargetGroupId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl border-slate-300 text-xs"
                >
                  {groups.map((grp) => (
                    <option key={grp.id} value={grp.id}>
                      Tổ {grp.group_number} ({grp.group_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMoveMemberModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Xác nhận chuyển tổ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member into Current Group Modal */}
      {showAddMemberModal && selectedGroup && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Thêm học sinh vào {selectedGroup.group_name}</h3>
                <p className="text-xs text-slate-300">Chọn học sinh từ tổ khác để chuyển qua</p>
              </div>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAddMember} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chọn học sinh</label>
                <select
                  value={selectedAddStudentId}
                  onChange={(e) => setSelectedAddStudentId(e.target.value)}
                  className="w-full p-2.5 border rounded-xl border-slate-300 text-xs"
                >
                  {availableStudentsForGroup.map((stu) => {
                    const currentGrp = groups.find((g) => g.id === stu.group_id);
                    return (
                      <option key={stu.id} value={stu.id}>
                        {stu.student_code} - {stu.full_name} ({currentGrp?.group_name || 'Chưa có tổ'})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Thêm vào tổ</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
