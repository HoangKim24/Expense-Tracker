import { useEffect, useMemo, useState } from "react";
import { Search, Filter, Mail, Receipt, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../lib/utils";
import { historyTransactions } from "../mockData";
import { getTransactions, TransactionSource, TransactionType, type TransactionDto } from "../lib/api";

type FilterMode = "all" | "expense" | "income" | "gmail";

export default function TransactionHistory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [transactions, setTransactions] = useState<TransactionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  useEffect(() => {
    getTransactions()
      .then(data => {
        setTransactions(data);
        setIsUsingFallback(false);
      })
      .catch(() => {
        setIsUsingFallback(true);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const formatCurrency = (val: number) => new Intl.NumberFormat("vi-VN").format(val) + "đ";

  const apiTransactions = useMemo(() => transactions.map(transaction => ({
    id: transaction.id,
    desc: transaction.description || transaction.merchant || "Giao dịch",
    amount: transaction.amount,
    source: transaction.source === TransactionSource.Gmail ? "Gmail" : "Thủ công",
    icon: Receipt,
    bg: transaction.type === TransactionType.Income ? "bg-emerald-50" : "bg-blue-50",
    col: transaction.type === TransactionType.Income ? "text-emerald-600" : "text-blue-600",
    type: transaction.type === TransactionType.Income ? "income" : "expense",
    date: new Date(transaction.transactionDate).toLocaleDateString("vi-VN"),
  })), [transactions]);

  const sourceData = apiTransactions.length > 0 && !isUsingFallback ? apiTransactions : historyTransactions;

  const filteredData = sourceData.filter(t => {
    const matchesSearch = t.desc.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMode = filterMode === "all"
      || t.type === filterMode
      || (filterMode === "gmail" && t.source.includes("Gmail"));

    return matchesSearch && matchesMode;
  });

  const visibleData = filteredData.slice(0, page * 8);
  const totalIncome = filteredData.filter(t => t.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const totalExpense = filteredData.filter(t => t.type === "expense").reduce((sum, item) => sum + item.amount, 0);

  const filters: Array<{ value: FilterMode; label: string }> = [
    { value: "all", label: "Tất cả" },
    { value: "expense", label: "Chi" },
    { value: "income", label: "Thu" },
    { value: "gmail", label: "Gmail" },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{isLoading ? "Đang tải dữ liệu" : `${filteredData.length} giao dịch`}</p>
          <h2 className="text-2xl font-extrabold text-slate-950">Lịch sử giao dịch</h2>
        </div>
        <div className={cn(
          "rounded-lg border px-3 py-2 text-xs font-bold",
          isUsingFallback ? "border-amber-200 bg-amber-50 text-amber-700" : "border-slate-200 bg-white text-slate-600"
        )}>
          {isUsingFallback ? "Dữ liệu mẫu" : "Dữ liệu thật"}
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        <SummaryCard label="Tổng thu trong bộ lọc" value={formatCurrency(totalIncome)} icon={ArrowDownRight} tone="emerald" />
        <SummaryCard label="Tổng chi trong bộ lọc" value={formatCurrency(totalExpense)} icon={ArrowUpRight} tone="rose" />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm theo mô tả, merchant..."
              className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm font-medium outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <button type="button" className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700">
            <Filter size={20} />
          </button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {filters.map(filter => (
            <button
              type="button"
              key={filter.value}
              onClick={() => {
                setFilterMode(filter.value);
                setPage(1);
              }}
              className={cn(
                "min-h-[36px] shrink-0 rounded-lg px-3 text-sm font-bold transition",
                filterMode === filter.value
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100">
          {visibleData.map(t => (
            <div key={t.id} className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
              <div className="flex min-w-0 items-center gap-3">
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", t.bg, t.col)}>
                  <t.icon size={20} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950">{t.desc}</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-400">{t.date}</p>
                  <span className={cn(
                    "mt-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold",
                    t.source.includes("Gmail") ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"
                  )}>
                    {t.source.includes("Gmail") && <Mail size={10} />}
                    {t.source}
                  </span>
                </div>
              </div>
              <span className={cn("shrink-0 text-sm font-extrabold", t.type === "income" ? "text-emerald-600" : "text-slate-950")}>
                {t.type === "income" ? "+" : "-"}{formatCurrency(t.amount)}
              </span>
            </div>
          ))}

          {visibleData.length === 0 && (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                <Search size={21} />
              </div>
              <p className="font-bold text-slate-900">Không có giao dịch phù hợp</p>
              <p className="mt-1 text-sm text-slate-500">Thử đổi từ khóa hoặc bộ lọc.</p>
            </div>
          )}
        </div>

        {visibleData.length < filteredData.length && (
          <div className="border-t border-slate-100 p-4">
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              className="min-h-[44px] w-full rounded-lg bg-slate-100 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
            >
              Xem thêm
            </button>
          </div>
        )}
      </section>
    </motion.div>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
  tone: "emerald" | "rose";
  icon: typeof ArrowDownRight;
};

function SummaryCard({ label, value, tone, icon: Icon }: SummaryCardProps) {
  const toneClass = tone === "emerald"
    ? "bg-emerald-50 text-emerald-700"
    : "bg-rose-50 text-rose-700";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-500">{label}</p>
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", toneClass)}>
          <Icon size={18} />
        </span>
      </div>
      <p className="text-xl font-extrabold text-slate-950">{value}</p>
    </div>
  );
}
