'use client'

import { Users, BookOpen, Crown, BookOpenCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useEffect, useState, useRef } from "react"
import { getAdminStatistics, AdminStatistics } from "@/lib/api/statistics"

const mockBooks = [
  {
    id: 1,
    title: "Lập trình React",
    author: "Tác giả A",
    status: "Chờ duyệt",
  },
  {
    id: 2,
    title: "Kinh tế học cơ bản",
    author: "Tác giả B",
    status: "Chờ duyệt",
  },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStatistics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    getAdminStatistics()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Gộp recent_users và recent_books, sort theo created_at giảm dần, lấy tối đa 4 hoạt động mới nhất
  const recentActivities = stats
    ? [
        ...(stats.recent_users?.map(u => ({
          type: "user" as const,
          id: u.id,
          name: u.full_name,
          created_at: u.created_at,
          first_name: u.first_name,
          last_name: u.last_name,
        })) || []),
        ...(stats.recent_books?.map(b => ({
          type: "book" as const,
          id: b.id,
          name: b.title,
          created_at: b.created_at,
        })) || [])
      ]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Tổng quan hệ thống</h2>
        <p className="text-muted-foreground">Thống kê tổng quan về hoạt động của hệ thống</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng người dùng</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats?.total_users ?? "-"}</div>
            {/* <p className="text-xs text-muted-foreground">+20.1% từ tháng trước</p> */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng sách</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats?.total_books ?? "-"}</div>
            {/* <p className="text-xs text-muted-foreground">+15.3% từ tháng trước</p> */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Người dùng Premium</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats?.total_premium_users ?? "-"}</div>
            {/* <p className="text-xs text-muted-foreground">+8.2% từ tháng trước</p> */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng lượt đọc sách</CardTitle>
            <BookOpenCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats?.total_book_reads ?? "-"}</div>
            {/* <p className="text-xs text-muted-foreground">+12.5% từ tháng trước</p> */}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Sách chờ duyệt */}
        <Card>
          <CardHeader>
            <CardTitle>Sách chờ duyệt</CardTitle>
            <CardDescription>Danh sách sách cần được phê duyệt</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div>Đang tải...</div>
              ) : stats?.pending_books && stats.pending_books.length > 0 ? (
                stats.pending_books.map((book) => (
                  <div key={book.id} className="flex items-center space-x-4">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{book.title}</p>
                      <p className="text-sm text-muted-foreground">{book.author}</p>
                    </div>
                    <Badge variant="outline">Chờ duyệt</Badge>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-sm">Không có sách chờ duyệt</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Hoạt động gần đây */}
        <Card>
          <CardHeader>
            <CardTitle>Hoạt động gần đây</CardTitle>
            <CardDescription>Các hoạt động mới nhất trong hệ thống</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                <div>Đang tải...</div>
              ) : recentActivities.length > 0 ? (
                recentActivities.map((item) => (
                  <div key={item.type + item.id} className="flex items-center space-x-4">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {item.type === "user"
                          ? `${item.first_name?.[0] ?? "U"}${item.last_name?.[0] ?? "N"}`
                          : "BK"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">
                        {item.type === "user"
                          ? `Người dùng mới đăng ký: ${item.name}`
                          : `Sách mới được tải lên: ${item.name}`}
                      </p>
                      <p className="text-sm text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground text-sm">Không có hoạt động gần đây</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 