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
      <div className="w-7 h-7 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      <span className="text-xs font-medium text-zinc-400 tracking-wide">
        Đang tải...
      </span>
    </div>
  );
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
