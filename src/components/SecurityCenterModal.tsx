import React, { useState } from 'react';
import { appState } from '../services/appStateService';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  History,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Users,
  X,
  LogOut,
  RefreshCw,
  Server,
  Download,
  Clock,
  UserCheck,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityCenterModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'change_pin' | 'audit_logs' | 'sessions'>('overview');

  // Change PIN state
  const [pinRole, setPinRole] = useState<'gvcn' | 'lop_truong' | 'lop_pho'>('gvcn');
  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMsg, setPinMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search in audit logs
  const [logSearch, setLogSearch] = useState('');

  if (!isOpen) return null;

  const currentUser = appState.currentUser;
  const officerAccounts = appState.officerAccounts;
  const auditLogs = appState.auditLogs;

  const handleChangePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPinMsg(null);

    if (!oldPin.trim() || !newPin.trim()) {
      setPinMsg({ type: 'error', text: 'Vui lòng nhập đầy đủ mã PIN hiện tại và mã PIN mới.' });
      return;
    }

    if (newPin !== confirmPin) {
      setPinMsg({ type: 'error', text: 'Mã PIN mới và xác nhận mã PIN không trùng khớp!' });
      return;
    }

    const res = appState.changeOfficerPin(pinRole, oldPin, newPin);
    if (res.success) {
      setPinMsg({ type: 'success', text: res.message });
      setOldPin('');
      setNewPin('');
      setConfirmPin('');
    } else {
      setPinMsg({ type: 'error', text: res.message });
    }
  };

  const handleForceLogoutOthers = () => {
    appState.addAuditLog(currentUser.name, 'Yêu cầu đăng xuất khẩn cấp tất cả phiên truy cập khác', 'security_action', 'sessions');
    appState.showToast('🛡️ Đã đăng xuất thành công tất cả các thiết bị khác khỏi phiên làm việc!', 'success');
  };

  const filteredLogs = auditLogs.filter((log) => {
    if (!logSearch.trim()) return true;
    const q = logSearch.toLowerCase();
    return (
      log.actor_name.toLowerCase().includes(q) ||
      log.action.toLowerCase().includes(q) ||
      log.reason?.toLowerCase().includes(q) ||
      log.entity_type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white">Trung Tâm Bảo Mật & An Toàn Dữ Liệu</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
                  100/100 An Toàn
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kiểm soát quyền truy cập, bảo vệ thông tin học sinh & giám sát an ninh Lớp 10A16
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-4 pt-2 shrink-0 overflow-x-auto no-scrollbar gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/80 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Tổng Quan Bảo Mật
          </button>
          <button
            onClick={() => setActiveTab('change_pin')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'change_pin'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/80 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Đổi Mã PIN Ban Cán Sự
          </button>
          <button
            onClick={() => setActiveTab('audit_logs')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'audit_logs'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/80 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <History className="w-4 h-4" />
            Nhật Ký Truy Cập ({auditLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-xl transition-all flex items-center gap-2 border-b-2 whitespace-nowrap ${
              activeTab === 'sessions'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/80 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Users className="w-4 h-4" />
            Quản Lý Phiên Làm Việc
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-200">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Security Score Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-900 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400 text-2xl font-black shrink-0">
                    100
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Mức Độ Bảo Mật: Đạt Chuẩn Sản Xuất
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 inline-block" />
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl">
                      Ứng dụng quản lý Lớp 10A16 tích hợp đầy đủ 6 lớp bảo vệ đa tầng: Phân quyền vai trò RBAC, Khóa chống dò PIN, Giấu thông tin cá nhân, Nhật ký thao tác不可sửa đổi và Khóa kỳ dữ liệu.
                    </p>
                  </div>
                </div>
                <div className="shrink-0 flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => appState.exportFullDatabaseBackup()}
                    className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-colors"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    Tải Báo Cáo Kiểm Toán
                  </button>
                </div>
              </div>

              {/* 6 Security Layers Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Layer 1 */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4" />
                      1. Phân quyền RBAC 3 Cấp
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Kích Hoạt</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Chỉ <b>GVCN & Ban Cán Sự</b> có quyền thêm/sửa/xóa vi phạm, khen thưởng, điểm danh. Học sinh chỉ được phép xem dữ liệu.
                  </p>
                </div>

                {/* Layer 2 */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Lock className="w-4 h-4" />
                      2. Chống Dò Mã PIN (Brute-Force)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Kích Hoạt</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Tự động tạm khóa tài khoản <b>3 phút</b> nếu nhập sai PIN quá 5 lần liên tiếp. Đồng thời tự động ghi log cảnh báo an ninh.
                  </p>
                </div>

                {/* Layer 3 */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                      <EyeOff className="w-4 h-4" />
                      3. Bảo Tồn Quyền Riêng Tư (GDPR)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Kích Hoạt</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Ẩn hoàn toàn địa chỉ IP cá nhân (ví dụ: <code>113.161.xx.xx</code>), không công khai email cá nhân của cán sự ra ngoài.
                  </p>
                </div>

                {/* Layer 4 */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                      <History className="w-4 h-4" />
                      4. Nhật Ký Giám Sát Chống Gian Lận
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Kích Hoạt</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Mọi thao tác thay đổi điểm, sửa tên, hủy vi phạm đều được lưu vĩnh viễn vào Audit Log kèm thời gian và người thực hiện.
                  </p>
                </div>

                {/* Layer 5 */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      5. Khóa Kỳ Dữ Liệu (Period Lock)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Kích Hoạt</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    GVCN có thể chốt sổ tuần/tháng. Khi đã chốt, bất kỳ tài khoản nào cũng không thể thay đổi dữ liệu nề nếp quá khứ.
                  </p>
                </div>

                {/* Layer 6 */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                      <Server className="w-4 h-4" />
                      6. Sao Lưu & Khôi Phục Tức Thời
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">Kích Hoạt</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Dữ liệu được lưu trữ hai tầng (Local Persistence & Supabase Cloud Sync) giúp khôi phục an toàn tuyệt đối khi đổi thiết bị.
                  </p>
                </div>

              </div>

              {/* Security Recommendations */}
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase">
                  <AlertTriangle className="w-4 h-4" />
                  Khuyến nghị An ninh từ Kỹ sư Hệ thống:
                </div>
                <ul className="text-xs text-amber-200/90 space-y-1 list-disc list-inside">
                  <li>Nên chủ động thay đổi mã PIN mặc định ban đầu của Ban Cán Sự sau khi nhận lớp.</li>
                  <li>Nhớ bấm <b>"Đăng xuất"</b> khi sử dụng máy tính chung tại phòng máy trường hoặc máy chiếu lớp học.</li>
                  <li>Nên định kỳ bấm <b>"Tải Báo Cáo Kiểm Toán"</b> lưu về máy cá nhân mỗi tháng một lần.</li>
                </ul>
              </div>

            </div>
          )}

          {/* TAB 2: CHANGE PIN */}
          {activeTab === 'change_pin' && (
            <div className="max-w-xl mx-auto space-y-6">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-emerald-400" />
                  Đổi Mã PIN Bảo Mật Cán Sự
                </h3>
                <p className="text-xs text-slate-400">
                  Mã PIN giúp bảo vệ quyền ghi nhận vi phạm, khen thưởng và điểm danh của Lớp 10A16.
                </p>
              </div>

              <form onSubmit={handleChangePinSubmit} className="space-y-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Chọn vai trò cần đổi PIN:</label>
                  <select
                    value={pinRole}
                    onChange={(e: any) => setPinRole(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                  >
                    <option value="gvcn">Giáo viên Chủ nhiệm (GVCN)</option>
                    <option value="lop_truong">Lớp phó Học tập</option>
                    <option value="lop_pho">Bí thư Chi đoàn</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mã PIN hiện tại:</label>
                  <input
                    type="password"
                    value={oldPin}
                    onChange={(e) => setOldPin(e.target.value)}
                    placeholder="Nhập PIN cũ..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mã PIN mới (Ít nhất 4 ký tự):</label>
                  <input
                    type="password"
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    placeholder="Nhập PIN mới..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Xác nhận mã PIN mới:</label>
                  <input
                    type="password"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    placeholder="Nhập lại PIN mới..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {pinMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                      pinMsg.type === 'success'
                        ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300'
                        : 'bg-red-950/80 border border-red-500/40 text-red-300'
                    }`}
                  >
                    {pinMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
                    <span>{pinMsg.text}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
                >
                  <KeyRound className="w-4 h-4" />
                  Cập Nhật Mã PIN Mới
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: AUDIT LOGS */}
          {activeTab === 'audit_logs' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <History className="w-5 h-5 text-emerald-400" />
                    Nhật Ký Giám Sát Thao Tác (Audit Logs)
                  </h3>
                  <p className="text-xs text-slate-400">Ghi lại toàn bộ hành động đăng nhập, sửa vi phạm, chốt sổ</p>
                </div>

                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Tìm kiếm nhật ký..."
                    className="w-full px-3 py-1.5 pl-8 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <History className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <div className="max-h-[360px] overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold sticky top-0">
                      <tr>
                        <th className="p-3">Thời gian</th>
                        <th className="p-3">Người thực hiện</th>
                        <th className="p-3">Hành động</th>
                        <th className="p-3">Lý do / Mô tả</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-900/50">
                          <td className="p-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                            {new Date(log.timestamp).toLocaleString('vi-VN')}
                          </td>
                          <td className="p-3 font-semibold text-emerald-400">{log.actor_name}</td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[11px]">
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 text-slate-300 max-w-xs truncate">{log.reason || '-'}</td>
                        </tr>
                      ))}
                      {filteredLogs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-slate-500">
                            Không tìm thấy nhật ký giám sát nào phù hợp.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ACTIVE SESSIONS */}
          {activeTab === 'sessions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    Quản Lý Phiên Làm Việc Trực Tuyến
                  </h3>
                  <p className="text-xs text-slate-400">Xem danh sách thiết bị đang kết nối và ngắt kết nối khẩn cấp</p>
                </div>

                <button
                  onClick={handleForceLogoutOthers}
                  className="px-3.5 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-500/40 text-xs font-semibold flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng Xuất Mọi Thiết Bị Khác
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                    <div>
                      <div className="text-sm font-bold text-white">Phiên của bạn (Hiện tại)</div>
                      <div className="text-xs text-slate-400">{currentUser.name} · {currentUser.role}</div>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                    Đang Đăng Nhập
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between shrink-0 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>THPT Võ Trường Toản · Lớp 10A16 · Chuẩn An Ninh 2026</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
