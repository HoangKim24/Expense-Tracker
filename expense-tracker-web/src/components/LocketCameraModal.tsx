import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  RefreshCw, 
  Image as ImageIcon, 
  Check, 
  Sparkles, 
  Zap, 
  RotateCcw,
  Tag,
  Camera
} from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { compressImageFile } from "../lib/imageUtils";
import { 
  getCategories, 
  uploadReceipt, 
  createTransaction, 
  TransactionSource, 
  TransactionType, 
  type CategoryDto 
} from "../lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function LocketCameraModal({ isOpen, onClose, onSuccess }: Props) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  // Form states for Locket / Instagram overlay
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  // Dừng stream camera - Ổn định vĩnh viễn, không gây re-render loop
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
  }, []);

  // Khởi động stream camera - Chuẩn hóa cho iOS Safari, không re-create
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

  // Quản lý đóng/mở modal
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

      if (!capturedImage) {
        startCamera(facingMode);
      }
    } else {
      stopStream();
      setCapturedImage(null);
      setCapturedFile(null);
      setAmount("");
      setDescription("");
      setIsSubmitting(false);
    }
    return () => {
      stopStream();
    };
  }, [isOpen, facingMode, capturedImage, startCamera, stopStream]);

  // Tự động focus vào ô nhập tiền sau khi chụp
  useEffect(() => {
    if (capturedImage) {
      const timer = setTimeout(() => {
        amountInputRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [capturedImage]);

  // Nút chụp ảnh Shutter kiểu Locket
  const handleCapture = () => {
    if (!videoRef.current) return;

    // Rung phản hồi haptic
    if (navigator.vibrate) {
      navigator.vibrate([25, 40, 25]);
    }

    // Hiệu ứng chớp sáng trắng màn hình (White Flash)
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

  // Chụp lại (Retake)
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
      const defaultDesc = selectedCat ? `${selectedCat.name} (Locket Snap)` : "Khoảnh khắc chi tiêu Snap";

      // Tự động cộng vào chi phí (Type: Expense, Source: SnapReceipt)
      await createTransaction({
        amount: numericAmount,
        transactionDate: new Date().toISOString(),
        description: description.trim() || defaultDesc,
        type: TransactionType.Expense,
        source: TransactionSource.SnapReceipt,
        categoryId: selectedCategoryId || null,
        receiptImagePath: receiptPath,
      });

      // Hiệu ứng pháo hoa rực rỡ
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.65 },
        colors: ["#facc15", "#38bdf8", "#34d399", "#f43f5e"],
      });

      toast.success("Đã lưu hóa đơn thành công!", {
        id: toastId,
        description: `-${new Intl.NumberFormat("vi-VN").format(numericAmount)}đ • ${description || defaultDesc}`,
      });

      window.dispatchEvent(new CustomEvent("transaction-updated"));
      onSuccess?.();
      onClose();
    } catch {
      toast.error("Không thể lưu hóa đơn", {
        id: toastId,
        description: "Vui lòng kiểm tra lại kết nối mạng và thử lại.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 sm:bg-black/90 backdrop-blur-2xl p-0 sm:p-4 overflow-hidden">
        {/* Shutter White Flash Animation */}
        <AnimatePresence>
          {isFlashing && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[60] bg-white pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Hidden Canvas & Native Inputs (Không dùng display:none để iOS Safari không chặn) */}
        <canvas ref={canvasRef} className="hidden" />
        <input
          id="locket-native-camera-input"
          ref={nativeCameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/*"
          capture="environment"
          style={{ position: "fixed", top: "-9999px", left: "-9999px", opacity: 0, width: "1px", height: "1px" }}
          onChange={handleFileChange}
        />
        <input
          id="locket-gallery-input"
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/heic,image/*"
          style={{ position: "fixed", top: "-9999px", left: "-9999px", opacity: 0, width: "1px", height: "1px" }}
          onChange={handleFileChange}
        />

        {/* Locket Frame Container */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 15 }}
          transition={{ type: "spring", stiffness: 380, damping: 28 }}
          className="relative w-full max-w-[420px] h-full sm:h-auto sm:max-h-[860px] bg-black sm:bg-slate-950 sm:border sm:border-slate-800/90 sm:rounded-[44px] shadow-2xl overflow-hidden flex flex-col justify-between p-3 sm:p-4"
        >
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between px-2 pt-1 pb-2 z-20">
            {/* Close / Retake Button */}
            <button
              type="button"
              onClick={capturedImage ? handleRetake : onClose}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white/90 backdrop-blur-xl border border-white/10 flex items-center justify-center transition shadow-lg"
              title={capturedImage ? "Chụp lại" : "Đóng"}
            >
              {capturedImage ? <RotateCcw size={18} /> : <X size={20} />}
            </button>

            {/* Locket Logo Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white shadow-inner">
              <Camera size={13} className="text-amber-400" />
              <span className="text-xs font-black tracking-wider uppercase">Locket Snap</span>
            </div>

            {/* Flash / Status indicator */}
            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/10 flex items-center justify-center text-amber-300">
              <Zap size={18} />
            </div>
          </div>

          {/* MAIN VIEWFINDER / PHOTO CANVAS */}
          <div 
            onClick={() => videoRef.current?.play().catch(() => {})}
            className="relative flex-1 w-full aspect-[4/5] sm:aspect-[4/5] bg-black rounded-[38px] overflow-hidden border-2 border-white/20 shadow-2xl flex items-center justify-center select-none my-1"
          >
            {!capturedImage ? (
              /* LIVE CAMERA FEED */
              <>
                {hasCameraPermission === false ? (
                  <div className="text-center px-6 space-y-3.5">
                    <div className="w-14 h-14 rounded-3xl bg-white/10 border border-white/10 flex items-center justify-center mx-auto text-amber-300 shadow-inner">
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
                        htmlFor="locket-native-camera-input"
                        className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 font-black text-xs text-black shadow-xl active:scale-95 transition"
                      >
                        <Camera size={16} /> Mở Máy Ảnh iPhone (Cách 2)
                      </label>
                      <label
                        htmlFor="locket-gallery-input"
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
                    className={`w-full h-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
                  />
                )}

                {/* Subtle Viewfinder Frame Guide */}
                <div className="absolute inset-4 pointer-events-none rounded-[30px] border border-white/15" />
                <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-[11px] font-medium text-white/80 border border-white/10">
                  Căn chỉnh hóa đơn / chi tiêu
                </div>
              </>
            ) : (
              /* CAPTURED PHOTO WITH INSTAGRAM & LOCKET OVERLAYS */
              <div className="relative w-full h-full">
                {/* Photo */}
                <img
                  src={capturedImage}
                  alt="Locket snap"
                  className="w-full h-full object-cover"
                />

                {/* Gradient shade overlays for contrast */}
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/50 via-transparent to-black/70" />

                {/* 1. INSTAGRAM-STYLE FLOATING AMOUNT STICKER */}
                <div className="absolute top-4 inset-x-3 flex flex-col items-center z-10">
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full max-w-[280px] px-4 py-2.5 rounded-2xl bg-black/70 backdrop-blur-xl border border-white/30 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center justify-between gap-2"
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

                  {/* Floating quick increment chips */}
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

                {/* 2. LOCKET-STYLE BOTTOM CAPTION CAPSULE */}
                <div className="absolute bottom-4 inset-x-3 z-10">
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/75 backdrop-blur-xl border border-white/30 shadow-2xl">
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

          {/* BOTTOM CONTROLS BAR */}
          {!capturedImage ? (
            /* CAMERA CONTROL BUTTONS */
            <div className="w-full pt-3 pb-2 flex items-center justify-around px-4">
              {/* Pick from Library (Rounded Square) */}
              <label
                htmlFor="locket-gallery-input"
                className="cursor-pointer w-13 h-13 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-90 border border-white/15 flex items-center justify-center text-white backdrop-blur-md transition shadow-lg"
                title="Chọn ảnh từ thư viện"
              >
                <ImageIcon size={22} />
              </label>

              {/* The Iconic Double-Ring Locket Shutter Button */}
              <button
                type="button"
                onClick={handleCapture}
                disabled={hasCameraPermission === false}
                className="relative flex items-center justify-center w-21 h-21 rounded-full border-[5px] border-white p-1 active:scale-90 transition-transform duration-150 shadow-[0_0_30px_rgba(255,255,255,0.45)] disabled:opacity-40"
                title="Chụp ảnh trực tiếp"
              >
                <span className="w-full h-full rounded-full bg-white shadow-inner flex items-center justify-center" />
              </button>

              {/* Camera Flip Button */}
              <button
                type="button"
                onClick={handleToggleCamera}
                disabled={hasCameraPermission === false}
                className="w-13 h-13 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 border border-white/15 flex items-center justify-center text-white backdrop-blur-md transition shadow-lg disabled:opacity-40"
                title="Đổi camera trước/sau"
              >
                <RefreshCw size={22} />
              </button>
            </div>
          ) : (
            /* POST-CAPTURE ACTION BAR (CATEGORY PILLS & LOCKET SEND BUTTON) */
            <div className="w-full pt-2 pb-1 space-y-2.5">
              {/* Category Pills (Horizontal Scroll) */}
              <div className="space-y-1">
                <div className="flex items-center gap-1 px-1 text-[11px] font-bold text-slate-400">
                  <Tag size={11} /> Chọn danh mục:
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

              {/* Nút Lưu Hóa Đơn & Gửi Vào Sổ Chi Tiêu */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-4 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 active:scale-[0.98] font-black text-slate-950 text-sm shadow-[0_0_30px_rgba(251,191,36,0.45)] transition flex items-center justify-center gap-2.5 disabled:opacity-50"
                title="Lưu hóa đơn vào sổ chi tiêu"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={19} className="animate-spin" /> Đang lưu hóa đơn...
                  </>
                ) : (
                  <>
                    <Check size={19} strokeWidth={2.8} /> Lưu Hóa Đơn (Vào Sổ)
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
