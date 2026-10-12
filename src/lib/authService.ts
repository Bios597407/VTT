import { supabase } from './supabaseClient';

export type AppRole = 'gvcn' | 'lop_truong' | 'lop_pho' | 'to_truong' | 'hoc_sinh';

export interface AppProfile {
  user_id: string;
  email: string;
  display_name: string | null;
  role: AppRole;
  title: string | null;
  student_id: string | null;
  can_manage: boolean;
}

export type SignInResult =
  | { ok: true; profile: AppProfile }
  | { ok: false; message: string };

/**
 * Đọc hồ sơ quyền của người đang đăng nhập từ bảng app_users.
 * RLS chỉ cho phép đọc dòng của chính mình (GVCN đọc được tất cả).
 * Vai trò do máy chủ quyết định, không lưu trong localStorage.
 */
async function loadProfile(userId: string): Promise<AppProfile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('app_users')
    .select('user_id, email, display_name, role, title, student_id, can_manage')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as AppProfile;
}

export async function getSessionProfile(): Promise<AppProfile | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;
  const profile = await loadProfile(user.id);
  if (!profile) {
    // Có phiên Supabase nhưng chưa được cấp quyền trong lớp → đăng xuất luôn
    await supabase.auth.signOut();
    return null;
  }
  return profile;
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  if (!supabase) {
    return { ok: false, message: 'Hệ thống chưa được cấu hình kết nối. Liên hệ GVCN.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  // Một thông báo chung cho mọi lỗi đăng nhập, không tiết lộ email nào tồn tại
  if (error || !data.user) {
    return { ok: false, message: 'Email hoặc mật khẩu không đúng. Kiểm tra lại và thử lần nữa.' };
  }

  const profile = await loadProfile(data.user.id);
  if (!profile) {
    await supabase.auth.signOut();
    return {
      ok: false,
      message: 'Tài khoản này chưa được cấp quyền vào lớp. Nhờ GVCN thêm tài khoản của bạn.',
    };
  }
  return { ok: true, profile };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

/** Gọi callback khi phiên bị đăng xuất (hết hạn, đăng xuất ở tab khác...). */
export function onSignedOut(callback: () => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') callback();
  });
  return () => data.subscription.unsubscribe();
}
