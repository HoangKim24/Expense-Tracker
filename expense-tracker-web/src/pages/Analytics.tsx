import { useState, useEffect, useMemo } from "react";
import { 
  TrendingUp, 
  TrendingDown, 
  Lightbulb, 
  PieChart, 
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ThumbsUp,
  Flame,
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
  getEndOfWeek,
  formatWeekRange
} from "../lib/dateUtils";
import { cn } from "../lib/utils";
import WeeklyBudgetCard from "../components/WeeklyBudgetCard";

type TimeRange = "today" | "this-week" | "this-month" | "last-month" | "all";

const WEEKLY_BUDGET_KEY = "weekly_budget";

/** Lấy ngày bắt đầu tuần cách đây N tuần */
function getStartOfWeekN(weeksAgo: number): Date {
  const now = new Date();
  const refDate = new Date(now);
  refDate.setDate(now.getDate() - weeksAgo * 7);
  return getStartOfWeek(refDate);
}

/** Lấy ngày kết thúc tuần cách đây N tuần */
function getEndOfWeekN(weeksAgo: number): Date {
  const now = new Date();
  const refDate = new Date(now);
  refDate.setDate(now.getDate() - weeksAgo * 7);
  return getEndOfWeek(refDate);
}

/** Tính tổng chi tiêu trong một khoảng ngày */
function sumExpensesInRange(transactions: TransactionDto[], start: Date, end: Date): number {
  return transactions
    .filter((t) => {
      const d = new Date(t.transactionDate);
      return t.type === TransactionType.Expense && d >= start && d <= end;
    })
    .reduce((sum, t) => sum + t.amount, 0);
}

