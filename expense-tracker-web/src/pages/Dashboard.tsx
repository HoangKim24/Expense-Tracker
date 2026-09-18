import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ArrowDownRight, ArrowUpRight, ReceiptText, Camera, Sparkles, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import {
  getDashboardMetrics,
  getTransactions,
  deleteTransaction,
  getReceiptImageUrl,
  TransactionType,
  type DashboardMetricsDto,
  type TransactionDto,
} from "../lib/api";
import PolaroidDetailModal from "../components/PolaroidDetailModal";
import { toast } from "sonner";

type DayTotal = { label: string; amount: number; isToday: boolean };

export default function Dashboard() {
  const { setIsQuickAddOpen, setIsCameraOpen } = useOutletContext<{
    setIsQuickAddOpen: (value: boolean) => void;
    setIsCameraOpen?: (value: boolean) => void;
  }>();

  const [metrics, setMetrics] = useState<DashboardMetricsDto | null>(null);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDto | null>(null);

  const loadData = useCallback(() => {
    const now = new Date();
    Promise.all([
      getDashboardMetrics(now.getMonth() + 1, now.getFullYear()),
      getTransactions(),
    ])
      .then(([metricsData, transactionData]) => {
        setMetrics(metricsData);
        setTransactions(transactionData);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener("transaction-updated", handleUpdate);
    return () => window.removeEventListener("transaction-updated", handleUpdate);
  }, [loadData]);

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id);
      loadData();
      toast.success("Đã xóa giao dịch thành công!");
    } catch {
      toast.error("Lỗi khi xóa giao dịch!");
    }
  };

  const formatCurrency = (value: number) => `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
  const weeklyTotals = useMemo(() => getWeeklyTotals(transactions), [transactions]);
  const maxWeeklyTotal = Math.max(...weeklyTotals.map((day) => day.amount), 1);
  const recentTransactions = transactions.slice(0, 5);
  const recentSnaps = transactions.filter((t) => !!t.receiptImagePath).slice(0, 6);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 px-4 pt-4">
      {/* Quick Action Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {/* Locket Snap Button */}
        <button
          type="button"
          onClick={() => setIsCameraOpen?.(true)}
          className="col-span-2 sm:col-span-1 flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-500 px-5 text-sm font-black text-white shadow-lg shadow-indigo-500/25 transition active:scale-98 hover:opacity-95"
        >
          <Camera size={20} className="animate-pulse" /> Snap Hóa Đơn
        </button>

        {/* Quick Add Button */}
        <button
          type="button"
          onClick={() => setIsQuickAddOpen(true)}
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-slate-900 dark:bg-slate-800 px-4 text-sm font-bold text-white shadow-md transition active:scale-98 hover:bg-slate-800"
        >
          <ReceiptText size={18} /> Nhập nhanh
        </button>

        {/* Analytics Link */}
        <Link
          to="/analytics"
          className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800/80 px-4 text-sm font-bold text-slate-800 dark:text-slate-200 transition active:scale-98 hover:bg-slate-200 dark:hover:bg-slate-700"
        >
          Phân tích <ChevronRight size={16} />
        </Link>
      </div>

      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm font-medium text-rose-700 dark:text-rose-400">
          Không thể kết nối API. Vui lòng kiểm tra backend server rồi tải lại trang.
        </p>
      )}

      {/* Monthly Overview Card */}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Tổng chi tháng này</p>
            <p className="mt-1 text-3xl font-black text-slate-950 dark:text-white">
              {isLoading ? "..." : formatCurrency(metrics?.totalExpense ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 px-3.5 py-2 text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 block">Số dư</span>
            <span className="text-xs font-black text-blue-700 dark:text-blue-400">
              {isLoading ? "..." : formatCurrency(metrics?.balance ?? 0)}
            </span>
          </div>
        </div>

        {/* Weekly Spending Bar Chart */}
        <div className="mt-6 grid h-40 grid-cols-7 items-end gap-2">
          {weeklyTotals.map((day) => {
            const height = day.amount ? Math.max((day.amount / maxWeeklyTotal) * 100, 6) : 3;
            return (
              <div key={day.label} className="flex h-full flex-col items-center justify-end gap-2">
                <div
                  title={`${day.label}: ${formatCurrency(day.amount)}`}
                  style={{ height: `${height}%` }}
                  className={`w-full rounded-xl transition-all duration-300 ${
                    day.isToday ? "bg-blue-600 shadow-md shadow-blue-500/30" : "bg-slate-200 dark:bg-slate-700"
                  }`}
                />
                <span
                  className={`text-[11px] font-bold ${
                    day.isToday ? "text-blue-600 dark:text-blue-400" : "text-slate-400"
                  }`}
                >
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent Snaps Gallery (Locket Style Carousel) */}
      {recentSnaps.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles size={16} className="text-amber-500" />
              <h2 className="text-base font-black text-slate-950 dark:text-white">Khoảnh khắc hóa đơn (Snaps)</h2>
            </div>
            <Link to="/history" className="text-xs font-bold text-blue-600 dark:text-blue-400">
              Xem tất cả
            </Link>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {recentSnaps.map((snap) => {
              const url = getReceiptImageUrl(snap.receiptImagePath);
              if (!url) return null;

              return (
                <div
                  key={snap.id}
                  onClick={() => setSelectedTransaction(snap)}
                  className="shrink-0 w-32 bg-slate-950 p-2 pb-3 rounded-2xl border border-slate-800 shadow-lg cursor-pointer transition hover:scale-105 active:scale-95"
                >
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-900">
                    <img src={url} alt={snap.description} className="w-full h-full object-cover" />
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[9px] font-bold text-white">
                      {new Date(snap.transactionDate).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" })}
                    </div>
                  </div>
                  <div className="mt-2 px-0.5">
                    <p className="truncate text-[11px] font-black text-rose-400">
                      -{formatCurrency(snap.amount)}
                    </p>
                    <p className="truncate text-[10px] font-medium text-slate-400">
                      {snap.description || "Hóa đơn"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Category Breakdown */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-black text-slate-950 dark:text-white">Chi tiêu theo danh mục</h2>
          <Link to="/analytics" className="text-xs font-bold text-blue-600 dark:text-blue-400">
            Chi tiết
          </Link>
        </div>
        <div className="space-y-2.5">
          {(metrics?.categoryBreakdown ?? []).slice(0, 4).map((category) => (
            <div
              key={category.categoryName}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm"
            >
              <div className="flex justify-between gap-3 text-sm">
                <span className="font-bold text-slate-900 dark:text-white">{category.categoryName}</span>
                <span className="font-black text-slate-700 dark:text-slate-300">
                  {formatCurrency(category.totalAmount)}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${Math.min(category.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}
          {!isLoading && (metrics?.categoryBreakdown.length ?? 0) === 0 && (
            <EmptyState text="Chưa có khoản chi nào trong tháng này." />
          )}
        </div>
      </section>

      {/* Recent Transactions List */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-black text-slate-950 dark:text-white">Giao dịch gần đây</h2>
          <Link to="/history" className="text-xs font-bold text-blue-600 dark:text-blue-400">
            Tất cả
          </Link>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          {recentTransactions.map((transaction) => {
            const hasReceipt = !!transaction.receiptImagePath;
            const receiptUrl = getReceiptImageUrl(transaction.receiptImagePath);
            const isIncome = transaction.type === TransactionType.Income;

            return (
              <div
                key={transaction.id}
                onClick={() => setSelectedTransaction(transaction)}
                className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/60 p-4 last:border-b-0 cursor-pointer hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {hasReceipt && receiptUrl ? (
                    <div className="relative h-11 w-11 shrink-0 rounded-xl overflow-hidden border-2 border-indigo-400/40 bg-slate-950 shadow-sm">
                      <img src={receiptUrl} alt="Bill" className="h-full w-full object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-indigo-600/90 text-center text-[7px] font-black text-white leading-tight">
                        SNAP
                      </div>
                    </div>
                  ) : (
                    <span
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        isIncome
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                          : "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400"
                      }`}
                    >
                      {isIncome ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
                    </span>
                  )}

                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950 dark:text-white">
                      {transaction.description || transaction.merchant || "Giao dịch"}
                    </p>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      {new Date(transaction.transactionDate).toLocaleDateString("vi-VN")}
                      {transaction.categoryName && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-500">
                          • {transaction.categoryName}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <span
                  className={`shrink-0 text-sm font-black ${
                    isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-slate-950 dark:text-white"
                  }`}
                >
                  {isIncome ? "+" : "-"}
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
            );
          })}
          {!isLoading && recentTransactions.length === 0 && (
            <EmptyState text="Chưa có giao dịch nào gần đây." />
          )}
        </div>
      </section>

      {/* Polaroid Modal for viewing recent transactions */}
      <PolaroidDetailModal
        transaction={selectedTransaction}
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onDelete={handleDelete}
      />
    </motion.div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="p-6 text-center text-xs font-medium text-slate-400">{text}</p>;
}

function getWeeklyTotals(transactions: TransactionDto[]): DayTotal[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(today.getDate() - 6);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const amount = transactions
      .filter(
        (transaction) =>
          transaction.type === TransactionType.Expense &&
          isSameDay(new Date(transaction.transactionDate), date)
      )
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    return {
      label: date.toLocaleDateString("vi-VN", { weekday: "short" }),
      amount,
      isToday: isSameDay(date, today),
    };
  });
}

function isSameDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}
