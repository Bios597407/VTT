import * as XLSX from 'xlsx';
import { Student, WeekScoreSnapshot, AttendanceRecord, Incident, RewardRecord, ConductLevel } from '../types';
import { formatStudentWeeklyAttendance, getWeekDateRange } from '../domain/scoring/scoringEngine';

export interface ImportStudentRow {
  stt?: number | string;
  student_code: string;
  last_name: string;
  first_name: string;
  full_name: string;
  status?: string;
}

export interface ImportValidationResult {
  fingerprint: string;
  totalRows: number;
  validRows: ImportStudentRow[];
  errors: { row: number; column: string; message: string }[];
  duplicateCodesInFile: string[];
}

export class ExcelService {
  /**
   * Parse an uploaded Excel file (.xlsx, .xls) for student roster import
   */
  static async parseStudentRosterFile(file: File): Promise<ImportValidationResult> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Convert sheet to array of rows
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { header: 1 });

    const errors: { row: number; column: string; message: string }[] = [];
    const validRows: ImportStudentRow[] = [];
    const codeSet = new Set<string>();
    const duplicateCodes: string[] = [];

    // Find header row
    let headerRowIndex = -1;
    let colIndices = {
      stt: -1,
      code: -1,
      lastName: -1,
      firstName: -1,
      fullName: -1,
    };

    for (let i = 0; i < Math.min(rawData.length, 10); i++) {
      const row = rawData[i] as any[];
      if (!row || !Array.isArray(row)) continue;

      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').trim().toLowerCase();
        if (cell === 'stt' || cell === 'số tt') colIndices.stt = j;
        if (cell.includes('mã') || cell.includes('mã số') || cell.includes('student code')) colIndices.code = j;
        if (cell === 'họ và' || cell === 'họ và tên đệm' || cell === 'họ') colIndices.lastName = j;
        if (cell === 'tên' || cell === 'first name') colIndices.firstName = j;
        if (cell === 'họ và tên' || cell === 'họ tên') colIndices.fullName = j;
      }

      if (colIndices.code !== -1 || colIndices.fullName !== -1 || (colIndices.lastName !== -1 && colIndices.firstName !== -1)) {
        headerRowIndex = i;
        break;
      }
    }

    if (headerRowIndex === -1) {
      // Default standard layout fallback
      colIndices = { stt: 0, code: 1, lastName: 2, firstName: 3, fullName: -1 };
      headerRowIndex = 0;
    }

    // Process data rows
    for (let r = headerRowIndex + 1; r < rawData.length; r++) {
      const row = rawData[r] as any[];
      if (!row || row.length === 0) continue;

      const codeVal = colIndices.code !== -1 ? String(row[colIndices.code] || '').trim() : '';
      let lastNameVal = colIndices.lastName !== -1 ? String(row[colIndices.lastName] || '').trim() : '';
      let firstNameVal = colIndices.firstName !== -1 ? String(row[colIndices.firstName] || '').trim() : '';
      const fullNameVal = colIndices.fullName !== -1 ? String(row[colIndices.fullName] || '').trim() : '';

      if (!codeVal && !lastNameVal && !fullNameVal) continue; // blank row

      if (!codeVal) {
        errors.push({ row: r + 1, column: 'Mã số', message: 'Mã học sinh không được để trống' });
        continue;
      }

      // Check duplicates in file
      if (codeSet.has(codeVal)) {
        duplicateCodes.push(codeVal);
        errors.push({ row: r + 1, column: 'Mã số', message: `Mã học sinh '${codeVal}' bị trùng lặp trong tệp` });
        continue;
      }
      codeSet.add(codeVal);

      // Name resolution
      let resolvedFullName = '';
      if (fullNameVal) {
        resolvedFullName = fullNameVal;
        if (!firstNameVal) {
          const parts = fullNameVal.split(' ');
          firstNameVal = parts.pop() || '';
          lastNameVal = parts.join(' ');
        }
      } else {
        resolvedFullName = `${lastNameVal} ${firstNameVal}`.trim();
      }

      if (!resolvedFullName) {
        errors.push({ row: r + 1, column: 'Họ và tên', message: 'Tên học sinh không hợp lệ' });
        continue;
      }

      validRows.push({
        stt: colIndices.stt !== -1 ? row[colIndices.stt] : validRows.length + 1,
        student_code: codeVal,
        last_name: lastNameVal,
        first_name: firstNameVal,
        full_name: resolvedFullName,
        status: 'active',
      });
    }

    // Generate deterministic fingerprint
    const fingerprint = `${file.name}_${validRows.length}_${codeSet.size}_${file.size}`;

    return {
      fingerprint,
      totalRows: validRows.length + errors.length,
      validRows,
      errors,
      duplicateCodesInFile: duplicateCodes,
    };
  }

  /**
   * Export Weekly Conduct Scores to real .xlsx
   */
  static exportWeeklyScoreExcel(
    students: Student[],
    snapshots: WeekScoreSnapshot[],
    weekNumber: number,
    weekName?: string,
    attendance: AttendanceRecord[] = [],
    fullRangeText?: string
  ): void {
    const range = getWeekDateRange(weekNumber);

    const data = students.map((stu, index) => {
      const snap = snapshots.find((s) => s.student_id === stu.id);
      const attSummary = formatStudentWeeklyAttendance(stu.id, weekNumber, attendance);
      return {
        'STT': index + 1,
        'Mã học sinh': stu.student_code,
        'Họ và tên': stu.full_name,
        'Điểm ban đầu': 8,
        'Điểm khen thưởng (+)': snap ? snap.reward_points : 0,
        'Điểm trừ (-)': snap ? snap.deduction_points : 0,
        'Chuyên cần': attSummary.shortText,
        'Điểm thô': snap?.raw_week_score ?? 'Chưa tính',
        'Điểm chính thức': snap?.official_week_score ?? 'Chưa tính',
        'Trạng thái': snap?.status === 'locked' ? 'Đã khóa' : 'Bản nháp',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Tuan_${weekNumber}`);
    const safeDateRangeStr = range.shortRange.replace(/\//g, '-');
    XLSX.writeFile(workbook, `VTT_10A16_Diem_Ren_Luyen_Tuan_${weekNumber}_(${safeDateRangeStr}).xlsx`);
  }

  /**
   * Export Semester Conduct Review to real .xlsx
   */
  static exportSemesterReviewExcel(
    students: Student[],
    snapshots: {
      student: Student;
      calculatedScore: number | null;
      suggestedLevel: ConductLevel;
      finalizedLevel: ConductLevel;
      permittedAbsences: number;
      unpermittedAbsences: number;
      phoneViolations: number;
      rationale: string;
    }[],
    semesterName: string
  ): void {
    const data = snapshots.map((item, index) => ({
      'STT': index + 1,
      'Mã học sinh': item.student.student_code,
      'Họ và tên': item.student.full_name,
      'Điểm số TB các tháng': item.calculatedScore ?? 'Chưa đủ dữ liệu',
      'Xếp loại đề xuất': item.suggestedLevel,
      'Xếp loại GVCN chốt': item.finalizedLevel,
      'Nghỉ có phép': item.permittedAbsences,
      'Nghỉ không phép': item.unpermittedAbsences,
      'Vi phạm ĐT (V24)': item.phoneViolations,
      'Căn cứ / Lý do GVCN': item.rationale,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, semesterName);
    XLSX.writeFile(workbook, `VTT_10A16_Danh_Gia_Ren_Luyen_${semesterName}.xlsx`);
  }

  /**
   * Export Attendance History to real .xlsx
   */
  static exportAttendanceExcel(
    attendance: AttendanceRecord[],
    students: Student[]
  ): void {
    const studentMap = new Map(students.map((s) => [s.id, s]));
    const data = attendance.map((att, idx) => {
      const stu = studentMap.get(att.student_id);
      return {
        'STT': idx + 1,
        'Ngày': att.date,
        'Buổi': att.session === 'morning' ? 'Sáng' : 'Chiều',
        'Mã HS': stu?.student_code || att.student_id,
        'Họ và tên': stu?.full_name || 'N/A',
        'Trạng thái': att.status,
        'Giờ đến': att.arrival_time || '',
        'Lý do': att.reason || '',
        'Miễn trừ chính đáng': att.is_legitimate_exception ? 'Có' : 'Không',
        'Lý do miễn trừ': att.exception_reason || '',
        'Mã VnEdu': att.vnedu_ref_number || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Diem_Danh');
    XLSX.writeFile(workbook, `VTT_10A16_Lich_Su_Diem_Danh.xlsx`);
  }

  /**
   * Export Incidents History to real .xlsx
   */
  static exportIncidentsExcel(
    incidents: Incident[],
    students: Student[]
  ): void {
    const studentMap = new Map(students.map((s) => [s.id, s]));
    const data = incidents.map((inc, idx) => {
      const stu = studentMap.get(inc.student_id);
      return {
        'STT': idx + 1,
        'Ngày': inc.date,
        'Buổi': inc.session === 'morning' ? 'Sáng' : 'Chiều',
        'Mã HS': stu?.student_code || inc.student_id,
        'Họ và tên': stu?.full_name || 'N/A',
        'Mã vi phạm': inc.conduct_code || 'Sự việc khác',
        'Nội dung khác': inc.other_category_description || '',
        'Trạng thái sự việc': inc.incident_status,
        'Hiệu lực điểm': inc.score_effect_status,
        'Điểm trừ chính thức': inc.effective_deduction,
        'Người báo cáo': inc.reported_by,
        'Vai trò người báo': inc.reporter_role,
        'Ghi chú': inc.notes || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Su_Viec');
    XLSX.writeFile(workbook, `VTT_10A16_Lich_Su_Vi_Pham.xlsx`);
  }
}
