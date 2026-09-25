import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { 
  Trash2, 
  Image as ImageIcon, 
  RefreshCw, 
  Camera, 
  Search, 
  Plus
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { formatCurrency } from "../lib/utils";
import { 
  getTransactions, 
  deleteTransaction, 
  getReceiptImageUrl, 
  getCategories,
  TransactionType,
  TransactionSource,
  type TransactionDto,
  type CategoryDto
} from "../lib/api";
import PolaroidDetailModal from "../components/PolaroidDetailModal";
import LocketCameraModal from "../components/LocketCameraModal";
import ReceiptImage from "../components/ReceiptImage";
import { deleteLocalReceipt } from "../lib/receiptStorage";

export default function ReceiptSnaps() {
  const location = useLocation();
  const [receiptTransactions, setReceiptTransactions] = useState<TransactionDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDto | null>(null);

  // Mở camera tự động lên đầu tiên khi bấm vào tab Hóa đơn
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(true);
  const isInitialMount = useRef(true);

  // Mở camera khi chuyển tab Hóa đơn
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setIsCameraModalOpen(true);
  }, [location.pathname, location.key]);

  // Lắng nghe sự kiện click từ thanh điều hướng đáy
  useEffect(() => {
    const handleOpenCamera = () => setIsCameraModalOpen(true);
    window.addEventListener("open-camera-modal", handleOpenCamera);
    return () => window.removeEventListener("open-camera-modal", handleOpenCamera);
  }, []);

  // Tải danh sách hóa đơn và danh mục thật từ Backend
  const loadSnaps = useCallback(() => {
    return Promise.all([getTransactions(), getCategories()])
      .then(([transData, catData]) => {
        const withReceipt = transData.filter(
          (t) => (!!t.receiptImagePath || t.source === TransactionSource.SnapReceipt) && t.type === TransactionType.Expense
        );
        // Sắp xếp ngày mới nhất lên đầu
        withReceipt.sort(
          (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
        );
        setReceiptTransactions(withReceipt);
        setCategories(catData);
      })
      .catch(() => {
        toast.error("Không thể tải danh sách ảnh hóa đơn!");
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadSnaps();
    const handleUpdate = () => {
      setIsLoading(true);
      loadSnaps();
    };
    window.addEventListener("transaction-updated", handleUpdate);
    return () => window.removeEventListener("transaction-updated", handleUpdate);
  }, [loadSnaps]);

  const handleDelete = async (id: string) => {
    try {
      const target = receiptTransactions.find((t) => t.id === id);
      if (target?.receiptImagePath) {
        deleteLocalReceipt(target.receiptImagePath);
      }
      deleteLocalReceipt(id);

      await deleteTransaction(id);
      setReceiptTransactions((prev) => prev.filter((t) => t.id !== id));
      window.dispatchEvent(new CustomEvent("transaction-updated"));
      toast.success("Đã xóa ảnh hóa đơn thành công!");
    } catch {
      toast.error("Không thể xóa hóa đơn. Vui lòng thử lại!");
    }
  };

  // Lọc theo tìm kiếm và danh mục
  const filteredSnaps = useMemo(() => {
    return receiptTransactions.filter((t) => {
      const matchesCategory = selectedCategoryId === "all" || t.categoryId === selectedCategoryId;
      const desc = (t.description || t.merchant || "").toLowerCase();
      const cat = (t.categoryName || "").toLowerCase();
      const matchesSearch = !searchTerm || desc.includes(searchTerm.toLowerCase()) || cat.includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [receiptTransactions, selectedCategoryId, searchTerm]);

  const totalSnapExpense = useMemo(() => {
    return filteredSnaps.reduce((acc, cur) => acc + cur.amount, 0);
  }, [filteredSnaps]);

  return (
    <div className="space-y-5 px-4 pt-4 pb-12">
      {/* Header tối giản hiện đại */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight">Kho Ảnh Hóa Đơn</h1>
          <p className="text-xs text-zinc-400">
            {isLoading ? "Đang tải ảnh..." : `${filteredSnaps.length} hóa đơn đã lưu`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCameraModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white text-black font-bold text-xs shadow-sm hover:bg-zinc-200 active:scale-95 transition"
        >
          <Camera size={14} className="text-black" />
          <span>Bật Camera</span>
        </button>
      </div>

      {/* Switcher chế độ: Bật Camera & Xem Kho Ảnh */}
      <div className="flex bg-zinc-950 p-1 rounded-2xl border border-white/[0.08]">
        <button
          type="button"
          onClick={() => setIsCameraModalOpen(true)}
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/10 text-white transition active:scale-95"
        >
          <Camera size={14} className="text-zinc-300" />
          <span>Bật Camera Chụp</span>
        </button>
        <button
          type="button"
          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-white text-black shadow-sm"
        >
          <ImageIcon size={14} />
          <span>Kho Hóa Đơn ({receiptTransactions.length})</span>
        </button>
      </div>

      {/* Summary Stat Card - Matte Dark Glass */}
      <section className="rounded-2xl border border-white/[0.08] bg-zinc-950 p-4 shadow-sm flex items-center justify-between">
        <div>
          <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block">
            Tổng Chi Qua Hóa Đơn
          </span>
          <span className="text-2xl font-black text-white tracking-tight mt-0.5 block">
            {formatCurrency(totalSnapExpense)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSnaps}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-white/[0.06] text-zinc-300 hover:text-white hover:bg-white/10 border border-white/[0.08] transition active:scale-95"
            title="Làm mới"
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </section>

      {/* Search & Category Filter */}
      <section className="space-y-3">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Search size={15} className="text-zinc-500" />
          </div>
          <input
            type="text"
            placeholder="Tìm theo món ăn, quán xá, hóa đơn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full min-h-[42px] rounded-2xl border border-white/[0.08] bg-zinc-950 py-2.5 pl-9 pr-4 text-xs font-medium text-white outline-none transition focus:border-white/30 placeholder-zinc-600"
          />
        </div>

        {/* Filter categories tags */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategoryId("all")}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                selectedCategoryId === "all"
                  ? "bg-white text-black shadow-sm"
                  : "bg-zinc-950 text-zinc-400 border border-white/[0.08] hover:text-white"
              }`}
            >
              Tất cả ({receiptTransactions.length})
            </button>
            {categories.map((cat) => {
              const count = receiptTransactions.filter((t) => t.categoryId === cat.id).length;
              if (count === 0) return null;
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isSelected
                      ? "bg-white text-black shadow-sm"
                      : "bg-zinc-950 text-zinc-400 border border-white/[0.08] hover:text-white"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className={`text-[10px] ${isSelected ? "text-zinc-600" : "text-zinc-500"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Grid thẻ Polaroid Gallery */}
      {filteredSnaps.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredSnaps.map((t) => {
            const url = getReceiptImageUrl(t.receiptImagePath);
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSelectedTransaction(t)}
                className="bg-zinc-950 border border-white/[0.08] hover:border-white/20 p-2.5 pb-3 rounded-[24px] shadow-lg transition cursor-pointer flex flex-col justify-between group active:scale-[0.98]"
              >
                {/* Photo frame */}
                <div className="relative w-full aspect-square rounded-[18px] overflow-hidden bg-black shadow-inner">
                  <ReceiptImage
                    src={url}
                    path={t.receiptImagePath}
                    alt={t.description || "Hóa đơn"}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />

                  {/* Date badge */}
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[9px] font-semibold text-white">
                    {new Date(t.transactionDate).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" })}
                  </div>
                </div>

                {/* Details below photo */}
                <div className="mt-2.5 px-1 space-y-1">
                  <span className="text-sm font-black text-white block tracking-tight">
                    -{formatCurrency(t.amount)}
                  </span>
                  <p className="text-[11px] font-medium text-zinc-300 truncate">
                    {t.description || t.merchant || "Hóa đơn chi tiêu"}
                  </p>
                  <div className="flex items-center justify-between pt-1.5 border-t border-white/[0.06] text-[10px] text-zinc-400">
                    <span className="truncate max-w-[85px]">
                      {t.categoryName || "Chi tiêu"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Xóa ảnh hóa đơn này khỏi sổ chi tiêu?")) {
                          handleDelete(t.id);
                        }
                      }}
                      className="text-zinc-500 hover:text-rose-400 p-0.5 transition"
                      title="Xóa"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : !isLoading ? (
        /* Empty State */
        <div className="rounded-3xl bg-zinc-950 border border-white/[0.08] p-8 text-center space-y-4 my-6">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-300 shadow-inner">
            <Camera size={26} />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-bold text-white">Chưa có ảnh hóa đơn nào</p>
            <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
              Chụp ảnh hóa đơn khi ăn uống hoặc mua sắm để theo dõi chi tiêu và tự động lưu ảnh hóa đơn vào sổ.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCameraModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white text-black font-bold text-xs shadow-md hover:bg-zinc-200 active:scale-95 transition"
          >
            <Plus size={15} /> Chụp Hóa Đơn Ngay
          </button>
        </div>
      ) : null}

      {/* Locket Camera Modal (Tái sử dụng chung 1 component chuẩn) */}
      <LocketCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onSuccess={loadSnaps}
      />

      {/* Polaroid Detail Modal (Xem phóng to & tải ảnh) */}
      <PolaroidDetailModal
        transaction={selectedTransaction}
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onDelete={handleDelete}
      />
    </div>
  );
}
