import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, ArrowDownRight, ArrowUpRight, Camera, Trash2, Tag, Calendar, Receipt } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { 
  getTransactions, 
  deleteTransaction, 
  getReceiptImageUrl, 
  TransactionType, 
  TransactionSource, 
  type TransactionDto 
} from "../lib/api";
import PolaroidDetailModal from "../components/PolaroidDetailModal";

type FilterMode = "all" | "expense" | "income" | "receipt";

export default function TransactionHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDto | null>(null);

  const fetchTransactions = useCallback(() => {
    setIsLoading(true);
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

    const handleUpdate = () => fetchTransactions();
    window.addEventListener("transaction-updated", handleUpdate);
    return () => window.removeEventListener("transaction-updated", handleUpdate);
  }, [fetchTransactions]);

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      toast.success("Đã xóa giao dịch thành công!");
    } catch {
      toast.error("Không thể xóa giao dịch. Vui lòng thử lại!");
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat("vi-VN").format(val) + "đ";

  const filteredData = useMemo(() => {
    return transactions.filter((t) => {
      const desc = (t.description || t.merchant || "").toLowerCase();
      const cat = (t.categoryName || "").toLowerCase();
      const matchesSearch = desc.includes(searchTerm.toLowerCase()) || cat.includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (filterMode === "expense") return t.type === TransactionType.Expense;
      if (filterMode === "income") return t.type === TransactionType.Income;
      if (filterMode === "receipt") return !!t.receiptImagePath;
      return true;
    });
  }, [transactions, searchTerm, filterMode]);

  const visibleData = filteredData.slice(0, page * 12);
  const totalIncome = filteredData
    .filter((t) => t.type === TransactionType.Income)
    .reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = filteredData
    .filter((t) => t.type === TransactionType.Expense)
    .reduce((sum, item) => sum + item.amount, 0);

  const filters: Array<{ value: FilterMode; label: string; icon?: typeof Camera }> = [
    { value: "all", label: "Tất cả" },
    { value: "expense", label: "Chi tiêu" },
    { value: "income", label: "Thu nhập" },
    { value: "receipt", label: "Có ảnh bill", icon: Camera },
  ];

  const handleExportCsv = () => {
    if (filteredData.length === 0) return;
    const headers = "ID,Mô tả,Danh mục,Số tiền,Loại,Nguồn,Ngày\n";
    const csvContent = filteredData
      .map((t) => {
        const typeStr = t.type === TransactionType.Income ? "Thu" : "Chi";
        const sourceStr = t.source === TransactionSource.SnapReceipt ? "Snap & Log" : "Nhập tay";
        const dateStr = new Date(t.transactionDate).toLocaleDateString("vi-VN");
        return `"${t.id}","${t.description || t.merchant || ""}","${t.categoryName || ""}","${t.amount}","${typeStr}","${sourceStr}","${dateStr}"`;
      })
      .join("\n");

    const blob = new Blob([headers + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `lich_su_giao_dich_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 px-4 pt-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {isLoading ? "Đang tải dữ liệu..." : `${filteredData.length} giao dịch`}
          </p>
          <h2 className="text-2xl font-black text-slate-950 dark:text-white">Lịch sử giao dịch</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={filteredData.length === 0}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
          >
            <ArrowDownRight size={14} /> Xuất CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <section className="grid gap-3 sm:grid-cols-2">
        <SummaryCard
          label="Tổng thu lọc"
          value={formatCurrency(totalIncome)}
          icon={ArrowDownRight}
          tone="emerald"
        />
        <SummaryCard
          label="Tổng chi lọc"
          value={formatCurrency(totalExpense)}
          icon={ArrowUpRight}
          tone="rose"
        />
      </section>

      {/* Search & Filters */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Search size={18} className="text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Tìm theo nội dung, danh mục..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 dark:text-white outline-none transition focus:border-blue-400 focus:bg-white dark:focus:bg-slate-900"
          />
        </div>

        {/* Filter chips */}
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
                  "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition",
                  isSelected
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                {Icon && <Icon size={14} />}
                {filter.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Transactions List */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {visibleData.map((t) => {
            const isIncome = t.type === TransactionType.Income;
            const hasReceipt = !!t.receiptImagePath;
            const receiptUrl = getReceiptImageUrl(t.receiptImagePath);

            return (
              <div
                key={t.id}
                onClick={() => setSelectedTransaction(t)}
                className="flex items-center justify-between gap-3 p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition"
              >
                {/* Left: Thumbnail or Category Icon */}
                <div className="flex min-w-0 items-center gap-3">
                  {hasReceipt && receiptUrl ? (
                    <div className="relative h-12 w-12 shrink-0 rounded-2xl overflow-hidden border-2 border-indigo-400/40 shadow-sm bg-slate-950">
                      <img
                        src={receiptUrl}
                        alt="Bill thumbnail"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-indigo-600/90 text-center text-[8px] font-black text-white leading-tight py-0.5">
                        SNAP
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                        isIncome
                          ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400"
                          : "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400"
                      )}
                    >
                      {isIncome ? <ArrowDownRight size={20} /> : <Receipt size={20} />}
                    </div>
                  )}

                  {/* Middle Details */}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                      {t.description || t.merchant || "Giao dịch"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} /> {new Date(t.transactionDate).toLocaleDateString("vi-VN")}
                      </span>
                      {t.categoryName && (
                        <span
                          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-white"
                          style={{ backgroundColor: t.categoryColor || "#3b82f6" }}
                        >
                          <Tag size={9} /> {t.categoryName}
                        </span>
                      )}
                      {t.source === TransactionSource.SnapReceipt && !hasReceipt && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-indigo-500">
                          <Camera size={10} /> Snap
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Quick Delete */}
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={cn(
                      "text-sm sm:text-base font-black tracking-tight",
                      isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-white"
                    )}
                  >
                    {isIncome ? "+" : "-"}{formatCurrency(t.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Xóa giao dịch này?")) {
                        handleDelete(t.id);
                      }
                    }}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                    title="Xóa giao dịch"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}

          {!isLoading && visibleData.length === 0 && (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                <Search size={24} />
              </div>
              <p className="font-extrabold text-slate-800 dark:text-white">Không tìm thấy giao dịch nào</p>
              <p className="mt-1 text-xs text-slate-500">Thử tìm từ khóa khác hoặc chụp hóa đơn mới nhé.</p>
            </div>
          )}
        </div>

        {visibleData.length < filteredData.length && (
          <div className="border-t border-slate-100 dark:border-slate-800 p-4">
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="w-full min-h-[44px] rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
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

function SummaryCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: "emerald" | "rose";
  icon: typeof ArrowDownRight;
}) {
  const isEmerald = tone === "emerald";
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
        <div
          className={cn(
            "p-1.5 rounded-xl",
            isEmerald
              ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600"
              : "bg-rose-50 dark:bg-rose-950/50 text-rose-600"
          )}
        >
          <Icon size={16} />
        </div>
      </div>
      <p className="text-xl font-black text-slate-950 dark:text-white tracking-tight">{value}</p>
    </div>
  );
}
