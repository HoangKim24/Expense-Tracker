import { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";

export default function MainLayout() {
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : true; // Mặc định Dark Mode chuẩn
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
    { name: "Hóa đơn", path: "/snaps", icon: "photo_camera" },
    { name: "Lịch sử", path: "/history", icon: "receipt_long" },
    { name: "Phân tích", path: "/analytics", icon: "insights" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600 selection:text-white transition-colors duration-200">
      {/* TopAppBar Tối Giản */}
      <header className="sticky top-0 w-full z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-900 pt-safe">
        <div className="flex justify-between items-center px-4 sm:px-6 h-14 w-full max-w-2xl mx-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-md shadow-blue-600/30 text-sm">
              T
            </div>
            <div>
              <span className="text-base font-black tracking-tight text-white block leading-tight">T-Expense</span>
              <span className="text-[10px] font-semibold text-slate-400 block leading-tight">Quản lý Chi tiêu</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition flex items-center justify-center"
              title="Đổi giao diện Sáng / Tối"
            >
              <span className="material-symbols-outlined text-[20px]">
                {isDarkMode ? "light_mode" : "dark_mode"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-2xl mx-auto pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation Bar - 4 Tab Tối Giản & Chuẩn Mực */}
      <nav className="fixed bottom-0 inset-x-0 w-full bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/80 z-40 pb-safe">
        <div className="max-w-2xl mx-auto flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-1.5 transition-all duration-150 rounded-2xl active:scale-95",
                  isActive
                    ? "text-blue-500 font-bold"
                    : "text-slate-400 hover:text-slate-200"
                )}
              >
                <div className={cn(
                  "p-1 rounded-xl transition-colors",
                  isActive ? "bg-blue-600/15" : ""
                )}>
                  <span className="material-symbols-outlined text-[22px] block leading-none">
                    {item.icon}
                  </span>
                </div>
                <span className="text-[10.5px] tracking-tight leading-none mt-1">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
