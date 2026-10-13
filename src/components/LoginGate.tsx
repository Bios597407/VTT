import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabaseClient';
import { getSessionProfile, onSignedOut } from '../lib/authService';
import { appState } from '../services/appStateService';

/**
 * KHÔNG chặn người xem.
 *  - Chưa đăng nhập: mở app ở CHẾ ĐỘ XEM (chỉ đọc). Ai có đường dẫn cũng xem được.
 *  - Cán sự đăng nhập bằng email + mật khẩu (nút đăng nhập sẵn có của app, AuthModal):
 *    chỉ khi đó mới có quyền chỉnh sửa. Quyền được máy chủ kiểm tra, không chỉ giao diện.
 *  - Nếu đã có phiên đăng nhập hợp lệ (tải lại trang), tự khôi phục quyền cán sự.
 *
 * Cách dùng (main.tsx):  <LoginGate><App /></LoginGate>
 */
export const LoginGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        const profile = isSupabaseConfigured ? await getSessionProfile() : null;
        if (profile) {
          await appState.startAuthenticatedSession(profile); // cán sự: có quyền sửa
        } else {
          await appState.initSupabaseData(); // người xem: chỉ đọc
        }
      } catch (e) {
        console.error('Lỗi khởi tạo phiên:', e);
      } finally {
        setReady(true);
      }
    })();

    // Đăng xuất (hoặc phiên hết hạn): về chế độ xem
    const off = onSignedOut(() => {
      appState.wipeLocalCacheIfSynced();
      window.location.reload();
    });
    return () => off();
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-slate-600 text-sm" role="status">
          <Loader2 className="w-4 h-4 animate-spin" />
          Đang tải dữ liệu lớp…
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
