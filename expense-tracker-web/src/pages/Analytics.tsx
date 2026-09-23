import { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Lightbulb, 
  PieChart, 
  Calendar
} from "lucide-react";
import { motion } from "framer-motion";
import { getTransactions, TransactionType, type TransactionDto } from "../lib/api";
import { 
  isToday, 
  isThisWeek, 
  isThisMonth, 
  isLastMonth, 
  isSameDay, 
  getStartOfWeek, 
  formatWeekRange 
} from "../lib/dateUtils";
import { cn } from "../lib/utils";

type TimeRange = "today" | "this-week" | "this-month" | "last-month" | "all";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>("this-month");
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getTransactions()
      .then(setTransactions)
      .catch(() => setTransactions([]))
      .finally(() => setIsLoading(false));
  }, []);

  const formatCurrency = (val: number) => `${new Intl.NumberFormat("vi-VN").format(val)}đ`;

  // 1. Lọc theo khoảng thời gian thực tế (Hôm nay / Tuần này / Tháng này / Tháng trước / Tất cả)
  const filteredTransactions = useMemo(() => {
    if (timeRange === "today") {
      return transactions.filter((t) => isToday(t.transactionDate));
    }
    if (timeRange === "this-week") {
      return transactions.filter((t) => isThisWeek(t.transactionDate));
    }
    if (timeRange === "this-month") {
      return transactions.filter((t) => isThisMonth(t.transactionDate));
    }
    if (timeRange === "last-month") {
      return transactions.filter((t) => isLastMonth(t.transactionDate));
    }
    return transactions;
  }, [transactions, timeRange]);

  // 2. Tính toán tổng chi và phân bổ danh mục theo dữ liệu thực
  const stats = useMemo(() => {
    const expenseTx = filteredTransactions.filter((t) => t.type === TransactionType.Expense);
    const totalExpense = expenseTx.reduce((sum, t) => sum + t.amount, 0);

    // Nhóm theo tên danh mục thực tế từ Database
    const categoryMap: Record<string, { amount: number; color?: string }> = {};
    expenseTx.forEach((t) => {
      const name = t.categoryName || "Khác";
      if (!categoryMap[name]) {
        categoryMap[name] = { amount: 0, color: t.categoryColor || "#64748b" };
      }
      categoryMap[name].amount += t.amount;
    });

    const categoryBreakdown = Object.entries(categoryMap)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        color: data.color,
        percentage: totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return { totalExpense, categoryBreakdown };
  }, [filteredTransactions]);

  // 3. Tính toán chi tiêu 7 ngày của tuần này (Thứ 2 đến CN)
  const thisWeekDailyTotals = useMemo(() => {
    const startOfWeek = getStartOfWeek();
    const today = new Date();

    return Array.from({ length: 7 }, (_, i) => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);

      const dayAmount = transactions
        .filter((t) => t.type === TransactionType.Expense && isSameDay(t.transactionDate, dayDate))
        .reduce((sum, t) => sum + t.amount, 0);

      const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
      return {
        label: dayLabels[i],
        dateStr: `${dayDate.getDate()}/${dayDate.getMonth() + 1}`,
        amount: dayAmount,
        isToday: isSameDay(dayDate, today),
      };
    });
  }, [transactions]);

  const maxThisWeekDayAmount = Math.max(...thisWeekDailyTotals.map((d) => d.amount), 1);

  // 4. Tính toán Insight thông minh thực tế (Không gán cứng)
  const insights = useMemo(() => {
    const now = new Date();
    let daysCount = 30;
    if (timeRange === "today") {
      daysCount = 1;
    } else if (timeRange === "this-week") {
      const dayOfWeek = (now.getDay() + 6) % 7 + 1; // Thứ 2 = 1, CN = 7
      daysCount = Math.max(dayOfWeek, 1);
    } else if (timeRange === "this-month") {
      daysCount = Math.max(now.getDate(), 1);
    }

    const dailyAverage = stats.totalExpense > 0 ? stats.totalExpense / daysCount : 0;
    const topCategory = stats.categoryBreakdown[0] || null;

    // So sánh tuần này vs tuần trước thực tế
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = (today.getDay() + 6) % 7; // Thứ 2 = 0
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(today.getDate() - dayOfWeek);

    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setMilliseconds(-1);

    const thisWeekExpenses = transactions
      .filter((t) => {
        const d = new Date(t.transactionDate);
        return t.type === TransactionType.Expense && d >= startOfThisWeek;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    const lastWeekExpenses = transactions
      .filter((t) => {
        const d = new Date(t.transactionDate);
        return t.type === TransactionType.Expense && d >= startOfLastWeek && d <= endOfLastWeek;
      })
      .reduce((sum, t) => sum + t.amount, 0);

    let weekDiffPercent = 0;
    if (lastWeekExpenses > 0) {
      weekDiffPercent = Math.round(((thisWeekExpenses - lastWeekExpenses) / lastWeekExpenses) * 100);
    }

    return {
      dailyAverage,
      topCategory,
      thisWeekExpenses,
      lastWeekExpenses,
      weekDiffPercent,
    };
  }, [stats, transactions, timeRange]);

  const timeRangeOptions: Array<{ value: TimeRange; label: string }> = [
    { value: "today", label: "Hôm nay" },
    { value: "this-week", label: "Tuần này" },
    { value: "this-month", label: "Tháng này" },
    { value: "last-month", label: "Tháng trước" },
    { value: "all", label: "Tất cả" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 px-4 pt-4 pb-12">
      {/* Header & Bộ lọc thời gian */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Phân Tích Chi Tiêu</h1>
          <p className="text-xs text-zinc-400">Dữ liệu tính toán thời gian thực</p>
        </div>

        {/* Tab chọn thời gian - Segmented Control */}
        <div className="flex bg-zinc-950 p-1 rounded-2xl border border-white/[0.08] overflow-x-auto no-scrollbar gap-0.5 max-w-full">
          {timeRangeOptions.map((opt) => {
            const isSelected = timeRange === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTimeRange(opt.value)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition active:scale-95",
                  isSelected
                    ? "bg-white text-black font-bold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Thẻ Insight Thông Minh (Được tính toán động 100% từ Database) */}
      <section className="rounded-3xl bg-zinc-950 border border-white/[0.08] p-5 shadow-sm space-y-3.5">
        <div className="flex items-center gap-2 text-zinc-300">
          <Lightbulb size={16} className="text-white" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">Insight Thông Minh</h2>
        </div>

        <div className="grid gap-2.5">
          {/* Insight 1: Danh mục chi nhiều nhất */}
          {insights.topCategory ? (
            <div className="p-3.5 rounded-2xl bg-black border border-white/[0.06] flex items-start gap-3">
              <span className="p-2 rounded-xl bg-white/[0.06] text-white shrink-0">
                <PieChart size={16} />
              </span>
              <div className="text-xs text-zinc-300 leading-relaxed">
                Chi tiêu nhiều nhất cho{" "}
                <span className="font-bold text-white">
                  {insights.topCategory.name}
                </span>{" "}
                với{" "}
                <span className="font-bold text-white">
                  {formatCurrency(insights.topCategory.amount)}
                </span>{" "}
                (chiếm <span className="font-bold text-white">{Math.round(insights.topCategory.percentage)}%</span> tổng chi).
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-black border border-white/[0.06] text-xs text-zinc-400 text-center">
              Chưa có dữ liệu chi tiêu trong khoảng thời gian này.
            </div>
          )}

          {/* Insight 2: Trung bình mỗi ngày */}
          {insights.dailyAverage > 0 && (
            <div className="p-3.5 rounded-2xl bg-black border border-white/[0.06] flex items-start gap-3">
              <span className="p-2 rounded-xl bg-white/[0.06] text-white shrink-0">
                <Calendar size={16} />
              </span>
              <div className="text-xs text-zinc-300 leading-relaxed">
                Mức chi tiêu trung bình:{" "}
                <span className="font-bold text-white">
                  {formatCurrency(Math.round(insights.dailyAverage))} / ngày
                </span>
                .
              </div>
            </div>
          )}

          {/* Insight 3: So sánh Tuần này so với Tuần trước */}
          <div className="p-3.5 rounded-2xl bg-black border border-white/[0.06] flex items-start gap-3">
            <span
              className={`p-2 rounded-xl shrink-0 ${
                insights.weekDiffPercent > 0
                  ? "bg-white/[0.06] text-white"
                  : "bg-white/[0.06] text-white"
              }`}
            >
              {insights.weekDiffPercent > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </span>
            <div className="text-xs text-zinc-300 leading-relaxed">
              {insights.lastWeekExpenses === 0 ? (
                <>Tuần này đã chi <span className="font-bold text-white">{formatCurrency(insights.thisWeekExpenses)}</span> (tuần trước không có chi tiêu).</>
              ) : insights.weekDiffPercent > 0 ? (
                <>
                  Tuần này chi tiêu <span className="font-bold text-white">tăng {insights.weekDiffPercent}%</span> so với tuần trước ({formatCurrency(insights.thisWeekExpenses)} vs {formatCurrency(insights.lastWeekExpenses)}).
                </>
              ) : (
                <>
                  Tuần này chi tiêu <span className="font-bold text-white">giảm {Math.abs(insights.weekDiffPercent)}%</span> so với tuần trước (bạn đang tiết kiệm tốt!).
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Biểu Đồ Phân Bổ Danh Mục (Dữ liệu thực từ Database) */}
      <section className="rounded-3xl bg-zinc-950 border border-white/[0.08] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Phân Bổ Danh Mục</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Tổng chi: {formatCurrency(stats.totalExpense)}</p>
          </div>
        </div>

        {/* Thanh Progress và Danh sách chi tiết */}
        <div className="space-y-3.5">
          {stats.categoryBreakdown.map((cat) => (
            <div key={cat.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full bg-white/70"
                  />
                  <span className="text-zinc-200">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">{formatCurrency(cat.amount)}</span>
                  <span className="text-white font-bold w-10 text-right">{Math.round(cat.percentage)}%</span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-white"
                  style={{
                    width: `${Math.min(cat.percentage, 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}

          {!isLoading && stats.categoryBreakdown.length === 0 && (
            <p className="text-center text-xs text-zinc-500 py-6">Chưa có giao dịch nào trong khoảng thời gian này.</p>
          )}
        </div>
      </section>

      {/* 2.5 Biểu Đồ Phân Bổ 7 Ngày Trong Tuần (Chỉ hiện khi chọn Tuần này) */}
      {timeRange === "this-week" && (
        <section className="rounded-3xl bg-zinc-950 border border-white/[0.08] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-white">Chi Tiêu Từng Ngày Trong Tuần</h2>
              <p className="text-xs text-zinc-400 mt-0.5">{formatWeekRange()}</p>
            </div>
          </div>
          <div className="grid h-36 grid-cols-7 items-end gap-2 pt-4">
            {thisWeekDailyTotals.map((day) => {
              const height = day.amount ? Math.max((day.amount / maxThisWeekDayAmount) * 100, 8) : 4;
              return (
                <div key={day.label} className="flex h-full flex-col items-center justify-end gap-1.5">
                  <span className="text-[10px] font-semibold text-zinc-500 truncate max-w-full">
                    {day.amount > 0 ? `${Math.round(day.amount / 1000)}k` : ""}
                  </span>
                  <div
                    title={`${day.label} (${day.dateStr}): ${formatCurrency(day.amount)}`}
                    style={{ height: `${height}%` }}
                    className={cn(
                      "w-full rounded-xl transition-all duration-300",
                      day.isToday
                        ? "bg-white shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                        : "bg-zinc-800/80 hover:bg-zinc-700"
                    )}
                  />
                  <span className={cn("text-[11px] font-semibold", day.isToday ? "text-white font-bold" : "text-zinc-500")}>
                    {day.label}
                  </span>
                  <span className="text-[9px] text-zinc-600">{day.dateStr}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. So Sánh Tuần Này vs Tuần Trước (Cột tỉ lệ thật) */}
      <section className="rounded-3xl bg-zinc-950 border border-white/[0.08] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">So Sánh Chi Tiêu Tuần</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Đo lường nhịp độ chi tiêu thực tế</p>
          </div>
          <span
            className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/[0.06] border border-white/10 text-white"
          >
            {insights.weekDiffPercent > 0 ? `+${insights.weekDiffPercent}%` : `${insights.weekDiffPercent}%`}
          </span>
        </div>

        {/* Biểu đồ cột so sánh theo số tiền thật */}
        {(() => {
          const maxAmount = Math.max(insights.thisWeekExpenses, insights.lastWeekExpenses, 1);
          const heightLast = insights.lastWeekExpenses > 0 ? Math.max((insights.lastWeekExpenses / maxAmount) * 100, 8) : 4;
          const heightThis = insights.thisWeekExpenses > 0 ? Math.max((insights.thisWeekExpenses / maxAmount) * 100, 8) : 4;

          return (
            <div className="flex items-end justify-around h-44 pt-6 bg-black rounded-2xl p-4 border border-white/[0.06]">
              {/* Cột Tuần Trước */}
              <div className="flex flex-col items-center gap-2 w-24 h-full justify-end">
                <span className="text-[11px] font-medium text-zinc-400">
                  {formatCurrency(insights.lastWeekExpenses)}
                </span>
                <div
                  style={{ height: `${heightLast}%` }}
                  className="w-12 rounded-t-xl bg-zinc-800 border-t border-zinc-700 transition-all duration-500"
                />
                <span className="text-xs font-medium text-zinc-400">Tuần trước</span>
              </div>

              {/* Cột Tuần Này */}
              <div className="flex flex-col items-center gap-2 w-24 h-full justify-end">
                <span className="text-[11px] font-bold text-white">
                  {formatCurrency(insights.thisWeekExpenses)}
                </span>
                <div
                  style={{ height: `${heightThis}%` }}
                  className="w-12 rounded-t-xl bg-white shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-500"
                />
                <span className="text-xs font-bold text-white">Tuần này</span>
              </div>
            </div>
          );
        })()}
      </section>
    </motion.div>
  );
}
