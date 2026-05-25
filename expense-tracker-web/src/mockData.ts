import { Utensils, ShoppingCart, Coffee, Home, Car, HeartPulse, DollarSign } from "lucide-react";

export const categories = [
  { id: 1, name: "Ăn uống", icon: Utensils, color: "bg-rose-100 text-rose-500 border-rose-200" },
  { id: 2, name: "Cà phê", icon: Coffee, color: "bg-amber-100 text-amber-600 border-amber-200" },
  { id: 3, name: "Mua sắm", icon: ShoppingCart, color: "bg-purple-100 text-purple-500 border-purple-200" },
  { id: 4, name: "Nhà cửa", icon: Home, color: "bg-emerald-100 text-emerald-500 border-emerald-200" },
  { id: 5, name: "Di chuyển", icon: Car, color: "bg-blue-100 text-blue-500 border-blue-200" },
  { id: 6, name: "Sức khỏe", icon: HeartPulse, color: "bg-pink-100 text-pink-500 border-pink-200" },
];

export const pieData = [
  { name: "Ăn uống", value: 3500000, color: "#f43f5e" },
  { name: "Di chuyển", value: 800000, color: "#3b82f6" },
  { name: "Mua sắm", value: 1200000, color: "#8b5cf6" },
  { name: "Nhà cửa", value: 500000, color: "#10b981" }
];

export const recentTransactions = [
  { id: 1, desc: "Cơm tấm", amount: 45000, source: "Tiền mặt", icon: Utensils, bg: "bg-rose-100", col: "text-rose-500", type: "expense", date: "2023-10-25" },
  { id: 2, desc: "Grab Bike", amount: 32000, source: "Gmail - Grab", icon: Car, bg: "bg-blue-100", col: "text-blue-500", type: "expense", date: "2023-10-24" },
  { id: 3, desc: "Shopee", amount: 150000, source: "Gmail - MB Bank", icon: ShoppingCart, bg: "bg-purple-100", col: "text-purple-500", type: "expense", date: "2023-10-24" },
  { id: 4, desc: "Cà phê", amount: 55000, source: "Tiền mặt", icon: Coffee, bg: "bg-amber-100", col: "text-amber-500", type: "expense", date: "2023-10-23" },
  { id: 5, desc: "Lương tháng 10", amount: 25000000, source: "Tiền mặt", icon: DollarSign, bg: "bg-emerald-100", col: "text-emerald-500", type: "income", date: "2023-10-01" },
];

export const historyTransactions = [
  ...recentTransactions,
  { id: 6, desc: "Tiền điện", amount: 500000, source: "Tiền mặt", icon: Home, bg: "bg-emerald-100", col: "text-emerald-500", type: "expense", date: "2023-10-15" },
  { id: 7, desc: "Khám bệnh", amount: 1200000, source: "Tiền mặt", icon: HeartPulse, bg: "bg-pink-100", col: "text-pink-500", type: "expense", date: "2023-10-10" },
  { id: 8, desc: "Cơm tấm", amount: 45000, source: "Tiền mặt", icon: Utensils, bg: "bg-rose-100", col: "text-rose-500", type: "expense", date: "2023-10-05" },
  { id: 9, desc: "Grab Car", amount: 125000, source: "Gmail - Grab", icon: Car, bg: "bg-blue-100", col: "text-blue-500", type: "expense", date: "2023-10-02" },
];

export const emailSyncLogs = [
  { id: "msg1", subject: "Cảm ơn bạn đã sử dụng dịch vụ Grab", receivedAt: "2023-10-24 14:30", status: "Success", error: "" },
  { id: "msg2", subject: "Biến động số dư tài khoản MB Bank", receivedAt: "2023-10-24 10:15", status: "Success", error: "" },
  { id: "msg3", subject: "Hóa đơn thanh toán Tiki", receivedAt: "2023-10-22 09:00", status: "Skipped", error: "Không tìm thấy Strategy phù hợp cho email này." },
  { id: "msg4", subject: "GrabFood: Đơn hàng của bạn", receivedAt: "2023-10-20 12:00", status: "Failed", error: "Không thể bóc tách số tiền từ email Grab." },
];
