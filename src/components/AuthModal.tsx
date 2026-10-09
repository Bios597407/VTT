import React, { useState } from 'react';
import { appState } from '../services/appStateService';
import {
  ShieldCheck,
  Mail,
  KeyRound,
  Lock,
  LogOut,
  X,
  CheckCircle2,
  AlertCircle,
  Eye,
  School,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  promptMessage?: string | null;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<Props> = ({ isOpen, onClose, promptMessage, onSuccess }) => {
  const currentUser = appState.currentUser;
  const classInfo = appState.classInfo;

  // Primary Login Tab: 'pin' (khuyên dùng nhanh & bảo mật) | 'gmail'
  const [activeLoginTab, setActiveLoginTab] = useState<'pin' | 'gmail'>('pin');

  // Gmail form state
  const [gmailInput, setGmailInput] = useState('');

  // PIN form state
  const officerAccounts = appState.officerAccounts;
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    officerAccounts.find((a) => a.role === 'gvcn')?.id || officerAccounts[0]?.id || 'acc-gvcn-user'
  );
  const selectedOfficer = officerAccounts.find((a) => a.id === selectedAccountId) || officerAccounts[0];
  const [pinInput, setPinInput] = useState('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [restrictionNotice, setRestrictionNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerifyGmail = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setRestrictionNotice(null);

    const clean = gmailInput.trim().toLowerCase();
    if (!clean) {
      setErrorMessage('Vui lòng nhập địa chỉ Gmail.');
      return;
    }

    const res = appState.authenticateWithGmail(clean);
    if (res.success) {
      if (onSuccess) onSuccess();
      onClose();
    } else {
      if (res.isRestricted) {
        setRestrictionNotice(res.message);
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 1800);
      } else {
        setErrorMessage(res.message);
      }
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setRestrictionNotice(null);

    if (!pinInput.trim()) {
      setErrorMessage('Vui lòng nhập mã PIN bảo mật.');
      return;
    }

    const res = appState.authenticateWithPin(selectedAccountId, pinInput);
    if (res.success) {
      setPinInput('');
      if (onSuccess) onSuccess();
      onClose();
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleContinueAsGuestStudent = () => {
    appState.setLoggedInRole('hoc_sinh');
    appState.showToast(
      'Bạn đang ở Chế độ Học sinh (Chỉ xem) · Quyền chỉnh sửa dữ liệu được khóa an toàn.',
      'info',
      4000
    );
    onClose();
  };

  const handleLogout = () => {
    appState.logoutToStudentMode();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200 my-auto">
        {/* Top Header - Chữ to, rõ ràng, không lộ thông tin cá nhân */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white relative">
          <button
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="absolute right-4 top-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-white shadow-lg shadow-blue-500/30 shrink-0">
              <School className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/30">
                  LỚP 10A16 · 2026–2027
                </span>
                <span className="text-xs text-slate-300 hidden sm:inline">{classInfo.school_name}</span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-1">
                Xác thực Quyền Quản trị Lớp học
              </h2>
            </div>
          </div>
          <p className="text-sm text-slate-200 mt-2 leading-relaxed">
            Hệ thống bảo mật nghiêm ngặt: Chỉ Giáo viên Chủ nhiệm và Ban Cán sự Lớp 10A16 mới có quyền điều chỉnh dữ liệu. Học sinh và phụ huynh ở Chế độ Chỉ xem an toàn.
          </p>
        </div>

        {/* Trạng thái hiện tại - Chữ to rõ ràng */}
        <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 truncate pr-2">
            <span className="text-slate-500 shrink-0 font-medium">Hiện tại:</span>
            <span className="font-extrabold text-slate-900 flex items-center gap-2 truncate">
              <span
                className={`w-3 h-3 rounded-full shrink-0 ${
                  currentUser.role === 'gvcn'
                    ? 'bg-emerald-500'
                    : currentUser.role === 'lop_truong' || currentUser.role === 'lop_pho'
                    ? 'bg-blue-500'
                    : 'bg-amber-500'
                }`}
              />
              <span className="truncate">{currentUser.name}</span>
            </span>
          </div>

          {currentUser.isAuthenticatedOfficer ? (
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200 transition flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Khóa lại</span>
            </button>
          ) : (
            <span className="text-xs font-extrabold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg shrink-0">
              Chỉ xem (Bị hạn chế)
            </span>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {promptMessage && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 text-sm flex items-center gap-2.5 shadow-xs">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <span className="font-bold">{promptMessage}</span>
            </div>
          )}

          {restrictionNotice && (
            <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-rose-950 text-sm flex items-start gap-3 shadow-xs animate-in fade-in duration-200">
              <ShieldAlert className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-black text-rose-950 text-base">Đã kích hoạt chế độ hạn chế quyền!</div>
                <div className="mt-1 leading-relaxed text-sm">{restrictionNotice}</div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          {/* Tab Switcher: PIN Cán sự vs Gmail (Chữ to, dễ nhấn) */}
          <div className="flex border border-slate-200 rounded-2xl p-1 bg-slate-100 text-sm font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveLoginTab('pin');
                setErrorMessage(null);
                setRestrictionNotice(null);
              }}
              className={`flex-1 py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
                activeLoginTab === 'pin'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-4 h-4 text-blue-600" />
              <span>1. Mã PIN Cán sự (Nhanh nhất)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveLoginTab('gmail');
                setErrorMessage(null);
                setRestrictionNotice(null);
              }}
              className={`flex-1 py-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
                activeLoginTab === 'gmail'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-4 h-4 text-slate-500" />
              <span>2. Đăng nhập Gmail</span>
            </button>
          </div>

          {/* TAB 1: PIN AUTHENTICATION (BẢO MẬT & CHỮ TO RÕ RÀNG) */}
          {activeLoginTab === 'pin' && (
            <form onSubmit={handleVerifyPin} className="space-y-4 pt-1">
              <div>
                <label className="block font-bold text-slate-900 text-sm mb-2">
                  Chọn chức danh cán sự cần mở khóa ({officerAccounts.length} cán bộ):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {officerAccounts.map((acc) => {
                    const isSelected = selectedAccountId === acc.id;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setSelectedAccountId(acc.id)}
                        className={`p-3 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 text-blue-950 shadow-xs ring-2 ring-blue-500/30'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-black text-xs truncate">{acc.title}</span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                              acc.role === 'gvcn'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {acc.badge || (acc.role === 'gvcn' ? 'Toàn quyền' : 'Ban Cán Sự')}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                          {acc.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-900 text-sm mb-2">
                  Nhập Mã PIN bảo mật của {selectedOfficer ? `[${selectedOfficer.title} - ${selectedOfficer.name}]` : 'Cán sự'}:
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    autoFocus
                    placeholder={selectedOfficer ? `Mã PIN của ${selectedOfficer.name}...` : 'Nhập mã PIN...'}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 border-2 rounded-xl border-slate-300 font-mono text-base tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden bg-white text-slate-900"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  Mã PIN bảo mật nội bộ do GVCN quản lý, bảo vệ an toàn dữ liệu và quyền điều hành lớp.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-base rounded-xl shadow-md shadow-blue-600/20 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Xác nhận Mã PIN & Mở khóa Quyền</span>
              </button>
            </form>
          )}

          {/* TAB 2: GMAIL AUTHENTICATION (KHÔNG LỘ BẤT KỲ EMAIL HAY THÔNG TIN CÁ NHÂN NÀO) */}
          {activeLoginTab === 'gmail' && (
            <form onSubmit={handleVerifyGmail} className="space-y-4 pt-1">
              <div>
                <label className="block font-bold text-slate-900 text-sm mb-2">
                  Nhập địa chỉ Gmail để kiểm soát quyền:
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="Nhập địa chỉ Gmail cán bộ hoặc giáo viên..."
                    value={gmailInput}
                    onChange={(e) => setGmailInput(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 border-2 rounded-xl border-slate-300 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden bg-white text-slate-900"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1.5">
                  Hệ thống tự động đối chiếu danh sách cán sự được GVCN cấp phép để kích hoạt quyền.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-base rounded-xl shadow-md shadow-blue-600/20 transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Xác thực Phân quyền Gmail</span>
              </button>
            </form>
          )}

          {/* Nút vào xem an toàn cho Học sinh / Phụ huynh */}
          <div className="pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleContinueAsGuestStudent}
              className="w-full py-3 px-4 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-sm transition flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Eye className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Vào với tư cách Học sinh / Phụ huynh (Chế độ Chỉ xem)</span>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-700 shrink-0" />
            </button>
          </div>
        </div>

        {/* Footer info - Chữ to rõ ràng */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-slate-400" />
            Bảo mật phân quyền theo QĐ 525/QĐ-THPT.VTT
          </span>
          <span className="font-bold text-slate-700">Lớp 10A16</span>
        </div>
      </div>
    </div>
  );
};
