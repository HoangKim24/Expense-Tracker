import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import MainLayout from "./components/MainLayout";
import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import TransactionHistory from "./pages/TransactionHistory";
import SyncSettings from "./pages/SyncSettings";

function App() {
  return (
    <>
      <Toaster position="top-center" richColors theme="light" />
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="history" element={<TransactionHistory />} />
            <Route path="settings" element={<SyncSettings />} />
          </Route>
        </Routes>
      </Router>
    </>
  );
}

export default App;
