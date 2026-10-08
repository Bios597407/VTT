import React, { useState } from 'react';
import { appState } from '../services/appStateService';
import { StatusBadge } from '../components/StatusBadge';
import { PendingRule } from '../types';
import { ConductCatalogItem } from '../domain/incidents/conductCatalog';
import {
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  X,
  FileEdit,
  Plus,
  BookOpen,
  Scale,
  Award,
  Lock,
} from 'lucide-react';

export const PendingRulesPage: React.FC = () => {
  const pendingRules = appState.pendingRules;
  const conductCatalog = appState.conductCatalog;
  const currentUser = appState.currentUser;

  const unresolvedCount = pendingRules.filter((r) => r.status !== 'confirmed_by_gvcn').length;
  const resolvedCount = pendingRules.filter((r) => r.status === 'confirmed_by_gvcn').length;

  // Tabs: 'pending_rules' | 'conduct_catalog'
  const [activeTab, setActiveTab] = useState<'pending_rules' | 'conduct_catalog'>('pending_rules');

  // Pending Rule Modal state
  const [selectedRule, setSelectedRule] = useState<PendingRule | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [basis, setBasis] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split('T')[0]);

  // Catalog Item Edit / Add Modal state
  const [editingCatalogItem, setEditingCatalogItem] = useState<ConductCatalogItem | null>(null);
  const [isAddingCatalogItem, setIsAddingCatalogItem] = useState(false);
  const [catalogCode, setCatalogCode] = useState('');
  const [catalogTitle, setCatalogTitle] = useState('');
  const [catalogPoints, setCatalogPoints] = useState(-2);
  const [catalogCategory, setCatalogCategory] = useState<ConductCatalogItem['category']>('chuyen_can');
  const [catalogDesc, setCatalogDesc] = useState('');

  // Permission: GVCN, Lớp phó, Lớp trưởng có toàn quyền điều chỉnh tất cả nội dung bản nề nếp
  const isOfficer = currentUser.isAuthenticatedOfficer;
  const canManageRules =
    currentUser.role === 'gvcn' ||
    currentUser.role === 'lop_truong' ||
    currentUser.role === 'lop_pho';

  if (!isOfficer) {
    return (
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-sm max-w-lg mx-auto text-center space-y-4 my-8">
        <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-200 shadow-xs">
          <Lock className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-lg sm:text-xl font-black text-slate-900">
          Khu vực Thẩm tra Quy tắc Nề nếp (Chỉ Cán sự / GVCN)
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Mục Quy tắc chờ GVCN và Danh mục vi phạm QĐ 525 yêu cầu quyền Ban Cán sự hoặc GVCN để xem xét và quyết định phương án xử lý. Vui lòng đăng nhập để truy cập.
        </p>
      </div>
    );
  }

  const handleOpenConfig = (rule: PendingRule) => {
    setSelectedRule(rule);
    setSelectedOptionId(rule.selected_option || rule.options[0]?.id || '');
    setBasis(rule.basis || '');
    setEffectiveFrom(rule.effective_from || new Date().toISOString().split('T')[0]);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRule || !selectedOptionId) return;

    const finalBasis = basis.trim() || 'Thống nhất phê duyệt chính thức theo thẩm quyền GVCN & Ban Cán sự Lớp 10A16';
    appState.configurePendingRule(selectedRule.code, selectedOptionId, finalBasis, effectiveFrom);
    appState.showToast(`🎉 Đã phê duyệt chính thức quy tắc ${selectedRule.code}!`, 'success');
    setSelectedRule(null);
  };

  const handleQuickApprove = (rule: PendingRule) => {
    const selectedOpt = rule.selected_option || rule.options[0]?.id || '';
    appState.configurePendingRule(
      rule.code,
      selectedOpt,
      'Phê duyệt nhanh theo thẩm quyền GVCN Lớp 10A16',
      new Date().toISOString().split('T')[0]
    );
    appState.showToast(`🎉 Đã phê duyệt chính thức quy tắc ${rule.code}!`, 'success');
  };

  const handleApproveAllPending = () => {
    const unapproved = pendingRules.filter((r) => r.status !== 'confirmed_by_gvcn');
    if (unapproved.length === 0) return;

    if (confirm(`Bạn có chắc chắn muốn PHÊ DUYỆT TẤT CẢ ${unapproved.length} quy tắc nề nếp chưa duyệt không?`)) {
      unapproved.forEach((rule) => {
        const selectedOpt = rule.selected_option || rule.options[0]?.id || '';
        appState.configurePendingRule(
          rule.code,
          selectedOpt,
          'Phê duyệt đồng loạt theo thẩm quyền GVCN Lớp 10A16',
          new Date().toISOString().split('T')[0]
        );
      });
      appState.showToast(`🎉 Đã phê duyệt chính thức toàn bộ ${unapproved.length} quy tắc nề nếp!`, 'success');
    }
  };

  const handleOpenEditCatalog = (item: ConductCatalogItem) => {
    setEditingCatalogItem(item);
    setCatalogCode(item.code);
    setCatalogTitle(item.title || item.shortTitle || '');
    setCatalogPoints(item.defaultPoints);
    setCatalogCategory(item.category);
    setCatalogDesc(item.description || '');
    setIsAddingCatalogItem(false);
  };

  const handleOpenAddCatalog = () => {
    setEditingCatalogItem(null);
    const nextCode = (conductCatalog.length + 1).toString().padStart(2, '0');
    setCatalogCode(nextCode);
    setCatalogTitle('');
    setCatalogPoints(-2);
    setCatalogCategory('chuyen_can');
    setCatalogDesc('');
    setIsAddingCatalogItem(true);
  };

  const handleSaveCatalogItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalogCode.trim() || !catalogTitle.trim()) return;

    if (isAddingCatalogItem) {
      appState.addConductCatalogItem({
        code: catalogCode.trim(),
        title: catalogTitle.trim(),
        shortTitle: catalogTitle.trim(),
        defaultPoints: Number(catalogPoints),
        category: catalogCategory,
        description: catalogDesc.trim(),
        severity: Number(catalogPoints) <= -5 ? 'major' : 'minor',
      });
      appState.showToast(`Đã bổ sung quy định nề nếp mới mã [${catalogCode}]!`, 'success');
    } else {
      appState.updateConductCatalogItem(catalogCode, {
        title: catalogTitle.trim(),
        defaultPoints: Number(catalogPoints),
        category: catalogCategory,
        description: catalogDesc.trim(),
        severity: Number(catalogPoints) <= -5 ? 'major' : 'minor',
      });
      appState.showToast(`Đã cập nhật quy định nề nếp mã [${catalogCode}]!`, 'success');
    }

    setEditingCatalogItem(null);
    setIsAddingCatalogItem(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Bản Nề Nếp & Biểu Điểm Kỷ Luật Lớp 10A16
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-800">
              QĐ 525 & TT 22
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quy định nề nếp, biểu điểm trừ và các tình huống quy chuẩn của Lớp 10A16
          </p>
        </div>

        {canManageRules ? (
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Quyền điều chỉnh: GVCN, Lớp phó, Lớp trưởng</span>
            </div>
            {activeTab === 'conduct_catalog' && (
              <button
                onClick={handleOpenAddCatalog}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm quy định</span>
              </button>
            )}
          </div>
        ) : (
          <div className="text-xs font-semibold px-3 py-1.5 bg-slate-100 text-slate-600 rounded-xl border border-slate-200">
            Chế độ chỉ xem · Quyền điều chỉnh: Ban Cán sự & GVCN
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-2 text-xs font-bold">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('pending_rules')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'pending_rules'
                ? 'bg-purple-100 text-purple-900 font-extrabold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Quy tắc Chờ GVCN Phê Duyệt ({unresolvedCount}/{pendingRules.length})</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                unresolvedCount > 0
                  ? 'bg-purple-200 text-purple-900'
                  : 'bg-emerald-200 text-emerald-900'
              }`}
            >
              {unresolvedCount > 0 ? `${unresolvedCount} chưa duyệt` : 'Đã duyệt xong! 🎉'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('conduct_catalog')}
            className={`px-3.5 py-2 rounded-xl transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'conduct_catalog'
                ? 'bg-blue-100 text-blue-900 font-extrabold shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Biểu điểm & Quy định Nề nếp ({conductCatalog.length} Mục)</span>
          </button>
        </div>

        {canManageRules && activeTab === 'pending_rules' && unresolvedCount > 0 && (
          <button
            type="button"
            onClick={handleApproveAllPending}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shrink-0"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>⚡ Phê duyệt đồng loạt {unresolvedCount} quy tắc còn lại</span>
          </button>
        )}
      </div>

      {/* TAB 1: Pending Rules */}
      {activeTab === 'pending_rules' && (
        <div className="space-y-4">
          {/* Status Overview Banner */}
          {unresolvedCount === 0 ? (
            <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-950 text-xs shadow-xs">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <div className="font-extrabold text-sm text-emerald-900">
                  🎉 TẤT CẢ QUY TẮC NỀ NẾP ĐÃ ĐƯỢC PHÊ DUYỆT HOÀN TẤT!
                </div>
                <div className="text-emerald-800 mt-0.5">
                  Giáo viên Chủ nhiệm và Ban Cán sự đã phê duyệt chính thức toàn bộ {pendingRules.length}/{pendingRules.length} quy tắc nề nếp. Tất cả đã có hiệu lực thi hành cho Lớp 10A16.
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1">
                <div className="font-bold text-blue-900 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" />
                  A. NGUỒN NỘI QUY CHÍNH THỨC
                </div>
                <p className="text-blue-800 text-[11px]">
                  Căn cứ văn bản QĐ 525/QĐ-THPT.VTT và Điều 8 Thông tư 22/2021/TT-BGDĐT.
                </p>
              </div>
              <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1">
                <div className="font-bold text-amber-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  B. NGUYÊN TẮC AN TOÀN SƯ PHẠM
                </div>
                <p className="text-amber-800 text-[11px]">
                  Không tự động gộp vi phạm, kiểm soát kẹp trần, đảm bảo tính công bằng minh bạch.
                </p>
              </div>
              <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200 space-y-1">
                <div className="font-bold text-purple-900 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  C. THẨM QUYỀN BAN CÁN SỰ &amp; GVCN
                </div>
                <p className="text-purple-800 text-[11px]">
                  GVCN, Lớp phó, Lớp trưởng có quyền thống nhất điều chỉnh và phê duyệt hiệu lực.
                </p>
              </div>
            </div>
          )}

          {/* List of Pending Rules */}
          <div className="grid grid-cols-1 gap-4">
            {pendingRules.map((rule) => {
              const isResolved = rule.status === 'confirmed_by_gvcn';
              return (
                <div
                  key={rule.code}
                  className={`p-5 rounded-2xl border transition shadow-xs space-y-3 ${
                    isResolved
                      ? 'bg-emerald-50/30 border-emerald-300'
                      : 'bg-white border-slate-200 hover:border-purple-300'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`font-mono text-xs font-black px-2 py-0.5 rounded ${isResolved ? 'bg-emerald-100 text-emerald-900' : 'bg-purple-100 text-purple-900'}`}>
                        {rule.code}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900">{rule.title}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 font-mono">
                        Nguồn: {rule.source_reference}
                      </span>
                      <StatusBadge
                        type={isResolved ? 'Đã duyệt' : 'Chờ xác nhận quy tắc'}
                        label={isResolved ? 'Đã phê duyệt' : 'Chờ GVCN chốt'}
                      />
                    </div>
                  </div>

                  <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <span className="font-semibold text-slate-900">Điểm cần thống nhất / Căn cứ: </span>
                    {rule.ambiguity}
                  </div>

                  {/* Options */}
                  <div className="space-y-1.5 text-xs">
                    <div className="font-semibold text-slate-700 text-[11px]">Các phương án giải quyết:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {rule.options.map((opt) => {
                        const isSelected = rule.selected_option === opt.id;
                        return (
                          <div
                            key={opt.id}
                            className={`p-2.5 rounded-lg border text-[11px] space-y-1 ${
                              isSelected
                                ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-1 ring-emerald-500'
                                : 'bg-white border-slate-200 text-slate-600'
                            }`}
                          >
                            <div className="font-semibold">{opt.label}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{opt.description}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {isResolved && (
                    <div className="text-[11px] bg-emerald-100/60 p-2.5 rounded-xl border border-emerald-300 text-emerald-950 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <strong>✅ Căn cứ phê duyệt chính thức: </strong> {rule.basis || 'Đồng thuận theo thực tế sư phạm Lớp 10A16'} (Hiệu lực: {rule.effective_from})
                      </div>
                      <div className="text-emerald-800 font-mono text-[10px] font-bold">
                        Đã duyệt bởi: {rule.confirmed_by || 'GVCN'}
                      </div>
                    </div>
                  )}

                  {canManageRules && (
                    <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100">
                      {!isResolved && (
                        <button
                          type="button"
                          onClick={() => handleQuickApprove(rule)}
                          className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Phê duyệt nhanh ngay</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenConfig(rule)}
                        className={`px-3.5 py-1.5 text-xs font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                          isResolved
                            ? 'bg-blue-600 hover:bg-blue-500 text-white'
                            : 'bg-purple-600 hover:bg-purple-500 text-white'
                        }`}
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        <span>{isResolved ? 'Chỉnh sửa phương án' : 'Phê duyệt & Tùy chỉnh'}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Official Conduct Catalog (Biểu điểm nề nếp) */}
      {activeTab === 'conduct_catalog' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="text-slate-600">
              Toàn bộ danh mục 24 tiêu chuẩn vi phạm theo <strong>Quy định 525</strong> của trường.
              {canManageRules && (
                <span className="text-blue-600 font-semibold ml-1">
                  GVCN, Lớp phó, Lớp trưởng có thể điều chỉnh biểu điểm hoặc nội dung theo cam kết nề nếp của lớp.
                </span>
              )}
            </div>
            {canManageRules && (
              <button
                onClick={handleOpenAddCatalog}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm quy định nề nếp mới</span>
              </button>
            )}
          </div>

          {/* Table / Card list */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 w-16">Mã</th>
                    <th className="p-3.5">Hành vi nề nếp</th>
                    <th className="p-3.5 w-28">Phân loại</th>
                    <th className="p-3.5 w-24 text-center">Điểm trừ</th>
                    <th className="p-3.5 w-32">Mức độ</th>
                    {canManageRules && <th className="p-3.5 w-24 text-right">Thao tác</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {conductCatalog.map((item) => (
                    <tr key={item.code} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        {item.code}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{item.title}</div>
                        {item.description && (
                          <div className="text-[11px] text-slate-500 mt-0.5">{item.description}</div>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-600">
                        <span className="capitalize text-[11px] font-medium bg-slate-100 px-2 py-0.5 rounded">
                          {item.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="font-black text-rose-600 tabular-nums bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          {item.defaultPoints}đ
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            item.severity === 'critical'
                              ? 'bg-rose-100 text-rose-800'
                              : item.severity === 'major'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.severity}
                        </span>
                      </td>
                      {canManageRules && (
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleOpenEditCatalog(item)}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition active:scale-95 cursor-pointer"
                          >
                            Điều chỉnh
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Modal for Pending Rules */}
      {selectedRule && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Điều chỉnh & Phê duyệt {selectedRule.code}
                </h3>
                <p className="text-xs text-slate-500">{selectedRule.title}</p>
              </div>
              <button
                onClick={() => setSelectedRule(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Chọn phương án xử lý nề nếp
                </label>
                <div className="space-y-2">
                  {selectedRule.options.map((opt) => (
                    <label
                      key={opt.id}
                      className={`block p-3 rounded-xl border cursor-pointer transition ${
                        selectedOptionId === opt.id
                          ? 'bg-purple-50 border-purple-600 text-purple-950 font-bold ring-1 ring-purple-600'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="rule_option"
                          checked={selectedOptionId === opt.id}
                          onChange={() => setSelectedOptionId(opt.id)}
                          className="text-purple-600"
                        />
                        <span>{opt.label}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 ml-5 font-normal mt-0.5">
                        {opt.description}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Căn cứ quy chế / Biên bản họp lớp
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi căn cứ (hoặc để trống để dùng căn cứ mặc định theo thẩm quyền GVCN)..."
                  value={basis}
                  onChange={(e) => setBasis(e.target.value)}
                  className="w-full p-2.5 border rounded-xl border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Ngày áp dụng hiệu lực
                </label>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="w-full p-2.5 border rounded-xl border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedRule(null)}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold bg-purple-600 text-white rounded-xl hover:bg-purple-500 shadow-sm cursor-pointer"
                >
                  Lưu & Ban hành nề nếp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit / Add Catalog Item Modal */}
      {(editingCatalogItem || isAddingCatalogItem) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {isAddingCatalogItem ? 'Bổ sung quy định nề nếp mới' : `Điều chỉnh quy định [Mã ${catalogCode}]`}
                </h3>
                <p className="text-xs text-slate-500">
                  Quyền chỉnh sửa của Ban Cán sự (GVCN, Lớp phó, Lớp trưởng)
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingCatalogItem(null);
                  setIsAddingCatalogItem(false);
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCatalogItem} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mã quy định</label>
                <input
                  type="text"
                  required
                  disabled={!isAddingCatalogItem}
                  value={catalogCode}
                  onChange={(e) => setCatalogCode(e.target.value)}
                  placeholder="Ví dụ: 25, 26..."
                  className="w-full p-2.5 border rounded-xl border-slate-300 font-mono disabled:bg-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên hành vi / Nội dung quy định</label>
                <input
                  type="text"
                  required
                  value={catalogTitle}
                  onChange={(e) => setCatalogTitle(e.target.value)}
                  placeholder="Ví dụ: Đi học trễ sau 07:00, không đeo thẻ..."
                  className="w-full p-2.5 border rounded-xl border-slate-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mức điểm trừ</label>
                  <input
                    type="number"
                    required
                    max="0"
                    value={catalogPoints}
                    onChange={(e) => setCatalogPoints(Number(e.target.value))}
                    placeholder="-2"
                    className="w-full p-2.5 border rounded-xl border-slate-300 font-mono font-bold text-rose-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phân loại</label>
                  <select
                    value={catalogCategory}
                    onChange={(e) => setCatalogCategory(e.target.value as any)}
                    className="w-full p-2.5 border rounded-xl border-slate-300"
                  >
                    <option value="chuyen_can">Chuyên cần</option>
                    <option value="trang_phuc">Trang phục</option>
                    <option value="hoc_tap">Học tập</option>
                    <option value="thai_do">Thái độ / Hành vi</option>
                    <option value="khac">Khác</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô tả chi tiết / Hướng dẫn xử lý</label>
                <textarea
                  rows={2}
                  value={catalogDesc}
                  onChange={(e) => setCatalogDesc(e.target.value)}
                  placeholder="Giải thích rõ quy định để cán sự và học sinh nắm rõ..."
                  className="w-full p-2.5 border rounded-xl border-slate-300"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setEditingCatalogItem(null);
                    setIsAddingCatalogItem(false);
                  }}
                  className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-500 shadow-sm cursor-pointer"
                >
                  Lưu quy định nề nếp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
