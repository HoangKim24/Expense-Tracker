import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, ArrowUpRight, Camera, Trash2, Tag, Calendar, Receipt, Download, RefreshCw, Smartphone } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { 
  getTransactions, 
  deleteTransaction, 
  getReceiptImageUrl, 
  syncGmailTransactions,
  TransactionType, 
  TransactionSource, 
  type TransactionDto 
} from "../lib/api";
import PolaroidDetailModal from "../components/PolaroidDetailModal";
import ReceiptImage from "../components/ReceiptImage";
import { isToday, isThisWeek, isThisMonth, groupTransactionsByDate } from "../lib/dateUtils";

type FilterMode = "all" | "receipt" | "momo" | "cake" | "manual";
type PeriodFilter = "all" | "today" | "week" | "month";

export default function TransactionHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDto | null>(null);

  const fetchTransactions = useCallback(() => {
    setIsLoading(true);
    getTransactions()
      .then((data) => {
        // Chỉ lấy các giao dịch chi tiêu
        setTransactions(data.filter((t) => t.type === TransactionType.Expense));
      })
      .catch(() => {
        toast.error("Không thể tải lịch sử giao dịch. Vui lòng thử lại!");
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    fetchTransactions();

    const handleUpdate = () => fetchTransactions();
    window.addEventListener("transaction-updated", handleUpdate);
    return () => window.removeEventListener("transaction-updated", handleUpdate);
  }, [fetchTransactions]);

  const handleDelete = async (id: string) => {
    try {
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

  const formatCurrency = (val: number) => `${new Intl.NumberFormat("vi-VN").format(val)}đ`;

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

  const filteredData = useMemo(() => {
    return transactions.filter((t) => {
      // 1. Lọc theo mốc thời gian (Hôm nay / Tuần này / Tháng này / Tất cả)
      if (periodFilter === "today" && !isToday(t.transactionDate)) return false;
      if (periodFilter === "week" && !isThisWeek(t.transactionDate)) return false;
      if (periodFilter === "month" && !isThisMonth(t.transactionDate)) return false;

      // 2. Lọc theo tìm kiếm
      const desc = (t.description || t.merchant || "").toLowerCase();
      const cat = (t.categoryName || "").toLowerCase();
      const matchesSearch = desc.includes(searchTerm.toLowerCase()) || cat.includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // 3. Lọc theo nguồn
      if (filterMode === "receipt") return !!t.receiptImagePath || t.source === TransactionSource.SnapReceipt;
      if (filterMode === "momo") return t.source === TransactionSource.MoMo;
      if (filterMode === "cake") return t.source === TransactionSource.Cake;
      if (filterMode === "manual") return t.source === TransactionSource.Manual;
      return true;
    });
  }, [transactions, searchTerm, filterMode, periodFilter]);

  const visibleData = filteredData.slice(0, page * 15);
  const totalExpense = filteredData.reduce((sum, item) => sum + item.amount, 0);

  const groupedDays = useMemo(() => {
    return groupTransactionsByDate(visibleData);
  }, [visibleData]);

  const summaryTitle = useMemo(() => {
    if (periodFilter === "today") return "Tổng Chi Tiêu Hôm Nay";
    if (periodFilter === "week") return "Tổng Chi Tiêu Tuần Này";
    if (periodFilter === "month") return "Tổng Chi Tiêu Tháng Này";
    return "Tổng Chi Tiêu Đã Lọc";
  }, [periodFilter]);

  const periodFilters: Array<{ value: PeriodFilter; label: string }> = [
    { value: "all", label: "Tất cả" },
    { value: "today", label: "Hôm nay" },
    { value: "week", label: "Tuần này" },
    { value: "month", label: "Tháng này" },
  ];

  const filters: Array<{ value: FilterMode; label: string; icon?: typeof Camera | typeof RefreshCw | typeof Smartphone }> = [
    { value: "all", label: "Tất cả chi tiêu" },
    { value: "momo", label: "Ví MoMo", icon: Smartphone },
    { value: "cake", label: "Cake VPBank" },
    { value: "receipt", label: "Có ảnh bill", icon: Camera },
    { value: "manual", label: "Nhập tay" },
  ];

  const handleExportCsv = () => {
    if (filteredData.length === 0) return;
    const headers = "ID,Mô tả,Danh mục,Số tiền,Nguồn,Ngày\n";
    const csvContent = filteredData
      .map((t) => {
        let sourceStr = "Nhập tay";
        if (t.source === TransactionSource.SnapReceipt) sourceStr = "Snap Bill";
        if (t.source === TransactionSource.MoMo) sourceStr = "MoMo";
        if (t.source === TransactionSource.Cake) sourceStr = "Cake Bank";
        const dateStr = new Date(t.transactionDate).toLocaleDateString("vi-VN");
        return `"${t.id}","${t.description || t.merchant || ""}","${t.categoryName || ""}","-${t.amount}","${sourceStr}","${dateStr}"`;
      })
      .join("\n");

    const blob = new Blob([headers + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `lich_su_chi_tieu_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 px-4 pt-4 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Lịch Sử Giao Dịch</h1>
          <p className="text-xs text-zinc-400">
            {isLoading ? "Đang tải dữ liệu..." : `${filteredData.length} giao dịch`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* MoMo & Cake Sync Button */}
          <button
            type="button"
            onClick={handleSyncMoMoCake}
            disabled={isSyncing}
            className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-50"
            title="Đồng bộ biến động số dư từ MoMo & Cake"
          >
            <RefreshCw size={13} className={cn("text-zinc-400", isSyncing && "animate-spin")} />
            <span>{isSyncing ? "Đang quét..." : "Đồng bộ MoMo/Cake"}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredData.length === 0}
            className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.06] hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-40"
          >
            <Download size={13} />
            <span>Xuất CSV</span>
          </button>
        </div>
      </div>

      {/* Summary Card - Matte Dark Glass */}
      <section className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-4 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
            {summaryTitle}
          </span>
          <span className="text-2xl font-black text-white tracking-tight mt-0.5 block">
            {formatCurrency(totalExpense)}
          </span>
        </div>
        <span className="p-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white">
          <ArrowUpRight size={20} />
        </span>
      </section>

      {/* Search & Filter Chips */}
      <section className="space-y-3">
        {/* Period Filter (Hôm nay / Tuần này / Tháng này / Tất cả) */}
        <div className="flex bg-zinc-950 p-1 rounded-2xl border border-white/[0.08]">
          {periodFilters.map((p) => {
            const isSelected = periodFilter === p.value;
            return (
              <button
                type="button"
                key={p.value}
                onClick={() => {
                  setPeriodFilter(p.value);
                  setPage(1);
                }}
                className={cn(
                  "flex-1 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 text-center",
                  isSelected
                    ? "bg-white text-black shadow-sm font-bold"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Search size={15} className="text-zinc-500" />
          </div>
          <input
            type="text"
            placeholder="Tìm theo nội dung, danh mục, số tiền..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full min-h-[42px] rounded-2xl border border-white/[0.08] bg-zinc-950 py-2.5 pl-9 pr-4 text-base sm:text-xs font-medium text-white outline-none transition focus:border-white/30 placeholder-zinc-600"
          />
        </div>

        {/* Source Filter chips - Segmented Controls */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {filters.map((filter) => {
            const Icon = filter.icon;
            const isSelected = filterMode === filter.value;
            return (
              <button
                type="button"
                key={filter.value}
                onClick={() => {
                  setFilterMode(filter.value);
                  setPage(1);
                }}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95",
                  isSelected
                    ? "bg-white text-black shadow-sm font-bold"
                    : "bg-zinc-950 text-zinc-400 border border-white/[0.08] hover:text-white"
                )}
              >
                {Icon && <Icon size={12} />}
                {filter.label}
              </button>
            );
          })}
        </div>
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
                          <span className="text-xs sm:text-sm font-black tracking-tight text-white">
                            -{formatCurrency(t.amount)}
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
          <div className="px-5 py-14 text-center">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06] text-zinc-400 border border-white/10">
              <Search size={18} />
            </div>
            <p className="font-bold text-xs text-white">Không tìm thấy giao dịch nào</p>
            <p className="mt-1 text-[11px] text-zinc-500">Thử đổi mốc thời gian hoặc bộ lọc khác.</p>
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
