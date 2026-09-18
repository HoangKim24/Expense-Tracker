import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { Camera } from "lucide-react";
import QuickAddBottomSheet from "./QuickAddBottomSheet";
import LocketCameraModal from "./LocketCameraModal";
import { cn } from "../lib/utils";

export default function MainLayout() {
  const location = useLocation();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return (
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  const navItems = [
    { name: "Tổng quan", path: "/", icon: "dashboard" },
    { name: "Lịch sử", path: "/history", icon: "receipt_long" },
  ];

  const rightNavItems = [
    { name: "Phân tích", path: "/analytics", icon: "analytics" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-background relative transition-colors duration-300">
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-40 bg-surface/80 backdrop-blur-md shadow-[0px_2px_8px_rgba(0,82,204,0.05)] pt-safe">
        <div className="flex justify-between items-center px-4 sm:px-6 h-16 w-full max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black shadow-md shadow-blue-500/20">
              T
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-primary block leading-none">T-Expense</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Snap & Log</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="material-symbols-outlined text-primary p-2 hover:bg-surface-container-low transition-colors rounded-full text-[20px]"
            >
              {isDarkMode ? "light_mode" : "dark_mode"}
            </button>
            <button
              onClick={() => setIsCameraOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-600/10 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-600/20 transition"
            >
              <Camera size={15} /> Snap
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto pb-32">
        <Outlet context={{ setIsQuickAddOpen, setIsCameraOpen }} />
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center py-2 px-2 sm:px-6 bg-surface/95 backdrop-blur-lg border-t border-outline-variant z-30 shadow-[0px_-4px_16px_rgba(0,0,0,0.06)] pb-safe">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center px-3 py-1 active:scale-90 duration-150 transition-all rounded-xl",
                isActive
                  ? "bg-secondary-container text-on-secondary-container font-bold"
                  : "text-outline hover:text-primary"
              )}
            >
              <span className="material-symbols-outlined text-[22px] leading-none mb-0.5">
                {item.icon}
              </span>
              <span className="text-[11px] font-semibold leading-none">{item.name}</span>
            </Link>
          );
        })}

        {/* Center Locket Snap Button */}
        <button
          type="button"
          onClick={() => setIsCameraOpen(true)}
          className="flex flex-col items-center justify-center -mt-7 active:scale-90 duration-150 transition-all group"
        >
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-rose-500 p-[3px] shadow-xl shadow-indigo-500/30 flex items-center justify-center group-hover:shadow-indigo-500/50">
            <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-white transition-colors group-hover:bg-slate-900">
              <Camera size={24} className="text-white" />
            </div>
          </div>
          <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 mt-0.5">Snap</span>
        </button>

        {rightNavItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center px-3 py-1 active:scale-90 duration-150 transition-all rounded-xl",
                isActive
                  ? "bg-secondary-container text-on-secondary-container font-bold"
                  : "text-outline hover:text-primary"
              )}
            >
              <span className="material-symbols-outlined text-[22px] leading-none mb-0.5">
                {item.icon}
              </span>
              <span className="text-[11px] font-semibold leading-none">{item.name}</span>
            </Link>
          );
        })}

        {/* Quick Add Button */}
        <button
          type="button"
          onClick={() => setIsQuickAddOpen(true)}
          className="flex flex-col items-center justify-center px-3 py-1 active:scale-90 duration-150 transition-all rounded-xl text-outline hover:text-primary"
        >
          <span className="material-symbols-outlined text-[22px] leading-none mb-0.5">
            add_circle
          </span>
          <span className="text-[11px] font-semibold leading-none">Thêm</span>
        </button>
      </nav>

      {/* Quick Add Bottom Sheet */}
      <QuickAddBottomSheet
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onOpenSnapCamera={() => {
          setIsQuickAddOpen(false);
          setIsCameraOpen(true);
        }}
      />

      {/* Locket Camera Modal */}
      <LocketCameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onSuccess={() => {
          // If on home or history, triggers re-fetch if needed
          window.dispatchEvent(new CustomEvent("transaction-updated"));
        }}
      />
    </div>
  );
}
