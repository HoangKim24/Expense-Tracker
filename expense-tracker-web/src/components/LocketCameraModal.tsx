import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, RefreshCw, Image as ImageIcon, Check, Sparkles, Tag } from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
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
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  // Form states
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera stream
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Start camera stream
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

  // Setup / teardown camera when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      getCategories().then((cats) => {
        setCategories(cats);
        if (cats.length > 0 && !selectedCategoryId) {
          const defaultCat = cats.find(c => c.name.includes("Ăn") || c.name.includes("Cà phê")) || cats[0];
          setSelectedCategoryId(defaultCat.id);
        }
      }).catch(() => setCategories([]));

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
  }, [isOpen, facingMode, capturedImage, startCamera, stopStream]);

  // Attach stream to video tag whenever stream changes
  useEffect(() => {
    if (videoRef.current && stream && !capturedImage) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, capturedImage]);

  // Trigger shutter capture
  const handleCapture = () => {
    if (!videoRef.current) return;

    if (navigator.vibrate) {
      navigator.vibrate([20, 30, 20]);
    }

    // Trigger flash animation
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
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedImage(dataUrl);

      // Convert dataUrl to File
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `snap_${Date.now()}.jpg`, { type: "image/jpeg" });
          setCapturedFile(file);
        }
      }, "image/jpeg", 0.9);

      stopStream();
    }
  };

  // Handle image upload from library
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

  // Switch between front and back camera
  const handleToggleCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Reset to take another photo
  const handleRetake = () => {
    setCapturedImage(null);
    setCapturedFile(null);
    startCamera(facingMode);
  };

  // Quick amount chip add
  const handleAddQuickAmount = (extra: number) => {
    const current = Number(amount.replace(/\D/g, "")) || 0;
    const nextVal = current + extra;
    setAmount(new Intl.NumberFormat("vi-VN").format(nextVal));
  };

  // Submit transaction with snap receipt
  const handleSubmit = async () => {
    const numericAmount = Number(amount.replace(/\D/g, ""));
    if (!numericAmount || numericAmount <= 0) {
      toast.error("Vui lòng nhập số tiền hợp lệ");
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
      const defaultDesc = selectedCat ? `${selectedCat.name} (Snap)` : "Hóa đơn Snap & Log";

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
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#3b82f6", "#10b981", "#f59e0b", "#ec4899"],
      });

      toast.success("Đã ghi nhận giao dịch & hóa đơn!", {
        description: `${new Intl.NumberFormat("vi-VN").format(numericAmount)}đ - ${description || defaultDesc}`,
      });

      onSuccess?.();
      onClose();
    } catch {
      toast.error("Lỗi khi lưu giao dịch. Vui lòng thử lại!");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
        {/* Shutter Flash Animation */}
        <AnimatePresence>
          {isFlashing && (
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-60 bg-white pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="relative w-full max-w-md bg-slate-900 border border-slate-800 text-white rounded-[36px] shadow-2xl overflow-hidden flex flex-col my-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-400">Snap & Log</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 transition"
            >
              <X size={20} />
            </button>
          </div>

          {/* Hidden Elements */}
          <canvas ref={canvasRef} className="hidden" />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {!capturedImage ? (
            /* CAMERA VIEWFINDER MODE */
            <div className="p-4 flex flex-col items-center">
              {/* Locket Viewfinder Frame */}
              <div className="relative w-full aspect-[4/5] bg-slate-950 rounded-[32px] overflow-hidden border-2 border-slate-700/60 shadow-inner flex items-center justify-center">
                {hasCameraPermission === false ? (
                  <div className="text-center px-6 space-y-4">
                    <Camera size={48} className="mx-auto text-slate-500" />
                    <p className="text-sm font-semibold text-slate-300">
                      Không thể truy cập camera hoặc chưa được cấp quyền.
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 font-bold text-xs text-white shadow-lg hover:bg-blue-500 transition"
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

                {/* Viewfinder Overlay Guide */}
                <div className="absolute inset-0 pointer-events-none border border-white/10 rounded-[30px]" />
                <div className="absolute top-4 left-4 pointer-events-none px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-[11px] font-medium text-white/80">
                  Căn chỉnh hóa đơn / bill
                </div>
              </div>

              {/* Camera Controls Bar */}
              <div className="w-full mt-6 mb-2 flex items-center justify-around px-4">
                {/* Pick from Gallery Button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3.5 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95 transition shadow-lg"
                  title="Chọn ảnh từ máy"
                >
                  <ImageIcon size={22} />
                </button>

                {/* Big Locket Shutter Button */}
                <button
                  type="button"
                  onClick={handleCapture}
                  disabled={hasCameraPermission === false}
                  className="relative flex items-center justify-center w-20 h-20 rounded-full border-4 border-white/80 p-1.5 active:scale-90 transition-transform duration-150 disabled:opacity-40"
                >
                  <span className="w-full h-full rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.6)]" />
                </button>

                {/* Flip Camera Button */}
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  disabled={hasCameraPermission === false}
                  className="p-3.5 rounded-full bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 active:scale-95 transition shadow-lg disabled:opacity-40"
                  title="Đổi camera trước/sau"
                >
                  <RefreshCw size={22} />
                </button>
              </div>
            </div>
          ) : (
            /* POLAROID PREVIEW & EXPENSE ENTRY MODE */
            <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Polaroid Card */}
              <div className="relative mx-auto w-full max-w-[320px] bg-slate-950 p-3 pt-3 pb-5 rounded-[28px] border border-slate-700/80 shadow-2xl transform rotate-[-0.5deg] transition hover:rotate-0">
                {/* Photo frame */}
                <div className="relative w-full aspect-square rounded-[20px] overflow-hidden bg-black shadow-inner">
                  <img
                    src={capturedImage}
                    alt="Receipt snap"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white tracking-wide">
                    {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>

                {/* Retake action */}
                <div className="mt-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400">
                    <Sparkles size={13} className="text-amber-400" /> Polaroid Snap
                  </div>
                  <button
                    type="button"
                    onClick={handleRetake}
                    className="text-xs font-bold text-blue-400 hover:text-blue-300 transition"
                  >
                    Chụp lại
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Số tiền đã chi
                </label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setAmount(val ? new Intl.NumberFormat("vi-VN").format(parseInt(val, 10)) : "");
                    }}
                    autoFocus
                    className="w-full rounded-2xl bg-slate-800/90 border border-slate-700 px-4 py-3.5 text-2xl font-black text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 pr-12 text-right"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                    VNĐ
                  </span>
                </div>

                {/* Quick amount increment chips */}
                <div className="flex gap-2 overflow-x-auto py-1 no-scrollbar">
                  {[10000, 20000, 50000, 100000, 200000].map((add) => (
                    <button
                      key={add}
                      type="button"
                      onClick={() => handleAddQuickAmount(add)}
                      className="shrink-0 px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-300 border border-slate-700 transition active:scale-95"
                    >
                      +{add >= 1000 ? `${add / 1000}k` : add}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Tag size={12} /> Danh mục
                </label>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {categories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategoryId(cat.id)}
                        style={{
                          borderColor: isSelected ? cat.color : undefined,
                          backgroundColor: isSelected ? `${cat.color}22` : undefined,
                        }}
                        className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border ${
                          isSelected
                            ? "text-white ring-1 ring-white/30"
                            : "bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: cat.color || "#3b82f6" }}
                        />
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Note / Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Ghi chú (tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="VD: Cà phê sáng, Grab đi làm..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl bg-slate-800/90 border border-slate-700 px-4 py-2.5 text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !amount}
                className="w-full mt-2 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.98] font-black text-sm text-white shadow-xl shadow-blue-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" /> Đang lưu hóa đơn...
                  </>
                ) : (
                  <>
                    <Check size={18} /> Lưu hóa đơn Snap & Log
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
