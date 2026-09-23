import { useState } from "react";
import { X, Zap, Trash2 } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { 
  createTransaction, 
  TransactionType, 
  TransactionSource, 
  type CategoryDto 
} from "../lib/api";
import { matchCategoryId } from "../lib/smartParser";

export interface PresetItem {
  id: string;
  name: string;
  amount: number;
  icon: string;
  categoryKeyword: string;
}

const DEFAULT_PRESETS: PresetItem[] = [
  { id: "p1", name: "Cà phê", amount: 30000, icon: "☕", categoryKeyword: "Cà phê" },
  { id: "p2", name: "Cơm trưa", amount: 45000, icon: "🍱", categoryKeyword: "Ăn uống" },
  { id: "p3", name: "Đổ xăng", amount: 50000, icon: "⛽", categoryKeyword: "Di chuyển" },
  { id: "p4", name: "Đi chợ", amount: 100000, icon: "🛒", categoryKeyword: "Mua sắm" },
  { id: "p5", name: "Trà sữa", amount: 35000, icon: "🥤", categoryKeyword: "Cà phê" },
  { id: "p6", name: "Ăn tối", amount: 50000, icon: "🍜", categoryKeyword: "Ăn uống" },
];

interface Props {
  categories: CategoryDto[];
  onTransactionCreated?: () => void;
}

