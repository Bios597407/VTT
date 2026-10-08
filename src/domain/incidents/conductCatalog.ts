// Official Conduct Catalog (Quy định 525/QĐ-THPT.VTT)
// Exactly codes 01 to 24. No code called OTHER.
// Software safety category "Sự việc khác — chờ xem xét" has code = null.

export interface ConductRuleItem {
  code: string; // "01" .. "24"
  defaultPoints: number; // -2, -4, or -6
  shortTitle: string;
  title?: string;
  description: string;
  category: 'formal' | 'order' | 'learning' | 'sanitation' | 'safety_behavior' | 'ethics' | 'phone' | any;
  requiresTeacherPermissionCheck?: boolean; // For V15 and V24
  severity?: 'minor' | 'major' | 'critical';
}

export type ConductCatalogItem = ConductRuleItem;

export const OFFICIAL_CONDUCT_CATALOG: ConductRuleItem[] = [
  {
    code: '01',
    defaultPoints: -2,
    shortTitle: 'Đồng phục, tác phong',
    description: 'Không đúng quy định về đồng phục, giày dép, tóc hoặc các yêu cầu hình thức theo nội quy nhà trường.',
    category: 'formal',
  },
  {
    code: '02',
    defaultPoints: -2,
    shortTitle: 'Mất trật tự tập trung/chào cờ',
    description: 'Mất trật tự, đùa giỡn trong lúc tập trung, chào cờ, lễ, sinh hoạt chuyên đề, ngoại khóa hoặc hoạt động tương tự.',
    category: 'order',
  },
  {
    code: '03',
    defaultPoints: -2,
    shortTitle: 'Ra ngoài hoặc trễ giờ ra chơi',
    description: 'Tự ý ra khỏi lớp hoặc đi trễ sau giờ ra chơi.',
    category: 'order',
  },
  {
    code: '04',
    defaultPoints: -2,
    shortTitle: 'Xả rác sai quy định',
    description: 'Xả rác không đúng quy định (sàn, hộc bàn, sân tập thể dục, sân trường, hành lang lớp học,...).',
    category: 'sanitation',
  },
  {
    code: '05',
    defaultPoints: -2,
    shortTitle: 'Ăn uống trong lớp',
    description: 'Ăn trong lớp học, hành lang hoặc trong bối cảnh tập trung/chào cờ không phù hợp quy định.',
    category: 'order',
  },
  {
    code: '06',
    defaultPoints: -2,
    shortTitle: 'Sai vị trí, không nghiêm túc',
    description: 'Ngồi không đúng vị trí sơ đồ lớp, thiếu nghiêm túc, nói chuyện, ngủ, làm môn khác trong giờ học (cụm từ "làm việc riêng" có dị bản cần xác nhận).',
    category: 'learning',
  },
  {
    code: '07',
    defaultPoints: -2,
    shortTitle: 'Trễ hoặc rời sớm buổi lễ',
    description: 'Đi trễ hoặc tự ý rời sớm trong các buổi lễ, hoạt động chuyên đề, hoạt động ngoại khóa.',
    category: 'order',
  },
  {
    code: '08',
    defaultPoints: -2,
    shortTitle: 'Đi học trễ mốc quy định',
    description: 'Đi học trễ sau: 06:50 buổi sáng hoặc 12:50 buổi chiều.',
    category: 'order',
  },
  {
    code: '09',
    defaultPoints: -2,
    shortTitle: 'Không hoàn thành nhiệm vụ GVCN giao',
    description: 'Không thực hiện nhiệm vụ do GVCN giao (phụ trách ghế, sổ đầu bài, tham gia hội thi,...; không tự động sinh từ hệ thống nhiệm vụ).',
    category: 'learning',
  },
  {
    code: '10',
    defaultPoints: -2,
    shortTitle: 'Không chuẩn bị bài/dụng cụ học tập',
    description: 'Không làm bài tập về nhà, không soạn bài theo yêu cầu của GVBM; không mang tập, sách, đồ dùng học tập.',
    category: 'learning',
  },
  {
    code: '11',
    defaultPoints: -2,
    shortTitle: 'Sai quy định bàn ghế/cây kiểng',
    description: 'Ngồi lên bàn, đứng trên ghế trong lớp; ngồi/đứng trên ghế đá sân trường; bẻ cành cây kiểng theo nội dung nguồn.',
    category: 'safety_behavior',
  },
  {
    code: '12',
    defaultPoints: -2,
    shortTitle: 'Vệ sinh lớp dơ',
    description: 'Vệ sinh lớp không đạt yêu cầu (không quét lớp, không lau bảng, hành lang có rác, rác hộc bàn, không đổ rác đúng giờ).',
    category: 'sanitation',
  },
  {
    code: '13',
    defaultPoints: -4,
    shortTitle: 'Quậy phá, ném đồ ồn ào',
    description: 'Quậy phá, chọi ném nhau gây ồn ào mất trật tự trong giờ sinh hoạt, hoạt động chuyên đề, ngoại khóa, tham quan,...',
    category: 'order',
  },
  {
    code: '14',
    defaultPoints: -4,
    shortTitle: 'Vắng không phép',
    description: 'Nghỉ học không phép; Nghỉ không phép các buổi lễ, hoạt động ngoài giờ chính khóa,...',
    category: 'order',
  },
  {
    code: '15',
    defaultPoints: -4,
    shortTitle: 'Buôn bán trái quy định',
    description: 'Tự ý đem đồ ăn thức uống hay các đồ vật khác vào buôn bán trong trường học khi không có sự cho phép của giáo viên.',
    category: 'safety_behavior',
    requiresTeacherPermissionCheck: true,
  },
  {
    code: '16',
    defaultPoints: -6,
    shortTitle: 'Chất kích thích, leo rào, cờ bạc',
    description: 'Leo hàng rào, hút thuốc, sử dụng các chất kích thích (bị cấm), cờ bạc, mê tín dị đoan theo nội dung nguồn.',
    category: 'safety_behavior',
  },
  {
    code: '17',
    defaultPoints: -6,
    shortTitle: 'Chửi thề, ngôn ngữ thiếu văn hóa',
    description: 'Chửi thề, nói tục, ngôn ngữ thiếu văn hóa hoặc hành vi giao tiếp thiếu văn minh với bạn bè.',
    category: 'ethics',
  },
  {
    code: '18',
    defaultPoints: -6,
    shortTitle: 'Gây lộn, đánh nhau không hung khí',
    description: 'Gây lộn, nói xấu nhau, gây chia rẽ; Đánh nhau tay không do không kiềm chế được (không gây thương tích).',
    category: 'ethics',
  },
  {
    code: '19',
    defaultPoints: -6,
    shortTitle: 'Trốn tiết, ngoài giờ (cú pháp gốc)',
    description: 'Trốn tiết giờ học, dự lễ, các buổi hoạt động ngoài giờ chính khóa (cú pháp văn bản gốc mơ hồ cần chờ xác nhận).',
    category: 'order',
  },
  {
    code: '20',
    defaultPoints: -6,
    shortTitle: 'Trộm cắp vặt',
    description: 'Trộm cắp vặt trong trường học hoặc tài sản của bạn bè, tập thể.',
    category: 'ethics',
  },
  {
    code: '21',
    defaultPoints: -6,
    shortTitle: 'Viết vẽ, hư hại tài sản trường',
    description: 'Viết, vẽ lên mặt bàn, tường; làm hư hỏng tài sản nhà trường.',
    category: 'safety_behavior',
  },
  {
    code: '22',
    defaultPoints: -6,
    shortTitle: 'Văn hóa phẩm độc hại',
    description: 'Lưu hành hoặc sử dụng ấn phẩm, văn hóa phẩm độc hại có ảnh hưởng xấu.',
    category: 'ethics',
  },
  {
    code: '23',
    defaultPoints: -6,
    shortTitle: 'Vi phạm chuẩn mực văn hóa mạng',
    description: 'Vi phạm chuẩn mực ứng xử văn hóa của học sinh trong nhà trường hoặc trên không gian mạng.',
    category: 'ethics',
  },
  {
    code: '24',
    defaultPoints: -6,
    shortTitle: 'Sử dụng điện thoại trái phép',
    description: 'Sử dụng điện thoại di động không được phép. Phải xác nhận câu hỏi: "Giáo viên có cho phép sử dụng không?" trước khi lập báo cáo.',
    category: 'phone',
    requiresTeacherPermissionCheck: true,
  },
];

