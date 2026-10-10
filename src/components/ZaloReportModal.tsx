import React, { useState, useMemo } from 'react';
import { appState } from '../services/appStateService';
import { getWeekDateRange } from '../domain/scoring/scoringEngine';
import { Copy, Check, MessageCircle, X, Sparkles, Send } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ZaloReportModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [weekNumber, setWeekNumber] = useState<number>(1);
  const [customNotes, setCustomNotes] = useState<string>('');
  const [showViolatorNames, setShowViolatorNames] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const reportText = useMemo(() => {
    if (!isOpen) return '';
    return appState.generateZaloWeeklyReport(weekNumber, customNotes, showViolatorNames);
  }, [isOpen, weekNumber, customNotes, showViolatorNames]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      appState.showToast('Đã sao chép Mẫu Báo Cáo Zalo vào Khay nhớ tạm (Clipboard)!', 'success');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      // Fallback copy
      const textArea = document.createElement('textarea');
      textArea.value = reportText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      appState.showToast('Đã sao chép Mẫu Báo Cáo Zalo thành công!', 'success');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-700 to-indigo-800 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
              <MessageCircle className="w-6 h-6 text-blue-200" />
            </div>
            <div>
              <div className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                Mẫu Báo Cáo Zalo Phụ Huynh 1-Click
              </div>
              <h3 className="text-base font-black tracking-tight">
                Tổng Kết Tuần Lớp 10A16 · THPT Võ Trường Toản
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls Bar */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">Chọn Tuần báo cáo:</label>
            <select
              value={weekNumber}
              onChange={(e) => setWeekNumber(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 shadow-xs cursor-pointer focus:ring-2 focus:ring-blue-500"
            >
              {Array.from({ length: 36 }, (_, i) => i + 1).map((w) => {
                const r = getWeekDateRange(w);
                return (
                  <option key={w} value={w}>
                    {r.optionLabel}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Chế độ tên học sinh vi phạm:</label>
            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowViolatorNames(!showViolatorNames)}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  showViolatorNames
                    ? 'bg-blue-50 border-blue-300 text-blue-800'
                    : 'bg-slate-100 border-slate-300 text-slate-600'
                }`}
              >
                {showViolatorNames ? '✓ Hiển thị tên cụ thể' : '🔒 Ẩn tên (Chỉ báo tổng số)'}
              </button>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">Dặn dò bổ sung của GVCN (Tùy chọn):</label>
            <textarea
              rows={2}
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Nhập dặn dò về lịch thi, tiền quỹ, trang phục, họp phụ huynh..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Live Preview Box */}
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Xem trước đoạn tin nhắn gửi nhóm Zalo Phụ Huynh:
            </span>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Chuẩn định dạng Zalo & Icon
            </span>
          </div>

          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 font-sans text-xs text-slate-200 leading-relaxed max-h-80 overflow-y-auto whitespace-pre-wrap select-all shadow-inner">
            {reportText}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500">
            💡 Bấm nút bên dưới để sao chép, sau đó mở ứng dụng Zalo/Messenger và <strong>Dán (Ctrl+V)</strong>.
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Đóng
            </button>
            <button
              onClick={handleCopy}
              className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition active:scale-95 cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Đã Copy Báo Cáo!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Báo Cáo Zalo (1-Click)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
