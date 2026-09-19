import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import MainLayout from "./components/MainLayout";

// Tải động (Lazy-loading) giúp giảm dung lượng tải ban đầu từ 550KB xuống còn ~80KB
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ReceiptSnaps = lazy(() => import("./pages/ReceiptSnaps"));
const Analytics = lazy(() => import("./pages/Analytics"));
const TransactionHistory = lazy(() => import("./pages/TransactionHistory"));

// Hiệu ứng tải trang mượt mà
function PageLoadingFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-amber-400/30 border-t-amber-400 animate-spin" />
      <span className="text-xs font-semibold text-slate-400 animate-pulse tracking-wide">
        Đang tải...
      </span>
    </div>
  );
}

function App() {
  return (
    <>
      {/* Toast chuẩn hóa phong cách Dynamic Island sang trọng, kính mờ */}
      <Toaster 
        position="top-center" 
        theme="dark" 
        richColors
        closeButton
        toastOptions={{
          className: "border border-white/10 bg-slate-900/95 backdrop-blur-2xl shadow-2xl rounded-2xl text-xs sm:text-sm font-medium text-white px-4 py-3.5",
          duration: 3200,
        }}
      />
      <Router>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="snaps" element={<ReceiptSnaps />} />
              <Route path="history" element={<TransactionHistory />} />
              <Route path="analytics" element={<Analytics />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </>
  );
}

export default App;
