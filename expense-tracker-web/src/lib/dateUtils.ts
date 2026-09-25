import { type TransactionDto, TransactionType } from "./api";

/**
 * So sánh 2 ngày có cùng ngày/tháng/năm không (theo múi giờ local)
 */
export function isSameDay(first: Date | string, second: Date | string): boolean {
  const d1 = new Date(first);
  const d2 = new Date(second);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Kiểm tra ngày có phải là ngày hôm nay không
 */
export function isToday(date: Date | string): boolean {
  return isSameDay(date, new Date());
}

/**
 * Kiểm tra ngày có phải là ngày hôm qua không
 */
export function isYesterday(date: Date | string): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

/**
 * Lấy ngày bắt đầu tuần (Thứ Hai 00:00:00)
 */
export function getStartOfWeek(refDate = new Date()): Date {
  const date = new Date(refDate);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Điều chỉnh sang Thứ 2
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Lấy ngày kết thúc tuần (Chủ Nhật 23:59:59)
 */
export function getEndOfWeek(refDate = new Date()): Date {
  const start = getStartOfWeek(refDate);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

/**
 * Kiểm tra ngày có nằm trong tuần này (Thứ 2 đến CN) không
 */
export function isThisWeek(date: Date | string, refDate = new Date()): boolean {
  const d = new Date(date);
  const start = getStartOfWeek(refDate);
  const end = getEndOfWeek(refDate);
  return d >= start && d <= end;
}

/**
 * Kiểm tra ngày có nằm trong tháng này không
 */
export function isThisMonth(date: Date | string, refDate = new Date()): boolean {
  const d = new Date(date);
  return d.getFullYear() === refDate.getFullYear() && d.getMonth() === refDate.getMonth();
}

/**
 * Kiểm tra ngày có nằm trong tháng trước không
 */
export function isLastMonth(date: Date | string, refDate = new Date()): boolean {
  const d = new Date(date);
  const targetYear = refDate.getMonth() === 0 ? refDate.getFullYear() - 1 : refDate.getFullYear();
  const targetMonth = refDate.getMonth() === 0 ? 11 : refDate.getMonth() - 1;
  return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
}

/**
 * Định dạng nhãn khoảng ngày tuần (ví dụ: "21/09 - 27/09/2026")
 */
export function formatWeekRange(refDate = new Date()): string {
  const start = getStartOfWeek(refDate);
  const end = getEndOfWeek(refDate);
  const formatPart = (d: Date) => 
    `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
  return `${formatPart(start)} - ${formatPart(end)}/${end.getFullYear()}`;
}

/**
 * Định dạng tiêu đề hiển thị thân thiện cho ngày (ví dụ: "Hôm nay, 23/09/2026", "Hôm qua, 22/09/2026", "Thứ Hai, 21/09/2026")
 */
export function formatDateHeading(dateStr: string | Date): string {
  const date = new Date(dateStr);
  const dayStr = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
  
  if (isToday(date)) {
    return `Hôm nay, ${dayStr}`;
  }
  if (isYesterday(date)) {
    return `Hôm qua, ${dayStr}`;
  }

  const weekdayNames = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];
  return `${weekdayNames[date.getDay()]}, ${dayStr}`;
}

export type DayGroup = {
  dateKey: string; // YYYY-MM-DD
  dateLabel: string;
  totalExpense: number;
  totalIncome: number;
  transactions: TransactionDto[];
};

/**
 * Chuyển đổi Date hoặc chuỗi ngày thành format chuẩn YYYY-MM-DD theo múi giờ local
 */
export function toDateKey(date: Date | string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Tính ngày liền kề (+1 ngày hoặc -1 ngày) từ dateKey chuẩn YYYY-MM-DD
 */
export function getOffsetDateKey(dateKey: string, offsetDays: number): string {
  const [year, month, day] = dateKey.split("-").map((num) => parseInt(num, 10));
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + offsetDays);
  return toDateKey(d);
}

export type DayStripItem = {
  dateKey: string; // YYYY-MM-DD
  dayOfWeek: string; // "CN", "T2", "T3"...
  dayOfMonth: number; // 24
  month: number; // 9
  isToday: boolean;
  isYesterday: boolean;
};

/**
 * Lấy danh sách n ngày gần nhất lùi dần từ hôm nay để hiển thị thanh trượt chọn ngày
 */
export function getRecentDaysStrip(count = 14): DayStripItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateKey = toDateKey(d);
    const weekdayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    return {
      dateKey,
      dayOfWeek: weekdayNames[d.getDay()],
      dayOfMonth: d.getDate(),
      month: d.getMonth() + 1,
      isToday: i === 0,
      isYesterday: i === 1,
    };
  });
}

/**
 * Gom nhóm danh sách giao dịch theo từng ngày và tính tổng chi tiêu mỗi ngày
 */
export function groupTransactionsByDate(transactions: TransactionDto[]): DayGroup[] {
  const groupsMap = new Map<string, DayGroup>();

  transactions.forEach((t) => {
    const dateKey = toDateKey(t.transactionDate);

    if (!groupsMap.has(dateKey)) {
      groupsMap.set(dateKey, {
        dateKey,
        dateLabel: formatDateHeading(t.transactionDate),
        totalExpense: 0,
        totalIncome: 0,
        transactions: [],
      });
    }

    const group = groupsMap.get(dateKey)!;
    group.transactions.push(t);
    if (t.type === TransactionType.Expense) {
      group.totalExpense += t.amount;
    } else if (t.type === TransactionType.Income) {
      group.totalIncome += t.amount;
    }
  });

  // Sắp xếp các ngày từ mới nhất đến cũ nhất
  return Array.from(groupsMap.values()).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}
