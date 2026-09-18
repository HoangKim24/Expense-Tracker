import { useEffect, useState, useCallback } from "react";
import { Camera, Trash2, Sparkles, Image as ImageIcon } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { 
  getTransactions, 
  deleteTransaction, 
  getReceiptImageUrl, 
  type TransactionDto 
} from "../lib/api";
import LocketCameraModal from "../components/LocketCameraModal";
import PolaroidDetailModal from "../components/PolaroidDetailModal";

export default function ReceiptSnaps() {
  const [receiptTransactions, setReceiptTransactions] = useState<TransactionDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDto | null>(null);

  const loadSnaps = useCallback(() => {
    setIsLoading(true);
    getTransactions()
      .then((data) => {
        // Chỉ lấy những giao dịch có ảnh hóa đơn
        const withReceipt = data.filter((t) => !!t.receiptImagePath);
        setReceiptTransactions(withReceipt);
      })
      .catch(() => {
        toast.error("Không thể tải danh sách ảnh hóa đơn!");
      })
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadSnaps();

    const handleUpdate = () => loadSnaps();
    window.addEventListener("transaction-updated", handleUpdate);
    return () => window.removeEventListener("transaction-updated", handleUpdate);
  }, [loadSnaps]);

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction(id);
      setReceiptTransactions((prev) => prev.filter((t) => t.id !== id));
      window.dispatchEvent(new CustomEvent("transaction-updated"));
      toast.success("Đã xóa hóa đơn và hoàn lại chi phí!");
    } catch {
      toast.error("Không thể xóa hóa đơn này!");
    }
  };

  const formatCurrency = (val: number) => `${new Intl.NumberFormat("vi-VN").format(val)}đ`;
  const totalSnapExpense = receiptTransactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 px-4 pt-4">
      {/* 1. Header & Nút Chụp Hóa Đơn Lớn */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Kho Ảnh Hóa Đơn</span>
            <h1 className="text-2xl font-black text-white tracking-tight mt-0.5">Snap & Log</h1>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Đã chi qua Snap</span>
            <span className="text-lg font-black text-rose-400">{formatCurrency(totalSnapExpense)}</span>
          </div>
        </div>

        {/* Nút chụp chính */}
        <button
          type="button"
          onClick={() => setIsCameraModalOpen(true)}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600 hover:opacity-95 active:scale-[0.98] font-black text-sm text-white shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2.5"
        >
          <Camera size={20} className="animate-pulse" /> Chụp Hóa Đơn Mới (Ghi Thẳng Vào Chi Phí)
        </button>

        <p className="text-[11px] text-slate-400 text-center">
          💡 Ảnh hóa đơn sau khi chụp sẽ được lưu trữ vĩnh viễn và số tiền sẽ tự động cộng vào tổng chi tiêu.
        </p>
      </div>

      {/* 2. Kho Thẻ Ảnh Polaroid (Gallery) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles size={15} className="text-amber-400" />
            <h2 className="text-sm font-black uppercase tracking-wider text-white">
              Ảnh Hóa Đơn Đã Lưu ({receiptTransactions.length})
            </h2>
          </div>
        </div>

        {/* Grid thẻ Polaroid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {receiptTransactions.map((t) => {
            const url = getReceiptImageUrl(t.receiptImagePath);
            return (
              <div
                key={t.id}
                onClick={() => setSelectedTransaction(t)}
                className="bg-slate-900 border border-slate-800 p-2.5 pb-3.5 rounded-2xl shadow-lg hover:border-slate-700 transition cursor-pointer flex flex-col justify-between group"
              >
                {/* Ảnh Polaroid */}
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-black shadow-inner">
                  {url ? (
                    <img
                      src={url}
                      alt={t.description}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-600">
                      <ImageIcon size={32} />
                    </div>
                  )}

                  {/* Date badge */}
                  <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[9px] font-bold text-white">
                    {new Date(t.transactionDate).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" })}
                  </div>
                </div>

                {/* Thông tin trên thẻ Polaroid */}
                <div className="mt-2.5 px-1 space-y-1">
                  <span className="text-sm font-black text-rose-400 block tracking-tight">
                    -{formatCurrency(t.amount)}
                  </span>
                  <p className="text-[11px] font-bold text-slate-200 truncate">
                    {t.description || "Hóa đơn thanh toán"}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px] text-slate-400">
                    <span className="truncate max-w-[80px]">
                      {t.categoryName || "Chi tiêu"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Xóa ảnh hóa đơn này và hoàn lại số tiền?")) {
                          handleDelete(t.id);
                        }
                      }}
                      className="text-slate-500 hover:text-rose-400 p-0.5 transition"
                      title="Xóa"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {!isLoading && receiptTransactions.length === 0 && (
          <div className="rounded-3xl bg-slate-900 border border-slate-800 p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Camera size={28} />
            </div>
            <p className="text-sm font-bold text-slate-200">Chưa có ảnh hóa đơn nào</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Chụp ảnh hóa đơn khi đi ăn, uống cà phê hoặc mua sắm để ghi nhận chi phí tự động và lưu lại hóa đơn tại đây.
            </p>
            <button
              type="button"
              onClick={() => setIsCameraModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white shadow-md transition"
            >
              <Camera size={15} /> Chụp hóa đơn đầu tiên
            </button>
          </div>
        )}
      </section>

      {/* Camera Snap Modal */}
      <LocketCameraModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onSuccess={() => {
          loadSnaps();
          window.dispatchEvent(new CustomEvent("transaction-updated"));
        }}
      />

      {/* Polaroid Detail Modal (xem phóng to) */}
      <PolaroidDetailModal
        transaction={selectedTransaction}
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onDelete={handleDelete}
      />
    </motion.div>
  );
}
