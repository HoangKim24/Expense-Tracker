import { useEffect, useState, useRef, useCallback } from "react";
import { 
  Trash2, 
  Sparkles, 
  Image as ImageIcon, 
  RefreshCw, 
  RotateCcw, 
  ChevronDown,
  X,
  HelpCircle,
  Camera,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { compressImageFile } from "../lib/imageUtils";
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

const DEFAULT_CATEGORIES: CategoryDto[] = [
  { id: "cat-food", name: "Ăn uống", color: "#f43f5e", icon: "restaurant", description: "Ăn uống", type: TransactionType.Expense },
  { id: "cat-coffee", name: "Cà phê", color: "#d97706", icon: "coffee", description: "Cà phê, nước uống", type: TransactionType.Expense },
  { id: "cat-shopping", name: "Mua sắm", color: "#3b82f6", icon: "shopping_bag", description: "Mua sắm", type: TransactionType.Expense },
  { id: "cat-transport", name: "Di chuyển", color: "#10b981", icon: "directions_car", description: "Đi lại", type: TransactionType.Expense },
  { id: "cat-living", name: "Sinh hoạt", color: "#8b5cf6", icon: "home", description: "Chi phí sinh hoạt", type: TransactionType.Expense },
  { id: "cat-entertainment", name: "Giải trí", color: "#ec4899", icon: "movie", description: "Vui chơi giải trí", type: TransactionType.Expense },
];

export default function ReceiptSnaps() {
  // Tab view: 'camera' mở ngay khi vào trang, 'gallery' để xem kho ảnh
  const [viewMode, setViewMode] = useState<"camera" | "gallery">("camera");

  // Danh sách hóa đơn & danh mục
  const [receiptTransactions, setReceiptTransactions] = useState<TransactionDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>(DEFAULT_CATEGORIES);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("cat-food");
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDto | null>(null);
  const [showHelpModal, setShowHelpModal] = useState(false);

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
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  // Dừng stream camera - Ổn định vĩnh viễn, không re-create
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
  }, []);

  // Bật camera - Ổn định vĩnh viễn, không gây re-render loop
  const startCamera = useCallback(async (mode: "environment" | "user") => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setHasCameraPermission(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasCameraPermission(false);
      return;
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode === "user" ? "user" : { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = newStream;
      setStream(newStream);
      setHasCameraPermission(true);
    } catch {
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = fallbackStream;
        setStream(fallbackStream);
        setHasCameraPermission(true);
      } catch {
        setHasCameraPermission(false);
      }
    }
  }, []);

  // Mở camera khi vào tab camera - Chỉ chạy 1 lần khi chuyển tab hoặc đổi camera
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

  // Gắn stream vào thẻ video một lần duy nhất và lắng nghe sự kiện phát hình
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream || capturedImage) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.srcObject = stream;

    const handlePlay = () => {
      video.play().catch(() => {});
    };

    video.addEventListener("loadedmetadata", handlePlay);
    video.addEventListener("canplay", handlePlay);
    handlePlay();

    return () => {
      video.removeEventListener("loadedmetadata", handlePlay);
      video.removeEventListener("canplay", handlePlay);
    };
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
    canvas.width = video.videoWidth || 1080;
    canvas.height = video.videoHeight || 1080;

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

  // Gửi vào sổ chi tiêu (Lưu hóa đơn)
  const handleSubmit = async () => {
    const numericAmount = Number(amount.replace(/\D/g, ""));
    if (!numericAmount || numericAmount <= 0) {
      toast.warning("Chưa nhập số tiền chi tiêu", {
        description: "Vui lòng chạm vào nhãn tiền ở giữa ảnh để nhập số tiền hóa đơn.",
      });
      amountInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Đang lưu hóa đơn vào sổ...");
    try {
      let receiptPath: string | null = null;
      if (capturedFile) {
        // Tự động nén ảnh phía client siêu tốc
        const optimizedFile = await compressImageFile(capturedFile);
        const uploadRes = await uploadReceipt(optimizedFile);
        receiptPath = uploadRes.path;
      }

      const selectedCat = categories.find((c) => c.id === selectedCategoryId);
      const defaultDesc = selectedCat ? `${selectedCat.name} (Hóa đơn Snap)` : "Khoảnh khắc chi tiêu Snap";

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

      toast.success("Đã ghi nhận hóa đơn vào sổ thành công!", {
        id: toastId,
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
      toast.error("Không thể lưu hóa đơn", {
        id: toastId,
        description: "Vui lòng kiểm tra lại kết nối mạng và thử lại.",
      });
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
      toast.success("Đã xóa hóa đơn thành công!", {
        description: "Khoản tiền đã được hoàn lại vào ngân sách của bạn.",
      });
    } catch {
      toast.error("Không thể xóa hóa đơn", {
        description: "Vui lòng thử lại sau giây lát.",
      });
    }
  };

  const formatCurrency = (val: number) => `${new Intl.NumberFormat("vi-VN").format(val)}đ`;
  const totalSnapExpense = receiptTransactions.reduce((sum, t) => sum + t.amount, 0);
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="w-full max-w-[420px] mx-auto min-h-[calc(100dvh-8.5rem)] flex flex-col justify-between select-none px-2">
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

      {/* VIEW 1: CAMERA TOÀN DIỆN CHUẨN LOCKET (ẢNH BÊN PHẢI) */}
      {viewMode === "camera" && (
        <div className="flex-1 w-full flex flex-col justify-between py-2">
          {/* Top Bar: [X] bên trái và [?] bên phải */}
          <div className="w-full flex items-center justify-between px-2 py-1">
            <button
              type="button"
              onClick={() => {
                if (capturedImage) {
                  handleRetake();
                } else {
                  setViewMode("gallery");
                }
              }}
              className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white/90 hover:text-white active:scale-90 transition"
              title={capturedImage ? "Chụp lại" : "Kho hóa đơn"}
            >
              <X size={26} strokeWidth={2.2} />
            </button>

            {/* Hint giữa màn hình */}
            <div className="text-center px-2">
              <span className="text-xs font-black text-white/90 tracking-wider uppercase block">
                {capturedImage ? "Chi Tiết Chi Phí" : "Chụp Hóa Đơn"}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-white/90 hover:text-white active:scale-90 transition"
              title="Hướng dẫn & Mục tiêu"
            >
              <HelpCircle size={24} strokeWidth={2.2} />
            </button>
          </div>

          {/* KHUNG VIEWFINDER SQUIRCLE CHUẨN LOCKET */}
          <div className="relative my-auto py-2 w-full flex flex-col items-center">
            <div 
              onClick={() => videoRef.current?.play().catch(() => {})}
              className="relative w-[88vw] max-w-[340px] aspect-square rounded-[38px] overflow-hidden bg-black shadow-2xl flex items-center justify-center select-none shrink-0 border-2 border-white/20"
            >
              {!capturedImage ? (
                /* LIVE CAMERA FEED */
                <>
                  {hasCameraPermission === false ? (
                    <div className="text-center px-6 space-y-3.5">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto text-amber-300">
                        <Camera size={28} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-white">Chưa mở được camera trực tiếp</p>
                        <p className="text-xs text-slate-300 leading-relaxed max-w-[260px] mx-auto">
                          Safari yêu cầu đường dẫn <b>HTTPS (Vercel)</b> hoặc cấp quyền ở biểu tượng <b>aA</b> thanh địa chỉ.
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 w-full max-w-[240px] mx-auto pt-1">
                        <label
                          htmlFor="receipt-native-camera-input"
                          className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 font-black text-xs text-black shadow-xl active:scale-95 transition"
                        >
                          <Camera size={16} /> Mở Máy Ảnh iPhone (Cách 2)
                        </label>
                        <label
                          htmlFor="receipt-gallery-input"
                          className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-slate-800 border border-slate-700 font-bold text-xs text-slate-200 shadow-md active:scale-95 transition"
                        >
                          <ImageIcon size={16} /> Chọn ảnh từ thư viện
                        </label>
                      </div>
                    </div>
                  ) : (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={`w-full h-full object-cover ${
                        facingMode === "user" ? "-scale-x-100" : ""
                      }`}
                    />
                  )}

                  {/* Watermark tinh tế Locket */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none text-white/90 text-sm font-bold tracking-tight drop-shadow-md">
                    Hóa Đơn Chi Tiêu
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
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/50 via-transparent to-black/75" />

                  {/* 1. STICKER NHẬP TIỀN */}
                  <div className="absolute top-4 inset-x-3 flex flex-col items-center z-10">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-full max-w-[270px] px-3.5 py-2.5 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/30 shadow-2xl flex items-center justify-between gap-2"
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

                    {/* Chips cộng tiền nhanh */}
                    <div className="flex gap-1.5 mt-2 overflow-x-auto max-w-full px-1 py-0.5 no-scrollbar">
                      {[10000, 20000, 50000, 100000, 200000].map((add) => (
                        <button
                          key={add}
                          type="button"
                          onClick={() => handleAddQuickAmount(add)}
                          className="shrink-0 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/25 text-[11px] font-bold text-white hover:bg-white/20 active:scale-95 transition shadow-sm"
                        >
                          +{add >= 1000 ? `${add / 1000}k` : add}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. CAPSULE GHI CHÚ */}
                  <div className="absolute bottom-4 inset-x-3 z-10">
                    <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-black/80 backdrop-blur-xl border border-white/30 shadow-2xl">
                      <Sparkles size={15} className="text-amber-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="Ghi chú chi tiêu... (VD: Ăn phở, Cà phê)"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="flex-1 bg-transparent text-xs sm:text-sm text-white placeholder-white/50 focus:outline-none font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* NÚT PILL CHỌN DANH MỤC DƯỚI VIEWFINDER */}
            <div className="flex flex-col items-center gap-2 mt-3 relative z-10">
              <button
                type="button"
                onClick={() => setIsCategoryPickerOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900/90 border border-white/20 text-white text-xs font-bold shadow-lg active:scale-95 transition"
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ backgroundColor: selectedCategory?.color || "#10b981" }} 
                />
                <span>{selectedCategory?.name || "Chọn danh mục"}</span>
                <ChevronDown size={14} className="text-white/70" />
              </button>

            </div>
          </div>

          {/* PHẦN ĐÁY: BỘ ĐIỀU KHIỂN CHỤP & SWITCHER CHUẨN LOCKET */}
          <div className="w-full space-y-3 pt-1 pb-2">
            {!capturedImage ? (
              /* LIVE CONTROLS */
              <div className="w-full flex items-center justify-around px-4">
                {/* 1. Nút chọn ảnh thư viện */}
                <label
                  htmlFor="receipt-gallery-input"
                  className="cursor-pointer w-12 h-12 shrink-0 rounded-full bg-neutral-900/90 border border-white/20 text-white flex items-center justify-center active:scale-90 transition shadow-lg"
                  title="Chọn ảnh từ máy"
                >
                  <ImageIcon size={20} />
                </label>

                {/* 2. NÚT CHỤP LOCKET SHUTTER LỚN */}
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={hasCameraPermission === false}
                  className="w-20 h-20 shrink-0 rounded-full border-[5px] border-white p-1 flex items-center justify-center active:scale-90 transition duration-150 shadow-[0_0_25px_rgba(255,255,255,0.35)] disabled:opacity-40"
                  title="Chụp ảnh trực tiếp"
                >
                  <span className="w-full h-full rounded-full bg-white transition" />
                </button>

                {/* 3. Nút lật camera trước / sau */}
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  disabled={hasCameraPermission === false}
                  className="w-12 h-12 shrink-0 rounded-full bg-neutral-900/90 border border-white/20 text-white flex items-center justify-center active:scale-90 transition shadow-lg disabled:opacity-40"
                  title="Lật camera"
                >
                  <RotateCcw size={20} />
                </button>
              </div>
            ) : (
              /* POST-CAPTURE CONTROLS */
              <div className="flex items-center gap-3 px-3">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="w-14 h-14 rounded-full bg-neutral-900/90 border border-white/20 text-white flex items-center justify-center active:scale-90 transition shadow-lg shrink-0"
                  title="Chụp lại"
                >
                  <RotateCcw size={20} />
                </button>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-3.5 px-6 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-sm shadow-[0_0_25px_rgba(251,191,36,0.4)] active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50"
                  title="Lưu hóa đơn vào sổ chi tiêu"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" /> Đang lưu hóa đơn...
                    </>
                  ) : (
                    <>
                      <Check size={18} strokeWidth={2.5} /> Lưu Hóa Đơn (Vào Sổ)
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB TEXT BOTTOM SWITCHER (GIỐNG LOCKET: KHO HÓA ĐƠN | ẢNH CHỤP NHANH) */}
            <div className="flex items-center justify-center gap-8 pt-1 text-xs font-bold uppercase tracking-wider select-none">
              <button
                type="button"
                onClick={() => setViewMode("gallery")}
                className="text-neutral-500 hover:text-white transition active:scale-95"
              >
                Kho Hóa Đơn ({receiptTransactions.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode("camera")}
                className="text-white font-black tracking-wider relative flex flex-col items-center"
              >
                <span>Ảnh Chụp Nhanh</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: KHO HÓA ĐƠN POLAROID ĐẦY ĐỦ (GALLERY VIEW) */}
      {viewMode === "gallery" && (
        <section className="flex-1 flex flex-col justify-between py-3 px-3 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-base font-black text-white">Kho Ảnh Hóa Đơn</h2>
              <p className="text-xs text-rose-400 font-bold">Đã chi: {formatCurrency(totalSnapExpense)}</p>
            </div>
            <button
              type="button"
              onClick={() => setViewMode("camera")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-md active:scale-95 transition"
            >
              <Camera size={14} className="text-slate-950" /> Chụp Thêm
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
                  className="bg-slate-900 border border-slate-800 p-2.5 pb-3 rounded-2xl shadow-lg hover:border-slate-700 transition cursor-pointer flex flex-col justify-between group"
                >
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

                    <div className="absolute top-1.5 right-1.5 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md text-[9px] font-bold text-white">
                      {new Date(t.transactionDate).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" })}
                    </div>
                  </div>

                  <div className="mt-2 px-1 space-y-1">
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

          {/* Empty State: Văn bản canh chuẩn, KHÔNG bị rớt từ từng chữ */}
          {!isLoading && receiptTransactions.length === 0 && (
            <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-8 text-center space-y-4 my-auto">
              <div className="w-16 h-16 rounded-3xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400 shadow-inner">
                <Camera size={32} />
              </div>
              <div className="space-y-1.5">
                <p className="text-base font-bold text-white">Chưa có ảnh hóa đơn nào</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Chụp ảnh hóa đơn khi đi ăn uống, cà phê hoặc mua sắm để theo dõi chi tiêu tháng này và lên kế hoạch tiết kiệm cho tháng sau.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewMode("camera")}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 font-black text-xs text-slate-950 shadow-lg active:scale-95 transition"
              >
                <Camera size={15} /> Bật Camera Chụp Ngay
              </button>
            </div>
          )}

          {/* Switcher đáy kho ảnh */}
          <div className="flex items-center justify-center gap-8 pt-2 pb-1 text-xs font-bold uppercase tracking-wider select-none">
            <button
              type="button"
              onClick={() => setViewMode("gallery")}
              className="text-white font-black tracking-wider relative flex flex-col items-center"
            >
              <span>Kho Hóa Đơn</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("camera")}
              className="text-neutral-500 hover:text-white transition active:scale-95"
            >
              Ảnh Chụp Nhanh
            </button>
          </div>
        </section>
      )}

      {/* Modal Hướng Dẫn & Mục Tiêu Tiết Kiệm */}
      <AnimatePresence>
        {showHelpModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 space-y-4 shadow-2xl text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-amber-400" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Mục Tiêu Chi Tiêu</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHelpModal(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="text-xs text-slate-300 space-y-2.5 leading-relaxed">
                <p>
                  🎯 <strong>Mục tiêu:</strong> Ghi nhận tức thì mọi khoản chi thông qua ảnh hóa đơn để kiểm soát chi tiêu tháng này, tìm ra các khoản chi vượt mức để tiết kiệm hiệu quả cho tháng sau.
                </p>
                <p>
                  📸 <strong>Cách dùng:</strong> Hướng camera vào hóa đơn &rarr; Bấm nút Chụp &rarr; Chạm vào nhãn tiền để nhập số tiền &rarr; Bấm "Gửi Vào Sổ".
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs active:scale-95 transition"
              >
                Đã hiểu
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Bottom Sheet Drawer */}
      <AnimatePresence>
        {isCategoryPickerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm"
          >
            <div
              onClick={() => setIsCategoryPickerOpen(false)}
              className="absolute inset-0"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative z-10 w-full max-w-md mx-auto rounded-t-[32px] bg-slate-900 border-t border-slate-800 p-5 pb-8 space-y-4 shadow-2xl"
            >
              <div className="w-12 h-1.5 rounded-full bg-slate-700 mx-auto" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-white uppercase tracking-wider">
                  Chọn Danh Mục Chi Tiêu
                </span>
                <button
                  type="button"
                  onClick={() => setIsCategoryPickerOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto no-scrollbar">
                {categories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategoryId(cat.id);
                        setIsCategoryPickerOpen(false);
                      }}
                      className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-bold transition active:scale-95 ${
                        isSelected
                          ? "bg-white/15 border-white/40 text-white shadow-md"
                          : "bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color || "#38bdf8" }}
                        />
                        <span className="truncate">{cat.name}</span>
                      </div>
                      {isSelected && <Check size={16} className="text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Polaroid Detail Modal (xem phóng to) */}
      <PolaroidDetailModal
        transaction={selectedTransaction}
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onDelete={handleDelete}
      />

      {/* Hidden File Inputs for Gallery & Native Camera fallback (Không dùng display:none) */}
      <input
        type="file"
        id="receipt-gallery-input"
        ref={fileInputRef}
        accept="image/jpeg,image/png,image/heic,image/*"
        style={{ position: "fixed", top: "-9999px", left: "-9999px", opacity: 0, width: "1px", height: "1px" }}
        onChange={handleFileChange}
      />
      <input
        type="file"
        id="receipt-native-camera-input"
        ref={nativeCameraInputRef}
        accept="image/jpeg,image/png,image/heic,image/*"
        capture="environment"
        style={{ position: "fixed", top: "-9999px", left: "-9999px", opacity: 0, width: "1px", height: "1px" }}
        onChange={handleFileChange}
      />
    </div>
  );
}
