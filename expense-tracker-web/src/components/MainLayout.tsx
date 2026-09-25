import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Plus, RefreshCw, Lock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../lib/utils";
import QuickLogDrawer from "./QuickLogDrawer";
import { lockApp } from "./PinLockGuard";

export default function MainLayout() {
  const location = useLocation();
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);

  // Lắng nghe sự kiện toàn cục để mở quick log
  useEffect(() => {
    const handleOpen = () => setIsQuickLogOpen(true);
    window.addEventListener("open-quick-log", handleOpen);
    return () => window.removeEventListener("open-quick-log", handleOpen);
  }, []);

  // Hỗ trợ PWA shortcut ?quick=true
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("quick") === "true") {
      setIsQuickLogOpen(true);
    }
  }, [location.search]);

  const leftNavItems = [
    { name: "Tổng quan", path: "/", icon: "dashboard" },
    { name: "Hóa đơn", path: "/snaps", icon: "photo_camera" },
  ];

  const rightNavItems = [
    { name: "Lịch sử", path: "/history", icon: "receipt_long" },
    { name: "Phân tích", path: "/analytics", icon: "insights" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-black text-zinc-100 selection:bg-white selection:text-black transition-colors duration-200">
      {/* TopAppBar Tối Giản Hiện Đại */}
      <header className="sticky top-0 w-full z-40 bg-black/80 backdrop-blur-2xl border-b border-white/[0.08] pt-safe">
        <div className="flex justify-between items-center px-4 sm:px-6 h-14 w-full max-w-2xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-black font-black text-sm shadow-sm">
              T
            </div>
            <div>
              <span className="text-sm sm:text-base font-bold tracking-tight text-white block leading-tight">T-Expense</span>
              <span className="text-[10px] font-medium text-zinc-500 block leading-tight">Quản lý Chi tiêu</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút Khóa sổ ngay */}
            <button
              type="button"
              onClick={() => {
                lockApp();
                toast.info("Đã khóa sổ an toàn.");
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-zinc-400 hover:text-white text-xs font-medium transition active:scale-95 shadow-sm"
              title="Khóa sổ ngay"
            >
              <Lock size={12} className="text-zinc-400" />
              <span className="text-[11px]">Khóa</span>
            </button>

            {/* Nút làm mới phiên bản web tức thì (xóa cache / tải bản mới nhất) */}
            <button
              type="button"
              onClick={async () => {
                toast.info("Đang kiểm tra & cập nhật bản mới nhất...");
                if ("serviceWorker" in navigator) {
                  try {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    for (const reg of regs) {
                      await reg.update();
                    }
                  } catch {
                    // ignore
                  }
                }
                window.location.reload();
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-zinc-400 hover:text-white text-xs font-medium transition active:scale-95 shadow-sm"
              title="Tải lại để nhận cập nhật mới nhất"
            >
              <RefreshCw size={12} className="text-zinc-400" />
              <span className="text-[11px]">Tải lại</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-2xl mx-auto pb-32">
        <Outlet />
      </main>

      {/* Bottom Navigation Bar with Center Quick Add Button */}
      <nav className="fixed bottom-0 inset-x-0 w-full bg-black/85 backdrop-blur-2xl border-t border-white/[0.08] z-40 pb-safe">
        <div className="max-w-2xl mx-auto flex items-center justify-around h-16 px-1 sm:px-3">
          {/* 2 tabs bên trái */}
          {leftNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => {
                  if (item.path === "/snaps") {
                    window.dispatchEvent(new CustomEvent("open-camera-modal"));
                  }
                }}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-1 transition-all duration-150 rounded-2xl active:scale-95",
                  isActive ? "text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <div className={cn(
                  "p-1 rounded-xl transition-colors",
                  isActive ? "bg-white/10 text-white" : "text-zinc-500"
                )}>
                  <span className="material-symbols-outlined text-[20px] block leading-none">
                    {item.icon}
                  </span>
                </div>
                <span className="text-[10px] tracking-tight leading-none mt-0.5">{item.name}</span>
              </Link>
            );
          })}

          {/* Phím Nổi Toàn Cục Trung Tâm (Universal Quick Add Button) */}
          <div className="flex-shrink-0 px-1">
            <button
              type="button"
              onClick={() => setIsQuickLogOpen(true)}
              className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-[0_0_24px_rgba(255,255,255,0.35)] active:scale-90 transition-transform duration-150 hover:bg-zinc-200"
              title="Ghi sổ nhanh"
            >
              <Plus size={24} strokeWidth={2.5} />
            </button>
          </div>

          {/* 2 tabs bên phải */}
          {rightNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-1 transition-all duration-150 rounded-2xl active:scale-95",
                  isActive ? "text-white font-bold" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <div className={cn(
                  "p-1 rounded-xl transition-colors",
                  isActive ? "bg-white/10 text-white" : "text-zinc-500"
                )}>
                  <span className="material-symbols-outlined text-[20px] block leading-none">
                    {item.icon}
                  </span>
                </div>
                <span className="text-[10px] tracking-tight leading-none mt-0.5">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Universal Quick Log Drawer */}
      <QuickLogDrawer
        isOpen={isQuickLogOpen}
        onClose={() => setIsQuickLogOpen(false)}
      />
    </div>
  );
}
