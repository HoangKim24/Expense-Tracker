import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

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
  Gmail: 2,
} as const;

export type TransactionSourceValue = typeof TransactionSource[keyof typeof TransactionSource];

export type TransactionDto = {
  id: string;
  amount: number;
  transactionDate: string;
  description: string;
  merchant: string;
  type: TransactionTypeValue;
  source: TransactionSourceValue;
  messageId?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryColor?: string | null;
  categoryIcon?: string | null;
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

export type EmailSyncLogDto = {
  messageId: string;
  receivedDate: string;
  subject: string;
  merchantName: string;
  status: number | string;
  errorMessage?: string | null;
  retryCount: number;
};

export type CreateTransactionRequest = {
  amount: number;
  transactionDate: string;
  description: string;
  type: TransactionTypeValue;
  source: TransactionSourceValue;
  categoryId?: string | null;
};

export async function getTransactions() {
  const response = await api.get<TransactionDto[]>("/api/transactions");
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

export async function getSyncLogs() {
  const response = await api.get<EmailSyncLogDto[]>("/api/sync/logs");
  return response.data;
}