/** Tính số ngày còn lại trong tuần từ hôm nay đến Chủ Nhật */
function getDaysRemainingInWeek(): number {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=CN, 1=T2, ..., 6=T7
  // CN (0) → 0 ngày còn lại (cuối tuần), T2 (1) → 6, T7 (6) → 1
  return dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
}

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>("this-month");
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Weekly budget state — lưu/đọc từ localStorage
  const [weeklyBudget, setWeeklyBudget] = useState<number | null>(() => {
    const saved = localStorage.getItem(WEEKLY_BUDGET_KEY);
    return saved ? Number(saved) : null;
  });

  const handleBudgetChange = (budget: number | null) => {
    setWeeklyBudget(budget);
    if (budget === null) {
      localStorage.removeItem(WEEKLY_BUDGET_KEY);
    } else {
      localStorage.setItem(WEEKLY_BUDGET_KEY, String(budget));
    }
  };

  useEffect(() => {
    getTransactions()
      .then(setTransactions)
      .catch(() => setTransactions([]))
      .finally(() => setIsLoading(false));
  }, []);

  const formatCurrency = (val: number) => `${new Intl.NumberFormat("vi-VN").format(val)}đ`;

  // 1. Lọc theo khoảng thời gian thực tế
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

  // 2. Tổng thu, tổng chi, số dư dòng tiền & phân bổ danh mục
  const stats = useMemo(() => {
    const expenseTx = filteredTransactions.filter((t) => t.type === TransactionType.Expense);
    const incomeTx = filteredTransactions.filter((t) => t.type === TransactionType.Income);
    const totalExpense = expenseTx.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = incomeTx.reduce((sum, t) => sum + t.amount, 0);
    const balance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalExpense) / totalIncome) * 100)) : 0;

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

    return { totalExpense, totalIncome, balance, savingsRate, categoryBreakdown };
  }, [filteredTransactions]);

  // 3. Chi tiêu 7 ngày của tuần này (T2→CN)
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

  // 4. Dữ liệu 4 tuần gần nhất cho multi-week comparison
  const multiWeekData = useMemo(() => {
    return Array.from({ length: 4 }, (_, i) => {
      // i=0 là tuần này, i=1 tuần trước, ...
      const weeksAgo = 3 - i; // Hiển thị từ cũ nhất đến mới nhất: 3,2,1,0
      const start = getStartOfWeekN(weeksAgo);
      const end = getEndOfWeekN(weeksAgo);
      const total = sumExpensesInRange(transactions, start, end);

      // Nhãn tuần
      const formatPart = (d: Date) =>
        `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label =
        weeksAgo === 0
          ? "Tuần này"
          : weeksAgo === 1
          ? "Tuần trước"
          : `${formatPart(start)}-${formatPart(end)}`;

      return { label, total, weeksAgo, start, end };
    });
  }, [transactions]);

  const maxMultiWeekAmount = Math.max(
    ...multiWeekData.map((w) => w.total),
    weeklyBudget ?? 1,
    1
  );

  // 5. Insight thông minh (kết hợp tuần này + ngân sách)
  const insights = useMemo(() => {
    const now = new Date();
    let daysCount = 30;
    if (timeRange === "today") {
      daysCount = 1;
    } else if (timeRange === "this-week") {
      const dayOfWeek = (now.getDay() + 6) % 7 + 1;
      daysCount = Math.max(dayOfWeek, 1);
    } else if (timeRange === "this-month") {
      daysCount = Math.max(now.getDate(), 1);
    }

    const dailyAverage = stats.totalExpense > 0 ? stats.totalExpense / daysCount : 0;
    const topCategory = stats.categoryBreakdown[0] || null;

    // Tuần này vs tuần trước
    const thisWeekData = multiWeekData.find((w) => w.weeksAgo === 0);
    const lastWeekData = multiWeekData.find((w) => w.weeksAgo === 1);
    const thisWeekExpenses = thisWeekData?.total ?? 0;
    const lastWeekExpenses = lastWeekData?.total ?? 0;

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
  }, [stats, multiWeekData, timeRange]);

  // 6. Budget-specific insights (tách riêng để dễ render)
  const budgetInsights = useMemo(() => {
    if (!weeklyBudget) return null;

    const { thisWeekExpenses, lastWeekExpenses, topCategory } = insights;
    const ratio = thisWeekExpenses / weeklyBudget;
    const remaining = weeklyBudget - thisWeekExpenses;
    const daysLeft = getDaysRemainingInWeek();
    const dailyBudgetLeft = daysLeft > 0 ? remaining / daysLeft : 0;

    const result: Array<{
      icon: React.ReactNode;
      text: React.ReactNode;
      type: "danger" | "warning" | "success" | "info";
    }> = [];

    if (ratio >= 1.0) {
      // Đã vượt ngân sách
      result.push({
        icon: <Flame size={15} />,
        type: "danger",
        text: (
          <>
            Tuần này đã chi{" "}
            <strong className="text-red-300">{formatCurrency(thisWeekExpenses)}</strong>,{" "}
            vượt ngân sách{" "}
            <strong className="text-red-300">{formatCurrency(Math.abs(remaining))}</strong>.
            Hãy dừng chi tiêu không cần thiết cho đến hết tuần.
          </>
        ),
      });
      if (topCategory) {
        result.push({
          icon: <AlertTriangle size={15} />,
          type: "danger",
          text: (
            <>
              Danh mục <strong className="text-red-300">{topCategory.name}</strong> chiếm{" "}
              <strong className="text-red-300">{Math.round(topCategory.percentage)}%</strong> tổng chi
              ({formatCurrency(topCategory.amount)}). Đây là nơi cần cắt giảm.
            </>
          ),
        });
      }
      if (lastWeekExpenses > 0) {
        const diff = thisWeekExpenses - lastWeekExpenses;
        result.push({
          icon: <TrendingUp size={15} />,
          type: "danger",
          text: (
            <>
              So với tuần trước ({formatCurrency(lastWeekExpenses)}), bạn đang chi{" "}
              <strong className="text-red-300">nhiều hơn {formatCurrency(Math.abs(diff))}</strong>.
            </>
          ),
        });
      }
    } else if (ratio >= 0.8) {
      // Gần giới hạn (80–100%)
      result.push({
        icon: <AlertTriangle size={15} />,
        type: "warning",
        text: (
          <>
            Bạn đã dùng{" "}
            <strong className="text-yellow-300">{Math.round(ratio * 100)}%</strong> ngân sách tuần.
            Chỉ còn lại{" "}
            <strong className="text-yellow-300">{formatCurrency(remaining)}</strong> —{" "}
            hãy chi tiêu cẩn thận!
          </>
        ),
      });
      if (daysLeft > 0) {
        result.push({
          icon: <Calendar size={15} />,
          type: "warning",
          text: (
            <>
              Còn <strong className="text-yellow-300">{daysLeft} ngày</strong> trong tuần. Mức an toàn
              mỗi ngày:{" "}
              <strong className="text-yellow-300">{formatCurrency(Math.round(dailyBudgetLeft))}</strong>.
            </>
          ),
        });
      }
      if (topCategory) {
        result.push({
          icon: <PieChart size={15} />,
          type: "warning",
          text: (
            <>
              <strong className="text-yellow-300">{topCategory.name}</strong> đang là khoản chi lớn nhất
              ({formatCurrency(topCategory.amount)}). Cân nhắc giảm bớt.
            </>
          ),
        });
      }
    } else if (ratio < 0.6 && daysLeft <= 2) {
      // Cuối tuần mà vẫn dưới 60% — tiết kiệm tốt
      const saved = weeklyBudget - thisWeekExpenses;
      result.push({
        icon: <ThumbsUp size={15} />,
        type: "success",
        text: (
          <>
            Tuyệt vời! Cuối tuần rồi mà bạn vẫn còn dư{" "}
            <strong className="text-emerald-300">{formatCurrency(saved)}</strong> so với ngân sách.
          </>
        ),
      });
      if (lastWeekExpenses > 0 && thisWeekExpenses < lastWeekExpenses) {
        result.push({
          icon: <TrendingDown size={15} />,
          type: "success",
          text: (
            <>
              So với tuần trước ({formatCurrency(lastWeekExpenses)}), bạn đã tiết kiệm được thêm{" "}
              <strong className="text-emerald-300">
                {formatCurrency(lastWeekExpenses - thisWeekExpenses)}
              </strong>
              . Tiếp tục duy trì!
            </>
          ),
        });
      }
    } else {
      // Bình thường (< 80%)
      result.push({
        icon: <CheckCircle2 size={15} />,
        type: "success",
        text: (
          <>
            Chi tiêu tuần này đang ổn:{" "}
            <strong className="text-emerald-300">{formatCurrency(thisWeekExpenses)}</strong> /{" "}
            {formatCurrency(weeklyBudget)} (
            <strong className="text-emerald-300">{Math.round(ratio * 100)}%</strong>).
          </>
        ),
      });
      if (daysLeft > 0) {
        result.push({
          icon: <Calendar size={15} />,
          type: "info",
          text: (
            <>
              Còn <strong className="text-white">{daysLeft} ngày</strong> trong tuần, bạn có thể chi
              thêm tối đa{" "}
              <strong className="text-white">{formatCurrency(Math.round(dailyBudgetLeft))}/ngày</strong>{" "}
              để không vượt ngân sách.
            </>
          ),
        });
      }
      if (lastWeekExpenses > 0) {
        const diff = thisWeekExpenses - lastWeekExpenses;
        result.push({
          icon: diff > 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />,
          type: diff > 0 ? "info" : "success",
          text: (
            <>
              {diff > 0 ? (
                <>
                  Tuần này đang chi nhiều hơn tuần trước{" "}
                  <strong className="text-white">{formatCurrency(Math.abs(diff))}</strong>. Chú ý giữ
                  trong ngân sách.
                </>
              ) : (
                <>
                  Bạn đang chi ít hơn tuần trước{" "}
                  <strong className="text-emerald-300">{formatCurrency(Math.abs(diff))}</strong>. Đang
                  trên đà tiết kiệm tốt!
                </>
              )}
            </>
          ),
        });
      }
    }

    return result;
  }, [weeklyBudget, insights, formatCurrency]);

  const insightBgColor = (type: "danger" | "warning" | "success" | "info") => {
    switch (type) {
      case "danger":
        return "border-red-900/50 bg-red-950/30 text-red-200";
      case "warning":
        return "border-yellow-900/40 bg-yellow-950/20 text-yellow-200";
      case "success":
        return "border-emerald-900/50 bg-emerald-950/20 text-emerald-200";
      default:
        return "bg-black border-white/[0.06] text-zinc-300";
    }
  };

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

      {/* ──────────────────────────────────────────── */}
      {/* SECTION: Dòng Tiền & Tỷ Lệ Tiết Kiệm        */}
      {/* ──────────────────────────────────────────── */}
      <section className="rounded-3xl bg-zinc-950 border border-white/[0.08] p-5 shadow-2xl space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
              <PieChart size={14} />
            </span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Dòng Tiền & Tiết Kiệm
            </h2>
          </div>
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-zinc-300">
            Tiết kiệm: <strong className={stats.savingsRate >= 20 ? "text-emerald-400" : "text-zinc-200"}>{stats.savingsRate}%</strong>
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="p-3 rounded-2xl bg-black/60 border border-white/[0.06]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
              Tổng Thu (+)
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-emerald-400 tracking-tight mt-0.5 block truncate">
              +{formatCurrency(stats.totalIncome)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-black/60 border border-white/[0.06]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
              Tổng Chi (-)
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-zinc-200 tracking-tight mt-0.5 block truncate">
              -{formatCurrency(stats.totalExpense)}
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-black/60 border border-white/[0.06]">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block">
              Số Dư Thuần
            </span>
            <span
              className={cn(
                "text-xs sm:text-sm font-black tracking-tight mt-0.5 block truncate",
                stats.balance >= 0 ? "text-emerald-400" : "text-rose-400"
              )}
            >
              {stats.balance >= 0 ? "+" : ""}{formatCurrency(stats.balance)}
            </span>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────── */}
      {/* SECTION: Ngân Sách Tuần                     */}
      {/* ──────────────────────────────────────────── */}
      <WeeklyBudgetCard
        weeklyBudget={weeklyBudget}
        currentSpent={insights.thisWeekExpenses}
        onBudgetChange={handleBudgetChange}
        formatCurrency={formatCurrency}
      />

      {/* ──────────────────────────────────────────── */}
      {/* SECTION: Budget Insights (chỉ khi có ngân sách) */}
      {/* ──────────────────────────────────────────── */}
      {weeklyBudget && budgetInsights && budgetInsights.length > 0 && (
        <section className="rounded-3xl bg-zinc-950 border border-white/[0.08] p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-zinc-300">
            <Lightbulb size={15} className="text-white" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Insights Ngân Sách
            </h2>
          </div>
          <div className="grid gap-2.5">
            {budgetInsights.map((insight, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={cn(
                  "p-3.5 rounded-2xl border flex items-start gap-3",
                  insightBgColor(insight.type)
                )}
              >
                <span className="p-2 rounded-xl bg-white/[0.06] shrink-0 mt-0.5">
                  {insight.icon}
                </span>
                <div className="text-xs leading-relaxed">{insight.text}</div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* ──────────────────────────────────────────── */}
      {/* SECTION: So Sánh 4 Tuần Gần Nhất             */}
      {/* ──────────────────────────────────────────── */}
      <section className="rounded-3xl bg-zinc-950 border border-white/[0.08] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">So Sánh 4 Tuần</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {weeklyBudget
                ? `Ngân sách: ${formatCurrency(weeklyBudget)}/tuần`
                : "Đặt ngân sách để xem đường giới hạn"}
            </p>
          </div>
        </div>

        {/* Biểu đồ cột 4 tuần */}
        <div className="relative">
          {/* Đường ngân sách ngang */}
          {weeklyBudget && (
            <div
              className="absolute left-0 right-0 border-t border-dashed border-yellow-400/60 z-10 pointer-events-none"
              style={{
                bottom: `${Math.min((weeklyBudget / maxMultiWeekAmount) * 100, 98)}%`,
              }}
            >
              <span className="absolute right-0 -top-4 text-[10px] font-bold text-yellow-400 bg-zinc-950 px-1">
                {`${Math.round(weeklyBudget / 1000)}k`}
              </span>
            </div>
          )}

          <div className="grid grid-cols-4 items-end gap-2 h-44 pt-4">
            {multiWeekData.map((week, idx) => {
              const heightPct = week.total > 0 ? Math.max((week.total / maxMultiWeekAmount) * 100, 6) : 4;
              const isThisWeekCol = week.weeksAgo === 0;
              const isOver = weeklyBudget ? week.total > weeklyBudget : false;
              const barCls = isOver
                ? "bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                : isThisWeekCol
                ? "bg-white shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                : "bg-zinc-700 hover:bg-zinc-600";

              return (
                <div key={idx} className="flex h-full flex-col items-center justify-end gap-1.5">
                  {/* Số tiền */}
                  <span className={cn("text-[10px] font-semibold truncate max-w-full text-center",
                    isThisWeekCol ? "text-white" : "text-zinc-500"
                  )}>
                    {week.total > 0 ? `${Math.round(week.total / 1000)}k` : ""}
                  </span>
                  {/* Cột */}
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${heightPct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut", delay: idx * 0.1 }}
                    title={`${week.label}: ${formatCurrency(week.total)}`}
                    className={cn("w-full rounded-xl transition-colors duration-300", barCls)}
                  />
                  {/* Nhãn tuần */}
                  <span className={cn("text-[10px] font-semibold text-center leading-tight",
                    isThisWeekCol ? "text-white font-bold" : "text-zinc-500"
                  )}>
                    {week.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] text-zinc-500 flex-wrap">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-white inline-block" /> Tuần này
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-zinc-700 inline-block" /> Tuần trước
          </span>
          {weeklyBudget && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-yellow-400 inline-block" /> Ngân sách
            </span>
          )}
          {weeklyBudget && (
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500/80 inline-block" /> Vượt ngân sách
            </span>
          )}
        </div>
      </section>

      {/* ──────────────────────────────────────────── */}
      {/* SECTION: Insight Thông Minh (general)       */}
      {/* ──────────────────────────────────────────── */}
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
            <span className="p-2 rounded-xl bg-white/[0.06] text-white shrink-0">
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

      {/* ──────────────────────────────────────────── */}
      {/* SECTION: Phân Bổ Danh Mục                  */}
      {/* ──────────────────────────────────────────── */}
      <section className="rounded-3xl bg-zinc-950 border border-white/[0.08] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Phân Bổ Danh Mục</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Tổng chi: {formatCurrency(stats.totalExpense)}</p>
          </div>
        </div>

        <div className="space-y-3.5">
          {stats.categoryBreakdown.map((cat) => (
            <div key={cat.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-white/70" />
                  <span className="text-zinc-200">{cat.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-400">{formatCurrency(cat.amount)}</span>
                  <span className="text-white font-bold w-10 text-right">{Math.round(cat.percentage)}%</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 bg-white"
                  style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}

          {!isLoading && stats.categoryBreakdown.length === 0 && (
            <p className="text-center text-xs text-zinc-500 py-6">Chưa có giao dịch nào trong khoảng thời gian này.</p>
          )}
        </div>
      </section>

      {/* SECTION: Chi Tiêu Từng Ngày Trong Tuần (chỉ khi chọn Tuần này) */}
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

      {/* SECTION: So Sánh Tuần Này vs Tuần Trước (cột chi tiết) */}
      <section className="rounded-3xl bg-zinc-950 border border-white/[0.08] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">So Sánh Chi Tiêu Tuần</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Đo lường nhịp độ chi tiêu thực tế</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/[0.06] border border-white/10 text-white">
            {insights.weekDiffPercent > 0 ? `+${insights.weekDiffPercent}%` : `${insights.weekDiffPercent}%`}
          </span>
        </div>

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
