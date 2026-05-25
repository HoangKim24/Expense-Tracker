import { Utensils, ShoppingCart, Coffee, Home, Car, HeartPulse, DollarSign } from "lucide-react";

export const categories = [
  { id: 1, name: "An uong", icon: Utensils, color: "bg-rose-100 text-rose-500 border-rose-200" },
  { id: 2, name: "Ca phe", icon: Coffee, color: "bg-amber-100 text-amber-600 border-amber-200" },
  { id: 3, name: "Mua sam", icon: ShoppingCart, color: "bg-purple-100 text-purple-500 border-purple-200" },
  { id: 4, name: "Nha cua", icon: Home, color: "bg-emerald-100 text-emerald-500 border-emerald-200" },
  { id: 5, name: "Di chuyen", icon: Car, color: "bg-blue-100 text-blue-500 border-blue-200" },
  { id: 6, name: "Suc khoe", icon: HeartPulse, color: "bg-pink-100 text-pink-500 border-pink-200" },
];

export const pieData = [
  { name: "An uong", value: 3500000, color: "#f43f5e" },
  { name: "Di chuyen", value: 800000, color: "#3b82f6" },
  { name: "Mua sam", value: 1200000, color: "#8b5cf6" },
  { name: "Nha cua", value: 500000, color: "#10b981" }
];

export const recentTransactions = [
  { id: 1, desc: "Com tam", amount: 45000, source: "Tien mat", icon: Utensils, bg: "bg-rose-100", col: "text-rose-500", type: "expense", date: "2023-10-25" },
  { id: 2, desc: "MoMo Food", amount: 32000, source: "Gmail - MoMo", icon: Car, bg: "bg-blue-100", col: "text-blue-500", type: "expense", date: "2023-10-24" },
  { id: 3, desc: "Shopee", amount: 150000, source: "Gmail - Techcombank", icon: ShoppingCart, bg: "bg-purple-100", col: "text-purple-500", type: "expense", date: "2023-10-24" },
  { id: 4, desc: "Ca phe", amount: 55000, source: "Tien mat", icon: Coffee, bg: "bg-amber-100", col: "text-amber-500", type: "expense", date: "2023-10-23" },
  { id: 5, desc: "Luong thang 10", amount: 25000000, source: "Tien mat", icon: DollarSign, bg: "bg-emerald-100", col: "text-emerald-500", type: "income", date: "2023-10-01" },
];

export const historyTransactions = [
  ...recentTransactions,
  { id: 6, desc: "Tien dien", amount: 500000, source: "Tien mat", icon: Home, bg: "bg-emerald-100", col: "text-emerald-500", type: "expense", date: "2023-10-15" },
  { id: 7, desc: "Kham benh", amount: 1200000, source: "Tien mat", icon: HeartPulse, bg: "bg-pink-100", col: "text-pink-500", type: "expense", date: "2023-10-10" },
  { id: 8, desc: "Com tam", amount: 45000, source: "Tien mat", icon: Utensils, bg: "bg-rose-100", col: "text-rose-500", type: "expense", date: "2023-10-05" },
  { id: 9, desc: "Timo Transfer", amount: 125000, source: "Gmail - Timo", icon: Car, bg: "bg-blue-100", col: "text-blue-500", type: "expense", date: "2023-10-02" },
];

export const emailSyncLogs = [
  { id: "msg1", subject: "MoMo: Thanh toan thanh cong", receivedAt: "2023-10-24 14:30", status: "Success", error: "" },
  { id: "msg2", subject: "Techcombank: Thong bao giao dich", receivedAt: "2023-10-24 10:15", status: "Success", error: "" },
  { id: "msg3", subject: "Timo: Thong bao giao dich", receivedAt: "2023-10-22 09:00", status: "Success", error: "" },
  { id: "msg4", subject: "Cake: Thong bao giao dich", receivedAt: "2023-10-20 12:00", status: "Failed", error: "Khong the boc tach so tien tu email Cake." },
];
