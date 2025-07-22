import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BarChart3, TrendingUp, Download, Eye } from "lucide-react"

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Thống kê & Phân tích</h2>
        <p className="text-muted-foreground">Theo dõi hiệu suất và xu hướng của hệ thống</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lượt tải sách</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45,231</div>
            <p className="text-xs text-muted-foreground">+20.1% từ tháng trước</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lượt xem</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2,350</div>
            <p className="text-xs text-muted-foreground">+180.1% từ tháng trước</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₫12,234,000</div>
            <p className="text-xs text-muted-foreground">+19% từ tháng trước</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tăng trưởng</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+573</div>
            <p className="text-xs text-muted-foreground">+201 từ tháng trước</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top sách được tải nhiều nhất</CardTitle>
            <CardDescription>Thống kê 7 ngày qua</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Lập trình React</p>
                  <p className="text-sm text-muted-foreground">Công nghệ</p>
                </div>
                <Badge variant="secondary">1,234 lượt</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Kinh tế học cơ bản</p>
                  <p className="text-sm text-muted-foreground">Kinh tế</p>
                </div>
                <Badge variant="secondary">987 lượt</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Văn học Việt Nam</p>
                  <p className="text-sm text-muted-foreground">Văn học</p>
                </div>
                <Badge variant="secondary">654 lượt</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phân tích người dùng</CardTitle>
            <CardDescription>Thống kê hoạt động người dùng</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Người dùng mới</span>
                <span className="font-medium">+1,234 (↑12%)</span>
              </div>
              <div className="flex justify-between">
                <span>Người dùng hoạt động</span>
                <span className="font-medium">8,576 (↑8%)</span>
              </div>
              <div className="flex justify-between">
                <span>Tỷ lệ giữ chân</span>
                <span className="font-medium">67.3% (↑2.1%)</span>
              </div>
              <div className="flex justify-between">
                <span>Thời gian trung bình</span>
                <span className="font-medium">23m 45s (↑5%)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 