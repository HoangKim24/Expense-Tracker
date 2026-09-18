import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2, Calendar, Tag, Download, Image as ImageIcon } from "lucide-react";
import { getReceiptImageUrl, type TransactionDto } from "../lib/api";

interface Props {
  transaction: TransactionDto | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export default function PolaroidDetailModal({ transaction, isOpen, onClose, onDelete }: Props) {
  if (!isOpen || !transaction) return null;

  const imageUrl = getReceiptImageUrl(transaction.receiptImagePath);
  const formattedAmount = new Intl.NumberFormat("vi-VN").format(transaction.amount);
  const formattedDate = new Date(transaction.transactionDate).toLocaleString("vi-VN", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-[36px] p-5 text-white shadow-2xl overflow-hidden my-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition"
          >
            <X size={18} />
          </button>

          {/* Polaroid Frame */}
          <div className="bg-slate-950 p-3 pb-6 rounded-[28px] border border-slate-800 shadow-xl space-y-4">
            {/* Photo / Receipt Image */}
            <div className="relative w-full aspect-square rounded-[20px] overflow-hidden bg-slate-900 flex items-center justify-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={transaction.description || "Receipt"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <ImageIcon size={48} />
                  <span className="text-xs font-semibold">Giao dịch không có ảnh bill</span>
                </div>
              )}

              {/* Tag overlay */}
              {transaction.categoryName && (
                <div
                  className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-bold text-white backdrop-blur-md shadow-lg flex items-center gap-1.5"
                  style={{ backgroundColor: `${transaction.categoryColor || "#3b82f6"}cc` }}
                >
                  <Tag size={12} /> {transaction.categoryName}
                </div>
              )}
            </div>

            {/* Bottom Polaroid Details */}
            <div className="px-2 space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-2xl font-black text-rose-400">
                  -{formattedAmount}đ
                </span>
                <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
                  <Calendar size={12} /> {formattedDate}
                </span>
              </div>

              <p className="text-sm font-bold text-slate-200">
                {transaction.description || transaction.merchant || "Giao dịch chi tiêu"}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex items-center justify-between gap-3 px-1">
            {imageUrl && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition"
              >
                <Download size={14} /> Tải ảnh
              </a>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Bạn có chắc muốn xóa giao dịch này không?")) {
                    onDelete(transaction.id);
                    onClose();
                  }
                }}
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-xs font-bold text-rose-400 transition"
              >
                <Trash2 size={14} /> Xóa giao dịch
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
