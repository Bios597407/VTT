import React from 'react';
import { appState } from '../services/appStateService';
import { RoleType } from '../types';
import {
  School,
  UserCheck,
  FileSpreadsheet,
  AlertOctagon,
  Menu,
  Shield,
  ShieldCheck,
  Lock,
  LogOut,
} from 'lucide-react';

interface Props {
  onOpenQuickAttendance: () => void;
  onOpenQuickIncident: () => void;
  onOpenExcelImport: () => void;
  onOpenAuthModal?: () => void;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<Props> = ({
  onOpenQuickAttendance,
  onOpenQuickIncident,
  onOpenExcelImport,
  onOpenAuthModal,
  onToggleSidebar,
}) => {
  const currentUser = appState.currentUser;
  const isOfficer =
    currentUser.role === 'gvcn' ||
    currentUser.role === 'lop_truong' ||
    currentUser.role === 'lop_pho';

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo & School Title */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                aria-label="Mở danh mục điều hướng"
                className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition active:scale-95 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-black text-sm sm:text-base tracking-tight shadow-md shadow-blue-600/20 text-white shrink-0 border border-blue-400/20">
                VTT
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm sm:text-base tracking-tight text-white truncate">
                    NỀ NẾP LỚP 10
                  </span>
                  <span className="text-[11px] font-bold text-blue-400 font-mono tracking-wider hidden xs:inline">
                    · {appState.classInfo.class_name}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block truncate">
                  {appState.classInfo.school_name} · {appState.classInfo.academic_year} · GVCN: {appState.classInfo.gvcn_name}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons on Desktop (Only available to Managers) */}
          <div className="hidden lg:flex items-center gap-2">
            {isOfficer ? (
              <>
                <button
                  onClick={onOpenQuickAttendance}
                  className="min-h-[38px] flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Điểm danh nhanh</span>
                </button>
                <button
                  onClick={onOpenQuickIncident}
                  className="min-h-[38px] flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Báo sự việc</span>
                </button>
                <button
                  onClick={onOpenExcelImport}
                  className="min-h-[38px] flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Nhập Excel</span>
                </button>
              </>
            ) : (
              <div className="px-3 py-1.5 bg-slate-800/80 rounded-xl border border-slate-700/80 text-[11px] text-amber-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Chế độ Học sinh (Chỉ xem) · Đăng nhập để kích hoạt điều chỉnh</span>
              </div>
            )}
          </div>

          {/* Active Role & Controls - Chữ to rõ ràng, không lộ email cá nhân */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* If currently Student (View-only) */}
            {!isOfficer ? (
              <>
                <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/90 rounded-xl border border-slate-700 text-sm text-slate-300">
                  <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Chế độ Học sinh</span>
                  <span className="text-amber-400 font-bold">(Chỉ xem)</span>
                </div>

                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="min-h-[42px] px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <ShieldCheck className="w-4.5 h-4.5 text-slate-950" />
                  <span>Kích hoạt quyền GVCN</span>
                </button>
              </>
            ) : (
              /* If currently Authenticated Officer */
              <div className="flex items-center gap-2.5">
                <div className="px-3.5 py-2 bg-emerald-950/90 border border-emerald-500/60 rounded-xl text-sm font-black text-emerald-300 flex items-center gap-2 shadow-xs">
                  <ShieldCheck className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                  <span className="truncate max-w-[200px] sm:max-w-none">{currentUser.name}</span>
                </div>

                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="min-h-[42px] px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-sm rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  title="Chuyển đổi tài khoản hoặc vai trò"
                >
                  <span>Đổi vai trò</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
