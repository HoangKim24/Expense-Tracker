import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Clipboard, 
  Check, 
  Tag, 
  CreditCard 
} from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import { 
  getCategories, 
  createTransaction, 
  TransactionType, 
  TransactionSource, 
  type CategoryDto,
  type TransactionTypeValue,
  type TransactionSourceValue,
} from "../lib/api";
import { 
  parseTransactionText, 
  detectCategoryFromText, 
  matchCategoryId 
} from "../lib/smartParser";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function QuickLogDrawer({ isOpen, onClose, onSuccess }: Props) {
  const [transactionType, setTransactionType] = useState<number>(TransactionType.Expense);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<number>(TransactionSource.Manual);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManualCategoryOverride, setIsManualCategoryOverride] = useState(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    setAmount("");
    setDescription("");
    setIsManualCategoryOverride(false);
    setSelectedSource(TransactionSource.Manual);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  // Load categories một lần duy nhất khi khởi tạo
  useEffect(() => {
    getCategories()
      .then((cats) => {
        setCategories(cats);
        if (cats.length > 0) {
          const defaultCat = cats.find((c) => c.type === TransactionType.Expense) || cats[0];
          setSelectedCategoryId(defaultCat.id);
        }
      })
      .catch(() => setCategories([]));
  }, []);

  // Tự động focus vào ô nhập tiền khi mở drawer
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        amountInputRef.current?.focus();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Tự động nhận diện danh mục khi gõ ghi chú
  const handleDescriptionChange = (val: string) => {
    setDescription(val);

    if (!isManualCategoryOverride) {
      const guessedName = detectCategoryFromText(val);
      if (guessedName) {
        const matchedId = matchCategoryId(guessedName, categories);
        if (matchedId) {
          setSelectedCategoryId(matchedId);
        }
      }
    }
  };

  // Nút cộng tiền nhanh
  const handleQuickAdd = (addValue: number) => {
    const current = parseInt(amount.replace(/\D/g, "") || "0", 10);
    const newTotal = current + addValue;
    setAmount(new Intl.NumberFormat("vi-VN").format(newTotal));
  };

  // Trình Dán & Tự Động Bóc Tách Thông Báo (Smart Clipboard Parser)
  const handleSmartPaste = async () => {
    let clipboardText = "";
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        clipboardText = await navigator.clipboard.readText();
      }
    } catch {
      // Trình duyệt không cấp quyền hoặc Safari chặn
    }

    if (!clipboardText) {
      const manualInput = window.prompt("Dán nội dung thông báo giao dịch MoMo hoặc Ngân hàng:");
      if (manualInput) clipboardText = manualInput;
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
      setDescription(parsed.description);
    }
    if (parsed.source) {
      setSelectedSource(parsed.source);
    }
    if (parsed.detectedCategoryName) {
      const matched = matchCategoryId(parsed.detectedCategoryName, categories);
      if (matched) setSelectedCategoryId(matched);
    }

    if (parsed.amount) {
      toast.success("Đã bóc tách thông báo!", {
        description: `Số tiền: ${new Intl.NumberFormat("vi-VN").format(parsed.amount)}đ • ${parsed.description || "Giao dịch"}`,
      });
    } else {
      toast.info("Đã dán văn bản vào ghi chú. Vui lòng nhập số tiền.");
    }
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = parseInt(amount.replace(/\D/g, ""), 10);
    if (isNaN(numeric) || numeric <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ");
      return;
    }

    setIsSubmitting(true);
    try {
      await createTransaction({
        amount: numeric,
        transactionDate: new Date().toISOString(),
        description: description.trim() || (transactionType === TransactionType.Income ? "Thu nhập" : "Chi tiêu"),
        type: transactionType as TransactionTypeValue,
        source: selectedSource as TransactionSourceValue,
        categoryId: selectedCategoryId || null,
      });

      confetti({
        particleCount: 60,
        spread: 65,
        origin: { y: 0.7 },
        colors: transactionType === TransactionType.Income ? ["#34d399", "#10b981", "#ffffff"] : ["#ffffff", "#e4e4e7", "#a1a1aa"],
      });

      const sign = transactionType === TransactionType.Income ? "+" : "-";
      toast.success(`Đã ghi sổ: ${sign}${new Intl.NumberFormat("vi-VN").format(numeric)}đ`, {
        description: description.trim() || (transactionType === TransactionType.Income ? "Khoản thu nhập" : "Khoản chi tiêu"),
      });

      window.dispatchEvent(new CustomEvent("transaction-updated"));
      resetForm();
      onSuccess?.();
      onClose();
    } catch {
      toast.error("Không thể ghi sổ. Vui lòng thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md">
          <div onClick={handleClose} className="absolute inset-0" />

        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative z-10 w-full max-w-lg mx-auto rounded-t-[36px] bg-zinc-950 border-t border-white/10 p-5 pb-9 space-y-3.5 shadow-2xl"
        >
          {/* Top handle bar */}
          <div className="w-12 h-1.5 rounded-full bg-zinc-800 mx-auto" />

          {/* Header & Smart Paste Button */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-white tracking-tight">
              {transactionType === TransactionType.Income ? "Ghi Khoản Thu Nhập" : "Ghi Khoản Chi Tiêu"}
            </h2>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSmartPaste}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition active:scale-95"
                title="Tự động bóc tách tin nhắn MoMo/Bank vừa sao chép"
              >
                <Clipboard size={13} className="text-zinc-300" />
                <span>Dán</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-full bg-white/[0.06] text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Switcher Chi tiêu (-) / Thu nhập (+) */}
          <div className="flex p-1 rounded-2xl bg-black border border-white/[0.08]">
            <button
              type="button"
              onClick={() => {
                setTransactionType(TransactionType.Expense);
                const expCat = categories.find((c) => c.type === TransactionType.Expense);
                if (expCat) setSelectedCategoryId(expCat.id);
              }}
              className={cn(
                "flex-1 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 text-center",
                transactionType === TransactionType.Expense
                  ? "bg-white text-black font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Chi tiêu (-)
            </button>
            <button
              type="button"
              onClick={() => {
                setTransactionType(TransactionType.Income);
                const incCat = categories.find((c) => c.type === TransactionType.Income) || categories[0];
                if (incCat) setSelectedCategoryId(incCat.id);
              }}
              className={cn(
                "flex-1 py-1.5 rounded-xl text-xs font-semibold transition active:scale-95 text-center",
                transactionType === TransactionType.Income
                  ? "bg-emerald-400 text-black font-bold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              Thu nhập (+)
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Ô nhập tiền Native Phone Keypad */}
            <div className="relative">
              <input
                ref={amountInputRef}
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setAmount(val ? new Intl.NumberFormat("vi-VN").format(parseInt(val, 10)) : "");
                }}
                className={cn(
                  "w-full rounded-2xl bg-black border px-4 py-3.5 text-3xl font-extrabold placeholder-zinc-700 focus:outline-none text-right pr-14 transition-colors",
                  transactionType === TransactionType.Income
                    ? "text-emerald-400 border-emerald-500/30 focus:border-emerald-500/60"
                    : "text-white border-white/10 focus:border-white/40"
                )}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                VNĐ
              </span>
            </div>

            {/* Dãy chip cộng nhanh (5 cột chuẩn, nằm gọn trong khung drawer) */}
            <div className="grid grid-cols-5 gap-1.5">
              {[10000, 20000, 50000, 100000, 200000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className="w-full py-1.5 rounded-xl bg-black border border-white/[0.08] hover:border-white/20 text-[11px] font-semibold text-zinc-400 hover:text-white transition active:scale-95 text-center"
                >
                  +{val >= 1000 ? `${val / 1000}k` : val}
                </button>
              ))}
            </div>

            {/* Ô nhập ghi chú */}
            <div>
              <input
                type="text"
                placeholder={transactionType === TransactionType.Income ? "Ghi chú (Lương, thưởng, chuyển khoản, lợi nhuận...)" : "Ghi chú (Cơm trưa, cà phê, grab, siêu thị...)"}
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                className="w-full rounded-2xl bg-black border border-white/10 px-4 py-3 text-xs font-medium text-white placeholder-zinc-600 focus:outline-none focus:border-white/30"
              />
            </div>

            {/* Danh mục (Category Pills) */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <Tag size={11} /> Danh mục
              </span>
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar pr-4">
                {categories
                  .filter((cat) => cat.type === transactionType || (!cat.type && transactionType === TransactionType.Expense))
                  .map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSelectedCategoryId(cat.id);
                          setIsManualCategoryOverride(true);
                        }}
                        className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition border active:scale-95 ${
                          isSelected
                            ? transactionType === TransactionType.Income
                              ? "bg-emerald-400 text-black font-bold border-emerald-400 shadow-sm"
                              : "bg-white text-black font-bold border-white shadow-sm"
                            : "bg-black border-white/10 text-zinc-400 hover:text-white hover:border-white/20"
                        }`}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: cat.color || "#a1a1aa" }}
                        />
                        <span>{cat.name}</span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Nguồn thanh toán */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <CreditCard size={11} /> Nguồn tiền
              </span>
              <div className="flex gap-2">
                {[
                  { id: TransactionSource.Manual, name: "Tiền mặt / Khác" },
                  { id: TransactionSource.MoMo, name: "Ví MoMo" },
                  { id: TransactionSource.Cake, name: "Cake VPBank" },
                ].map((s) => {
                  const isSelected = selectedSource === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSource(s.id)}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition border active:scale-95 ${
                        isSelected
                          ? "bg-white/[0.12] border-white/30 text-white font-bold"
                          : "bg-black border-white/[0.08] text-zinc-400 hover:text-white"
                      }`}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting || !amount}
              className={cn(
                "w-full py-3.5 rounded-2xl active:scale-98 text-black font-bold text-xs uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none mt-2",
                transactionType === TransactionType.Income
                  ? "bg-emerald-400 hover:bg-emerald-300"
                  : "bg-white hover:bg-zinc-200"
              )}
            >
              <Check size={16} /> {transactionType === TransactionType.Income ? "Ghi Khoản Thu (+)" : "Ghi Khoản Chi (-)"}
            </button>
          </form>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
