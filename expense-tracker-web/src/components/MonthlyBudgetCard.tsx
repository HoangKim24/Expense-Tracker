import { useState, useRef } from "react";
import { Target, Pencil, Check, X, AlertTriangle, ShieldCheck, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "../lib/utils";

const MONTHLY_BUDGET_KEY = "monthly_budget_vnd";
const DEFAULT_BUDGET = 5000000; // 5.000.000đ mặc định

interface MonthlyBudgetCardProps {
  currentExpenseMonth: number;
  formatCurrency: (val: number) => string;
}

export default function MonthlyBudgetCard({
  currentExpenseMonth,
  formatCurrency,
}: MonthlyBudgetCardProps) {
  const [budget, setBudget] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_BUDGET;
    const saved = localStorage.getItem(MONTHLY_BUDGET_KEY);
    if (!saved) return DEFAULT_BUDGET;
    const parsed = parseInt(saved, 10);
    return isNaN(parsed) || parsed <= 0 ? DEFAULT_BUDGET : parsed;
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleStartEdit = () => {
    setEditValue(new Intl.NumberFormat("vi-VN").format(budget));
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  const handleSave = () => {
    const numeric = parseInt(editValue.replace(/\D/g, ""), 10);
    if (!numeric || numeric <= 0) {
      toast.error("Vui lòng nhập ngân sách lớn hơn 0đ");
      return;
    }
    setBudget(numeric);
    localStorage.setItem(MONTHLY_BUDGET_KEY, numeric.toString());
    setIsEditing(false);
    toast.success(`Đã cập nhật ngân sách tháng: ${formatCurrency(numeric)}`);
  };

  // Tính toán chỉ số ngày & ngân sách còn lại
  const now = new Date();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const currentDay = now.getDate();
  const daysLeft = Math.max(1, lastDayOfMonth - currentDay + 1);

  const ratio = currentExpenseMonth / budget;
  const percent = Math.min(Math.round(ratio * 100), 100);
  const remaining = budget - currentExpenseMonth;
  const isOver = remaining < 0;
  const dailyAllowance = Math.max(0, Math.round(remaining / daysLeft));

  // Phân loại trạng thái: <70% An toàn, 70-99% Cảnh báo, >=100% Vượt chi
  let statusBadge = {
    label: "Chi tiêu an toàn",
    icon: ShieldCheck,
    color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    barColor: "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.3)]",
  };

  if (ratio >= 1.0) {
    statusBadge = {
      label: `Vượt ngân sách ${Math.round(ratio * 100)}%`,
      icon: AlertCircle,
      color: "text-rose-400 bg-rose-500/15 border-rose-500/30 font-bold animate-pulse",
      barColor: "bg-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.6)]",
    };
  } else if (ratio >= 0.7) {
    statusBadge = {
      label: `Cảnh báo chi tiêu ${Math.round(ratio * 100)}%`,
      icon: AlertTriangle,
      color: "text-amber-400 bg-amber-500/15 border-amber-500/30 font-semibold",
      barColor: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]",
    };
  }

  const StatusIcon = statusBadge.icon;

  return (
    <section className="rounded-3xl bg-zinc-950 border border-white/[0.08] p-5 shadow-2xl relative overflow-hidden space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-300">
            <Target size={14} />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">Ngân Sách Tháng</h2>
            <span className="text-[10px] text-zinc-500">
              Tháng {now.getMonth() + 1}/{now.getFullYear()}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <span
          className={cn(
            "flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border transition-all",
            statusBadge.color
          )}
        >
          <StatusIcon size={12} />
          <span>{statusBadge.label}</span>
        </span>
      </div>

      {/* Main Budget Display or Inline Edit Form */}
      <div className="pt-1">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                value={editValue}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, "");
                  setEditValue(raw ? new Intl.NumberFormat("vi-VN").format(parseInt(raw, 10)) : "");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") setIsEditing(false);
                }}
                className="w-full rounded-2xl bg-black border border-white/20 px-3.5 py-2 text-lg font-bold text-white focus:outline-none focus:border-white/40"
                placeholder="Nhập hạn mức..."
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                VNĐ
              </span>
            </div>
            <button
              type="button"
              onClick={handleSave}
              className="p-2.5 rounded-xl bg-white text-black font-bold active:scale-95 transition"
              title="Lưu"
            >
              <Check size={16} />
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="p-2.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white active:scale-95 transition"
              title="Hủy"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 min-w-0">
            {/* Cột Trái: Đã Chi & Hạn mức */}
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block truncate">
                Đã chi tháng này
              </span>
              <div className="text-2xl font-black text-white tracking-tight truncate my-0.5">
                {formatCurrency(currentExpenseMonth)}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                <span className="truncate">Hạn mức: {formatCurrency(budget)}</span>
                <button
                  type="button"
                  onClick={handleStartEdit}
                  className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition shrink-0 active:scale-95"
                  title="Thay đổi ngân sách tháng"
                >
                  <Pencil size={11} />
                </button>
              </div>
            </div>

            {/* Cột Phải: Còn lại hoặc Vượt chi */}
            <div className="min-w-0 text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 block truncate">
                {isOver ? "Đã vượt chi" : "Còn lại được chi"}
              </span>
              <div
                className={cn(
                  "text-2xl font-black tracking-tight truncate my-0.5",
                  isOver ? "text-rose-400" : "text-emerald-400"
                )}
              >
                {isOver ? `+${formatCurrency(Math.abs(remaining))}` : formatCurrency(remaining)}
              </div>
              <span className="text-xs text-zinc-400 block truncate">
                {isOver ? "Vượt ngân sách" : `Đã dùng ${percent}%`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2 pt-0.5">
        <div className="w-full h-2 rounded-full bg-zinc-900 border border-white/[0.06] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={cn("h-full rounded-full transition-all duration-300", statusBadge.barColor)}
          />
        </div>

        {/* Dynamic Spend Advice per remaining day */}
        <div className="flex items-center justify-between text-[11px] text-zinc-400">
          {isOver ? (
            <span className="text-rose-400 font-medium flex items-center gap-1 truncate">
              <AlertCircle size={11} className="shrink-0" /> Cần thắt chặt chi tiêu!
            </span>
          ) : (
            <span className="truncate">
              Chi tối đa: <strong className="text-zinc-200">{formatCurrency(dailyAllowance)}/ngày</strong>
            </span>
          )}
          <span className="text-zinc-400 shrink-0 font-medium text-[11px]">Còn {daysLeft} ngày</span>
        </div>
      </div>
    </section>
  );
}
