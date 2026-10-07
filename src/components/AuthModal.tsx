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

  // Primary Login Tab: 'gmail' | 'pin'
  const [activeLoginTab, setActiveLoginTab] = useState<'gmail' | 'pin'>('gmail');

  // Gmail form state
  const [gmailInput, setGmailInput] = useState('');

  // PIN form state
  const [pinRole, setPinRole] = useState<'gvcn' | 'lop_truong' | 'lop_pho'>('gvcn');
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
      // Tài khoản GVCN hoặc Cán sự hợp lệ
      if (onSuccess) onSuccess();
      onClose();
    } else {
      if (res.isRestricted) {
        // Tài khoản khác -> Đã bị hạn chế về chế độ Học sinh
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

    const res = appState.authenticateWithPin(pinRole, pinInput);
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
      'Bạn đang ở Chế độ Học sinh (Chỉ xem) · Toàn bộ quyền chỉnh sửa dữ liệu đã bị khóa bảo vệ.',
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
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200 my-auto">
        {/* Top Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white relative">
          <button
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="absolute right-4 top-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-blue-500/30 shrink-0">
              <School className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/30">
                  LỚP 10A16 · 2026–2027
                </span>
                <span className="text-[11px] text-slate-300 hidden sm:inline">THPT Võ Trường Toản</span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight mt-1">
                Kiểm soát Quyền & Đăng nhập Hệ thống
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-300 mt-2 leading-relaxed">
            Phân quyền nghiêm ngặt: Chỉ GVCN (<strong>{classInfo.gvcn_email}</strong>) và Ban Cán sự mới có quyền điều chỉnh. Mọi tài khoản khác đều bị hạn chế ở chế độ Chỉ xem.
          </p>
        </div>

        {/* Current Active Status Indicator */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate pr-2">
            <span className="text-slate-500 shrink-0">Hiện tại:</span>
            <span className="font-extrabold text-slate-900 flex items-center gap-1.5 truncate">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
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
              className="text-[11px] font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition flex items-center gap-1 cursor-pointer shrink-0"
            >
              <LogOut className="w-3 h-3" />
              <span>Khóa lại</span>
            </button>
          ) : (
            <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md shrink-0">
              Chỉ xem (Bị hạn chế)
            </span>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {promptMessage && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-center gap-2 shadow-xs">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-bold">{promptMessage}</span>
            </div>
          )}

          {restrictionNotice && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 text-xs flex items-start gap-2.5 shadow-xs animate-in fade-in duration-200">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-black text-rose-950">Đã kích hoạt chế độ hạn chế quyền!</div>
                <div className="mt-0.5 leading-relaxed">{restrictionNotice}</div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Tab Switcher: Gmail vs PIN */}
          <div className="flex border border-slate-200 rounded-2xl p-1 bg-slate-100 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveLoginTab('gmail');
                setErrorMessage(null);
                setRestrictionNotice(null);
              }}
              className={`flex-1 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
                activeLoginTab === 'gmail'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>1. Đăng nhập bằng Gmail (Khuyên dùng)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveLoginTab('pin');
                setErrorMessage(null);
                setRestrictionNotice(null);
              }}
              className={`flex-1 py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${
                activeLoginTab === 'pin'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>2. Mã PIN Cán sự (Nội bộ)</span>
            </button>
          </div>

          {/* TAB 1: GMAIL AUTHENTICATION */}
          {activeLoginTab === 'gmail' && (
            <form onSubmit={handleVerifyGmail} className="space-y-4 text-xs pt-1">
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Nhập địa chỉ Gmail để kiểm soát quyền:
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="Nhập email của bạn (VD: nouvo4344@gmail.com hoặc email học sinh...)"
                    value={gmailInput}
                    onChange={(e) => setGmailInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border rounded-xl border-slate-300 font-mono text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                  <span>Chọn nhanh tài khoản kiểm tra phân quyền:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setGmailInput('nouvo4344@gmail.com')}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                  >
                    <span>GVCN: nouvo4344@gmail.com</span>
                    <span className="text-[10px] px-1 bg-emerald-700 text-white rounded">Toàn quyền</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setGmailInput('hocsinh.test@gmail.com')}
                    className="px-2.5 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-950 font-bold text-[11px] transition cursor-pointer flex items-center gap-1"
                  >
                    <span>Tài khoản khác (Học sinh)</span>
                    <span className="text-[10px] px-1 bg-amber-700 text-white rounded">Bị hạn chế</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed space-y-1">
                <div className="font-bold flex items-center gap-1 text-blue-950">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                  Nguyên tắc kiểm soát phân quyền tự động:
                </div>
                <div>• <strong>nouvo4344@gmail.com</strong>: Kích hoạt toàn quyền Giáo viên Chủ nhiệm (Sửa, xóa, duyệt, khóa kỳ, cài đặt).</div>
                <div>• <strong>Tài khoản khác</strong>: Tự động bị hạn chế về Chế độ Học sinh (Chỉ xem, khóa hoàn toàn quyền sửa).</div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác thực Phân quyền Gmail</span>
              </button>
            </form>
          )}

          {/* TAB 2: PIN AUTHENTICATION */}
          {activeLoginTab === 'pin' && (
            <form onSubmit={handleVerifyPin} className="space-y-4 text-xs pt-1">
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Chọn chức danh cán sự:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPinRole('gvcn')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                      pinRole === 'gvcn'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="truncate">{classInfo.gvcn_name.split(' ').slice(-2).join(' ') || 'GVCN'}</div>
                    <div className="text-[10px] opacity-75 font-normal">(GVCN)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPinRole('lop_truong')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                      pinRole === 'lop_truong'
                        ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="truncate">{classInfo.class_president_name.split(' ').slice(-2).join(' ') || 'Lớp trưởng'}</div>
                    <div className="text-[10px] opacity-75 font-normal">(Lớp trưởng)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPinRole('lop_pho')}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                      pinRole === 'lop_pho'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-900 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="truncate">{classInfo.class_vice_discipline_name.split(' ').slice(-2).join(' ') || 'Lớp phó'}</div>
                    <div className="text-[10px] opacity-75 font-normal">(Lớp phó)</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Nhập Mã PIN bảo mật bí mật:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    placeholder="Nhập mã PIN bí mật của cán bộ..."
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 border rounded-xl border-slate-300 font-mono text-sm tracking-widest focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Mã PIN được giáo viên chủ nhiệm cấp riêng, không công khai để chống học sinh tự tiện đổi quyền.
                </p>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Xác nhận Mã PIN & Mở khóa Quyền</span>
              </button>
            </form>
          )}

          {/* Bottom Guest Option */}
          <div className="pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleContinueAsGuestStudent}
              className="w-full py-2.5 px-4 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-950 font-bold text-xs transition flex items-center justify-between cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Vào với tư cách Học sinh / Phụ huynh (Chỉ xem)</span>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-700 shrink-0" />
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            Kiểm soát quyền theo QĐ 525/QĐ-THPT.VTT
          </span>
          <span className="font-semibold text-slate-700">Lớp 10A16</span>
        </div>
      </div>
    </div>
  );
};
