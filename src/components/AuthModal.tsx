import React, { useState } from 'react';
import { appState } from '../services/appStateService';
import { signIn } from '../lib/authService';
import {
  Lock,
  LogOut,
  X,
  AlertCircle,
  Eye,
  School,
  ArrowRight,
  ShieldCheck,
  Mail,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  promptMessage?: string | null;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<Props> = ({
  isOpen,
  onClose,
  promptMessage,
  onSuccess,
}) => {
  const currentUser = appState.currentUser;
  const classInfo = appState.classInfo;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('Email hoặc mật khẩu không đúng');
      return;
    }

    setIsLoggingIn(true);
    try {
      const res = await signIn(cleanEmail, cleanPassword);
      setIsLoggingIn(false);
      if (res.ok) {
        appState.setLoggedInProfile(res.profile);
        appState.showToast(
          `Đã đăng nhập thành công (${res.profile.display_name || cleanEmail})`,
          'success'
        );
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setErrorMessage('Email hoặc mật khẩu không đúng');
      }
    } catch {
      setIsLoggingIn(false);
      setErrorMessage('Email hoặc mật khẩu không đúng');
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

  const isSubmitDisabled = isLoggingIn || !email.trim() || !password.trim();

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
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
                Đăng nhập Cán sự / Quản trị
              </h2>
            </div>
          </div>
          <p className="text-sm text-slate-200 mt-2 leading-relaxed">
            Nhập email và mật khẩu cán sự để đăng nhập hệ thống quản lý nề nếp.
          </p>
        </div>

        {/* Trạng thái hiện tại */}
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

          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold">{errorMessage}</span>
            </div>
          )}

          {/* Form Đăng nhập Email & Mật khẩu */}
          <form onSubmit={handleSignIn} className="space-y-4 pt-1">
            <div>
              <label className="block font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-blue-600" />
                <span>Địa chỉ Email:</span>
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="nhap.email@truong.edu.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 border-2 rounded-xl border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden bg-white text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-900 text-sm mb-2 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-blue-600" />
                <span>Mật khẩu:</span>
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 border-2 rounded-xl border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-hidden bg-white text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 disabled:text-slate-500 text-white font-black text-base rounded-xl shadow-md shadow-blue-600/20 transition active:scale-95 cursor-pointer disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5" />
              <span>{isLoggingIn ? 'Đang đăng nhập...' : 'Đăng nhập Cán sự'}</span>
            </button>
          </form>

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

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-slate-400" />
            Bảo mật phân quyền hệ thống VTT
          </span>
          <span className="font-bold text-slate-700">Lớp 10A16</span>
        </div>
      </div>
    </div>
  );
};
