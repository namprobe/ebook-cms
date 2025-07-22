"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { checkAuthStatus } from "@/lib/features/auth/authSlice"

export default function HomePage() {
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth)

  // CHỈ chạy logic này khi thực sự ở root path
  const isRootPath = pathname === "/"

  useEffect(() => {
    // Chỉ check auth status khi ở root path
    if (isRootPath) {
    dispatch(checkAuthStatus())
    }
  }, [dispatch, isRootPath])

  useEffect(() => {
    // Only redirect when at root path
    if (isRootPath && !isLoading) {
      if (isAuthenticated) {
        router.replace("/admin")
      } else {
        router.replace("/login")
      }
    }
  }, [isAuthenticated, isLoading, router, isRootPath])

  // Không render gì nếu không phải root path
  if (!isRootPath) {
    return null
  }

  // Hiển thị loading khi ở root path
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Booklify Admin</h1>
        <p className="text-muted-foreground">
          {isLoading ? "Đang kiểm tra đăng nhập..." : "Đang chuyển hướng..."}
        </p>
      </div>
    </div>
  )
}
