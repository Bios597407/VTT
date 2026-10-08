import React from 'react';
import { appState } from '../services/appStateService';
import {
  LayoutDashboard,
  Users,
  Grid,
  MapPin,
  CalendarCheck,
  AlertTriangle,
  Award,
  CheckSquare,
  Calculator,
  HelpCircle,
  Lock,
  MessageSquare,
  FileDown,
  History,
  Settings,
  School,
  X,
} from 'lucide-react';

export type NavTab =
  | 'dashboard'
  | 'class_info'
  | 'students'
  | 'groups'
  | 'seating'
  | 'attendance'
  | 'incidents'
  | 'rewards'
  | 'tasks'
  | 'scoring'
  | 'pending_rules'
  | 'period_locks'
  | 'qualitative'
  | 'reports'
  | 'audit'
  | 'settings';

interface Props {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  pendingIncidentsCount: number;
  pendingRewardsCount: number;
  unresolvedRulesCount: number;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  pendingIncidentsCount,
  pendingRewardsCount,
  unresolvedRulesCount,
  onCloseMobile,
}) => {
  const sections = [
    {
      title: 'Quản lý Lớp học',
      items: [
        { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
        { id: 'class_info', label: 'Quản lý Lớp & Ban cán sự', icon: School },
        { id: 'students', label: 'Danh sách 43 học sinh', icon: Users },
        { id: 'groups', label: 'Tổ học tập (1–4)', icon: Grid },
        { id: 'seating', label: 'Sơ đồ chỗ ngồi', icon: MapPin },
      ],
    },
    {
      title: 'Nề nếp & Khen kỷ luật',
      items: [
        { id: 'attendance', label: 'Điểm danh & VnEdu', icon: CalendarCheck },
        {
          id: 'incidents',
          label: 'Sự việc & Duyệt lỗi',
          icon: AlertTriangle,
          badge: pendingIncidentsCount > 0 ? pendingIncidentsCount : undefined,
          badgeColor: 'bg-rose-500 text-white',
        },
        {
          id: 'rewards',
          label: 'Khen thưởng & Biểu dương',
          icon: Award,
          badge: pendingRewardsCount > 0 ? pendingRewardsCount : undefined,
          badgeColor: 'bg-emerald-500 text-white',
        },
        { id: 'tasks', label: 'Phân công nhiệm vụ', icon: CheckSquare },
      ],
    },
    {
      title: 'Đánh giá & Xếp loại',
      items: [
        { id: 'scoring', label: 'Bảng điểm & Xếp loại', icon: Calculator },
        {
          id: 'pending_rules',
          label: 'Quy tắc chờ GVCN',
          icon: HelpCircle,
          badge: unresolvedRulesCount > 0 ? unresolvedRulesCount : undefined,
          badgeColor: 'bg-purple-600 text-white',
        },
        { id: 'period_locks', label: 'Khóa / Mở kỳ đánh giá', icon: Lock },
        { id: 'qualitative', label: 'Đánh giá định tính', icon: MessageSquare },
      ],
    },
    {
      title: 'Hồ sơ & Hệ thống',
      items: [
        { id: 'reports', label: 'Xuất Excel & Bản in', icon: FileDown },
        { id: 'audit', label: 'Nhật ký kiểm toán', icon: History },
        { id: 'settings', label: 'Cài đặt & Cơ sở dữ liệu', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-68 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 h-full overflow-hidden select-none">
      {/* Mobile Header with close button */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Phân hệ Quản lý Giáo dục
          </div>
          <div className="text-xs font-semibold text-slate-200 mt-0.5">
            Lớp 10A16 · THPT Võ Trường Toản
          </div>
        </div>
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg"
            aria-label="Đóng bảng chọn"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
        {sections.map((sec, secIdx) => (
          <div key={secIdx} className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {sec.title}
            </div>
            {sec.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              const isOfficer = appState.currentUser.isAuthenticatedOfficer;
              const isGvcn = appState.currentUser.role === 'gvcn';
              const isRestricted =
                item.id === 'pending_rules' ||
                item.id === 'period_locks' ||
                item.id === 'audit' ||
                item.id === 'settings';
              const isLockedForUser = !isGvcn && isRestricted && (!isOfficer || (item.id === 'settings'));

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectTab(item.id as NavTab);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer text-left ${
                    isActive
                      ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Icon className={`w-4.5 h-4.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isLockedForUser && (
                      <span title="Yêu cầu đăng nhập Ban Cán sự / GVCN">
                        <Lock className="w-4 h-4 text-amber-400" />
                      </span>
                    )}
                    {item.badge !== undefined && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold tabular-nums shrink-0 ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Legal Footer Reference */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-400 text-center shrink-0">
        <span>QĐ 525/QĐ-THPT.VTT</span>
        <span className="mx-1.5">·</span>
        <span>TT 22/2021/TT-BGDĐT</span>
      </div>
    </aside>
  );
};