export default function QuickPresetsBar({ categories, onTransactionCreated }: Props) {
  const [presets, setPresets] = useState<PresetItem[]>(() => {
    try {
      const saved = localStorage.getItem("expense_quick_presets_v1");
      return saved ? JSON.parse(saved) : DEFAULT_PRESETS;
    } catch {
      return DEFAULT_PRESETS;
    }
  });

  const [isSubmittingId, setIsSubmittingId] = useState<string | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [newPresetAmount, setNewPresetAmount] = useState("");
  const [newPresetIcon, setNewPresetIcon] = useState("⚡");
  const [newPresetCategory, setNewPresetCategory] = useState("");

  const savePresets = (updated: PresetItem[]) => {
    setPresets(updated);
    localStorage.setItem("expense_quick_presets_v1", JSON.stringify(updated));
  };

  const handle1TapLog = async (preset: PresetItem) => {
    if (isSubmittingId) return;
    setIsSubmittingId(preset.id);

    try {
      // Tìm category id phù hợp
      const catId = matchCategoryId(preset.categoryKeyword, categories) || 
        (categories.length > 0 ? categories[0].id : null);

      await createTransaction({
        amount: preset.amount,
        transactionDate: new Date().toISOString(),
        description: preset.name,
        type: TransactionType.Expense,
        source: TransactionSource.Manual,
        categoryId: catId,
      });

      // Hiệu ứng hoàn tất
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#ffffff", "#e4e4e7", "#a1a1aa"],
      });

      toast.success(`Đã ghi nhanh: -${new Intl.NumberFormat("vi-VN").format(preset.amount)}đ`, {
        description: `${preset.icon} ${preset.name}`,
      });

      window.dispatchEvent(new CustomEvent("transaction-updated"));
      onTransactionCreated?.();
    } catch {
      toast.error(`Không thể ghi ${preset.name}. Vui lòng thử lại!`);
    } finally {
      setIsSubmittingId(null);
    }
  };

  const handleAddPreset = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = parseInt(newPresetAmount.replace(/\D/g, ""), 10);
    if (!newPresetName.trim() || isNaN(numeric) || numeric <= 0) {
      toast.error("Vui lòng nhập tên và số tiền hợp lệ");
      return;
    }

    const newItem: PresetItem = {
      id: `p_${Date.now()}`,
      name: newPresetName.trim(),
      amount: numeric,
      icon: newPresetIcon || "⚡",
      categoryKeyword: newPresetCategory || "Ăn uống",
    };

    const updated = [...presets, newItem];
    savePresets(updated);
    setNewPresetName("");
    setNewPresetAmount("");
    toast.success("Đã thêm mẫu chi tiêu mới!");
  };

  const handleDeletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    savePresets(updated);
    toast.success("Đã xóa mẫu chi tiêu");
  };

  const formatShortAmount = (amt: number) => {
    if (amt >= 1000000) return `${amt / 1000000}tr`;
    if (amt >= 1000) return `${amt / 1000}k`;
    return `${amt}đ`;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-1.5 text-zinc-400">
          <Zap size={13} className="text-white fill-white" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300">
            Mẫu 1-Chạm (0.5s)
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowManageModal(true)}
          className="text-[11px] font-semibold text-zinc-400 hover:text-white transition"
        >
          Tùy chỉnh mẫu
        </button>
      </div>

      {/* Row of 1-Tap Preset Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar select-none">
        {presets.map((preset) => {
          const isPending = isSubmittingId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handle1TapLog(preset)}
              disabled={!!isSubmittingId}
              className="shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-zinc-950 border border-white/[0.08] hover:border-white/30 hover:bg-white/[0.06] active:scale-95 transition text-left group disabled:opacity-50 shadow-sm"
              title={`Chạm để ghi nhận ${preset.name} ${formatShortAmount(preset.amount)}`}
            >
              <span className="text-base group-hover:scale-110 transition">{preset.icon}</span>
              <div className="leading-tight">
                <span className="text-xs font-semibold text-white block">{preset.name}</span>
                <span className="text-[10px] font-bold text-zinc-400 block tracking-tight">
                  -{formatShortAmount(preset.amount)}
                </span>
              </div>
              {isPending && <span className="w-2 h-2 rounded-full bg-white animate-ping ml-1" />}
            </button>
          );
        })}
      </div>

      {/* Modal Tùy Chỉnh Mẫu Chi Tiêu */}
      {showManageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-[32px] bg-zinc-950 border border-white/10 p-5 space-y-4 shadow-2xl text-left">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Quản Lý Mẫu 1-Chạm
              </h3>
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Danh sách mẫu hiện tại */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 no-scrollbar pr-1">
              {presets.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-black border border-white/[0.06]"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{p.icon}</span>
                    <div>
                      <span className="text-xs font-bold text-white block">{p.name}</span>
                      <span className="text-[10px] text-zinc-400">
                        -{new Intl.NumberFormat("vi-VN").format(p.amount)}đ • {p.categoryKeyword}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePreset(p.id)}
                    className="p-1 text-zinc-500 hover:text-rose-400 transition"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Form thêm mẫu mới */}
            <form onSubmit={handleAddPreset} className="space-y-2.5 pt-2 border-t border-white/[0.08]">
              <span className="text-[11px] font-semibold text-zinc-400 block uppercase tracking-wider">
                + Thêm Mẫu Mới
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Emoji"
                  value={newPresetIcon}
                  onChange={(e) => setNewPresetIcon(e.target.value)}
                  className="w-12 text-center rounded-xl bg-black border border-white/10 text-xs py-2 text-white"
                />
                <input
                  type="text"
                  placeholder="Tên (VD: Bánh mì)"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  className="flex-1 rounded-xl bg-black border border-white/10 px-3 py-2 text-xs text-white placeholder-zinc-600"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Số tiền (VD: 20000)"
                  value={newPresetAmount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setNewPresetAmount(val ? new Intl.NumberFormat("vi-VN").format(parseInt(val, 10)) : "");
                  }}
                  className="flex-1 rounded-xl bg-black border border-white/10 px-3 py-2 text-xs text-white placeholder-zinc-600"
                />
                <select
                  value={newPresetCategory}
                  onChange={(e) => setNewPresetCategory(e.target.value)}
                  className="rounded-xl bg-black border border-white/10 px-2.5 py-2 text-xs text-white"
                >
                  <option value="">Danh mục</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition"
                >
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
