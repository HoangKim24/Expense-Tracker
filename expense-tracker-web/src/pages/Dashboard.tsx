import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowUpRight, 
  PlusCircle, 
  Tag, 
  ChevronRight, 
  Camera,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import {
  getDashboardMetrics,
  getTransactions,
  getCategories,
  createTransaction,
  deleteTransaction,
  syncGmailTransactions,
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
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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

  // Handle Manual MoMo & Cake Gmail Sync
  const handleSyncMoMoCake = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    const toastId = toast.loading("Đang kết nối Gmail quét biến động MoMo & Cake (< 15s)...");

    try {
      const result = await syncGmailTransactions();
      if (result.success) {
        localStorage.setItem("last_momo_cake_sync", new Date().toISOString());
        if (result.syncedCount > 0) {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ["#ffffff", "#e4e4e7", "#a1a1aa"],
          });
          toast.success(`Đã đồng bộ ${result.syncedCount} giao dịch mới từ MoMo/Cake!`, {
            id: toastId,
            description: result.message,
          });
          loadData();
          window.dispatchEvent(new CustomEvent("transaction-updated"));
        } else {
          toast.info(result.message || "Hộp thư đã cập nhật mới nhất. Không có giao dịch mới.", {
            id: toastId,
          });
        }
      } else {
        toast.error(result.message || "Không thể đồng bộ Gmail", {
          id: toastId,
          description: result.errors?.[0] || "Vui lòng kiểm tra cấu hình Gmail trong hệ thống.",
        });
      }
    } catch {
      toast.error("Lỗi khi kết nối API đồng bộ Gmail!", { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto-Sync check every new day (after 24h)
  useEffect(() => {
    loadData();

    const checkAutoSync = async () => {
      const lastSyncStr = localStorage.getItem("last_momo_cake_sync");
      const now = new Date();
      let shouldAutoSync = false;

      if (!lastSyncStr) {
        shouldAutoSync = true;
      } else {
        const lastDate = new Date(lastSyncStr);
        const diffHours = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60);
        const isDifferentDay = lastDate.getDate() !== now.getDate() || lastDate.getMonth() !== now.getMonth();
        if (diffHours >= 24 || isDifferentDay) {
          shouldAutoSync = true;
        }
      }

      if (shouldAutoSync) {
        try {
          const res = await syncGmailTransactions();
          if (res.success && res.syncedCount > 0) {
            toast.success(`Tự động đồng bộ ngày mới: Thêm ${res.syncedCount} giao dịch từ MoMo/Cake!`);
            loadData();
            window.dispatchEvent(new CustomEvent("transaction-updated"));
          }
          localStorage.setItem("last_momo_cake_sync", now.toISOString());
        } catch {
          // Bỏ qua lỗi ngầm khi auto sync
        }
      }
    };

    checkAutoSync();

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
      toast.warning("Chưa nhập số tiền", {
        description: "Vui lòng nhập số tiền chi tiêu lớn hơn 0đ.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedCat = categories.find((c) => c.id === selectedCategoryId);
      const defaultDesc = selectedCat ? selectedCat.name : "Khoản chi tiêu";

      await createTransaction({
        amount: numericAmount,
        transactionDate: new Date().toISOString(),
        description: note.trim() || defaultDesc,
        type: TransactionType.Expense,
        source: TransactionSource.Manual,
        categoryId: selectedCategoryId || null,
      });

      confetti({
        particleCount: 50,
        spread: 55,
        origin: { y: 0.7 },
        colors: ["#ffffff", "#f4f4f5", "#e4e4e7", "#a1a1aa"],
      });

      toast.success(`Đã ghi sổ: -${new Intl.NumberFormat("vi-VN").format(numericAmount)}đ`, {
        description: note.trim() || defaultDesc,
      });

      setAmount("");
      setNote("");
      loadData();
    } catch {
      toast.error("Không thể ghi sổ giao dịch", {
        description: "Vui lòng kiểm tra lại kết nối mạng và thử lại.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete transaction
  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id);
      loadData();
      toast.success("Đã xóa giao dịch thành công!", {
        description: "Dữ liệu chi tiêu đã được cập nhật lại.",
      });
    } catch {
      toast.error("Không thể xóa giao dịch", {
        description: "Vui lòng thử lại sau giây lát.",
      });
    }
  };

  // Weekly calculations
  const weeklyTotals = useMemo(() => getWeeklyTotals(transactions), [transactions]);
  const maxWeeklyTotal = Math.max(...weeklyTotals.map((day) => day.amount), 1);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 px-4 pt-4">
      {/* 1. Thẻ Chi Tiêu Tháng Này — Minimalist Matte Dark Hero */}
      <section className="rounded-3xl bg-zinc-950 border border-white/[0.08] p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Chi Tiêu Tháng Này</span>
          <span className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
            <ArrowUpRight size={14} />
          </span>
        </div>
        <p className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight my-1">
          {isLoading ? "..." : formatCurrency(metrics?.totalExpense ?? 0)}
        </p>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06] text-xs">
          <span className="text-zinc-500 font-medium capitalize">
            {new Date().toLocaleString("vi-VN", { month: "long", year: "numeric" })}
          </span>
          <span className="text-zinc-400 font-medium text-[11px]">
            Đồng bộ thời gian thực
          </span>
        </div>
      </section>

      {/* 2. KHU VỰC NHẬP TIỀN TRỰC TIẾP TRÊN TRANG (INLINE QUICK ADD) */}
      <section className="rounded-3xl bg-zinc-950 border border-white/[0.08] p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlusCircle size={17} className="text-zinc-400" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">Ghi Khoản Chi Nhanh</h2>
          </div>

          <div className="flex items-center gap-2">
            {/* MoMo & Cake Gmail Sync Button - Minimalist Dark Glass */}
            <button
              type="button"
              onClick={handleSyncMoMoCake}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white text-xs font-semibold transition active:scale-95 shadow-sm disabled:opacity-50"
              title="Đồng bộ biến động số dư từ MoMo & Cake qua Gmail"
            >
              <RefreshCw size={13} className={cn("text-zinc-400", isSyncing && "animate-spin")} />
              <span>{isSyncing ? "Đang quét..." : "MoMo & Cake"}</span>
            </button>

            {/* Locket Snap Quick Camera Button - Minimalist Dark Glass */}
            <button
              type="button"
              onClick={() => setIsCameraModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-white text-xs font-semibold transition active:scale-95 shadow-sm"
              title="Chụp ảnh hóa đơn phong cách Locket"
            >
              <Camera size={14} className="text-zinc-300" />
              <span>Locket Snap</span>
            </button>
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
              className="w-full rounded-2xl bg-black border border-white/10 px-4 py-3.5 text-2xl font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 text-right pr-14"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
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
                className="shrink-0 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-[11px] font-semibold text-zinc-400 hover:text-white transition active:scale-95"
              >
                +{quick >= 1000 ? `${quick / 1000}k` : quick}
              </button>
            ))}
          </div>

          {/* Chọn danh mục (Minimalist Tag Chips) */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
              <Tag size={11} /> Danh mục
            </label>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {categories
                .filter((cat) => cat.type === TransactionType.Expense)
                .map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition border active:scale-95 ${
                        isSelected
                          ? "bg-white text-black font-bold border-white shadow-sm"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: cat.color || "#a1a1aa" }}
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
              className="flex-1 rounded-xl bg-black border border-white/10 px-3.5 py-2.5 text-xs font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
            />
            <button
              type="submit"
              disabled={isSubmitting || !amount}
              className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 active:scale-95 font-bold text-xs text-black shadow-sm transition flex items-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none"
            >
              <CheckCircle2 size={15} /> Ghi Sổ
            </button>
          </div>
        </form>
      </section>

      {/* 3. BIỂU ĐỒ CHI TIÊU TRONG TUẦN (WEEKLY BAR CHART) */}
      <section className="rounded-3xl bg-zinc-950 border border-white/[0.08] p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">Chi tiêu 7 ngày qua</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Biểu đồ cập nhật theo thời gian thực</p>
          </div>
          <Link to="/analytics" className="text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-0.5">
            Phân tích <ChevronRight size={14} />
          </Link>
        </div>

        <div className="grid h-36 grid-cols-7 items-end gap-2 pt-4">
          {weeklyTotals.map((day) => {
            const height = day.amount ? Math.max((day.amount / maxWeeklyTotal) * 100, 8) : 4;
            return (
              <div key={day.label} className="flex h-full flex-col items-center justify-end gap-1.5">
                <span className="text-[10px] font-semibold text-zinc-500 truncate max-w-full">
                  {day.amount > 0 ? `${Math.round(day.amount / 1000)}k` : ""}
                </span>
                <div
                  title={`${day.label}: ${formatCurrency(day.amount)}`}
                  style={{ height: `${height}%` }}
                  className={`w-full rounded-xl transition-all duration-300 ${
                    day.isToday
                      ? "bg-white shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                      : "bg-zinc-800/80 hover:bg-zinc-700"
                  }`}
                />
                <span
                  className={`text-[11px] font-semibold ${
                    day.isToday ? "text-white font-bold" : "text-zinc-500"
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
      <section className="rounded-3xl bg-zinc-950 border border-white/[0.08] p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">Danh mục chi tiêu chính</h2>
          <Link to="/analytics" className="text-xs font-semibold text-zinc-400 hover:text-white">Chi tiết</Link>
        </div>

        <div className="space-y-2.5">
          {(metrics?.categoryBreakdown ?? []).slice(0, 4).map((category) => (
            <div key={category.categoryName} className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-zinc-200">{category.categoryName}</span>
                <span className="text-zinc-400">{formatCurrency(category.totalAmount)}</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-900 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${Math.min(category.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}

          {!isLoading && (metrics?.categoryBreakdown.length ?? 0) === 0 && (
            <p className="text-center text-xs font-medium text-zinc-500 py-3">Chưa có khoản chi nào trong tháng này.</p>
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
