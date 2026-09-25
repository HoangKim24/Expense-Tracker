import { useState, useEffect, useCallback, type ReactNode } from "react";
import { Lock, Delete, ShieldCheck, KeyRound } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

const PIN_STORAGE_KEY = "expense_pin_unlocked_until";
const FOUR_WEEKS_MS = 28 * 24 * 60 * 60 * 1000; // 28 ngày (4 tuần)
const CORRECT_PIN = "2403";

export function isAppUnlocked(): boolean {
  if (typeof window === "undefined") return true;
  const raw = localStorage.getItem(PIN_STORAGE_KEY);
  if (!raw) return false;
  const expiresAt = parseInt(raw, 10);
  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    localStorage.removeItem(PIN_STORAGE_KEY);
    return false;
  }
  return true;
}

export function lockApp(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PIN_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("app-locked"));
}

interface PinLockGuardProps {
  children: ReactNode;
}

export default function PinLockGuard({ children }: PinLockGuardProps) {
  const [unlocked, setUnlocked] = useState<boolean>(() => isAppUnlocked());
  const [enteredPin, setEnteredPin] = useState<string>("");
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Lắng nghe sự kiện khóa ứng dụng từ header "Khóa sổ"
  useEffect(() => {
    const handleLock = () => {
      setUnlocked(false);
      setEnteredPin("");
      setErrorMessage("");
    };

    window.addEventListener("app-locked", handleLock);
    return () => window.removeEventListener("app-locked", handleLock);
  }, []);

  const handleKeyPress = useCallback((digit: string) => {
    if (enteredPin.length >= 4) return;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(10);
    }
    setErrorMessage("");
    setEnteredPin((prev) => prev + digit);
  }, [enteredPin.length]);

  const handleDelete = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(15);
    }
    setEnteredPin((prev) => prev.slice(0, -1));
    setErrorMessage("");
  }, []);

  // Xử lý khi đủ 4 ký tự PIN
  useEffect(() => {
    if (enteredPin.length === 4) {
      if (enteredPin === CORRECT_PIN) {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([20, 40, 20]);
        }
        localStorage.setItem(PIN_STORAGE_KEY, (Date.now() + FOUR_WEEKS_MS).toString());
        toast.success("Mở khóa thành công!", {
          description: "Đã lưu đăng nhập trong 4 tuần.",
        });
        setUnlocked(true);
        setEnteredPin("");
      } else {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([50, 50, 50]);
        }
        setIsShaking(true);
        setErrorMessage("Mã PIN không đúng, vui lòng thử lại!");
        setTimeout(() => {
          setIsShaking(false);
          setEnteredPin("");
        }, 500);
      }
    }
  }, [enteredPin]);

  // Hỗ trợ nhập phím vật lý trên máy tính hoặc bàn phím gắn ngoài
  useEffect(() => {
    if (unlocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleKeyPress(e.key);
      } else if (e.key === "Backspace") {
        handleDelete();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [unlocked, handleKeyPress, handleDelete]);

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black text-white px-6 py-10 select-none overflow-hidden touch-manipulation">
      {/* Top Header Branding */}
      <div className="w-full flex items-center justify-between max-w-sm pt-safe">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-white text-black font-black flex items-center justify-center text-xs shadow-sm">
            T
          </div>
          <span className="text-xs font-semibold text-zinc-400">T-Expense Vault</span>
        </div>
        <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10">
          <ShieldCheck size={12} className="text-emerald-400" />
          <span>Ghi nhớ 4 tuần</span>
        </span>
      </div>

      {/* Center PIN Display */}
      <div className="w-full max-w-xs flex flex-col items-center text-center my-auto space-y-7">
        <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-200 shadow-2xl">
          <Lock size={28} className="text-white" />
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-bold tracking-tight text-white">Nhập mã PIN mở khóa</h1>
          <p className="text-xs text-zinc-400 max-w-[240px] mx-auto">
            Bảo mật sổ thu chi cá nhân. Nhập một lần và ghi nhớ trong 28 ngày.
          </p>
        </div>

        {/* 4 PIN Dots with shake animation */}
        <motion.div
          animate={isShaking ? { x: [-12, 12, -8, 8, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-center gap-4 py-2"
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = enteredPin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? "bg-white scale-110 shadow-[0_0_12px_rgba(255,255,255,0.7)]"
                    : "border-2 border-zinc-700 bg-transparent"
                }`}
              />
            );
          })}
        </motion.div>

        {/* Error message slot */}
        <div className="h-5">
          <AnimatePresence>
            {errorMessage && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs font-medium text-rose-400"
              >
                {errorMessage}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Numeric Keypad - Standardized for iPhone 15 touch */}
      <div className="w-full max-w-xs grid grid-cols-3 gap-3.5 pb-safe">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => handleKeyPress(num.toString())}
            className="h-16 sm:h-18 rounded-3xl bg-zinc-900/90 active:bg-white active:text-black border border-white/[0.08] flex items-center justify-center text-2xl font-semibold text-white transition-all duration-150 active:scale-95 shadow-sm"
          >
            {num}
          </button>
        ))}

        {/* Empty placeholder slot */}
        <div className="flex items-center justify-center">
          <KeyRound size={20} className="text-zinc-700" />
        </div>

        {/* Digit 0 */}
        <button
          type="button"
          onClick={() => handleKeyPress("0")}
          className="h-16 sm:h-18 rounded-3xl bg-zinc-900/90 active:bg-white active:text-black border border-white/[0.08] flex items-center justify-center text-2xl font-semibold text-white transition-all duration-150 active:scale-95 shadow-sm"
        >
          0
        </button>

        {/* Backspace Button */}
        <button
          type="button"
          onClick={handleDelete}
          disabled={enteredPin.length === 0}
          className="h-16 sm:h-18 rounded-3xl bg-zinc-900/60 active:bg-zinc-800 border border-white/[0.08] flex items-center justify-center text-zinc-400 active:text-white transition-all duration-150 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
        >
          <Delete size={22} />
        </button>
      </div>
    </div>
  );
}
