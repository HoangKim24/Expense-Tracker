import { useState, useEffect, useRef } from "react";
import { ArrowDownRight, ArrowUpRight, X, Camera } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { createTransaction, getCategories, TransactionSource, TransactionType, type CategoryDto } from "../lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenSnapCamera?: () => void;
}

type EntryType = "expense" | "income";

export default function QuickAddBottomSheet({ isOpen, onClose, onOpenSnapCamera }: Props) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [entryType, setEntryType] = useState<EntryType>("expense");
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setAmount("");
    setNote("");
    setEntryType("expense");
    setTransactionDate(new Date().toISOString().slice(0, 10));
    setCategoryId("");
    setIsSaving(false);
  };

  useEffect(() => {
    if (isOpen) {
      getCategories().then(setCategories).catch(() => setCategories([]));
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
        transactionDate: new Date(`${transactionDate}T12:00:00`).toISOString(),
        description: note || (entryType === "income" ? "Khoản thu nhập nhanh" : "Giao dịch nhập nhanh"),
        type: entryType === "income" ? TransactionType.Income : TransactionType.Expense,
        source: TransactionSource.Manual,
        categoryId: categoryId || null,
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
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5">
              <div>
                <p className="text-xs font-bold uppercase text-slate-400">Tạo giao dịch</p>
                <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">Nhập nhanh</h2>
              </div>
              <div className="flex items-center gap-2">
                {onOpenSnapCamera && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      onOpenSnapCamera();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition shadow-sm"
                  >
                    <Camera size={15} /> Chụp bill
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { triggerHaptic(); onClose(); }}
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X size={24} />
                </button>
              </div>
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

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase text-slate-500">Danh muc</span>
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                >
                  <option value="">Khong chon danh muc</option>
                  {categories
                    .filter(category => category.type === (entryType === "income" ? TransactionType.Income : TransactionType.Expense))
                    .map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase text-slate-500">Ngay giao dich</span>
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(event) => setTransactionDate(event.target.value)}
                  className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
                />
              </label>

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
