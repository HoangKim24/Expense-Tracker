import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowUpRight, 
  PlusCircle, 
  Tag, 
  ChevronRight, 
  Camera, 
  CheckCircle2, 
  RefreshCw, 
  Clipboard 
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
import QuickPresetsBar from "../components/QuickPresetsBar";
import { parseTransactionText, detectCategoryFromText, matchCategoryId } from "../lib/smartParser";
import { isSameDay, isToday, isThisWeek, isThisMonth, formatWeekRange } from "../lib/dateUtils";

type DayTotal = { label: string; amount: number; isToday: boolean };
type DashboardPeriod = "today" | "week" | "month";

export default function Dashboard() {
  const [dashboardPeriod, setDashboardPeriod] = useState<DashboardPeriod>("month");
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

  // Tự động đoán danh mục khi gõ ghi chú
  const handleNoteChange = (val: string) => {
    setNote(val);
    const guessedName = detectCategoryFromText(val);
    if (guessedName) {
      const matched = matchCategoryId(guessedName, categories);
      if (matched) setSelectedCategoryId(matched);
    }
  };

  // Dán & Tự động bóc tách thông báo MoMo / Ngân hàng
  const handleSmartPaste = async () => {
    let clipboardText = "";
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        clipboardText = await navigator.clipboard.readText();
      }
    } catch {}

    if (!clipboardText) {
      const manual = window.prompt("Dán nội dung thông báo giao dịch MoMo hoặc Ngân hàng:");
      if (manual) clipboardText = manual;
    }

    if (!clipboardText || !clipboardText.trim()) {
      toast.info("Không có nội dung văn bản để phân tích");
      return;
    }

    const parsed = parseTransactionText(clipboardText);
    if (parsed.amount) {
      setAmount(new Intl.NumberFormat("vi-VN").format(parsed.amount));
    }
    if (parsed.description) {
      setNote(parsed.description);
    }
    if (parsed.detectedCategoryName) {
      const matched = matchCategoryId(parsed.detectedCategoryName, categories);
      if (matched) setSelectedCategoryId(matched);
    }

    if (parsed.amount) {
      toast.success("Đã bóc tách thông báo!", {
        description: `${new Intl.NumberFormat("vi-VN").format(parsed.amount)}đ • ${parsed.description || "Giao dịch"}`,
      });
    }
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

  // Period Expense Totals (Hôm nay / Tuần này / Tháng này)
  const periodData = useMemo(() => {
    const expenseTx = transactions.filter((t) => t.type === TransactionType.Expense);
    const todayTx = expenseTx.filter((t) => isToday(t.transactionDate));
    const weekTx = expenseTx.filter((t) => isThisWeek(t.transactionDate));
    const monthTx = expenseTx.filter((t) => isThisMonth(t.transactionDate));

    const todayTotal = todayTx.reduce((sum, t) => sum + t.amount, 0);
    const weekTotal = weekTx.reduce((sum, t) => sum + t.amount, 0);
    const monthTotal = metrics?.totalExpense ?? monthTx.reduce((sum, t) => sum + t.amount, 0);

    if (dashboardPeriod === "today") {
      return {
        title: "Chi Tiêu Hôm Nay",
        amount: todayTotal,
        count: todayTx.length,
        subLabel: `Hôm nay, ${new Date().toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}`,
      };
    }
    if (dashboardPeriod === "week") {
      return {
        title: "Chi Tiêu Tuần Này",
        amount: weekTotal,
        count: weekTx.length,
        subLabel: `Tuần này (${formatWeekRange()})`,
      };
    }
    return {
      title: "Chi Tiêu Tháng Này",
      amount: monthTotal,
      count: monthTx.length,
      subLabel: new Date().toLocaleString("vi-VN", { month: "long", year: "numeric" }),
    };
  }, [transactions, metrics, dashboardPeriod]);

  // Dynamic Category Breakdown theo period (Hôm nay / Tuần này / Tháng này)
  const categoryBreakdown = useMemo(() => {
    let txList = transactions.filter((t) => t.type === TransactionType.Expense);
    if (dashboardPeriod === "today") {
      const today = new Date();
      txList = txList.filter((t) => isSameDay(t.transactionDate, today));
    } else if (dashboardPeriod === "week") {
      txList = txList.filter((t) => isThisWeek(t.transactionDate));
    } else {
      txList = txList.filter((t) => isThisMonth(t.transactionDate));
    }

    if (txList.length > 0) {
      const totalAmount = txList.reduce((s, t) => s + t.amount, 0);
      const catMap = new Map<string, number>();

      for (const t of txList) {
        const cat = categories.find((c) => c.id === t.categoryId);
        const name = cat?.name || "Khác";
        catMap.set(name, (catMap.get(name) || 0) + t.amount);
      }

      return Array.from(catMap.entries())
        .map(([categoryName, amount]) => ({
          categoryName,
          totalAmount: amount,
          percentage: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);
    }

    // Fallback to metrics?.categoryBreakdown nếu txList rỗng nhưng metrics có
    if (metrics?.categoryBreakdown && metrics.categoryBreakdown.length > 0) {
      return metrics.categoryBreakdown;
    }

    return [];
  }, [transactions, categories, dashboardPeriod, metrics]);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 px-4 pt-4">
      {/* 1. Thẻ Chi Tiêu Theo Mốc Thời Gian — Minimalist Matte Dark Hero */}
      <section className="rounded-3xl bg-zinc-950 border border-white/[0.08] p-5 sm:p-6 shadow-2xl relative overflow-hidden">
        {/* Period Selector Tabs */}
        <div className="flex items-center justify-between gap-2.5 mb-3">
          <div className="flex flex-1 p-1 rounded-2xl bg-black border border-white/[0.08]">
            <button
              type="button"
              onClick={() => setDashboardPeriod("today")}
              className={cn(
                "flex-1 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 text-center",
                dashboardPeriod === "today"
                  ? "bg-white text-black font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => setDashboardPeriod("week")}
              className={cn(
                "flex-1 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 text-center",
                dashboardPeriod === "week"
                  ? "bg-white text-black font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Tuần này
            </button>
            <button
              type="button"
              onClick={() => setDashboardPeriod("month")}
              className={cn(
                "flex-1 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 text-center",
                dashboardPeriod === "month"
                  ? "bg-white text-black font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Tháng này
            </button>
          </div>

          <span className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300 shrink-0">
            <ArrowUpRight size={15} />
          </span>
        </div>

        <div className="mt-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 block">
            {periodData.title}
          </span>
          <p className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight my-1.5">
            {isLoading ? "..." : formatCurrency(periodData.amount)}
          </p>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06] text-xs">
          <span className="text-zinc-400 font-medium capitalize">
            {periodData.subLabel}
          </span>
          <span className="text-zinc-400 font-medium text-[11px]">
            {isLoading ? "Đang đồng bộ..." : `${periodData.count} giao dịch`}
          </span>
        </div>
      </section>

      {/* 2. MẪU CHI TIÊU THƯỜNG GẶP 1-CHẠM (0.5 GIÂY) */}
      <QuickPresetsBar categories={categories} onTransactionCreated={loadData} />

      {/* 3. KHU VỰC NHẬP TIỀN TRỰC TIẾP TRÊN TRANG (INLINE QUICK ADD) */}
      <section className="rounded-3xl bg-zinc-950 border border-white/[0.08] p-4 sm:p-5 shadow-xl space-y-3.5">
        {/* Header trên 1 hàng duy nhất: Tiêu đề bên trái, 3 nút hành động bên phải */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 shrink-0">
            <PlusCircle size={15} className="text-zinc-400" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">Ghi Khoản Chi</h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Smart Paste Button */}
            <button
              type="button"
              onClick={handleSmartPaste}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-white text-[11px] font-semibold transition active:scale-95 shadow-sm"
              title="Dán thông báo MoMo / Bank để tự động điền"
            >
              <Clipboard size={12} className="text-zinc-300" />
              <span>Dán</span>
            </button>

            {/* MoMo & Cake Gmail Sync Button */}
            <button
              type="button"
              onClick={handleSyncMoMoCake}
              disabled={isSyncing}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-zinc-300 hover:text-white text-[11px] font-semibold transition active:scale-95 shadow-sm disabled:opacity-50"
              title="Đồng bộ biến động số dư từ MoMo & Cake qua Gmail"
            >
              <RefreshCw size={12} className={cn("text-zinc-400", isSyncing && "animate-spin")} />
              <span>{isSyncing ? "..." : "MoMo"}</span>
            </button>

            {/* Locket Snap Quick Camera Button */}
            <button
              type="button"
              onClick={() => setIsCameraModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-white text-[11px] font-semibold transition active:scale-95 shadow-sm"
              title="Chụp ảnh hóa đơn phong cách Locket"
            >
              <Camera size={12} className="text-zinc-300" />
              <span>Snap</span>
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
              placeholder="Ghi chú (Gõ bún, cà phê, grab...)"
              value={note}
              onChange={(e) => handleNoteChange(e.target.value)}
              className="flex-1 min-w-0 rounded-xl bg-black border border-white/10 px-3.5 py-2.5 text-sm sm:text-xs font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-white/30"
            />
            <button
              type="submit"
              disabled={isSubmitting || !amount}
              className="shrink-0 whitespace-nowrap px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-200 active:scale-95 font-bold text-xs text-black shadow-sm transition flex items-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none"
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
                      ? day.amount > 0
                        ? "bg-white shadow-[0_0_12px_rgba(255,255,255,0.4)]"
                        : "bg-zinc-700/60 border border-white/20"
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

      {/* 4. Top Danh Mục Chi Tiêu */}
      <section className="rounded-3xl bg-zinc-950 border border-white/[0.08] p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">Danh mục chi tiêu chính</h2>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {dashboardPeriod === "today" ? "Hôm nay" : dashboardPeriod === "week" ? "Tuần này" : "Tháng này"}
            </p>
          </div>
          <Link to="/analytics" className="text-xs font-semibold text-zinc-400 hover:text-white">Chi tiết</Link>
        </div>

        {/* Donut chart + legend */}
        {categoryBreakdown.length > 0 && (
          <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-black/60 border border-white/[0.05]">
            {/* SVG Donut */}
            <CategoryDonutChart breakdown={categoryBreakdown} />

            {/* Legend list */}
            <div className="flex-1 space-y-2 min-w-0">
              {categoryBreakdown.slice(0, 5).map((category, idx) => {
                const COLORS = ["#f97316", "#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#06b6d4"];
                return (
                  <div key={category.categoryName} className="flex items-center justify-between gap-1.5 min-w-0 text-xs">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="text-zinc-300 truncate">{category.categoryName}</span>
                    </div>
                    <span className="font-bold text-white shrink-0">{Math.round(category.percentage)}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Progress bars */}
        <div className="space-y-2.5">
          {categoryBreakdown.slice(0, 4).map((category, idx) => {
            const COLORS = ["#f97316", "#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#06b6d4"];
            return (
              <div key={category.categoryName} className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-200">{category.categoryName}</span>
                  <span className="text-zinc-400">{formatCurrency(category.totalAmount)}</span>
                </div>
                <div className="h-2 rounded-full bg-zinc-900 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(category.percentage, 100)}%`,
                      backgroundColor: COLORS[idx % COLORS.length],
                    }}
                  />
                </div>
              </div>
            );
          })}

          {!isLoading && categoryBreakdown.length === 0 && (
            <p className="text-center text-xs font-medium text-zinc-500 py-3">
              Chưa có khoản chi nào trong {dashboardPeriod === "today" ? "hôm nay" : dashboardPeriod === "week" ? "tuần này" : "tháng này"}.
            </p>
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

/** SVG Donut chart cho phần danh mục */
function CategoryDonutChart({
  breakdown,
}: {
  breakdown: Array<{ categoryName: string; totalAmount: number; percentage: number }>;
}) {
  const COLORS = ["#f97316", "#8b5cf6", "#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#06b6d4"];
  const SIZE = 110;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 38;
  const STROKE_WIDTH = 15;
  const CIRC = 2 * Math.PI * R;
  const GAP = breakdown.length > 1 ? 2.5 : 0; // Không trừ khoảng trống nếu chỉ có 1 danh mục

  const total = breakdown.reduce((s, c) => s + c.totalAmount, 0);
  if (total === 0) return null;

  let cumulativePct = 0;

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="shrink-0 drop-shadow-md"
    >
      {/* Track nền */}
      <circle
        cx={CX}
        cy={CY}
        r={R}
        fill="none"
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={STROKE_WIDTH}
      />

      {breakdown.slice(0, 7).map((cat, i) => {
        const pct = (cat.totalAmount / total) * 100;
        const dashLen = Math.max((pct / 100) * CIRC - GAP, 0);
        const rotation = (cumulativePct / 100) * 360 - 90; // Bắt đầu từ đỉnh (-90 độ)
        const el = (
          <circle
            key={cat.categoryName}
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={`${dashLen} ${CIRC}`}
            transform={`rotate(${rotation} ${CX} ${CY})`}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        );
        cumulativePct += pct;
        return el;
      })}

      {/* Trung tâm: hiển thị tỷ lệ hoặc số lượng danh mục */}
      <text
        x={CX}
        y={CY - 3}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-white font-bold"
        fontSize="13"
        fontWeight="800"
        fill="white"
      >
        {breakdown.length === 1 ? "100%" : `${breakdown.length}`}
      </text>
      <text
        x={CX}
        y={CY + 11}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="8"
        fontWeight="500"
        fill="rgba(255,255,255,0.45)"
      >
        {breakdown.length === 1 ? "chi tiêu" : "danh mục"}
      </text>
    </svg>
  );
}
