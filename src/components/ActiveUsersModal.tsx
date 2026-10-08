import React, { useState, useEffect } from 'react';
import { appState, ActiveUserSession } from '../services/appStateService';
import {
  Users,
  Activity,
  Search,
  RefreshCw,
  X,
  ShieldCheck,
  UserCheck,
  Smartphone,
  Laptop,
  Clock,
  Eye,
  Globe,
  Radio,
  Send,
  Sparkles,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ActiveUsersModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeSessions, setActiveSessions] = useState<ActiveUserSession[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>('Vừa xong');

  const loadSessions = () => {
    setIsRefreshing(true);
    const sessions = appState.getActiveSessions();
    setActiveSessions(sessions);
    setLastRefreshedAt(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    setTimeout(() => {
      setIsRefreshing(false);
    }, 400);
  };

  useEffect(() => {
    if (isOpen) {
      loadSessions();
      // Auto refresh active count every 15 seconds
      const timer = setInterval(() => {
        loadSessions();
      }, 15000);
      return () => clearInterval(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredSessions = activeSessions.filter((session) => {
    const matchesSearch =
      session.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.roleLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.currentPage.toLowerCase().includes(searchQuery.toLowerCase()) ||
      session.device.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'officer' && (session.role === 'gvcn' || session.role === 'lop_truong' || session.role === 'lop_pho')) ||
      (roleFilter === 'hoc_sinh' && session.role === 'hoc_sinh');

    return matchesSearch && matchesRole;
  });

  const totalCount = activeSessions.length;
  const officerCount = activeSessions.filter(
    (s) => s.role === 'gvcn' || s.role === 'lop_truong' || s.role === 'lop_pho'
  ).length;
  const studentCount = totalCount - officerCount;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-start justify-between border-b border-slate-700/80 relative">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/20">
                <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                  <Activity className="w-6 h-6 text-emerald-400 animate-pulse" />
                </div>
              </div>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  Người Dùng Đang Truy Cập
                </h3>
                <span className="px-2.5 py-0.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-black text-xs rounded-full flex items-center gap-1">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  LIVE {totalCount} Trực tuyến
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Giám sát danh sách ai đang truy cập, thiết bị và mục làm việc theo thời gian thực (Lớp 10A16)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Stat Cards */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500">Tổng đang truy cập</div>
              <div className="text-xl font-black text-slate-800">{totalCount} người</div>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500">Ban Cán Sự / GVCN</div>
              <div className="text-xl font-black text-blue-700">{officerCount} người</div>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500">Học sinh / Khách</div>
              <div className="text-xl font-black text-amber-700">{studentCount} người</div>
            </div>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-500">Cập nhật gần nhất</div>
              <div className="text-xs font-bold text-indigo-700 mt-1">{lastRefreshedAt}</div>
            </div>
          </div>
        </div>

        {/* Filter & Refresh Toolbar */}
        <div className="p-3.5 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm theo tên, vai trò, trang hoặc thiết bị..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="officer">Chỉ Ban Cán Sự / GVCN</option>
              <option value="hoc_sinh">Chỉ Học sinh</option>
            </select>
          </div>

          <button
            onClick={loadSessions}
            disabled={isRefreshing}
            className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-xs sm:text-sm rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Làm mới ngay</span>
          </button>
        </div>

        {/* Active Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-sm">Không tìm thấy người dùng phù hợp tìm kiếm</p>
            </div>
          ) : (
            filteredSessions.map((session) => {
              const isOfficer =
                session.role === 'gvcn' || session.role === 'lop_truong' || session.role === 'lop_pho';

              return (
                <div
                  key={session.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    session.isCurrentUser
                      ? 'bg-emerald-50/60 border-emerald-300 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* User Info */}
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <div
                          className={`w-10 h-10 rounded-xl ${
                            session.avatarBg || (isOfficer ? 'bg-blue-600' : 'bg-slate-700')
                          } text-white font-extrabold text-sm flex items-center justify-center shadow-xs shrink-0`}
                        >
                          {session.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-slate-900">{session.name}</span>

                          {session.isCurrentUser && (
                            <span className="px-2 py-0.5 bg-emerald-600 text-white font-black text-[10px] rounded-md uppercase tracking-wider">
                              Bạn (Phiên hiện tại)
                            </span>
                          )}

                          <span
                            className={`px-2.5 py-0.5 text-xs font-bold rounded-lg border ${
                              session.role === 'gvcn'
                                ? 'bg-purple-100 border-purple-300 text-purple-800'
                                : session.role === 'lop_truong' || session.role === 'lop_pho'
                                ? 'bg-blue-100 border-blue-300 text-blue-800'
                                : 'bg-slate-100 border-slate-300 text-slate-700'
                            }`}
                          >
                            {session.roleLabel}
                          </span>
                        </div>

                        {/* Page & Activity */}
                        <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                          <span className="flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Đang ở: <strong>{session.currentPage}</strong></span>
                          </span>

                          <span className="flex items-center gap-1 text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{session.lastActive}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Device & Network Security Info */}
                    <div className="flex flex-col items-start sm:items-end gap-1 text-xs text-slate-500 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        {session.device.includes('iPhone') || session.device.includes('Android') || session.device.includes('Mobile') ? (
                          <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                        ) : (
                          <Laptop className="w-3.5 h-3.5 text-slate-600" />
                        )}
                        <span>{session.device}</span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                        <Globe className="w-3 h-3 text-slate-400" />
                        <span>IP: {session.ipMasked}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Hệ thống ghi nhận và hiển thị thông tin trực tuyến chính xác theo cơ chế thời gian thực.</span>
          </div>

          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
