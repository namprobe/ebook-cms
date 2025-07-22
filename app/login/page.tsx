"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAppSelector, useAppDispatch } from "@/lib/hooks"
import { checkAuthStatus } from "@/lib/features/auth/authSlice"
import LoginForm from "@/components/auth/login-form"

export default function LoginPage() {
  const router = useRouter()
  const pathname = usePathname()
  const dispatch = useAppDispatch()
  const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth)

  // Chỉ chạy logic khi thực sự ở login path
  const isLoginPath = pathname === "/login"

  useEffect(() => {
    // Chỉ check auth status khi ở login path
    if (isLoginPath) {
    dispatch(checkAuthStatus())
    }
  }, [dispatch, isLoginPath])

  useEffect(() => {
    // Only redirect when at login path and authenticated
    if (isLoginPath && !isLoading && isAuthenticated) {
      // Check for return path
      const returnPath = localStorage.getItem("returnPath")
      const redirectTo = returnPath && returnPath !== "/login" ? returnPath : "/admin"
      
      // Clear return path after use
      localStorage.removeItem("returnPath")
      
      router.replace(redirectTo)
      return
    }
  }, [isAuthenticated, isLoading, router, isLoginPath])

  // Không render gì nếu không phải login path
  if (!isLoginPath) {
    return null
  }

  // Nếu đang loading hoặc đã authenticated thì hiển thị loading
  if (isLoading || isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Booklify Admin</h1>
          <p className="text-muted-foreground">
            {isAuthenticated ? "Đang chuyển hướng đến trang quản trị..." : "Đang kiểm tra đăng nhập..."}
          </p>
        </div>
      </div>
    )
  }

  return <LoginForm />
}
