import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import MainLayout from "./components/MainLayout";
import Dashboard from "./pages/Dashboard";
import ReceiptSnaps from "./pages/ReceiptSnaps";
import Analytics from "./pages/Analytics";
import TransactionHistory from "./pages/TransactionHistory";

function App() {
  return (
    <>
      <Toaster position="top-center" richColors theme="dark" />
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
    </>
  );
}

export default App;
