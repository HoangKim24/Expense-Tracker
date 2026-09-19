import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowUpRight, 
  PlusCircle, 
  Tag, 
  ChevronRight, 
  Camera,
  CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import {
  getDashboardMetrics,
  getTransactions,
  getCategories,
  createTransaction,
  deleteTransaction,
  TransactionType,
  TransactionSource,
  type DashboardMetricsDto,
  type TransactionDto,
  type CategoryDto,
} from "../lib/api";
import PolaroidDetailModal from "../components/PolaroidDetailModal";
import LocketCameraModal from "../components/LocketCameraModal";

type DayTotal = { label: string; amount: number; isToday: boolean };

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetricsDto | null>(null);
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDto | null>(null);

  // Inline Quick Add Form State
  const [entryType, setEntryType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);

  // Load Data
  const loadData = useCallback(() => {
    const now = new Date();
    Promise.all([
      getDashboardMetrics(now.getMonth() + 1, now.getFullYear()),
      getTransactions(),
      getCategories(),
    ])
      .then(([metricsData, transactionData, categoryData]) => {
        setMetrics(metricsData);
        setTransactions(transactionData);
        setCategories(categoryData);
        if (categoryData.length > 0 && !selectedCategoryId) {
          const defaultCat = categoryData.find((c) => c.name.includes("Ăn") || c.name.includes("Cà phê")) || categoryData[0];
          setSelectedCategoryId(defaultCat.id);
        }
      })
      .catch(() => {
        toast.error("Không thể tải dữ liệu. Hãy đảm bảo Backend API đang chạy!");
      })
      .finally(() => setIsLoading(false));
  }, [selectedCategoryId]);

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener("transaction-updated", handleUpdate);
    return () => window.removeEventListener("transaction-updated", handleUpdate);
  }, [loadData]);

  // Format currency
  const formatCurrency = (val: number) => `${new Intl.NumberFormat("vi-VN").format(val)}đ`;

  // Quick Amount Add
  const handleQuickAddAmount = (extra: number) => {
    const current = Number(amount.replace(/\D/g, "")) || 0;
    setAmount(new Intl.NumberFormat("vi-VN").format(current + extra));
  };

  // Submit Inline Transaction
  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount.replace(/\D/g, ""));
    if (!numericAmount || numericAmount <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ!");
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCat = categories.find((c) => c.id === selectedCategoryId);
      const defaultDesc = selectedCat ? selectedCat.name : (entryType === "income" ? "Khoản thu nhập" : "Khoản chi tiêu");

      await createTransaction({
        amount: numericAmount,
        transactionDate: new Date().toISOString(),
        description: note.trim() || defaultDesc,
        type: entryType === "income" ? TransactionType.Income : TransactionType.Expense,
        source: TransactionSource.Manual,
        categoryId: selectedCategoryId || null,
      });

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#3b82f6", "#10b981", "#ec4899"],
      });

      toast.success(`Đã ghi sổ ${new Intl.NumberFormat("vi-VN").format(numericAmount)}đ`, {
        description: note.trim() || defaultDesc,
      });

      setAmount("");
      setNote("");
      loadData();
    } catch {
      toast.error("Lỗi khi ghi sổ giao dịch. Hãy thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete transaction
  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id);
      loadData();
      toast.success("Đã xóa giao dịch thành công!");
    } catch {
      toast.error("Lỗi khi xóa giao dịch!");
    }
  };

  // Weekly calculations
  const weeklyTotals = useMemo(() => getWeeklyTotals(transactions), [transactions]);
  const maxWeeklyTotal = Math.max(...weeklyTotals.map((day) => day.amount), 1);


  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 px-4 pt-4">
      {/* 1. Thẻ Chi Tiêu Tháng Này — Hero Metric */}
      <section className="rounded-2xl bg-gradient-to-br from-rose-950/60 to-slate-950 border border-rose-800/40 p-5 shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Chi Tiêu Tháng Này</span>
          <span className="p-1.5 rounded-xl bg-rose-500/15 text-rose-400">
            <ArrowUpRight size={16} />
          </span>
        </div>
        <p className="text-4xl font-black text-rose-400 tracking-tight">
          {isLoading ? "..." : formatCurrency(metrics?.totalExpense ?? 0)}
        </p>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mt-3 pt-3 border-t border-rose-950/70 text-xs">
          <span className="text-slate-400 font-medium">
            {new Date().toLocaleString("vi-VN", { month: "long", year: "numeric" })}
          </span>
          <span className="text-amber-400/90 font-semibold flex items-center gap-1">
            🎯 Tối ưu chi tiêu tháng này để lên kế hoạch tiết kiệm tháng sau
          </span>
        </div>
      </section>

      {/* 2. KHU VỰC NHẬP TIỀN TRỰC TIẾP TRÊN TRANG (INLINE QUICK ADD) */}
      <section className="rounded-3xl bg-slate-900 border border-slate-800 p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle size={18} className="text-blue-500" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">Ghi Sổ Nhanh</h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Locket Snap Quick Camera Button */}
            <button
              type="button"
              onClick={() => setIsCameraModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/30 text-amber-300 text-xs font-bold transition active:scale-95 shadow-sm"
              title="Chụp ảnh hóa đơn phong cách Locket"
            >
              <Camera size={14} className="text-amber-400 animate-pulse" />
              <span>Locket Snap</span>
            </button>

            {/* Toggle Chi / Thu */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setEntryType("expense")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  entryType === "expense"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Chi tiêu
              </button>
              <button
                type="button"
                onClick={() => setEntryType("income")}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  entryType === "income"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Thu nhập
              </button>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveTransaction} className="space-y-3.5">
          {/* Ô nhập số tiền */}
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setAmount(val ? new Intl.NumberFormat("vi-VN").format(parseInt(val, 10)) : "");
              }}
              className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3.5 text-2xl font-black text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-right pr-14"
            />
            <span className={`absolute right-4 top-1/2 -translate-y-1/2 text-sm font-black ${
              entryType === "income" ? "text-emerald-400" : "text-rose-400"
            }`}>
              VNĐ
            </span>
          </div>

          {/* Chip cộng nhanh */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {[10000, 20000, 50000, 100000, 200000, 500000].map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => handleQuickAddAmount(quick)}
                className="shrink-0 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-[11px] font-bold text-slate-300 border border-slate-700/60 transition active:scale-95"
              >
                +{quick >= 1000 ? `${quick / 1000}k` : quick}
              </button>
            ))}
          </div>

          {/* Chọn danh mục (Category Chips) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Tag size={11} /> Danh mục
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {categories
                .filter((cat) => cat.type === (entryType === "income" ? TransactionType.Income : TransactionType.Expense))
                .map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      style={{
                        borderColor: isSelected ? cat.color : undefined,
                        backgroundColor: isSelected ? `${cat.color}22` : undefined,
                      }}
                      className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                        isSelected
                          ? "text-white ring-1 ring-white/20"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: cat.color || "#3b82f6" }}
                      />
                      {cat.name}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Ghi chú & Nút Lưu */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Ghi chú (VD: Cơm trưa, Grab, Tiền điện...)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="flex-1 rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={isSubmitting || !amount}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 font-bold text-xs text-white shadow-lg shadow-blue-600/25 transition flex items-center gap-1.5 disabled:opacity-40 disabled:pointer-events-none"
            >
              <CheckCircle2 size={16} /> Ghi Sổ
            </button>
          </div>
        </form>
      </section>

      {/* 3. BIỂU ĐỒ CHI TIÊU TRONG TUẦN (WEEKLY BAR CHART) NGAY TRÊN TRANG */}
      <section className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">Chi tiêu 7 ngày qua</h2>
            <p className="text-xs text-slate-400 mt-0.5">Biểu đồ cập nhật theo thời gian thực</p>
          </div>
          <Link to="/analytics" className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-0.5">
            Phân tích <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid h-36 grid-cols-7 items-end gap-2 pt-4">
          {weeklyTotals.map((day) => {
            const height = day.amount ? Math.max((day.amount / maxWeeklyTotal) * 100, 8) : 4;
            return (
              <div key={day.label} className="flex h-full flex-col items-center justify-end gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 truncate max-w-full">
                  {day.amount > 0 ? `${Math.round(day.amount / 1000)}k` : ""}
                </span>
                <div
                  title={`${day.label}: ${formatCurrency(day.amount)}`}
                  style={{ height: `${height}%` }}
                  className={`w-full rounded-xl transition-all duration-300 ${
                    day.isToday
                      ? "bg-blue-600 shadow-md shadow-blue-500/40"
                      : "bg-slate-800 hover:bg-slate-700"
                  }`}
                />
                <span
                  className={`text-[11px] font-bold ${
                    day.isToday ? "text-blue-400" : "text-slate-500"
                  }`}
                >
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Top Danh Mục Chi Tiêu Tháng Này */}
      <section className="rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-white">Danh mục chi tiêu chính</h2>
          <Link to="/analytics" className="text-xs font-bold text-blue-400">Chi tiết</Link>
        </div>

        <div className="space-y-2.5">
          {(metrics?.categoryBreakdown ?? []).slice(0, 4).map((category) => (
            <div key={category.categoryName} className="space-y-1.5">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-200">{category.categoryName}</span>
                <span className="text-slate-400">{formatCurrency(category.totalAmount)}</span>
              </div>
              <div className="h-2 rounded-full bg-slate-950 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${Math.min(category.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}

          {!isLoading && (metrics?.categoryBreakdown.length ?? 0) === 0 && (
            <p className="text-center text-xs font-medium text-slate-500 py-3">Chưa có khoản chi nào trong tháng này.</p>
          )}
        </div>
      </section>


      {/* Polaroid Detail Modal */}
      <PolaroidDetailModal
        transaction={selectedTransaction}
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onDelete={handleDelete}
      />

      {/* Locket Camera Modal */}
      <LocketCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onSuccess={loadData}
      />
    </motion.div>
  );
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
