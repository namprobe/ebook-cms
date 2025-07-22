"use client"

import { useAppSelector } from "@/lib/hooks"
import UserManagement from "@/components/admin/user-management"

export default function UsersPage() {
  const { user } = useAppSelector((state) => state.auth)
  const isAdmin = user?.app_role?.includes("Admin") || false

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Không có quyền truy cập</h3>
          <p className="text-muted-foreground">Bạn không có quyền truy cập chức năng này</p>
        </div>
      </div>
    )
  }

  return <UserManagement />
} 