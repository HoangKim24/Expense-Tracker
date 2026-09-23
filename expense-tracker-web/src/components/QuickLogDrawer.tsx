import { useState, useEffect, useRef } from "react";
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
import { 
  getCategories, 
  createTransaction, 
  TransactionType, 
  TransactionSource, 
  type CategoryDto 
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
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedSource, setSelectedSource] = useState<number>(TransactionSource.Manual);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isManualCategoryOverride, setIsManualCategoryOverride] = useState(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  // Load categories
  useEffect(() => {
    if (isOpen) {
      getCategories()
        .then((cats) => {
          setCategories(cats);
          if (cats.length > 0 && !selectedCategoryId) {
            const defaultCat = cats.find((c) => c.name.includes("Ăn") || c.name.includes("Cà phê")) || cats[0];
            setSelectedCategoryId(defaultCat.id);
          }
        })
        .catch(() => setCategories([]));

      // Reset state & auto-focus input
      setAmount("");
      setDescription("");
      setIsManualCategoryOverride(false);
      setSelectedSource(TransactionSource.Manual);

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
        description: description.trim() || "Chi tiêu",
        type: TransactionType.Expense,
        source: selectedSource as any,
        categoryId: selectedCategoryId || null,
      });

      confetti({
        particleCount: 60,
        spread: 65,
        origin: { y: 0.7 },
        colors: ["#ffffff", "#e4e4e7", "#a1a1aa"],
      });

      toast.success(`Đã ghi sổ: -${new Intl.NumberFormat("vi-VN").format(numeric)}đ`, {
        description: description.trim() || "Khoản chi tiêu",
      });

      window.dispatchEvent(new CustomEvent("transaction-updated"));
      onSuccess?.();
      onClose();
    } catch {
      toast.error("Không thể ghi sổ. Vui lòng thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-md">
        <div onClick={onClose} className="absolute inset-0" />

        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative z-10 w-full max-w-lg mx-auto rounded-t-[36px] bg-zinc-950 border-t border-white/10 p-5 pb-9 space-y-4 shadow-2xl"
        >
          {/* Top handle bar */}
          <div className="w-12 h-1.5 rounded-full bg-zinc-800 mx-auto" />

          {/* Header & Smart Paste Button */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-white tracking-tight">
              Ghi Khoản Chi Nhanh
            </h2>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSmartPaste}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition active:scale-95"
                title="Tự động bóc tách tin nhắn MoMo/Bank vừa sao chép"
              >
                <Clipboard size={13} className="text-zinc-300" />
                <span>Dán thông báo</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-full bg-white/[0.06] text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full rounded-2xl bg-black border border-white/10 px-4 py-3.5 text-3xl font-extrabold text-white placeholder-zinc-700 focus:outline-none focus:border-white/40 text-right pr-14"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                VNĐ
              </span>
            </div>

            {/* Dãy chip cộng nhanh */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {[10000, 20000, 50000, 100000, 200000, 500000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleQuickAdd(val)}
                  className="shrink-0 px-3 py-1.5 rounded-xl bg-black border border-white/[0.08] hover:border-white/20 text-[11px] font-semibold text-zinc-400 hover:text-white transition active:scale-95"
                >
                  +{val >= 1000 ? `${val / 1000}k` : val}
                </button>
              ))}
            </div>

            {/* Ô nhập ghi chú với Auto-Category */}
            <div>
              <input
                type="text"
                placeholder="Ghi chú (Gõ cà phê, grab, cơm trưa... để tự đoán danh mục)"
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
              <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((cat) => {
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
                          ? "bg-white text-black font-bold border-white shadow-sm"
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

            {/* Nguồn thanh toán (Nạp từ MoMo / Cake / Tiền mặt) */}
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
              className="w-full py-3.5 rounded-2xl bg-white hover:bg-zinc-200 active:scale-98 text-black font-bold text-xs uppercase tracking-wider shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-30 disabled:pointer-events-none mt-2"
            >
              <Check size={16} /> Ghi Vào Sổ Ngay
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
