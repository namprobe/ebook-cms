"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  Users,
  BookOpen,
  BarChart3,
  Settings,
  Crown,
  MessageSquare,
  CheckCircle,
  Star,
  Bell,
  Menu,
  LogOut,
  FolderPlus,
  UserCheck,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import AuthGuard from "@/components/auth/auth-guard"
import { useAppDispatch, useAppSelector } from "@/lib/hooks"
import { logout } from "@/lib/features/auth/authSlice"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { useSilentTokenManager } from "@/lib/hooks/useSilentTokenManager"

const sidebarItems = [
  { id: "dashboard", label: "Tổng quan hệ thống", icon: BarChart3, roles: ["Admin"], path: "/admin" },
  { id: "users", label: "Quản lý người dùng", icon: Users, roles: ["Admin"], path: "/admin/users" },
  { id: "staff", label: "Quản lý nhân viên", icon: UserCheck, roles: ["Admin"], path: "/admin/staff" },
  { id: "books", label: "Quản lý sách", icon: BookOpen, roles: ["Admin", "Staff"], path: "/admin/books" },
  { id: "categories", label: "Danh mục sách", icon: FolderPlus, roles: ["Admin"], path: "/admin/categories" },
  { id: "premium", label: "Gói Premium & chính sách", icon: Crown, roles: ["Admin"], path: "/admin/premium" },
  { id: "approval", label: "Phê duyệt sách mới", icon: CheckCircle, roles: ["Admin"], path: "/admin/approval" },
  { id: "support", label: "Hỗ trợ khách hàng", icon: MessageSquare, roles: ["Admin", "Staff"], path: "/admin/support" },
  { id: "analytics", label: "Thống kê & Phân tích", icon: BarChart3, roles: ["Admin"], path: "/admin/analytics" },
  { id: "settings", label: "Cài đặt hệ thống", icon: Settings, roles: ["Admin"], path: "/admin/settings" },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state) => state.auth)
  const router = useRouter()
  const pathname = usePathname()

  // Initialize Silent Token Manager
  useSilentTokenManager()

  const handleLogout = () => {
    dispatch(logout())
    router.push("/login")
  }

  const hasAccess = (requiredRoles: string[]) => {
    if (!user) return false
    return requiredRoles.some((role) => user.app_role.includes(role))
  }

  const getFilteredSidebarItems = () => {
    return sidebarItems.filter((item) => hasAccess(item.roles))
  }

  const isActivePath = (path: string) => {
    if (!pathname) return false
    
    if (path === "/admin") {
      return pathname === "/admin"
    }
    return pathname.startsWith(path)
  }

  const Sidebar = ({ className, collapsed = false }: { className?: string; collapsed?: boolean }) => (
    <div className={className}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          {!collapsed && <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">Admin Panel</h2>}
          <div className="space-y-1">
            {getFilteredSidebarItems().map((item) => (
              <Button
                key={item.id}
                variant={isActivePath(item.path) ? "secondary" : "ghost"}
                className={`w-full ${collapsed ? "justify-center px-2" : "justify-start"}`}
                onClick={() => {
                  router.push(item.path)
                  setIsMobileMenuOpen(false)
                }}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className={`h-4 w-4 ${collapsed ? "" : "mr-2"}`} />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">{item.label}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {item.roles.join(", ")}
                    </Badge>
                  </>
                )}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <AuthGuard requiredRoles={["Admin", "Staff"]}>
      <div className="flex h-screen bg-background">
        {/* Desktop Sidebar */}
        <div
          className={`hidden md:flex md:flex-col transition-all duration-300 ${isSidebarCollapsed ? "md:w-16" : "md:w-80"}`}
        >
          <Sidebar className="flex-1 border-r" collapsed={isSidebarCollapsed} />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-80">
            <div className="sr-only">
              <SheetTitle>Navigation Menu</SheetTitle>
              <SheetDescription>Main navigation menu for the admin panel</SheetDescription>
            </div>
            <Sidebar />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-14 items-center px-4 lg:px-6">
              {/* Mobile menu button */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileMenuOpen(true)}>
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                  </Button>
                </SheetTrigger>
              </Sheet>

              {/* Desktop sidebar toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle sidebar</span>
              </Button>

              <div className="flex-1" />

              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon">
                  <Bell className="h-4 w-4" />
                </Button>
                <ThemeToggle />
                <Separator orientation="vertical" className="h-6" />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="/placeholder-user.jpg" alt={user?.username} />
                        <AvatarFallback>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{user?.username}</p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground">{user?.email}</p>
                        <div className="flex gap-1">
                          {user?.app_role.map((role) => (
                            <Badge key={role} variant="secondary" className="text-xs">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
                      <Settings className="mr-2 h-4 w-4" />
                      Cài đặt
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Đăng xuất
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </AuthGuard>
  )
} 