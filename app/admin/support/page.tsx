import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"

export default function SupportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Hỗ trợ khách hàng</h2>
        <p className="text-muted-foreground">Quản lý các yêu cầu hỗ trợ từ người dùng</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Yêu cầu mới</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">23</div>
            <p className="text-sm text-muted-foreground">Cần xử lý ngay</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Đang xử lý</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">45</div>
            <p className="text-sm text-muted-foreground">Đang được xử lý</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Đã hoàn thành</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">156</div>
            <p className="text-sm text-muted-foreground">Hoàn thành tuần này</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách yêu cầu hỗ trợ</CardTitle>
          <CardDescription>Các yêu cầu hỗ trợ gần đây</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Người dùng</TableHead>
                <TableHead>Tiêu đề</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tạo</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Nguyễn Văn A</TableCell>
                <TableCell>Không thể tải sách</TableCell>
                <TableCell>
                  <Badge variant="outline">Kỹ thuật</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="destructive">Mới</Badge>
                </TableCell>
                <TableCell>2024-01-15</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    Xử lý
                  </Button>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Trần Thị B</TableCell>
                <TableCell>Lỗi thanh toán Premium</TableCell>
                <TableCell>
                  <Badge variant="outline">Thanh toán</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">Đang xử lý</Badge>
                </TableCell>
                <TableCell>2024-01-14</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm">
                    Xem
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
} 