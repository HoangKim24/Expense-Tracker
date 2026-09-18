import { useEffect, useState, useRef, useCallback } from "react";
import { 
  Camera, 
  Trash2, 
  Sparkles, 
  Image as ImageIcon, 
  RefreshCw, 
  Zap, 
  RotateCcw, 
  Send, 
  Tag, 
  Grid
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { 
  getTransactions, 
  deleteTransaction, 
  getReceiptImageUrl, 
  getCategories,
  uploadReceipt,
  createTransaction,
  TransactionType,
  TransactionSource,
  type TransactionDto,
  type CategoryDto
} from "../lib/api";
import PolaroidDetailModal from "../components/PolaroidDetailModal";

export default function ReceiptSnaps() {
  // Tab view: 'camera' mở ngay khi vào trang, 'gallery' để xem kho ảnh
  const [viewMode, setViewMode] = useState<"camera" | "gallery">("camera");

  // Danh sách hóa đơn & danh mục
  const [receiptTransactions, setReceiptTransactions] = useState<TransactionDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDto | null>(null);

  // Trạng thái camera Locket
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  // Form states trên ảnh Locket / Instagram
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Tải danh sách hóa đơn đã lưu
  const loadSnaps = useCallback(() => {
    setIsLoading(true);
    Promise.all([getTransactions(), getCategories()])
      .then(([transData, catData]) => {
        const withReceipt = transData.filter((t) => !!t.receiptImagePath);
        setReceiptTransactions(withReceipt);
        setCategories(catData);
        if (catData.length > 0 && !selectedCategoryId) {
          const defaultCat = catData.find((c) => c.name.includes("Ăn") || c.name.includes("Cà phê")) || catData[0];
          setSelectedCategoryId(defaultCat.id);
        }
      })
      .catch(() => {
        toast.error("Không thể tải danh sách ảnh hóa đơn!");
      })
      .finally(() => setIsLoading(false));
  }, [selectedCategoryId]);

  useEffect(() => {
    loadSnaps();
    const handleUpdate = () => loadSnaps();
    window.addEventListener("transaction-updated", handleUpdate);
    return () => window.removeEventListener("transaction-updated", handleUpdate);
  }, [loadSnaps]);

  // Dừng stream camera khi chuyển tab hoặc unmount
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Bật camera Locket trực tiếp
  const startCamera = useCallback(async (mode: "environment" | "user") => {
    stopStream();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCameraPermission(false);
        return;
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
        audio: false,
      });
      setStream(newStream);
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch {
      setHasCameraPermission(false);
    }
  }, [stopStream]);

  // Mở camera NGAY LẬP TỨC khi vào trang
  useEffect(() => {
    if (viewMode === "camera" && !capturedImage) {
      startCamera(facingMode);
    } else {
      stopStream();
    }
    return () => {
      stopStream();
    };
  }, [viewMode, facingMode, capturedImage, startCamera, stopStream]);

  // Gắn stream vào video tag
  useEffect(() => {
    if (videoRef.current && stream && !capturedImage) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, capturedImage]);

  // Tự động focus vào ô nhập tiền sau khi chụp
  useEffect(() => {
    if (capturedImage) {
      const timer = setTimeout(() => {
        amountInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [capturedImage]);

  // Chụp ảnh Locket
  const handleCapture = () => {
    if (!videoRef.current) return;

    if (navigator.vibrate) {
      navigator.vibrate([25, 40, 25]);
    }

    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 200);

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      if (facingMode === "user") {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      setCapturedImage(dataUrl);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `snap_${Date.now()}.jpg`, { type: "image/jpeg" });
          setCapturedFile(file);
        }
      }, "image/jpeg", 0.92);

      stopStream();
    }
  };

  // Chọn ảnh từ thư viện
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImage(event.target?.result as string);
      setCapturedFile(file);
      stopStream();
    };
    reader.readAsDataURL(file);
  };

  // Lật camera trước / sau
  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Chụp lại
  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    setAmount("");
    setDescription("");
    startCamera(facingMode);
  };

  // Nút cộng tiền nhanh
  const handleAddQuickAmount = (extra: number) => {
    const current = Number(amount.replace(/\D/g, "")) || 0;
    const nextVal = current + extra;
    setAmount(new Intl.NumberFormat("vi-VN").format(nextVal));
  };

  // Gửi vào sổ chi tiêu
  const handleSubmit = async () => {
    const numericAmount = Number(amount.replace(/\D/g, ""));
    if (!numericAmount || numericAmount <= 0) {
      toast.error("Vui lòng chạm vào nhãn tiền để nhập số tiền chi tiêu!");
      amountInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      let receiptPath: string | null = null;
      if (capturedFile) {
        toast.info("Đang tải ảnh hóa đơn...");
        const uploadRes = await uploadReceipt(capturedFile);
        receiptPath = uploadRes.path;
      }

      const selectedCat = categories.find((c) => c.id === selectedCategoryId);
      const defaultDesc = selectedCat ? `${selectedCat.name} (Locket Snap)` : "Khoảnh khắc chi tiêu Snap";

      await createTransaction({
        amount: numericAmount,
        transactionDate: new Date().toISOString(),
        description: description.trim() || defaultDesc,
        type: TransactionType.Expense,
        source: TransactionSource.SnapReceipt,
        categoryId: selectedCategoryId || null,
        receiptImagePath: receiptPath,
      });

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#facc15", "#38bdf8", "#34d399", "#f43f5e"],
      });

      toast.success("Đã ghi nhận chi phí vào sổ thành công!", {
        description: `-${new Intl.NumberFormat("vi-VN").format(numericAmount)}đ • ${description || defaultDesc}`,
      });

      // Reset camera để sẵn sàng chụp tiếp
      setCapturedImage(null);
      setCapturedFile(null);
      setAmount("");
      setDescription("");
      loadSnaps();
      window.dispatchEvent(new CustomEvent("transaction-updated"));
      startCamera(facingMode);
    } catch {
      toast.error("Không thể lưu giao dịch. Vui lòng thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa ảnh hóa đơn
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 px-3 sm:px-4 pt-3 pb-8">
      {/* Hidden Canvas & Input File */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Shutter White Flash Animation */}
      <AnimatePresence>
        {isFlashing && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-white pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* TOP HEADER: Chuyển đổi giữa Camera Trực Tiếp & Kho Hóa Đơn */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800/80 p-2 rounded-2xl shadow-md">
        <div className="flex gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode("camera")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition ${
              viewMode === "camera"
                ? "bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Camera size={14} className={viewMode === "camera" ? "text-slate-950" : ""} />
            <span>Camera Live</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode("gallery")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition ${
              viewMode === "gallery"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Grid size={14} />
            <span>Kho Hóa Đơn ({receiptTransactions.length})</span>
          </button>
        </div>

        {/* Tổng tiền chi qua snap */}
        <div className="text-right px-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Đã chi qua Snap</span>
          <span className="text-sm font-black text-rose-400">{formatCurrency(totalSnapExpense)}</span>
        </div>
      </div>

      {/* PHẦN 1: CAMERA TRỰC TIẾP CHUẨN LOCKET (HIỆN NGAY KHI VÀO TAB) */}
      {viewMode === "camera" && (
        <div className="space-y-4">
          {/* LOCKET CAMERA CONTAINER TRỰC TIẾP */}
          <div className="relative w-full max-w-[420px] mx-auto bg-black sm:bg-slate-950 border border-slate-800/90 rounded-[38px] p-3 sm:p-4 shadow-2xl overflow-hidden flex flex-col justify-between">
            {/* Top Bar bên trong Camera */}
            <div className="flex items-center justify-between px-2 pt-1 pb-2 z-20">
              {capturedImage ? (
                <button
                  type="button"
                  onClick={handleRetake}
                  className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white backdrop-blur-xl border border-white/20 flex items-center justify-center transition shadow-lg"
                  title="Chụp lại"
                >
                  <RotateCcw size={16} />
                </button>
              ) : (
                <div className="w-9 h-9" />
              )}

              {/* Locket badge */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white shadow-inner">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#facc15]" />
                <span className="text-xs font-black tracking-wider uppercase">Locket Snap Cam</span>
              </div>

              {/* Flash / Help */}
              <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-amber-300">
                <Zap size={16} />
              </div>
            </div>

            {/* VIEWFINDER & CANVAS */}
            <div className="relative w-full aspect-[4/5] bg-neutral-950 rounded-[32px] overflow-hidden border-2 border-white/15 shadow-2xl flex items-center justify-center select-none my-1">
              {!capturedImage ? (
                /* LIVE CAMERA FEED */
                <>
                  {hasCameraPermission === false ? (
                    <div className="text-center px-6 space-y-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mx-auto text-slate-300">
                        <ImageIcon size={28} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-white">Chưa cấp quyền Camera</p>
                        <p className="text-xs text-slate-400">Bạn có thể chọn ảnh hóa đơn sẵn có trong máy.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 font-bold text-xs text-white shadow-lg active:scale-95 transition"
                      >
                        <ImageIcon size={16} /> Chọn ảnh từ thư viện
                      </button>
                    </div>
                  ) : (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
                    />
                  )}

                  {/* Guide Frame */}
                  <div className="absolute inset-3 pointer-events-none rounded-[26px] border border-white/15" />
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-none px-3 py-1 rounded-full bg-black/50 backdrop-blur-md text-[10px] font-medium text-white/80 border border-white/10">
                    Căn chỉnh hóa đơn / bill
                  </div>
                </>
              ) : (
                /* POST-CAPTURE WITH OVERLAYS */
                <div className="relative w-full h-full">
                  <img
                    src={capturedImage}
                    alt="Locket snap"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/50 via-transparent to-black/70" />

                  {/* 1. STICKER SỐ TIỀN PHONG CÁCH INSTAGRAM */}
                  <div className="absolute top-4 inset-x-3 flex flex-col items-center z-10">
                    <motion.div
                      initial={{ scale: 0.88, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-full max-w-[280px] px-4 py-2.5 rounded-2xl bg-black/75 backdrop-blur-xl border border-white/30 shadow-2xl flex items-center justify-between gap-2"
                    >
                      <span className="text-xl">💸</span>
                      <div className="flex-1 flex items-center justify-center">
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
                          className="bg-transparent text-2xl font-black text-white text-center focus:outline-none w-full placeholder-white/40 tracking-tight"
                        />
                      </div>
                      <span className="text-xs font-black text-amber-400">VNĐ</span>
                    </motion.div>

                    {/* Quick increment chips */}
                    <div className="flex gap-1.5 mt-2 overflow-x-auto max-w-full px-1 py-0.5 no-scrollbar">
                      {[10000, 20000, 50000, 100000, 200000].map((add) => (
                        <button
                          key={add}
                          type="button"
                          onClick={() => handleAddQuickAmount(add)}
                          className="shrink-0 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[11px] font-bold text-white hover:bg-white/20 active:scale-95 transition shadow-sm"
                        >
                          +{add >= 1000 ? `${add / 1000}k` : add}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. THANH GHI CHÚ CAPSULE LOCKET */}
                  <div className="absolute bottom-4 inset-x-3 z-10">
                    <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/80 backdrop-blur-xl border border-white/30 shadow-2xl">
                      <Sparkles size={15} className="text-amber-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Gửi một ghi chú... (VD: Cà phê Highlands)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-white/50 focus:outline-none font-semibold"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ĐÁY CAMERA: NÚT SHUTTER HOẶC NÚT GỬI LOCKET */}
            {!capturedImage ? (
              <div className="w-full pt-3 pb-2 flex items-center justify-around px-4">
                {/* Chọn ảnh từ máy */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-12 h-12 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-90 border border-white/15 flex items-center justify-center text-white backdrop-blur-md transition shadow-lg"
                  title="Chọn ảnh từ thư viện"
                >
                  <ImageIcon size={20} />
                </button>

                {/* Nút chụp viền đôi Locket Shutter */}
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={hasCameraPermission === false}
                  className="relative flex items-center justify-center w-20 h-20 rounded-full border-[5px] border-white p-1 active:scale-90 transition-transform duration-150 shadow-[0_0_30px_rgba(255,255,255,0.45)] disabled:opacity-40"
                  title="Chụp ảnh"
                >
                  <span className="w-full h-full rounded-full bg-white shadow-inner flex items-center justify-center" />
                </button>

                {/* Lật camera */}
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  disabled={hasCameraPermission === false}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 border border-white/15 flex items-center justify-center text-white backdrop-blur-md transition shadow-lg disabled:opacity-40"
                  title="Đổi camera trước/sau"
                >
                  <RefreshCw size={20} />
                </button>
              </div>
            ) : (
              <div className="w-full pt-2 pb-1 space-y-2.5">
                {/* Chọn danh mục */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 px-1 text-[11px] font-bold text-slate-400">
                    <Tag size={11} /> Danh mục:
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar px-1">
                    {categories.map((cat) => {
                      const isSelected = selectedCategoryId === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategoryId(cat.id)}
                          style={{
                            borderColor: isSelected ? cat.color : "rgba(255,255,255,0.15)",
                            backgroundColor: isSelected ? `${cat.color}33` : "rgba(255,255,255,0.08)",
                          }}
                          className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition border active:scale-95 ${
                            isSelected ? "text-white ring-1 ring-white/40" : "text-slate-300 hover:bg-white/15"
                          }`}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: cat.color || "#38bdf8" }}
                          />
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nút Vàng Locket Gửi Vào Sổ */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !amount}
                  className="w-full py-3.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 active:scale-[0.98] font-black text-slate-950 text-sm shadow-[0_0_25px_rgba(251,191,36,0.45)] transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" /> Đang gửi vào Sổ Chi Tiêu...
                    </>
                  ) : (
                    <>
                      <Send size={17} className="fill-slate-950" /> Gửi Vào Sổ Chi Tiêu
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* DẢI HÓA ĐƠN VỪA LƯU GẦN ĐÂY */}
          {receiptTransactions.length > 0 && (
            <div className="pt-2 space-y-2 max-w-[420px] mx-auto">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-400">Hóa đơn gần đây</span>
                <button
                  type="button"
                  onClick={() => setViewMode("gallery")}
                  className="text-xs font-bold text-amber-400 hover:underline"
                >
                  Xem tất cả ({receiptTransactions.length}) &rarr;
                </button>
              </div>

              <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
                {receiptTransactions.slice(0, 5).map((t) => {
                  const url = getReceiptImageUrl(t.receiptImagePath);
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTransaction(t)}
                      className="shrink-0 w-24 bg-slate-900 border border-slate-800 p-1.5 pb-2 rounded-2xl cursor-pointer hover:border-slate-700 transition"
                    >
                      <div className="w-full aspect-square rounded-xl overflow-hidden bg-black">
                        {url ? (
                          <img src={url} alt={t.description} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={20} className="m-auto text-slate-600" />
                        )}
                      </div>
                      <p className="text-[10px] font-black text-rose-400 mt-1 truncate">
                        -{formatCurrency(t.amount)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PHẦN 2: KHO HÓA ĐƠN POLAROID ĐẦY ĐỦ (GALLERY GRID) */}
      {viewMode === "gallery" && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Sparkles size={15} className="text-amber-400" />
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Tất Cả Ảnh Hóa Đơn ({receiptTransactions.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setViewMode("camera")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs shadow-md shadow-amber-400/20 active:scale-95 transition"
            >
              <Camera size={13} className="text-slate-950" /> Chụp Thêm
            </button>
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
                onClick={() => setViewMode("camera")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 font-black text-xs text-slate-950 shadow-md transition"
              >
                <Camera size={15} /> Bật Camera Chụp Ngay
              </button>
            </div>
          )}
        </section>
      )}

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
