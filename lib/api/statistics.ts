import { getApiUrl, authFetch } from "@/lib/config";
import type { Book } from "./books";
import type { User } from "./users";

export interface AdminStatistics {
  total_users: number;
  total_books: number;
  total_premium_users: number;
  total_book_reads: number;
  pending_books: Book[];
  recent_books: Book[];
  recent_users: User[];
}

export async function getAdminStatistics(): Promise<AdminStatistics> {
  const response = await authFetch(getApiUrl("/statistics"));
  const result = await response.json();
  if (!response.ok || result.result !== "success") {
    throw new Error(result.message || "Lấy thống kê thất bại");
  }
  return result.data;
} 