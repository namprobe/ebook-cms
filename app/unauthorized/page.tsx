import Link from "next/link"
import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold">Không có quyền truy cập</CardTitle>
          <CardDescription>Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ quản trị viên.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href="/admin">Quay lại trang chủ</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
