import React from 'react';

export type BadgeType =
  | 'pending_verification'
  | 'approved'
  | 'rejected'
  | 'more_info_needed'
  | 'pending_rule'
  | 'locked'
  | 'insufficient_data'
  | 'demo'
  | 'unverified'
  | 'active'
  | 'tot'
  | 'kha'
  | 'dat'
  | 'chua_dat'
  | 'Tốt'
  | 'Khá'
  | 'Đạt'
  | 'Chưa đạt';

interface Props {
  type: BadgeType | string;
  label?: string;
  className?: string;
  variant?: 'subtle' | 'pill' | 'minimal';
}

export const StatusBadge: React.FC<Props> = ({
  type,
  label,
  className = '',
  variant = 'subtle',
}) => {
  let dotColor = 'bg-slate-400';
  let textColor = 'text-slate-700';
  let bgColor = 'bg-slate-100/90 border-slate-200';
  let defaultLabel = label || type;

  switch (type) {
    case 'present':
    case 'Có mặt':
      dotColor = 'bg-emerald-500';
      textColor = 'text-emerald-800';
      bgColor = 'bg-emerald-50/80 border-emerald-200/80 font-bold';
      defaultLabel = label || 'Có mặt';
      break;
    case 'pending_verification':
    case 'Chờ xác minh':
      dotColor = 'bg-amber-500';
      textColor = 'text-amber-800';
      bgColor = 'bg-amber-50/80 border-amber-200/80';
      defaultLabel = label || 'Chờ xác minh';
      break;
    case 'approved':
    case 'Đã duyệt':
      dotColor = 'bg-emerald-500';
      textColor = 'text-emerald-800';
      bgColor = 'bg-emerald-50/80 border-emerald-200/80';
      defaultLabel = label || 'Đã duyệt';
      break;
    case 'rejected':
    case 'Từ chối':
      dotColor = 'bg-rose-500';
      textColor = 'text-rose-800';
      bgColor = 'bg-rose-50/80 border-rose-200/80';
      defaultLabel = label || 'Từ chối';
      break;
    case 'more_info_needed':
    case 'Yêu cầu bổ sung':
      dotColor = 'bg-orange-500';
      textColor = 'text-orange-800';
      bgColor = 'bg-orange-50/80 border-orange-200/80';
      defaultLabel = label || 'Cần thêm tin';
      break;
    case 'pending_rule':
    case 'Chờ xác nhận quy tắc':
      dotColor = 'bg-purple-500';
      textColor = 'text-purple-800';
      bgColor = 'bg-purple-50/80 border-purple-200/80';
      defaultLabel = label || 'Chờ xác nhận quy tắc';
      break;
    case 'locked':
    case 'Đã khóa':
      dotColor = 'bg-indigo-500';
      textColor = 'text-indigo-800';
      bgColor = 'bg-indigo-50/80 border-indigo-200/80';
      defaultLabel = label || 'Đã khóa';
      break;
    case 'insufficient_data':
    case 'Chưa đủ dữ liệu':
      dotColor = 'bg-zinc-400';
      textColor = 'text-zinc-600';
      bgColor = 'bg-zinc-100 border-zinc-200';
      defaultLabel = label || 'Chưa đủ dữ liệu';
      break;
    case 'demo':
    case 'DEMO':
      dotColor = 'bg-amber-600';
      textColor = 'text-amber-900';
      bgColor = 'bg-amber-100/90 border-amber-300 font-bold';
      defaultLabel = label || 'DEMO';
      break;
    case 'unverified':
    case 'CHƯA KIỂM CHỨNG':
      dotColor = 'bg-rose-600';
      textColor = 'text-rose-800';
      bgColor = 'bg-rose-50 border-rose-200 font-semibold';
      defaultLabel = label || 'Chưa kiểm chứng';
      break;
    case 'Tốt':
    case 'tot':
      dotColor = 'bg-blue-600';
      textColor = 'text-blue-900';
      bgColor = 'bg-blue-50/80 border-blue-200 font-bold';
      defaultLabel = label || 'Tốt';
      break;
    case 'Khá':
    case 'kha':
      dotColor = 'bg-teal-600';
      textColor = 'text-teal-900';
      bgColor = 'bg-teal-50/80 border-teal-200 font-bold';
      defaultLabel = label || 'Khá';
      break;
    case 'Đạt':
    case 'dat':
      dotColor = 'bg-amber-600';
      textColor = 'text-amber-900';
      bgColor = 'bg-amber-50/80 border-amber-200 font-bold';
      defaultLabel = label || 'Đạt';
      break;
    case 'Chưa đạt':
    case 'chua_dat':
      dotColor = 'bg-rose-600';
      textColor = 'text-rose-900';
      bgColor = 'bg-rose-50/80 border-rose-200 font-bold';
      defaultLabel = label || 'Chưa đạt';
      break;
    default:
      break;
  }

  if (variant === 'minimal') {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${textColor} ${className}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} aria-hidden="true" />
        <span>{defaultLabel}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium border tracking-tight ${bgColor} ${textColor} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} aria-hidden="true" />
      <span className="truncate">{defaultLabel}</span>
    </span>
  );
};
