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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="relative w-full max-w-sm bg-zinc-950 border border-white/10 rounded-[32px] p-5 text-white shadow-2xl overflow-hidden my-auto"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 text-zinc-400 hover:text-white hover:bg-white/15 transition active:scale-95"
          >
            <X size={16} />
          </button>

          {/* Polaroid Frame */}
          <div className="bg-black p-3 pb-5 rounded-[24px] border border-white/[0.08] shadow-inner space-y-4">
            {/* Photo / Receipt Image */}
            <div className="relative w-full aspect-square rounded-[18px] overflow-hidden bg-zinc-900 flex items-center justify-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={transaction.description || "Receipt"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-600">
                  <ImageIcon size={44} />
                  <span className="text-xs font-medium">Giao dịch không có ảnh bill</span>
                </div>
              )}

              {/* Tag overlay */}
              {transaction.categoryName && (
                <div
                  className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-semibold text-white bg-black/70 backdrop-blur-md border border-white/10 shadow-lg flex items-center gap-1.5"
                >
                  <Tag size={11} className="text-zinc-400" /> {transaction.categoryName}
                </div>
              )}
            </div>

            {/* Bottom Polaroid Details */}
            <div className="px-1.5 space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-2xl font-black text-white tracking-tight">
                  -{formattedAmount}đ
                </span>
                <span className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                  <Calendar size={12} /> {formattedDate}
                </span>
              </div>

              <p className="text-xs font-medium text-zinc-300">
                {transaction.description || transaction.merchant || "Giao dịch chi tiêu"}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-4 flex items-center justify-between gap-2.5 px-0.5">
            {imageUrl && (
              <a
                href={imageUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-white/[0.08] hover:bg-white/15 border border-white/10 text-xs font-semibold text-white transition active:scale-95"
              >
                <Download size={13} /> Tải ảnh
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
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-xs font-semibold text-rose-400 transition active:scale-95"
              >
                <Trash2 size={13} /> Xóa
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
