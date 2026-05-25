import { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import QuickAddBottomSheet from "./QuickAddBottomSheet";
import { cn } from "../lib/utils";

export default function MainLayout() {
  const location = useLocation();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const navItems = [
    { name: "Dashboard", path: "/", icon: "dashboard" },
    { name: "Transactions", path: "/history", icon: "receipt_long" },
    { name: "Analytics", path: "/analytics", icon: "analytics" },
    { name: "Connect", path: "/settings", icon: "sync" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-on-background relative">
      
      {/* TopAppBar */}
      <header className="sticky top-0 w-full z-40 bg-surface shadow-[0px_2px_8px_rgba(0,82,204,0.05)] pt-safe">
        <div className="flex justify-between items-center px-[24px] h-16 w-full max-w-[1200px] mx-auto">
          <div className="flex items-center gap-[8px]">
            <img 
              alt="User avatar" 
              className="w-10 h-10 rounded-full border-2 border-primary-container object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuC9trClS02Ca3JRP3ftZC5MlKL9TG7CkcHaYDJHKuQdlbycYwIPaZQw0hGNWI40YcOZfG1TKvIG43hhi9JvdSsmg5a87zGHG3bCOiNdisddeOCCTlQ2T9nMBl5A7a95qiWVBIT-7E2gnBkMH6cCczp8lid33jUvPfXJFikJrPxgE_KB5x1LCiLegKdtBtwEN_tVVL0p9DTJ4ZJLma7W55BPu5sZs4diuhj6YvzU_unmNIFJC750UIoy4JGM3kZGgMPeYQhkMa-VCEI"
            />
            <span className="text-[24px] font-bold text-primary">FinTrack</span>
          </div>
          <button className="material-symbols-outlined text-primary p-2 hover:bg-surface-container-low transition-colors rounded-full">
            notifications
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto pb-32">
        <Outlet context={{ setIsQuickAddOpen }} />
      </main>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center py-2 px-[16px] bg-surface border-t border-outline-variant z-30 shadow-[0px_-2px_8px_rgba(0,82,204,0.05)] pb-safe">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center px-4 py-1 active:scale-90 duration-150 transition-all rounded-xl",
                isActive 
                  ? "bg-secondary-container text-on-secondary-container" 
                  : "text-outline hover:text-primary"
              )}
            >
              <span className="material-symbols-outlined text-[24px] leading-none mb-1">
                {item.icon}
              </span>
              <span className="text-[12px] font-semibold leading-none">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Quick Add Bottom Sheet */}
      <QuickAddBottomSheet 
        isOpen={isQuickAddOpen} 
        onClose={() => setIsQuickAddOpen(false)} 
      />
    </div>
  );
}
