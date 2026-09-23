import { useState, useRef, useEffect } from "react";
import { Target, Pencil, Check, X, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../lib/utils";

interface WeeklyBudgetCardProps {
  weeklyBudget: number | null;
  currentSpent: number;
  onBudgetChange: (budget: number | null) => void;
  formatCurrency: (val: number) => string;
}

export default function WeeklyBudgetCard({
  weeklyBudget,
  currentSpent,
  onBudgetChange,
  formatCurrency,
}: WeeklyBudgetCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    setInputValue(weeklyBudget ? new Intl.NumberFormat("vi-VN").format(weeklyBudget) : "");
    setIsEditing(true);
  };

  const handleSave = () => {
    const numeric = Number(inputValue.replace(/\D/g, ""));
    if (numeric > 0) {
      onBudgetChange(numeric);
    }
    setIsEditing(false);
  };

  const handleClear = () => {
    onBudgetChange(null);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setIsEditing(false);
  };

  // Tính ratio và màu sắc
  const ratio = weeklyBudget && weeklyBudget > 0 ? currentSpent / weeklyBudget : 0;
  const percent = Math.min(ratio * 100, 100);
  const remaining = weeklyBudget ? weeklyBudget - currentSpent : 0;
  const isOver = remaining < 0;

  const barColor =
    ratio >= 1.0
      ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
      : ratio >= 0.8
      ? "bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.4)]"
      : "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.4)]";

  const StatusIcon =
    ratio >= 1.0 ? TrendingUp : ratio >= 0.8 ? Minus : TrendingDown;
  const statusColor =
    ratio >= 1.0 ? "text-red-400" : ratio >= 0.8 ? "text-yellow-400" : "text-emerald-400";

  return (
    <section className="rounded-3xl bg-zinc-950 border border-white/[0.08] p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={15} className="text-white" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">
            Ngân Sách Tuần
          </h2>
        </div>

        {!isEditing && (
          <button
            type="button"
            onClick={handleStartEdit}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-zinc-400 hover:text-white text-[11px] font-semibold transition active:scale-95"
          >
            <Pencil size={11} />
            {weeklyBudget ? "Sửa" : "Đặt ngân sách"}
          </button>
        )}
      </div>

      {/* Edit Form */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={inputValue}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setInputValue(val ? new Intl.NumberFormat("vi-VN").format(parseInt(val, 10)) : "");
                  }}
                  onKeyDown={handleKeyDown}
                  className="w-full rounded-2xl bg-black border border-white/10 px-4 py-3 text-lg font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 text-right pr-14"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                  VNĐ
                </span>
              </div>
              <button
                type="button"
                onClick={handleSave}
                className="p-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 transition active:scale-95"
              >
                <Check size={16} />
              </button>
              {weeklyBudget && (
                <button
                  type="button"
                  onClick={handleClear}
                  title="Xóa ngân sách"
                  className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-red-900/40 border border-white/10 text-zinc-400 hover:text-red-400 transition active:scale-95"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Budget Display */}
      {weeklyBudget ? (
        <div className="space-y-3">
          {/* Numbers row */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] text-zinc-500 font-medium mb-0.5">Đã chi</p>
              <p className="text-2xl font-extrabold text-white tracking-tight">
                {formatCurrency(currentSpent)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-zinc-500 font-medium mb-0.5">Ngân sách</p>
              <p className="text-sm font-bold text-zinc-300">{formatCurrency(weeklyBudget)}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className={cn("h-full rounded-full transition-all duration-700", barColor)}
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-semibold">
              <span className="text-zinc-500">{Math.round(percent)}% đã dùng</span>
              <span className={cn("flex items-center gap-1", statusColor)}>
                <StatusIcon size={11} />
                {isOver
                  ? `Vượt ${formatCurrency(Math.abs(remaining))}`
                  : `Còn lại ${formatCurrency(remaining)}`}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* No budget set — prompt */
        <div className="py-3 text-center space-y-1">
          <p className="text-xs text-zinc-500">
            Chưa có ngân sách tuần. Bấm <strong className="text-zinc-300">Đặt ngân sách</strong> để theo dõi chi tiêu!
          </p>
        </div>
      )}
    </section>
  );
}
