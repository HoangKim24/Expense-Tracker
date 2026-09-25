import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import MainLayout from "./components/MainLayout";
import Dashboard from "./pages/Dashboard";
import ReceiptSnaps from "./pages/ReceiptSnaps";
import Analytics from "./pages/Analytics";
import TransactionHistory from "./pages/TransactionHistory";
import PinLockGuard from "./components/PinLockGuard";

// Tự động cập nhật khi có phiên bản mới trên Vercel hoặc PWA Service Worker
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", () => {
    window.location.reload();
  });

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        navigator.serviceWorker.getRegistration().then((reg) => {
          reg?.update();
        }).catch(() => {});
      }
    });
  }
}

function App() {
  return (
    <>
      {/* Toast chuẩn hóa phong cách Dynamic Island tối giản hiện đại */}
      <Toaster 
        position="top-center" 
        theme="dark" 
        closeButton
        toastOptions={{
          className: "border border-white/10 bg-zinc-950/95 backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] rounded-full text-xs font-semibold text-white px-5 py-3",
          duration: 3000,
        }}
      />
      <PinLockGuard>
        <Router>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="snaps" element={<ReceiptSnaps />} />
              <Route path="history" element={<TransactionHistory />} />
              <Route path="analytics" element={<Analytics />} />
            </Route>
          </Routes>
        </Router>
      </PinLockGuard>
    </>
  );
}

export default App;