/**
 * Format specific deduction rationale according to QĐ 525 regulations:
 * Example output: "-2đ vì lý do Đi học trễ mốc quy định (Mã 08) [Ngày 2026-10-08 · Sáng tiết 1]: Đi trễ 10 phút"
 */
export function formatIncidentDeductionRationale(
  inc: {
    conduct_code?: string | null;
    base_deduction?: number;
    effective_deduction?: number;
    notes?: string;
    other_category_description?: string;
    date?: string;
    session?: 'morning' | 'afternoon' | string;
    period?: number;
  },
  catalog: ConductRuleItem[] = OFFICIAL_CONDUCT_CATALOG
): string {
  const points = Math.abs(
    (inc.effective_deduction && inc.effective_deduction !== 0)
      ? inc.effective_deduction
      : (inc.base_deduction || 2)
  );

  const rule = catalog.find((c) => c.code === inc.conduct_code);
  const reasonName = rule
    ? rule.shortTitle
    : inc.conduct_code
    ? `Vi phạm Mã ${inc.conduct_code}`
    : 'Vi phạm nội quy';

  const codeStr = inc.conduct_code ? ` (Mã ${inc.conduct_code})` : '';

  // Format Date & Session/Period
  let timeStr = '';
  if (inc.date) {
    const sessionLabel = inc.session === 'morning' ? 'Sáng' : inc.session === 'afternoon' ? 'Chiều' : inc.session || '';
    const periodLabel = inc.period ? ` tiết ${inc.period}` : '';
    const timeDetail = [sessionLabel, periodLabel].filter(Boolean).join('');
    timeStr = ` [Ngày ${inc.date}${timeDetail ? ` · ${timeDetail}` : ''}]`;
  }

  const detailNotes = inc.notes || inc.other_category_description;
  const notesStr = detailNotes && detailNotes.trim() ? `: ${detailNotes.trim()}` : '';

  return `-${points}đ vì lý do ${reasonName}${codeStr}${timeStr}${notesStr}`;
}
