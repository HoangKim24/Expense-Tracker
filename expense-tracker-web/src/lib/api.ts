import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const TransactionType = {
  Expense: 1,
  Income: 2,
} as const;

export type TransactionTypeValue = typeof TransactionType[keyof typeof TransactionType];

export const TransactionSource = {
  Manual: 1,
  Telegram: 2,
  SnapReceipt: 3,
  MoMo: 4,
  Cake: 5,
} as const;

export type TransactionSourceValue = typeof TransactionSource[keyof typeof TransactionSource];

export type SyncResultDto = {
  success: boolean;
  syncedCount: number;
  skippedCount: number;
  syncedAt: string;
  message: string;
  newTransactions: TransactionDto[];
  errors: string[];
};

export type TransactionDto = {
  id: string;
  amount: number;
  transactionDate: string;
  description: string;
  merchant: string;
  type: TransactionTypeValue;
  source: TransactionSourceValue;
  messageId?: string | null;
  receiptImagePath?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryColor?: string | null;
  categoryIcon?: string | null;
};

export type CategoryDto = {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  type: TransactionTypeValue;
  budget?: number | null;
};

export type DashboardMetricsDto = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  categoryBreakdown: Array<{
    categoryName: string;
    totalAmount: number;
    percentage: number;
  }>;
};

export type CreateTransactionRequest = {
  amount: number;
  transactionDate: string;
  description: string;
  type: TransactionTypeValue;
  source: TransactionSourceValue;
  categoryId?: string | null;
  receiptImagePath?: string | null;
};

export function getReceiptImageUrl(imagePath?: string | null): string | null {
  if (!imagePath) return null;
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://") || imagePath.startsWith("data:")) {
    return imagePath;
  }
  const cleanPath = imagePath.startsWith("/") ? imagePath : `/${imagePath}`;
  return `${API_BASE_URL}${cleanPath}`;
}

export async function getTransactions() {
  const response = await api.get<TransactionDto[]>("/api/transactions");
  return response.data;
}

export async function getCategories() {
  const response = await api.get<CategoryDto[]>("/api/categories");
  return response.data;
}

export async function getDashboardMetrics(month: number, year: number) {
  const response = await api.get<DashboardMetricsDto>("/api/transactions/dashboard", {
    params: { month, year },
  });
  return response.data;
}

export async function createTransaction(payload: CreateTransactionRequest) {
  const response = await api.post<{ id: string }>("/api/transactions", payload);
  return response.data;
}

export async function deleteTransaction(id: string) {
  const response = await api.delete<{ success: boolean }>(`/api/transactions/${id}`);
  return response.data;
}

export async function uploadReceipt(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post<{ url: string; path: string }>("/api/transactions/upload-receipt", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
}

export async function syncGmailTransactions() {
  const response = await api.post<SyncResultDto>("/api/sync/gmail");
  return response.data;
}

export async function getLastSyncTime() {
  const response = await api.get<{ lastSyncTime?: string | null }>("/api/sync/gmail/last-sync");
  return response.data;
}

