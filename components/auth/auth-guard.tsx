"use client"

import type React from "react"
import { useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { checkAuthStatus, logout, isTokenExpired } from "@/lib/features/auth/authSlice"
import { silentTokenManager } from "@/lib/services/silentTokenManager"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRoles?: string[]
}

export default function AuthGuard({ children, requiredRoles = [] }: AuthGuardProps) {
  const dispatch = useAppDispatch()
  const { isAuthenticated, user, isLoading, token_expires_at } = useAppSelector((state) => state.auth)
  const router = useRouter()
  const hasCheckedAuth = useRef(false)

  useEffect(() => {
    // Always check auth status on mount to restore from localStorage
    if (!hasCheckedAuth.current) {
      hasCheckedAuth.current = true
      dispatch(checkAuthStatus())
    }
  }, [dispatch])

  // Redirect logic với race condition protection
  useEffect(() => {
    // Only redirect after we've completed the initial auth check
    if (hasCheckedAuth.current && !isLoading && !isAuthenticated) {
      // Add small delay to ensure React re-renders after Redux state update
      const redirectTimer = setTimeout(() => {
        // Double-check auth state với localStorage để tránh race conditions
        const currentState = JSON.parse(localStorage.getItem("user") || "null")
        const hasToken = !!localStorage.getItem("access_token")
        
        if (!currentState || !hasToken) {
          router.push("/login")
        }
      }, 50) // Small delay for React re-render

      return () => clearTimeout(redirectTimer)
    }
  }, [isAuthenticated, isLoading, router])

  // Listen cho token refresh events từ Silent Token Manager
  useEffect(() => {
    const handleTokenRefreshed = (event: CustomEvent) => {
      // Token đã được refresh thành công - không cần làm gì
      // localStorage đã được update bởi Silent Token Manager
      console.log("🔄 Token refreshed silently by Silent Token Manager")
    }

    const handleAuthLogout = () => {
      // Silent Token Manager yêu cầu logout
      console.log("🔄 Silent Token Manager requested logout")
      silentTokenManager.cleanup()
      dispatch(logout())
      router.push("/login")
    }

    window.addEventListener("tokenRefreshed", handleTokenRefreshed as EventListener)
    window.addEventListener("authLogout", handleAuthLogout)

    return () => {
      window.removeEventListener("tokenRefreshed", handleTokenRefreshed as EventListener)
      window.removeEventListener("authLogout", handleAuthLogout)
    }
  }, [dispatch, router])

  // Chỉ check token expiry để logout - không còn auto refresh
  useEffect(() => {
    if (!isAuthenticated || !token_expires_at) return

    const checkTokenExpiry = () => {
      // Chỉ check nếu token đã thực sự hết hạn
      if (isTokenExpired(token_expires_at)) {
        console.warn("🛡️ Token expired in AuthGuard, auto-logout...")
        silentTokenManager.cleanup()
        dispatch(logout())
        router.push("/login")
      }
    }

    // Check ngay lập tức
    checkTokenExpiry()

    // Check mỗi 60 giây (giảm frequency vì Silent Token Manager đã handle refresh)
    const intervalId = setInterval(checkTokenExpiry, 60000)

    return () => clearInterval(intervalId)
  }, [isAuthenticated, token_expires_at, dispatch, router])

  // Role-based access control
  useEffect(() => {
    if (isAuthenticated && user && requiredRoles.length > 0) {
      const hasRequiredRole = requiredRoles.some((role) => user.app_role.includes(role))

      if (!hasRequiredRole) {
        router.push("/unauthorized")
      }
    }
  }, [isAuthenticated, user, requiredRoles, router])

  // Cleanup Silent Token Manager khi logout
  useEffect(() => {
    if (!isAuthenticated) {
      silentTokenManager.cleanup()
    }
  }, [isAuthenticated])

  // Only show loading for main auth operations
  if (isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Đang kiểm tra đăng nhập...</p>
        </div>
      </div>
    )
  }

  // If not authenticated and not loading, will redirect to login  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Đang chuyển hướng...</p>
        </div>
      </div>
    )
  }

  if (!user?.is_active) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Tài khoản bị khóa</h2>
          <p className="text-muted-foreground">Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Token refresh không còn hiển thị UI indicator vì hoàn toàn silent */}
      {children}
    </>
  )
}
