"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Eye, EyeOff, Loader2, BookOpen, Shield } from "lucide-react"
import { ThemeToggle } from "@/components/ui/theme-toggle"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { loginUser, clearError } from "@/lib/features/auth/authSlice"

export default function LoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  const dispatch = useAppDispatch()
  const { isLoading, error, isAuthenticated } = useAppSelector((state) => state.auth)
  const router = useRouter()
  const pathname = usePathname()

  // Redirect when at login page and authenticated
  useEffect(() => {
    if (isAuthenticated && pathname === "/login") {
      router.replace("/admin")
    }
  }, [isAuthenticated, router, pathname])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username || !password || isLoading) {
      return
    }

    try {
      const result = await dispatch(loginUser({ email: username, password }))

      if (loginUser.fulfilled.match(result)) {
        // Redirect will be handled by auth state change
      }
    } catch (error) {
      console.error("Login error:", error)
    }
  }

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value)
    if (error) {
      dispatch(clearError())
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    if (error) {
      dispatch(clearError())
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 flex items-center justify-center py-6 px-4">
      <div className="max-w-md w-full space-y-6">        
        {/* Logo and Header */}
        <div className="text-center">
          <div className="mx-auto h-14 w-14 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center mb-3">
            <BookOpen className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Booklify Admin</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">Hệ thống quản trị thư viện điện tử</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">Đăng nhập Admin</CardTitle>
              </div>
              <ThemeToggle />
            </div>
            <CardDescription className="text-center text-gray-600 dark:text-gray-300 text-sm">
              Nhập thông tin đăng nhập để truy cập hệ thống quản trị
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                  <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Tài khoản (Username)
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Nhập email hoặc tên đăng nhập"
                  value={username}
                  onChange={handleUsernameChange}
                  required
                  disabled={isLoading}
                  className="h-10 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Mật khẩu
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={handlePasswordChange}
                    required
                    disabled={isLoading}
                    className="h-10 pr-10 border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-10 px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-medium transition-colors"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang đăng nhập...
                  </>
                ) : (
                  "Đăng nhập"
                )}
              </Button>
            </form>

            {/* Footer */}
            <div className="text-center pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">© 2024 Booklify. Hệ thống quản trị an toàn và bảo mật.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
