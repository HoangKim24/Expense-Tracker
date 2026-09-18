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

type TimeRange = "this-month" | "last-month" | "all";

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

  // 1. Lọc theo khoảng thời gian thực tế
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (timeRange === "this-month") {
      return transactions.filter((t) => {
        const d = new Date(t.transactionDate);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      });
    }

    if (timeRange === "last-month") {
      const lastMonthDate = new Date(currentYear, currentMonth - 1, 1);
      const targetYear = lastMonthDate.getFullYear();
      const targetMonth = lastMonthDate.getMonth();
      return transactions.filter((t) => {
        const d = new Date(t.transactionDate);
        return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
      });
    }

    return transactions;
  }, [transactions, timeRange]);

  // 2. Tính toán tổng chi và phân bổ danh mục theo dữ liệu thực
  const stats = useMemo(() => {
    const expenseTx = filteredTransactions.filter((t) => t.type === TransactionType.Expense);
    const incomeTx = filteredTransactions.filter((t) => t.type === TransactionType.Income);

    const totalExpense = expenseTx.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = incomeTx.reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;

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

    return { totalExpense, totalIncome, balance, categoryBreakdown };
  }, [filteredTransactions]);

  // 3. Tính toán Insight thông minh thực tế (Không gán cứng)
  const insights = useMemo(() => {
    const now = new Date();
    const todayDay = now.getDate();
    const daysCount = timeRange === "this-month" ? Math.max(todayDay, 1) : 30;
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

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 px-4 pt-4">
      {/* Header & Bộ lọc thời gian */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Phân Tích Chi Tiêu</h1>
          <p className="text-xs text-slate-400">Dữ liệu tính toán thời gian thực</p>
        </div>

        {/* Tab chọn thời gian */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setTimeRange("this-month")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              timeRange === "this-month" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            Tháng này
          </button>
          <button
            type="button"
            onClick={() => setTimeRange("last-month")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              timeRange === "last-month" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            Tháng trước
          </button>
          <button
            type="button"
            onClick={() => setTimeRange("all")}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              timeRange === "all" ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            Tất cả
          </button>
        </div>
      </div>

      {/* 1. Thẻ Insight Thông Minh (Được tính toán động 100% từ Database) */}
      <section className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-sm space-y-3.5">
        <div className="flex items-center gap-2 text-amber-400">
          <Lightbulb size={18} />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-white">Insight Thông Minh</h2>
        </div>

        <div className="grid gap-2.5">
          {/* Insight 1: Danh mục chi nhiều nhất */}
          {insights.topCategory ? (
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start gap-3">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                <PieChart size={18} />
              </span>
              <div className="text-xs text-slate-300 leading-relaxed">
                Chi tiêu nhiều nhất cho{" "}
                <span className="font-extrabold text-white" style={{ color: insights.topCategory.color }}>
                  {insights.topCategory.name}
                </span>{" "}
                với{" "}
                <span className="font-extrabold text-rose-400">
                  {formatCurrency(insights.topCategory.amount)}
                </span>{" "}
                (chiếm <span className="font-bold text-white">{Math.round(insights.topCategory.percentage)}%</span> tổng chi).
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 text-xs text-slate-400 text-center">
              Chưa có dữ liệu chi tiêu trong khoảng thời gian này.
            </div>
          )}

          {/* Insight 2: Trung bình mỗi ngày */}
          {insights.dailyAverage > 0 && (
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start gap-3">
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                <Calendar size={18} />
              </span>
              <div className="text-xs text-slate-300 leading-relaxed">
                Mức chi tiêu trung bình:{" "}
                <span className="font-extrabold text-white">
                  {formatCurrency(Math.round(insights.dailyAverage))} / ngày
                </span>
                .
              </div>
            </div>
          )}

          {/* Insight 3: So sánh Tuần này so với Tuần trước */}
          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-start gap-3">
            <span
              className={`p-2 rounded-xl shrink-0 ${
                insights.weekDiffPercent > 0
                  ? "bg-rose-500/10 text-rose-400"
                  : "bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {insights.weekDiffPercent > 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            </span>
            <div className="text-xs text-slate-300 leading-relaxed">
              {insights.lastWeekExpenses === 0 ? (
                <>Tuần này đã chi <span className="font-extrabold text-white">{formatCurrency(insights.thisWeekExpenses)}</span> (tuần trước không có chi tiêu).</>
              ) : insights.weekDiffPercent > 0 ? (
                <>
                  Tuần này chi tiêu <span className="font-bold text-rose-400">tăng {insights.weekDiffPercent}%</span> so với tuần trước ({formatCurrency(insights.thisWeekExpenses)} vs {formatCurrency(insights.lastWeekExpenses)}).
                </>
              ) : (
                <>
                  Tuần này chi tiêu <span className="font-bold text-emerald-400">giảm {Math.abs(insights.weekDiffPercent)}%</span> so với tuần trước (bạn đang tiết kiệm tốt!).
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. Biểu Đồ Phân Bổ Danh Mục (Dữ liệu thực từ Database) */}
      <section className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-white">Phân Bổ Danh Mục</h2>
            <p className="text-xs text-slate-400 mt-0.5">Tổng chi: {formatCurrency(stats.totalExpense)}</p>
          </div>
        </div>

        {/* Thanh Progress và Danh sách chi tiết */}
        <div className="space-y-3">
          {stats.categoryBreakdown.map((cat) => (
            <div key={cat.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: cat.color || "#3b82f6" }}
                  />
                  <span className="text-slate-200">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{formatCurrency(cat.amount)}</span>
                  <span className="text-white w-10 text-right">{Math.round(cat.percentage)}%</span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(cat.percentage, 100)}%`,
                    backgroundColor: cat.color || "#3b82f6",
                  }}
                />
              </div>
            </div>
          ))}

          {!isLoading && stats.categoryBreakdown.length === 0 && (
            <p className="text-center text-xs text-slate-500 py-6">Chưa có giao dịch nào trong khoảng thời gian này.</p>
          )}
        </div>
      </section>

      {/* 3. So Sánh Tuần Này vs Tuần Trước (Cột tỉ lệ thật) */}
      <section className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-white">So Sánh Chi Tiêu Tuần</h2>
            <p className="text-xs text-slate-400 mt-0.5">Đo lường nhịp độ chi tiêu thực tế</p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
              insights.weekDiffPercent > 0
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}
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
            <div className="flex items-end justify-around h-44 pt-6 bg-slate-950 rounded-2xl p-4 border border-slate-800/80">
              {/* Cột Tuần Trước */}
              <div className="flex flex-col items-center gap-2 w-24 h-full justify-end">
                <span className="text-[11px] font-bold text-slate-400">
                  {formatCurrency(insights.lastWeekExpenses)}
                </span>
                <div
                  style={{ height: `${heightLast}%` }}
                  className="w-14 rounded-t-xl bg-slate-800 border-t border-slate-700 transition-all duration-500"
                />
                <span className="text-xs font-bold text-slate-400">Tuần trước</span>
              </div>

              {/* Cột Tuần Này */}
              <div className="flex flex-col items-center gap-2 w-24 h-full justify-end">
                <span className="text-[11px] font-bold text-blue-400">
                  {formatCurrency(insights.thisWeekExpenses)}
                </span>
                <div
                  style={{ height: `${heightThis}%` }}
                  className="w-14 rounded-t-xl bg-gradient-to-t from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/30 transition-all duration-500"
                />
                <span className="text-xs font-bold text-blue-400">Tuần này</span>
              </div>
            </div>
          );
        })()}
      </section>
    </motion.div>
  );
}
