import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, ArrowDownRight, ArrowUpRight, Camera, Trash2, Tag, Calendar, Receipt, Download } from "lucide-react";
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
      window.dispatchEvent(new CustomEvent("transaction-updated"));
      toast.success("Đã xóa giao dịch thành công!");
    } catch {
      toast.error("Không thể xóa giao dịch. Vui lòng thử lại!");
    }
  };

  const formatCurrency = (val: number) => `${new Intl.NumberFormat("vi-VN").format(val)}đ`;

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

  const visibleData = filteredData.slice(0, page * 15);
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
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 px-4 pt-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Lịch Sử Giao Dịch</h1>
          <p className="text-xs text-slate-400">
            {isLoading ? "Đang tải dữ liệu..." : `${filteredData.length} giao dịch`}
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={filteredData.length === 0}
          className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800 transition disabled:opacity-40"
        >
          <Download size={14} /> Xuất CSV
        </button>
      </div>

      {/* Summary Cards */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tổng thu lọc</span>
            <span className="text-lg font-black text-emerald-400 tracking-tight mt-0.5 block">{formatCurrency(totalIncome)}</span>
          </div>
          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <ArrowDownRight size={18} />
          </span>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Tổng chi lọc</span>
            <span className="text-lg font-black text-rose-400 tracking-tight mt-0.5 block">{formatCurrency(totalExpense)}</span>
          </div>
          <span className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
            <ArrowUpRight size={18} />
          </span>
        </div>
      </section>

      {/* Search & Filter Chips */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-sm space-y-3">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Search size={16} className="text-slate-500" />
          </div>
          <input
            type="text"
            placeholder="Tìm theo nội dung, danh mục..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="w-full min-h-[42px] rounded-xl border border-slate-800 bg-slate-950 py-2.5 pl-9 pr-4 text-xs font-medium text-white outline-none transition focus:border-blue-500 placeholder-slate-600"
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
                    : "bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
                )}
              >
                {Icon && <Icon size={13} />}
                {filter.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Transactions List */}
      <section className="rounded-3xl border border-slate-800 bg-slate-900 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-800/80">
          {visibleData.map((t) => {
            const isIncome = t.type === TransactionType.Income;
            const hasReceipt = !!t.receiptImagePath;
            const receiptUrl = getReceiptImageUrl(t.receiptImagePath);

            return (
              <div
                key={t.id}
                onClick={() => setSelectedTransaction(t)}
                className="flex items-center justify-between gap-3 p-4 hover:bg-slate-800/40 cursor-pointer transition"
              >
                {/* Left: Thumbnail or Category Icon */}
                <div className="flex min-w-0 items-center gap-3">
                  {hasReceipt && receiptUrl ? (
                    <div className="relative h-11 w-11 shrink-0 rounded-xl overflow-hidden border border-indigo-400/40 bg-black">
                      <img
                        src={receiptUrl}
                        alt="Bill thumbnail"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-indigo-600 text-center text-[7px] font-black text-white leading-tight">
                        SNAP
                      </div>
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                        isIncome ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                      )}
                    >
                      {isIncome ? <ArrowDownRight size={18} /> : <Receipt size={18} />}
                    </div>
                  )}

                  {/* Middle Details */}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-white">
                      {t.description || t.merchant || "Giao dịch"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={10} /> {new Date(t.transactionDate).toLocaleDateString("vi-VN")}
                      </span>
                      {t.categoryName && (
                        <span
                          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9.5px] font-bold text-white"
                          style={{ backgroundColor: t.categoryColor || "#3b82f6" }}
                        >
                          <Tag size={8} /> {t.categoryName}
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
                      isIncome ? "text-emerald-400" : "text-slate-200"
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
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                    title="Xóa giao dịch"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}

          {!isLoading && visibleData.length === 0 && (
            <div className="px-5 py-14 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
                <Search size={20} />
              </div>
              <p className="font-bold text-xs text-white">Không tìm thấy giao dịch nào</p>
              <p className="mt-1 text-[11px] text-slate-500">Thử đổi từ khóa hoặc bộ lọc khác.</p>
            </div>
          )}
        </div>

        {visibleData.length < filteredData.length && (
          <div className="border-t border-slate-800 p-3">
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              className="w-full py-2.5 rounded-xl bg-slate-800/80 text-xs font-bold text-slate-300 hover:bg-slate-800 transition"
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
