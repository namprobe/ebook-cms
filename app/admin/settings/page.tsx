import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Cài đặt hệ thống</h2>
        <p className="text-muted-foreground">Quản lý các cài đặt và cấu hình của hệ thống</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin hệ thống</CardTitle>
            <CardDescription>Cấu hình thông tin cơ bản của ứng dụng</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="app-name">Tên ứng dụng</Label>
              <Input id="app-name" defaultValue="Booklify Admin" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="app-description">Mô tả</Label>
              <Textarea id="app-description" defaultValue="Hệ thống quản lý thư viện điện tử" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-email">Email liên hệ</Label>
              <Input id="contact-email" type="email" defaultValue="admin@booklify.com" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cài đặt Premium</CardTitle>
            <CardDescription>Cấu hình gói Premium và thanh toán</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="monthly-price">Giá gói tháng (VNĐ)</Label>
              <Input id="monthly-price" type="number" defaultValue="99000" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="yearly-price">Giá gói năm (VNĐ)</Label>
              <Input id="yearly-price" type="number" defaultValue="990000" />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="auto-approval" defaultChecked />
              <Label htmlFor="auto-approval">Tự động gia hạn Premium</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cài đặt phê duyệt</CardTitle>
            <CardDescription>Quy trình phê duyệt sách và nội dung</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch id="auto-approve" />
              <Label htmlFor="auto-approve">Tự động phê duyệt sách mới</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="manual-review" defaultChecked />
              <Label htmlFor="manual-review">Yêu cầu kiểm duyệt thủ công</Label>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="max-file-size">Kích thước file tối đa (MB)</Label>
              <Input id="max-file-size" type="number" defaultValue="50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Thông báo</CardTitle>
            <CardDescription>Cấu hình hệ thống thông báo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch id="email-notifications" defaultChecked />
              <Label htmlFor="email-notifications">Gửi thông báo qua email</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="push-notifications" defaultChecked />
              <Label htmlFor="push-notifications">Thông báo đẩy (Push notifications)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="admin-alerts" defaultChecked />
              <Label htmlFor="admin-alerts">Cảnh báo cho Admin</Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bảo mật</CardTitle>
            <CardDescription>Cài đặt bảo mật và xác thực</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch id="two-factor" />
              <Label htmlFor="two-factor">Xác thực hai yếu tố (2FA)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="force-ssl" defaultChecked />
              <Label htmlFor="force-ssl">Bắt buộc HTTPS</Label>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="session-timeout">Thời gian hết phiên (phút)</Label>
              <Input id="session-timeout" type="number" defaultValue="60" />
            </div>
          </CardContent>
        </Card>

        <Separator />

        <div className="flex justify-end space-x-2">
          <Button variant="outline">Hủy bỏ</Button>
          <Button>Lưu cài đặt</Button>
        </div>
      </div>
    </div>
  )
} 