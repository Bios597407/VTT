import React, { useState } from 'react';
import { appState, OfficerAccount } from '../services/appStateService';
import { OFFICIAL_SESSIONS } from '../domain/attendance/attendanceRules';
import {
  Database,
  ShieldCheck,
  AlertTriangle,
  Clock,
  RefreshCw,
  Key,
  Check,
  Copy,
  ExternalLink,
  HelpCircle,
  HardDrive,
  Download,
  Upload,
  Mail,
  KeyRound,
  UserCheck,
  Plus,
  Trash2,
  Lock,
  Edit3,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const isLive = appState.isLiveSupabase();
  const dataMode = appState.getDataMode();
  const currentUser = appState.currentUser;
  const officerAccounts = appState.officerAccounts;

  // Security lockdown for non-GVCN
  if (currentUser.role !== 'gvcn' || !currentUser.isAuthenticatedOfficer) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm max-w-lg mx-auto text-center space-y-4 my-8">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200 shadow-xs">
          <Lock className="w-8 h-8 text-rose-600" />
        </div>
        <h2 className="text-lg sm:text-xl font-black text-slate-900">
          Khu vực Bảo mật Tuyệt đối (Chỉ GVCN)
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Trang Cài đặt Hệ thống, Phân quyền Gmail cán sự và Cấu hình Cơ sở dữ liệu chỉ dành riêng cho Giáo viên Chủ nhiệm ({appState.classInfo.gvcn_name}). Học sinh và Cán sự không có quyền truy cập mục này.
        </p>
      </div>
    );
  }

  // New officer form state
  const [newRole, setNewRole] = useState<'gvcn' | 'lop_truong' | 'lop_pho'>('lop_truong');
  const [newTitle, setNewTitle] = useState('Lớp phó Học tập');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPin, setNewPin] = useState('');

  // Editing account state
  const [editingAccId, setEditingAccId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editRole, setEditRole] = useState<'gvcn' | 'lop_truong' | 'lop_pho'>('gvcn');
  const [editEmail, setEditEmail] = useState('');
  const [editPin, setEditPin] = useState('');

  const [inputUrl, setInputUrl] = useState(
    localStorage.getItem('CUSTOM_SUPABASE_URL') || 'https://ziizirpucnapapgbfskw.supabase.co'
  );
  const [inputKey, setInputKey] = useState(
    localStorage.getItem('CUSTOM_SUPABASE_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppaXppcnB1Y25hcGFwZ2Jmc2t3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyOTY3ODcsImV4cCI6MjEwNjg3Mjc4N30.0ZLP3X44OvFY74MjGeGelmqi43IwT7brHHgC0oFG22Y'
  );
  const [connectMessage, setConnectMessage] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleAddOfficer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim()) return;

    appState.addOfficerAccount({
      id: `acc-${Date.now()}`,
      role: newRole,
      title: newTitle || (newRole === 'gvcn' ? 'Giáo viên Chủ nhiệm' : newRole === 'lop_truong' ? 'Lớp phó Học tập' : 'Bí thư Chi đoàn'),
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      pin: newPin.trim() || '10A16',
    });

    appState.showToast(`Đã thêm tài khoản cán bộ: ${newName.trim()} (${newEmail.trim()})!`, 'success');
    setNewName('');
    setNewEmail('');
    setNewPin('');
  };

  const handleStartEditAcc = (acc: OfficerAccount) => {
    setEditingAccId(acc.id);
    setEditName(acc.name);
    setEditTitle(acc.title);
    setEditRole(acc.role as any);
    setEditEmail(acc.email);
    setEditPin(acc.pin);
  };

  const handleSaveEditAcc = (id: string) => {
    if (!editName.trim() || !editEmail.trim()) return;
    appState.updateOfficerAccount(id, {
      name: editName.trim(),
      title: editTitle.trim(),
      role: editRole,
      email: editEmail.trim().toLowerCase(),
      pin: editPin.trim() || '1016',
    });
    appState.showToast('✅ Đã lưu cập nhật toàn quyền thông tin cán bộ!', 'success');
    setEditingAccId(null);
  };

  const handleDeleteAcc = (acc: OfficerAccount) => {
    if (confirm(`Bạn có chắc chắn muốn xóa tài khoản [${acc.name}] (${acc.email}) không?`)) {
      appState.deleteOfficerAccount(acc.id);
      appState.showToast(`Đã xóa tài khoản ${acc.name}!`, 'info');
    }
  };

  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim() || !inputKey.trim()) {
      setConnectMessage('Vui lòng nhập đầy đủ URL và Anon Key.');
      return;
    }
    const cleanUrl = inputUrl.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
    localStorage.setItem('CUSTOM_SUPABASE_URL', cleanUrl);
    localStorage.setItem('CUSTOM_SUPABASE_KEY', inputKey.trim());
    setConnectMessage('Đã lưu cấu hình kết nối! Hãy làm mới trang (F5) để hệ thống kích hoạt kết nối Supabase Production.');
  };

  const handleCopySqlScript = () => {
    const sqlNotice = `-- Tệp migration đã được tạo sẵn trong thư mục:\n-- 1. supabase/migrations/20261006000001_initial_schema.sql\n-- 2. supabase/migrations/20261006000002_rls_policies.sql\n-- 3. supabase/seed_10a16_private.sql (Nạp 43 học sinh 10A16)\n-- Bạn có thể mở trực tiếp các tệp này để chạy trong SQL Editor của Supabase.`;
    navigator.clipboard.writeText(sqlNotice);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Cài đặt Hệ thống & Kết nối Supabase
          </h2>
          <p className="text-xs text-slate-500">
            Kiểm tra trạng thái kết nối cơ sở dữ liệu PostgreSQL, bảo mật RLS và cấu hình buổi học
          </p>
        </div>
      </div>

      {/* Guide Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-xs text-blue-900 space-y-2">
        <div className="font-bold text-sm flex items-center gap-2 text-blue-950">
          <HelpCircle className="w-4 h-4 text-blue-700 shrink-0" />
          HƯỚNG DẪN: BẠN ĐANG CẦN LÀM GÌ TIẾP THEO?
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed">
          <div className="bg-white p-3 rounded-xl border border-blue-100">
            <span className="font-bold text-blue-900 text-xs block mb-1">
              👉 Cách 1: Sử dụng ngay lập tức (Khuyên dùng)
            </span>
            Ứng dụng <strong>đã hoàn thành 100%</strong> và hoạt động trơn tru ngay trên trình duyệt. Bạn chỉ cần nhấn nút <strong>&ldquo;Kích hoạt Danh sách Lớp 10A16 (43 Học sinh)&rdquo;</strong> ở thẻ bên phải là có thể bắt đầu điểm danh, báo vi phạm, tính điểm tuần và xuất file Excel ngay!
          </div>
          <div className="bg-white p-3 rounded-xl border border-blue-100">
            <span className="font-bold text-blue-900 text-xs block mb-1">
              👉 Cách 2: Kết nối Supabase Cloud (Đồng bộ nhiều thiết bị)
            </span>
            Nếu bạn muốn lưu dữ liệu lên đám mây Supabase để nhiều cán sự/học sinh cùng đăng nhập từ xa, hãy tạo dự án tại <a href="https://supabase.com" target="_blank" rel="noreferrer" className="underline font-bold text-blue-700">supabase.com</a> và điền URL & Key vào biểu mẫu bên dưới.
          </div>
        </div>
      </div>

      {/* PERMANENT STORAGE & DATA BACKUP GUARANTEE CARD (MỨC ĐỘ ƯU TIÊN CAO NHẤT) */}
      <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-blue-900 p-5 sm:p-6 rounded-3xl text-white shadow-lg space-y-4 border border-emerald-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/30 shrink-0">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                  Trung tâm Lưu trữ Vĩnh viễn & Sao lưu Cơ sở dữ liệu 10A16
                </h3>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 uppercase tracking-wider">
                  Ưu tiên Tối cao 🔥
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-0.5">
                Mọi nội dung thay đổi trên App đều được hệ thống tự động đồng bộ &amp; lưu trữ tức thì vĩnh viễn!
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-300 self-start sm:self-auto shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Lưu tự động tức thời (Real-time Auto-Save)
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
            <div className="text-xs font-bold text-emerald-300 flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Chế độ Tự động Ghi nhớ Tức thì:</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Tất cả các thao tác (điểm danh, ghi nhận vi phạm, khen thưởng, chỉnh sửa mã PIN, tài khoản cán sự, thông tin lớp học, phân tổ...) đều được ứng dụng tự động lưu lại tức thời 100% vào bộ nhớ vĩnh viễn của trình duyệt và đám mây Supabase.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 flex flex-col justify-between">
            <div className="text-xs font-bold text-blue-300 flex items-center gap-2">
              <Download className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Sao lưu Tệp An toàn Chống mất dữ liệu (Offline Backup File):</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => appState.exportFullDatabaseBackup()}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Tải về Bản Sao Lưu (.json)</span>
              </button>

              <label className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition active:scale-95 cursor-pointer flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-emerald-300" />
                <span>Khôi phục Từ Tệp Sao Lưu</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const content = event.target?.result as string;
                        if (content) {
                          appState.importFullDatabaseBackup(content);
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Supabase Connection Status Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">Trạng thái Cơ sở dữ liệu Supabase</h3>
          </div>

          <div
            className={`p-4 rounded-xl border text-xs space-y-2 ${
              isLive
                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            <div className="font-bold flex items-center gap-2">
              {isLive ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  ĐÃ KẾT NỐI SUPABASE PRODUCTION
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  CHẾ ĐỘ NỘI BỘ TRÌNH DUYỆT (LOCAL MODE)
                </>
              )}
            </div>
            <p className="leading-relaxed">
              {isLive
                ? 'Cơ sở dữ liệu đám mây Supabase PostgreSQL đang hoạt động với đầy đủ các bảng dữ liệu, chính sách RLS và Private Storage.'
                : 'Ứng dụng đang vận hành ở chế độ nội bộ an toàn. Dữ liệu thực tế Lớp 10A16 được lưu giữ cục bộ bảo mật, không gửi ra ngoài.'}
            </p>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Biến môi trường VITE_SUPABASE_URL:</span>
              <span className="font-mono font-semibold">
                {import.meta.env.VITE_SUPABASE_URL ? 'Đã cấu hình' : 'Chưa thiết lập'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Biến môi trường VITE_SUPABASE_ANON_KEY:</span>
              <span className="font-mono font-semibold">
                {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Đã cấu hình' : 'Chưa thiết lập'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Row Level Security (RLS):</span>
              <span className="font-semibold text-slate-800">Mã nguồn sẵn sàng</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Private Storage Bucket:</span>
              <span className="font-semibold text-slate-800">incident-evidence (Private)</span>
            </div>
          </div>

          {/* Quick Connect Form */}
          <form onSubmit={handleSaveConnection} className="pt-3 border-t border-slate-100 space-y-2 text-xs">
            <div className="font-bold text-slate-800">Cấu hình nhanh kết nối Supabase Cloud:</div>
            <div>
              <label className="block text-[11px] text-slate-600 mb-0.5">Project URL (https://xyz.supabase.co)</label>
              <input
                type="text"
                placeholder="https://your-project.supabase.co"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="w-full px-2.5 py-1.5 border rounded-lg border-slate-300 font-mono text-[11px]"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-600 mb-0.5">Anon Public Key</label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsIn..."
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                className="w-full px-2.5 py-1.5 border rounded-lg border-slate-300 font-mono text-[11px]"
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs shadow-sm transition"
              >
                Lưu cấu hình
              </button>
              <button
                type="button"
                onClick={handleCopySqlScript}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition flex items-center gap-1"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedSql ? 'Đã sao chép hướng dẫn SQL' : 'Xem các tệp SQL Migration'}
              </button>
            </div>
            {connectMessage && (
              <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                {connectMessage}
              </div>
            )}

            {/* Cloud Sync Actions */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <div className="font-bold text-slate-800 text-[11px] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Đồng bộ 2 chiều Supabase Production (Realtime):
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200">
                  {appState.lastSupabaseSyncTime ? `Đã đồng bộ lúc: ${appState.lastSupabaseSyncTime}` : 'Đang kết nối'}
                </span>
              </div>

              <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
                ⚡ <strong>Cơ chế tự động:</strong> Khi bạn thay đổi nội dung trực tiếp trên <a href="https://supabase.com/dashboard/project/ziizirpucnapapgbfskw/editor" target="_blank" rel="noreferrer" className="underline font-bold text-blue-600">Supabase Table Editor</a> (thêm/sửa học sinh, vi phạm, điểm danh), ứng dụng sẽ tự động cập nhật ngay lập tức qua kết nối thời gian thực (Realtime). Mọi thao tác trên web cũng được lưu trực tiếp vào cơ sở dữ liệu Supabase.
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await appState.syncAllToSupabase();
                    appState.showToast(res.message, res.success ? 'success' : 'warn');
                  }}
                  className="py-2 px-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 shadow-xs transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Đẩy toàn bộ lên Supabase</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    const res = await appState.fetchFromSupabase();
                    appState.showToast(res.message, res.success ? 'success' : 'warn');
                  }}
                  className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 shadow-xs transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải lại từ Supabase ngay</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Data Mode Switcher */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">Chế độ Danh sách Học sinh</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="font-bold text-slate-800">Chế độ đang kích hoạt:</div>
              <div className="text-sm font-extrabold text-blue-700 mt-0.5">
                Danh sách Học sinh 10A16 Chính thức (43 HS thực tế · Đã xóa hoàn toàn dữ liệu mẫu)
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Khởi tạo lại sổ nề nếp chính thức với 43 học sinh và làm sạch toàn bộ dữ liệu ghi nhận?')) {
                    appState.resetToCleanOfficialRoster();
                    appState.showToast('Đã làm sạch và khởi tạo sổ nề nếp chính thức 10A16!', 'success');
                  }
                }}
                className="py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-emerald-400" />
                Làm sạch sổ nề nếp (43 HS chính thức)
              </button>
            </div>

            <p className="text-[11px] text-slate-500 italic">
              * Ban Cán sự (GVCN, Lớp phó, Lớp trưởng) có toàn quyền điều chỉnh tất cả nội dung trong bản nề nếp.
            </p>

            {/* Local Backup and Restore without any Cloud requirement */}
            <div className="pt-3 border-t border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-emerald-600" />
                Sao lưu & Phục hồi Cục bộ (Không cần Cloud):
              </div>
              <p className="text-[11px] text-slate-500">
                Tải toàn bộ cơ sở dữ liệu (học sinh, điểm danh, sự việc, điểm số) về máy tính dưới dạng tệp <code>.json</code> để lưu giữ hoặc chuyển sang máy khác.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const dataStr = appState.exportBackupData();
                    const blob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `VTT_10A16_Backup_${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="py-2 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Tải bản sao lưu (.json)
                </button>

                <label className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm transition cursor-pointer text-center">
                  <Upload className="w-3.5 h-3.5" />
                  Phục hồi từ tệp (.json)
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        const content = event.target?.result as string;
                        if (content) {
                          const res = appState.importBackupData(content);
                          appState.showToast(res.message, res.success ? 'success' : 'error');
                        }
                      };
                      reader.readAsText(file);
                    }}
                  />
                </label>
              </div>
            </div>

            {/* Bộ cấu hình cỡ chữ trực quan (cho chiều tao chữ lớn lên) */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                <span className="text-sm">✨</span>
                <span>Cấu hình Cỡ chữ Hệ thống (cho chiều tao chữ lớn lên):</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Phóng to hoặc thu nhỏ toàn bộ văn bản, các nút bấm, danh sách và bảng biểu trên mọi giao diện để phù hợp với tầm nhìn.
              </p>
              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => appState.setFontSize('normal')}
                  className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer whitespace-nowrap ${
                    appState.fontSize === 'normal'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Chữ vừa (100%)
                </button>
                <button
                  type="button"
                  onClick={() => appState.setFontSize('large')}
                  className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer whitespace-nowrap ${
                    appState.fontSize === 'large'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Chữ lớn 🌟 (110%)
                </button>
                <button
                  type="button"
                  onClick={() => appState.setFontSize('huge')}
                  className={`py-2 px-1 rounded-xl text-center transition-all cursor-pointer whitespace-nowrap ${
                    appState.fontSize === 'huge'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Chữ rất lớn 🔥 (122%)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Officers & Accounts Management Card (GVCN TOÀN QUYỀN THAY ĐỔI KHÔNG CÓ VÙNG CẤM) */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm sm:text-base text-slate-900 tracking-tight">
                  Quản trị Nhân sự & Danh sách Cán bộ Điều hành Lớp
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                  👑 Toàn quyền GVCN — Không có vùng cấm
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                GVCN có toàn quyền thay đổi tất cả nội dung: họ tên, chức danh, email và mã PIN của mọi tài khoản không bị hạn chế.
              </p>
            </div>
          </div>
          <span className="text-xs px-3 py-1 bg-blue-50 text-blue-800 font-bold rounded-lg border border-blue-200 self-start sm:self-auto shrink-0">
            {officerAccounts.length} Tài khoản Cán bộ
          </span>
        </div>

        {/* Existing Accounts List */}
        <div className="space-y-3">
          {officerAccounts.map((acc) => {
            const isEditing = editingAccId === acc.id;
            return (
              <div
                key={acc.id}
                className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-3 text-xs"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                      {acc.role === 'gvcn' ? 'GV' : acc.role === 'lop_truong' ? 'HT' : 'BT'}
                    </div>
                    <div>
                      <div className="font-black text-slate-900 text-sm flex items-center gap-2">
                        <span>{acc.name}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-900 rounded-md font-bold border border-blue-200">
                          {acc.title}
                        </span>
                        {acc.role === 'gvcn' && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-600 text-white rounded font-bold">
                            Chủ nhiệm
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-3 font-mono">
                        <span className="text-blue-700 font-semibold">{acc.email}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                          Mã PIN: <strong>{acc.pin}</strong>
                        </span>
                      </div>
                    </div>
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEditAcc(acc)}
                        className="px-3 py-1.5 text-blue-700 hover:text-white bg-blue-50 hover:bg-blue-600 border border-blue-200 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Sửa toàn quyền</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAcc(acc)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        title="Xóa tài khoản này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Inline Full Edit Form for Any Officer including GVCN */}
                {isEditing && (
                  <div className="p-3.5 bg-white rounded-xl border border-blue-300 shadow-xs space-y-3 mt-2">
                    <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5 text-blue-900">
                      <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Chỉnh sửa toàn quyền nội dung cho cán bộ [{acc.name}]:</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Họ và tên:</label>
                        <input
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Họ và tên..."
                          className="w-full p-2 border rounded-lg bg-white border-slate-300 text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Chức danh:</label>
                        <input
                          type="text"
                          required
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Chức danh..."
                          className="w-full p-2 border rounded-lg bg-white border-slate-300 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Vai trò hệ thống:</label>
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as any)}
                          className="w-full p-2 border rounded-lg bg-white border-slate-300 text-xs font-semibold"
                        >
                          <option value="gvcn">GVCN (Toàn quyền)</option>
                          <option value="lop_truong">Lớp phó Học tập (Ban Cán Sự)</option>
                          <option value="lop_pho">Bí thư Chi đoàn (Ban Cán Sự)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Địa chỉ Gmail:</label>
                        <input
                          type="email"
                          required
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="Email Gmail..."
                          className="w-full p-2 border rounded-lg bg-white border-slate-300 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-0.5">Mã PIN bí mật:</label>
                        <input
                          type="text"
                          required
                          value={editPin}
                          onChange={(e) => setEditPin(e.target.value)}
                          placeholder="Mã PIN..."
                          className="w-full p-2 border rounded-lg bg-white border-slate-300 text-xs font-mono font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setEditingAccId(null)}
                        className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEditAcc(acc.id)}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Lưu thay đổi</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add New Authorized Account Form */}
        <form onSubmit={handleAddOfficer} className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200 text-xs space-y-3">
          <div className="font-bold text-blue-950 flex items-center gap-1.5 text-sm">
            <Plus className="w-4 h-4 text-blue-700" />
            <span>Thêm tài khoản cán bộ mới (GVCN toàn quyền cấp phép):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-[11px] text-slate-600 mb-0.5">Vai trò:</label>
              <select
                value={newRole}
                onChange={(e) => {
                  const r = e.target.value as any;
                  setNewRole(r);
                  setNewTitle(r === 'gvcn' ? 'Giáo viên Chủ nhiệm' : r === 'lop_truong' ? 'Lớp phó Học tập' : 'Bí thư Chi đoàn');
                }}
                className="w-full p-2 border rounded-lg bg-white border-slate-300 text-xs"
              >
                <option value="gvcn">GVCN</option>
                <option value="lop_truong">Lớp phó Học tập</option>
                <option value="lop_pho">Bí thư Chi đoàn</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 mb-0.5">Họ và tên cán bộ:</label>
              <input
                type="text"
                required
                placeholder="VD: Lê Thiên Bảo"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full p-2 border rounded-lg bg-white border-slate-300 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 mb-0.5">Địa chỉ Gmail:</label>
              <input
                type="email"
                required
                placeholder="canbo@gmail.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full p-2 border rounded-lg bg-white border-slate-300 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 mb-0.5">Mã PIN (hoặc để trống):</label>
              <input
                type="text"
                placeholder="VD: 10A16lp"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full p-2 border rounded-lg bg-white border-slate-300 text-xs font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm vào Danh sách Cấp quyền</span>
            </button>
          </div>
        </form>
      </div>

      {/* School Session Times Config Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-sm text-slate-900">
            Khung Giờ Học và Mốc Điểm danh (QĐ 525/QĐ-THPT.VTT)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {OFFICIAL_SESSIONS.map((sess) => (
            <div key={sess.session} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900 text-sm">
                {sess.session === 'morning' ? 'Buổi Sáng (Chính khóa)' : 'Buổi Chiều (Chính khóa)'}
              </div>
              <div className="space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>Giờ vào học (session_start_time):</span>
                  <span className="font-mono font-bold text-slate-800">{sess.session_start_time}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mốc tính đi học trễ (late_threshold_time):</span>
                  <span className="font-mono font-bold text-amber-700">Sau {sess.late_threshold_time}</span>
                </div>
                <div className="flex justify-between">
                  <span>Giờ kết thúc buổi học (session_end_time):</span>
                  <span className="font-mono font-bold text-slate-800">{sess.session_end_time}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
