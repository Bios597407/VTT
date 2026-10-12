import React, { useEffect, useRef, useState } from 'react';
import { Loader2, LogIn, ShieldAlert } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { AppProfile, getSessionProfile, onSignedOut, signIn } from '../lib/authService';
import { appState } from '../services/appStateService';

type Phase = 'checking' | 'login' | 'loading-data' | 'ready' | 'misconfigured';

/**
 * Bao ngoài toàn bộ ứng dụng. Chưa đăng nhập thì KHÔNG hiển thị gì của lớp
 * và KHÔNG tải dữ liệu nào từ máy chủ. Cách dùng (main.tsx):
 *
 *   <LoginGate><App /></LoginGate>
 */
export const LoginGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [phase, setPhase] = useState<Phase>(isSupabaseConfigured ? 'checking' : 'misconfigured');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const startedFor = useRef<string | null>(null);

  const begin = async (profile: AppProfile) => {
    if (startedFor.current === profile.user_id) return;
    startedFor.current = profile.user_id;
    setPhase('loading-data');
    await appState.startAuthenticatedSession(profile);
    setPhase('ready');
  };

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let cancelled = false;
    getSessionProfile().then((profile) => {
      if (cancelled) return;
      if (profile) void begin(profile);
      else setPhase('login');
    });

    // Phiên hết hạn hoặc đăng xuất ở tab khác: xóa bộ nhớ đệm và tải lại trang
    const off = onSignedOut(() => {
      appState.wipeLocalCacheIfSynced();
      window.location.reload();
    });

    return () => {
      cancelled = true;
      off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    setPassword('');
    if (!result.ok) {
      setError(result.message);
      return;
    }
    void begin(result.profile);
  };

  if (phase === 'ready') return <>{children}</>;

  if (phase === 'misconfigured') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div role="alert" className="max-w-md w-full bg-white border border-rose-200 rounded-2xl p-6 space-y-2">
          <div className="flex items-center gap-2 text-rose-700 font-bold">
            <ShieldAlert className="w-5 h-5" />
            Chưa cấu hình kết nối dữ liệu
          </div>
          <p className="text-sm text-slate-600">
            Thiếu <code>VITE_SUPABASE_URL</code> hoặc <code>VITE_SUPABASE_ANON_KEY</code>. Thêm hai biến
            này trong Vercel (Settings → Environment Variables) rồi triển khai lại.
          </p>
        </div>
      </div>
    );
  }

  if (phase === 'checking' || phase === 'loading-data') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-slate-600 text-sm" role="status">
          <Loader2 className="w-4 h-4 animate-spin" />
          {phase === 'checking' ? 'Đang kiểm tra phiên đăng nhập…' : 'Đang tải dữ liệu lớp…'}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4"
        aria-labelledby="login-title"
      >
        <div>
          <h1 id="login-title" className="text-lg font-black text-slate-900 tracking-tight">
            Nề nếp lớp 10A16
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Đăng nhập bằng tài khoản do GVCN cấp để xem và ghi nhận nề nếp.
          </p>
        </div>

        <div className="space-y-1">
          <label htmlFor="login-email" className="block text-sm font-semibold text-slate-700">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          />
        </div>

        <div className="space-y-1">
          <label htmlFor="login-password" className="block text-sm font-semibold text-slate-700">
            Mật khẩu
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm font-bold rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
          Đăng nhập
        </button>
      </form>
    </div>
  );
};
