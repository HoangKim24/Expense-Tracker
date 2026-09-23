import { Outlet, Link, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";

export default function MainLayout() {
  const location = useLocation();


  const navItems = [
    { name: "Tổng quan", path: "/", icon: "dashboard" },
    { name: "Hóa đơn", path: "/snaps", icon: "photo_camera" },
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
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-2xl mx-auto pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation Bar - Minimalist Monochrome */}
      <nav className="fixed bottom-0 inset-x-0 w-full bg-black/85 backdrop-blur-2xl border-t border-white/[0.08] z-40 pb-safe">
        <div className="max-w-2xl mx-auto flex justify-around items-center h-16 px-2">
          {navItems.map((item) => {
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
                  "flex-1 flex flex-col items-center justify-center py-1.5 transition-all duration-150 rounded-2xl active:scale-95",
                  isActive
                    ? "text-white font-bold"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <div className={cn(
                  "p-1 rounded-xl transition-colors",
                  isActive ? "bg-white/10 text-white" : "text-zinc-500"
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
