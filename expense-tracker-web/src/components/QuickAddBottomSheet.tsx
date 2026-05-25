import { useState, useEffect, useRef } from "react";
import { ArrowDownRight, ArrowUpRight, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { categories } from "../mockData";
import { createTransaction, TransactionSource, TransactionType } from "../lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type EntryType = "expense" | "income";

export default function QuickAddBottomSheet({ isOpen, onClose }: Props) {
  const [amount, setAmount] = useState("");
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [entryType, setEntryType] = useState<EntryType>("expense");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setAmount("");
    setSelectedCat(null);
    setNote("");
    setEntryType("expense");
    setIsSaving(false);
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
    }
  }, [isOpen]);

  const triggerHaptic = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    triggerHaptic();
    const val = e.target.value.replace(/\D/g, "");
    if (!val) {
      setAmount("");
      return;
    }
    setAmount(new Intl.NumberFormat("en-US").format(parseInt(val, 10)));
  };

  const handleSave = async () => {
    const numericAmount = Number(amount.replace(/\D/g, ""));
    if (!numericAmount || isSaving) return;

    triggerHaptic();
    setIsSaving(true);

    try {
      await createTransaction({
        amount: numericAmount,
        transactionDate: new Date().toISOString(),
        description: note || (entryType === "income" ? "Khoản thu nhập nhanh" : "Giao dịch nhập nhanh"),
        type: entryType === "income" ? TransactionType.Income : TransactionType.Expense,
        source: TransactionSource.Manual,
        categoryId: null,
      });

      confetti({ particleCount: 80, spread: 64, origin: { y: 0.72 }, colors: ["#2563eb", "#10b981", "#f43f5e"] });
      toast.success(`Đã lưu ${amount}đ`, { description: note || "Giao dịch đã được ghi nhận." });
      onClose();
    } catch {
      toast.error("Chưa lưu được giao dịch", { description: "Kiểm tra backend API rồi thử lại nhé." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence onExitComplete={resetForm}>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92vh] max-w-2xl flex-col overflow-hidden rounded-t-lg bg-white pb-safe shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">Tạo giao dịch</p>
                <h2 className="text-xl font-extrabold text-slate-950">Nhập nhanh</h2>
              </div>
              <button
                type="button"
                onClick={() => { triggerHaptic(); onClose(); }}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X size={24} />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto p-5">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
                <TypeButton
                  active={entryType === "expense"}
                  label="Chi"
                  icon={ArrowUpRight}
                  onClick={() => setEntryType("expense")}
                />
                <TypeButton
                  active={entryType === "income"}
                  label="Thu"
                  icon={ArrowDownRight}
                  onClick={() => setEntryType("income")}
                />
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase text-slate-500">Số tiền</span>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    inputMode="numeric"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0"
                    className="min-h-[76px] w-full rounded-lg border border-slate-200 bg-slate-50 py-4 pl-4 pr-12 text-right text-4xl font-extrabold text-slate-950 outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                  {amount && <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xl font-extrabold text-blue-600">đ</span>}
                </div>
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-slate-500">Danh mục gợi ý</span>
                  <span className="text-xs font-semibold text-slate-400">Tùy chọn</span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {categories.map(cat => (
                    <motion.button
                      key={cat.id}
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => { triggerHaptic(); setSelectedCat(cat.id); }}
                      className={cn(
                        "relative flex min-h-[76px] min-w-[44px] flex-col items-center justify-center gap-1 rounded-lg border p-2 text-center transition",
                        selectedCat === cat.id
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      {selectedCat === cat.id && (
                        <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded bg-blue-600 text-white">
                          <Check size={11} />
                        </span>
                      )}
                      <cat.icon size={22} />
                      <span className="text-[11px] font-bold leading-tight">{cat.name}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase text-slate-500">Ghi chú</span>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ví dụ: cà phê sáng, lương tháng..."
                  className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </label>

              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={!amount || isSaving}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-4 text-base font-extrabold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
              >
                {isSaving ? "Đang lưu..." : "Lưu giao dịch"}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function TypeButton({ active, label, icon: Icon, onClick }: { active: boolean; label: string; icon: typeof ArrowUpRight; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[44px] items-center justify-center gap-2 rounded-lg text-sm font-extrabold transition",
        active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
      )}
    >
      <Icon size={18} />
      {label}
    </button>
  );
}
