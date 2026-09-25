import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { 
  Search, 
  Camera, 
  Trash2, 
  Tag, 
  Calendar, 
  Receipt, 
  RefreshCw, 
  Smartphone, 
  X,
  ChevronLeft,
  ChevronRight,
  CalendarDays
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn, formatCurrency } from "../lib/utils";
import { 
  getTransactions, 
  deleteTransaction, 
  getReceiptImageUrl, 
  syncGmailTransactions,
  TransactionType, 
  TransactionSource, 
  type TransactionDto 
} from "../lib/api";
import { deleteLocalReceipt } from "../lib/receiptStorage";
import PolaroidDetailModal from "../components/PolaroidDetailModal";
import ReceiptImage from "../components/ReceiptImage";
import { 
  isThisWeek, 
  isThisMonth, 
  groupTransactionsByDate,
  toDateKey,
  getOffsetDateKey,
  getRecentDaysStrip,
  formatDateHeading 
} from "../lib/dateUtils";

type FilterMode = "all" | "receipt" | "momo" | "cake" | "manual";
type PeriodFilter = "all" | "today" | "yesterday" | "week" | "month";
type TypeFilter = "all" | "expense" | "income";

export default function TransactionHistory() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedDate = searchParams.get("date");

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDto | null>(null);

  const handleSelectDate = (dateKey: string | null) => {
    setPage(1);
    if (dateKey) {
      setSearchParams({ date: dateKey });
    } else {
      setSearchParams({});
    }
  };

  const handlePrevDay = () => {
    const baseKey = selectedDate || toDateKey(new Date());
    const prevKey = getOffsetDateKey(baseKey, -1);
    handleSelectDate(prevKey);
  };

  const handleNextDay = () => {
    const baseKey = selectedDate || toDateKey(new Date());
    const nextKey = getOffsetDateKey(baseKey, 1);
    const todayKey = toDateKey(new Date());
    if (nextKey <= todayKey) {
      handleSelectDate(nextKey);
    }
  };

  const fetchTransactions = useCallback(() => {
    getTransactions()
      .then((data) => {
        setTransactions(data);
      })
      .catch(() => {
        toast.error("Không thể tải lịch sử giao dịch. Vui lòng thử lại!");
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    fetchTransactions();

    const handleUpdate = () => {
      setIsLoading(true);
      fetchTransactions();
    };
    window.addEventListener("transaction-updated", handleUpdate);
    return () => window.removeEventListener("transaction-updated", handleUpdate);
  }, [fetchTransactions]);

  const handleDelete = async (id: string) => {
    try {
      const target = transactions.find((t) => t.id === id);
      if (target?.receiptImagePath) {
        deleteLocalReceipt(target.receiptImagePath);
      }
      deleteLocalReceipt(id);

      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      window.dispatchEvent(new CustomEvent("transaction-updated"));
      toast.success("Đã xóa giao dịch thành công!", {
        description: "Lịch sử chi tiêu đã được cập nhật.",
      });
    } catch {
      toast.error("Không thể xóa giao dịch", {
        description: "Vui lòng thử lại sau giây lát.",
      });
    }
  };

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncMoMoCake = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    const toastId = toast.loading("Đang quét biến động số dư MoMo & Cake qua Gmail...");

    try {
      const result = await syncGmailTransactions();
      if (result.success) {
        localStorage.setItem("last_momo_cake_sync", new Date().toISOString());
        if (result.syncedCount > 0) {
          toast.success(`Đã thêm ${result.syncedCount} giao dịch từ MoMo & Cake!`, {
            id: toastId,
            description: result.message,
          });
          fetchTransactions();
          window.dispatchEvent(new CustomEvent("transaction-updated"));
        } else {
          toast.info(result.message || "Hộp thư đã cập nhật mới nhất.", { id: toastId });
        }
      } else {
        toast.error(result.message || "Lỗi đồng bộ Gmail", {
          id: toastId,
          description: result.errors?.[0] || "Vui lòng kiểm tra cấu hình Gmail trong hệ thống.",
        });
      }
    } catch {
      toast.error("Lỗi khi kết nối API đồng bộ!", { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  // Map ngày -> tổng chi tiêu & thu nhập để hiển thị badge trên dải ngày
  const dailyStatsMap = useMemo(() => {
    const map = new Map<string, { expense: number; income: number; count: number }>();
    for (const t of transactions) {
      const key = toDateKey(t.transactionDate);
      const curr = map.get(key) || { expense: 0, income: 0, count: 0 };
      if (t.type === TransactionType.Expense) {
        curr.expense += t.amount;
      } else if (t.type === TransactionType.Income) {
        curr.income += t.amount;
      }
      curr.count += 1;
      map.set(key, curr);
    }
    return map;
  }, [transactions]);

  // Dải 14 ngày gần nhất
  const recentDays = useMemo(() => getRecentDaysStrip(14), []);

  const filteredData = useMemo(() => {
    const todayKey = toDateKey(new Date());
    const yesterdayKey = getOffsetDateKey(todayKey, -1);

    return transactions.filter((t) => {
      // 1. Lọc theo loại (Tất cả / Chi tiêu / Thu nhập)
      if (typeFilter === "expense" && t.type !== TransactionType.Expense) return false;
      if (typeFilter === "income" && t.type !== TransactionType.Income) return false;

      // 2. Lọc theo ngày cụ thể (nếu đang chọn 1 ngày nhất định)
      if (selectedDate) {
        if (toDateKey(t.transactionDate) !== selectedDate) return false;
      } else {
        // Lọc theo mốc thời gian (Hôm nay / Hôm qua / Tuần này / Tháng này / Tất cả)
        if (periodFilter === "today" && toDateKey(t.transactionDate) !== todayKey) return false;
        if (periodFilter === "yesterday" && toDateKey(t.transactionDate) !== yesterdayKey) return false;
        if (periodFilter === "week" && !isThisWeek(t.transactionDate)) return false;
        if (periodFilter === "month" && !isThisMonth(t.transactionDate)) return false;
      }

      // 3. Lọc theo tìm kiếm
      const desc = (t.description || t.merchant || "").toLowerCase();
      const cat = (t.categoryName || "").toLowerCase();
      const matchesSearch = desc.includes(searchTerm.toLowerCase()) || cat.includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // 4. Lọc theo nguồn
      if (filterMode === "receipt") return !!t.receiptImagePath || t.source === TransactionSource.SnapReceipt;
      if (filterMode === "momo") return t.source === TransactionSource.MoMo;
      if (filterMode === "cake") return t.source === TransactionSource.Cake;
      if (filterMode === "manual") return t.source === TransactionSource.Manual;
      return true;
    });
  }, [transactions, searchTerm, filterMode, periodFilter, typeFilter, selectedDate]);

  // Nếu đang xem theo ngày cụ thể, hiển thị toàn bộ không cắt trang
  const visibleData = selectedDate ? filteredData : filteredData.slice(0, page * 15);
  const totalExpense = filteredData
    .filter((t) => t.type === TransactionType.Expense)
    .reduce((sum, item) => sum + item.amount, 0);
  const totalIncome = filteredData
    .filter((t) => t.type === TransactionType.Income)
    .reduce((sum, item) => sum + item.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const groupedDays = useMemo(() => {
    return groupTransactionsByDate(visibleData);
  }, [visibleData]);

  const summaryTitle = useMemo(() => {
    if (selectedDate) {
      const todayKey = toDateKey(new Date());
      const yesterdayKey = getOffsetDateKey(todayKey, -1);
      if (selectedDate === todayKey) return "Chi Tiêu Hôm Nay";
      if (selectedDate === yesterdayKey) return "Chi Tiêu Hôm Qua";
      const [year, month, day] = selectedDate.split("-");
      return `Chi Tiêu Ngày ${day}/${month}/${year}`;
    }
    if (periodFilter === "today") return "Chi Tiêu Hôm Nay";
    if (periodFilter === "yesterday") return "Chi Tiêu Hôm Qua";
    if (periodFilter === "week") return "Chi Tiêu Tuần Này";
    if (periodFilter === "month") return "Chi Tiêu Tháng Này";
    return "Chi Tiêu Đã Lọc";
  }, [selectedDate, periodFilter]);


  const sourceFilters: Array<{ value: FilterMode; label: string; icon?: typeof Camera | typeof RefreshCw | typeof Smartphone }> = [
    { value: "momo", label: "Ví MoMo", icon: Smartphone },
    { value: "cake", label: "Cake" },
    { value: "receipt", label: "Có ảnh bill", icon: Camera },
    { value: "manual", label: "Nhập tay" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 px-4 pt-4 pb-12">
      {/* Header & Compact Summary Card */}
      <section className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-3.5 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xs font-bold text-white tracking-wider uppercase">
              Lịch Sử Giao Dịch
            </h1>
            <span className="text-[11px] text-zinc-500 font-medium">
              ({isLoading ? "..." : `${filteredData.length}`})
            </span>
          </div>

          {/* MoMo & Cake Sync Button - compact */}
          <button
            type="button"
            onClick={handleSyncMoMoCake}
            disabled={isSyncing}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:text-white transition active:scale-95 disabled:opacity-50"
            title="Đồng bộ biến động số dư từ MoMo & Cake"
          >
            <RefreshCw size={11} className={cn("text-zinc-400", isSyncing && "animate-spin")} />
            <span>{isSyncing ? "Quét..." : "Đồng bộ MoMo/Cake"}</span>
          </button>
        </div>

        {/* Amount Metrics */}
        <div className="flex items-baseline justify-between pt-1 border-t border-white/[0.06]">
          <div>
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
              {typeFilter === "income"
                ? "Tổng Thu Nhập"
                : typeFilter === "expense"
                ? summaryTitle
                : "Dòng Tiền Thuần"}
            </span>
            <span
              className={cn(
                "text-2xl font-black tracking-tight block",
                typeFilter === "income"
                  ? "text-emerald-400"
                  : typeFilter === "expense"
                  ? "text-white"
                  : netBalance >= 0
                  ? "text-emerald-400"
                  : "text-rose-400"
              )}
            >
              {typeFilter === "income"
                ? `+${formatCurrency(totalIncome)}`
                : typeFilter === "expense"
                ? `-${formatCurrency(totalExpense)}`
                : `${netBalance >= 0 ? "+" : ""}${formatCurrency(netBalance)}`}
            </span>
          </div>

          {typeFilter === "all" && (
            <div className="text-right text-[11px] space-y-0.5">
              <div className="text-emerald-400 font-bold">Thu: +{formatCurrency(totalIncome)}</div>
              <div className="text-zinc-400 font-semibold">Chi: -{formatCurrency(totalExpense)}</div>
            </div>
          )}
        </div>
      </section>

      {/* Streamlined Filters */}
      <section className="space-y-2.5">
        {/* Row 1: Type Filter: Tất cả | Chi tiêu (-) | Thu nhập (+) */}
        <div className="flex bg-zinc-950 p-1 rounded-2xl border border-white/[0.08]">
          <button
            type="button"
            onClick={() => {
              setTypeFilter("all");
              setPage(1);
            }}
            className={cn(
              "flex-1 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 text-center",
              typeFilter === "all" ? "bg-white text-black font-bold shadow-sm" : "text-zinc-400 hover:text-white"
            )}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => {
              setTypeFilter("expense");
              setPage(1);
            }}
            className={cn(
              "flex-1 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 text-center",
              typeFilter === "expense" ? "bg-white text-black font-bold shadow-sm" : "text-zinc-400 hover:text-white"
            )}
          >
            Chi tiêu (-)
          </button>
          <button
            type="button"
            onClick={() => {
              setTypeFilter("income");
              setPage(1);
            }}
            className={cn(
              "flex-1 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 text-center",
              typeFilter === "income" ? "bg-emerald-400 text-black font-bold shadow-sm" : "text-zinc-400 hover:text-white"
            )}
          >
            Thu nhập (+)
          </button>
        </div>

        {/* Row 2: Search Bar */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Search size={14} className="text-zinc-500" />
          </div>
          <input
            type="text"
            placeholder="Tìm kiếm giao dịch..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 rounded-2xl border border-white/[0.08] bg-zinc-950 py-2 pl-9 pr-9 text-xs font-medium text-white outline-none transition focus:border-white/30 placeholder-zinc-500"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setPage(1);
              }}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-white"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Row 3: Macro Period Filters (Toàn bộ | Tuần này | Tháng này) */}
        <div className="grid grid-cols-3 p-1 rounded-2xl bg-zinc-950 border border-white/[0.08]">
          {[
            { value: "all" as const, label: "Toàn bộ" },
            { value: "week" as const, label: "Tuần này" },
            { value: "month" as const, label: "Tháng này" },
          ].map((p) => {
            const isSelected = !selectedDate && periodFilter === p.value;
            return (
              <button
                type="button"
                key={p.value}
                onClick={() => {
                  setPage(1);
                  handleSelectDate(null);
                  setPeriodFilter(p.value);
                }}
                className={cn(
                  "py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 text-center",
                  isSelected
                    ? "bg-white text-black font-bold shadow-sm"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Nguồn Giao Dịch (Chips có đệm cuối không bị tràn khung) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pr-4">
          <button
            type="button"
            onClick={() => {
              setFilterMode("all");
              setPage(1);
            }}
            className={cn(
              "shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95",
              filterMode === "all"
                ? "bg-white text-black shadow-sm font-bold"
                : "bg-zinc-950 text-zinc-400 border border-white/[0.08] hover:text-white"
            )}
          >
            Tất cả nguồn
          </button>
          {sourceFilters.map((filter) => {
            const Icon = filter.icon;
            const isSelected = filterMode === filter.value;
            return (
              <button
                type="button"
                key={filter.value}
                onClick={() => {
                  setFilterMode(isSelected ? "all" : filter.value);
                  setPage(1);
                }}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95",
                  isSelected
                    ? "bg-white text-black shadow-sm font-bold"
                    : "bg-zinc-950 text-zinc-400 border border-white/[0.08] hover:text-white"
                )}
              >
                {Icon && <Icon size={12} />}
                <span>{filter.label}</span>
              </button>
            );
          })}
        </div>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* ROW 4: DẢI LƯỚT CHỌN NGÀY NHANH (14 NGÀY GẦN NHẤT + LỊCH)  */}
        {/* ──────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-zinc-950 border border-white/[0.08] p-2.5 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <CalendarDays size={12} className="text-zinc-400" /> Lướt chọn ngày cụ thể
            </span>

            {/* Nút mở Lịch Native HTML5 để chọn ngày bất kỳ trong năm */}
            <label className="relative cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-[10px] font-semibold text-zinc-300 hover:text-white transition active:scale-95">
              <Calendar size={11} className="text-amber-400" />
              <span>{selectedDate ? selectedDate.split("-").reverse().join("/") : "Chọn ngày khác"}</span>
              <input
                type="date"
                max={toDateKey(new Date())}
                value={selectedDate || ""}
                onChange={(e) => {
                  if (e.target.value) handleSelectDate(e.target.value);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>

          {/* Dải cuộn 14 ngày */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar pr-4">
            {recentDays.map((day) => {
              const isSelected = selectedDate === day.dateKey;
              const stats = dailyStatsMap.get(day.dateKey);
              const hasExpense = stats && stats.expense > 0;
              const hasIncome = stats && stats.income > 0;

              return (
                <button
                  key={day.dateKey}
                  type="button"
                  onClick={() => handleSelectDate(isSelected ? null : day.dateKey)}
                  className={cn(
                    "shrink-0 flex flex-col items-center justify-between w-14 py-2 px-1 rounded-2xl border transition active:scale-95 text-center min-h-[58px]",
                    isSelected
                      ? "bg-white text-black font-bold border-white shadow-lg scale-105"
                      : "bg-black/60 border-white/[0.08] hover:border-white/20 text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <span className={cn(
                    "text-[10px] uppercase font-bold",
                    isSelected ? "text-zinc-900" : day.isToday ? "text-amber-400" : "text-zinc-500"
                  )}>
                    {day.isToday ? "Nay" : day.isYesterday ? "Qua" : day.dayOfWeek}
                  </span>
                  
                  <span className={cn(
                    "text-xs font-black my-0.5",
                    isSelected ? "text-black" : "text-white"
                  )}>
                    {day.dayOfMonth}
                  </span>

                  {/* Nhãn tiền hoặc chấm nhỏ báo hiệu giao dịch */}
                  <div className="h-3 flex items-center justify-center">
                    {hasExpense ? (
                      <span className={cn(
                        "text-[9px] font-semibold leading-none truncate max-w-full",
                        isSelected ? "text-zinc-800" : "text-zinc-400"
                      )}>
                        {stats.expense >= 1000000 
                          ? `${Math.round(stats.expense / 1000000)}tr` 
                          : stats.expense >= 1000 
                          ? `${Math.round(stats.expense / 1000)}k` 
                          : `${stats.expense}`}
                      </span>
                    ) : hasIncome ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    ) : (
                      <span className="w-1 h-1 rounded-full bg-zinc-800" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ──────────────────────────────────────────────────────────── */}
        {/* ROW 5: DATE STEPPER BANNER (CHỈ HIỂN THỊ KHI ĐANG LỌC THEO NGÀY) */}
        {/* ──────────────────────────────────────────────────────────── */}
        {selectedDate && (
          <div className="flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-2xl bg-zinc-900/90 border border-white/15 backdrop-blur-md shadow-md">
            <button
              type="button"
              onClick={handlePrevDay}
              className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/[0.08] hover:bg-white/15 active:scale-95 text-zinc-200 hover:text-white transition shrink-0"
              title="Lùi 1 ngày"
            >
              <ChevronLeft size={16} />
            </button>

            <label className="relative cursor-pointer flex-1 min-w-0 flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 transition active:scale-95">
              <Calendar size={13} className="text-amber-400 shrink-0" />
              <span className="text-xs font-bold text-white tracking-wide truncate">
                {(() => {
                  const [y, m, d] = selectedDate.split("-").map(Number);
                  return formatDateHeading(new Date(y, m - 1, d));
                })()}
              </span>
              <input
                type="date"
                max={toDateKey(new Date())}
                value={selectedDate}
                onChange={(e) => {
                  if (e.target.value) handleSelectDate(e.target.value);
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleNextDay}
                disabled={selectedDate >= toDateKey(new Date())}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/[0.08] hover:bg-white/15 active:scale-95 text-zinc-200 hover:text-white transition disabled:opacity-20 disabled:pointer-events-none"
                title="Tiến 1 ngày"
              >
                <ChevronRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => handleSelectDate(null)}
                className="flex items-center justify-center w-8 h-8 rounded-xl bg-white/[0.08] hover:bg-rose-500/20 active:scale-95 text-zinc-400 hover:text-rose-400 transition"
                title="Bỏ lọc theo ngày, xem tất cả"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Transactions List Grouped by Day */}
      <section className="rounded-3xl border border-white/[0.08] bg-zinc-950 shadow-sm overflow-hidden">
        {groupedDays.length > 0 ? (
          <div>
            {groupedDays.map((group) => (
              <div key={group.dateKey} className="border-b border-white/[0.06] last:border-b-0">
                {/* Sticky Daily Sub-Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2.5 bg-zinc-900/90 backdrop-blur border-b border-white/[0.06]">
                  <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                    <Calendar size={12} className="text-zinc-400" />
                    {group.dateLabel}
                  </span>
                  <span className="text-[11px] font-medium text-zinc-400">
                    Tổng ngày: <span className="text-white font-bold">-{formatCurrency(group.totalExpense)}</span>
                  </span>
                </div>

                {/* Items in this Day */}
                <div className="divide-y divide-white/[0.04]">
                  {group.transactions.map((t) => {
                    const hasReceipt = !!t.receiptImagePath;
                    const receiptUrl = getReceiptImageUrl(t.receiptImagePath);

                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTransaction(t)}
                        className="flex items-center justify-between gap-3 p-4 hover:bg-white/[0.03] cursor-pointer transition"
                      >
                        {/* Left: Thumbnail or Category Icon */}
                        <div className="flex min-w-0 items-center gap-3">
                          {hasReceipt && receiptUrl ? (
                            <div className="relative h-11 w-11 shrink-0 rounded-xl overflow-hidden border border-white/20 bg-black">
                              <ReceiptImage
                                src={receiptUrl}
                                path={t.receiptImagePath}
                                alt="Bill thumbnail"
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute bottom-0 inset-x-0 bg-white text-black text-center text-[7px] font-black leading-tight">
                                BILL
                              </div>
                            </div>
                          ) : t.source === TransactionSource.MoMo ? (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-white border border-white/10 font-bold text-[11px]">
                              MoMo
                            </div>
                          ) : t.source === TransactionSource.Cake ? (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-white border border-white/10 font-bold text-[11px]">
                              Cake
                            </div>
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-zinc-300 border border-white/10">
                              <Receipt size={17} />
                            </div>
                          )}

                          {/* Middle Details */}
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-white">
                              {t.description || t.merchant || "Khoản chi tiêu"}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-zinc-400">
                              <span className="flex items-center gap-1">
                                <Calendar size={10} /> {new Date(t.transactionDate).toLocaleDateString("vi-VN")}
                              </span>

                              {/* Source Badge */}
                              {t.source === TransactionSource.MoMo && (
                                <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium bg-white/[0.06] text-zinc-300 border border-white/10">
                                  Ví MoMo
                                </span>
                              )}
                              {t.source === TransactionSource.Cake && (
                                <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium bg-white/[0.06] text-zinc-300 border border-white/10">
                                  Cake VPBank
                                </span>
                              )}
                              {t.source === TransactionSource.SnapReceipt && (
                                <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-medium bg-white/[0.06] text-zinc-300 border border-white/10">
                                  Ảnh bill
                                </span>
                              )}

                              {t.categoryName && (
                                <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9.5px] font-medium text-zinc-300 bg-white/[0.06] border border-white/10">
                                  <Tag size={8} className="text-zinc-400" /> {t.categoryName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Amount & Delete Button */}
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span
                            className={cn(
                              "text-xs sm:text-sm font-black tracking-tight",
                              t.type === TransactionType.Income ? "text-emerald-400" : "text-white"
                            )}
                          >
                            {t.type === TransactionType.Income ? "+" : "-"}{formatCurrency(t.amount)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Xóa giao dịch này khỏi sổ chi tiêu?")) {
                                handleDelete(t.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-zinc-600 hover:text-rose-400 hover:bg-white/[0.06] transition"
                            title="Xóa giao dịch"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-14 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] text-zinc-400 border border-white/10">
              <Calendar size={22} className="text-amber-400" />
            </div>
            <div>
              <p className="font-bold text-xs text-white">
                {selectedDate 
                  ? `Không có giao dịch nào trong ngày ${selectedDate.split("-").reverse().join("/")}`
                  : "Không tìm thấy giao dịch nào"}
              </p>
              <p className="mt-1 text-[11px] text-zinc-500 max-w-xs mx-auto">
                {selectedDate
                  ? "Bạn chưa ghi chép khoản chi hoặc thu nhập nào vào ngày này."
                  : "Thử đổi mốc thời gian hoặc từ khóa tìm kiếm khác."}
              </p>
            </div>
            {selectedDate && (
              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleSelectDate(toDateKey(new Date()))}
                  className="px-3.5 py-1.5 rounded-xl bg-white text-black font-bold text-xs active:scale-95 transition shadow-sm"
                >
                  Về Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDate(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-zinc-300 font-semibold text-xs active:scale-95 transition"
                >
                  Xem tất cả
                </button>
              </div>
            )}
          </div>
        )}

        {visibleData.length < filteredData.length && (
          <div className="border-t border-white/[0.06] p-3">
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="w-full py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/10 border border-white/10 text-xs font-semibold text-white transition active:scale-95"
            >
              Xem thêm giao dịch
            </button>
          </div>
        )}
      </section>

      {/* Polaroid Detail Modal */}
      <PolaroidDetailModal
        transaction={selectedTransaction}
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onDelete={handleDelete}
      />
    </motion.div>
  );
}
