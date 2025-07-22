"use client"

import { useState, useEffect } from "react"
import { Search, MoreHorizontal, Edit, Trash2, Loader2, Star, Crown, BarChart3, Users, CheckCircle, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SimpleSelect } from "@/components/ui/simple-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/lib/hooks/use-toast"
import { useAppSelector } from "@/lib/hooks"
import { subscriptionsApi, type SubscriptionResponse, type SubscriptionFilterModel, type SubscriptionStatistics } from "@/lib/api/subscriptions"
import SubscriptionForm from "./subscription-form"
import { useConfirmModal } from "@/components/ui/confirm-modal"

const FILTER_OPTIONS = {
  status: [
    { value: "1", label: "Hoạt động" },
    { value: "0", label: "Tạm khóa" }
  ],
  popular: [
    { value: "true", label: "Phổ biến" },
    { value: "false", label: "Thường" }
  ],
  sort: [
    { value: "name-asc", label: "Tên A→Z" },
    { value: "name-desc", label: "Tên Z→A" },
    { value: "price-asc", label: "Giá thấp→cao" },
    { value: "price-desc", label: "Giá cao→thấp" },
    { value: "createdat-desc", label: "Mới nhất" },
    { value: "createdat-asc", label: "Cũ nhất" }
  ]
}

export default function SubscriptionManagement() {
  const [subscriptionList, setSubscriptionList] = useState<SubscriptionResponse[]>([])
  const [statistics, setStatistics] = useState<SubscriptionStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [popularFilter, setPopularFilter] = useState<string>("")
  const [sortBy, setSortBy] = useState<string>("createdat")
  const [isAscending, setIsAscending] = useState(false)
  const [pageNumber, setPageNumber] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [mounted, setMounted] = useState(false)

  const [selectedSubscriptionForEdit, setSelectedSubscriptionForEdit] = useState<SubscriptionResponse | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const { access_token, user } = useAppSelector((state) => state.auth)
  const { toast } = useToast()

  const isAdmin = user?.app_role?.includes("Admin") || false

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      setPageNumber(1)
    }
  }, [searchQuery, statusFilter, popularFilter, sortBy, isAscending, mounted])

  // Load statistics
  const fetchStatistics = async () => {
    if (!access_token) return
    
    setIsLoadingStats(true)
    try {
      const stats = await subscriptionsApi.getStatistics()
      setStatistics(stats)
    } catch (err: any) {
      console.error("Error fetching statistics:", err)
    } finally {
      setIsLoadingStats(false)
    }
  }

  const fetchSubscriptionList = async (params: SubscriptionFilterModel = {}) => {
    if (!access_token || !mounted) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await subscriptionsApi.getList(params)
      setSubscriptionList(response.data)
      setTotalPages(response.totalPages)
      setTotalCount(response.totalCount)
      setPageNumber(response.pageNumber)
    } catch (err: any) {
      console.error("Error fetching subscription list:", err)
      toast({
        title: "Lỗi!",
        description: err.message || "Có lỗi xảy ra khi tải danh sách subscription plans.",
        variant: "destructive",
      })
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!mounted) return

    const params: SubscriptionFilterModel = {
      pageNumber,
      pageSize: 12, // Increase for better grid display
      sortBy: sortBy as any,
      isAscending,
    }

    if (searchQuery.trim()) params.name = searchQuery.trim()
    if (statusFilter) params.status = parseInt(statusFilter) as 0 | 1
    if (popularFilter) params.isPopular = popularFilter === "true"

    const timeoutId = setTimeout(() => {
      fetchSubscriptionList(params)
    }, searchQuery.trim() ? 500 : 0)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, statusFilter, popularFilter, sortBy, isAscending, pageNumber, mounted])

  // Load statistics on mount
  useEffect(() => {
    if (mounted) {
      fetchStatistics()
    }
  }, [mounted, access_token])

  const handleResetFilters = () => {
    setSearchQuery("")
    setStatusFilter("")
    setPopularFilter("")
    setSortBy("createdat")
    setIsAscending(false)
    setPageNumber(1)
  }

  const handleEditSubscription = (subscription: SubscriptionResponse) => {
    setSelectedSubscriptionForEdit(subscription)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedSubscriptionForEdit(null)
  }

  const handleDeleteSubscription = (subscription: SubscriptionResponse) => {
    if (!isAdmin) {
      toast({
        title: "Không có quyền!",
        description: "Chỉ Admin mới có quyền xóa subscription plan.",
        variant: "destructive",
      })
      return
    }

    const confirmModal = useConfirmModal.getState()
    confirmModal.open({
      title: "Xác nhận xóa subscription plan",
      description: "Bạn có chắc chắn muốn xóa subscription plan này không?",
      confirmText: "Xóa",
      confirmVariant: "destructive",
      onConfirm: async () => {
        try {
          await subscriptionsApi.delete(subscription.id)
          toast({
            title: "Thành công!",
            description: `Đã xóa subscription plan "${subscription.name}" thành công.`,
            variant: "default",
          })
          
          const params: SubscriptionFilterModel = {
            pageNumber,
            pageSize: 12,
            sortBy: sortBy as any,
            isAscending,
          }
          if (searchQuery.trim()) params.name = searchQuery.trim()
          if (statusFilter) params.status = parseInt(statusFilter) as 0 | 1
          if (popularFilter) params.isPopular = popularFilter === "true"
          
          await fetchSubscriptionList(params)
          await fetchStatistics() // Refresh stats
        } catch (err: any) {
          toast({
            title: "Lỗi!",
            description: err.message || "Có lỗi xảy ra khi xóa subscription plan.",
            variant: "destructive",
          })
          throw err
        }
      }
    })
  }

  const handleFormSuccess = () => {
    fetchSubscriptionList({ pageNumber, pageSize: 12, sortBy: sortBy as any, isAscending })
    fetchStatistics() // Refresh stats
  }

  const formatPrice = (price: number) => price.toLocaleString("vi-VN") + " VND"
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString("vi-VN")

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gói Premium & Chính sách</h2>
          <p className="text-muted-foreground">Quản lý gói Premium, giá cả và các chính sách của hệ thống</p>
        </div>
        <SubscriptionForm 
          mode="create"
          onSuccess={handleFormSuccess}
        />
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doanh thu tháng</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoadingStats ? "..." : statistics?.revenue ? `₫${(statistics.revenue / 1000000).toFixed(1)}M` : "₫0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Doanh thu từ subscription plans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Người dùng Premium</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? "..." : statistics?.activeSubscribers?.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Tổng người dùng đang hoạt động
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng gói plans</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? "..." : statistics?.totalPlans || "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Số gói subscription hiện có
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gói phổ biến</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {isLoadingStats ? "..." : statistics?.popularPlan || "Chưa có"}
            </div>
            <p className="text-xs text-muted-foreground">
              Gói được đăng ký nhiều nhất
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      {mounted && (
        <div className="flex flex-col gap-4 pb-4 border-b">
          <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Tìm kiếm theo tên subscription..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <SimpleSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder="Trạng thái"
              className="w-[130px] shrink-0"
              options={FILTER_OPTIONS.status}
            />

            <SimpleSelect
              value={popularFilter}
              onValueChange={setPopularFilter}
              placeholder="Phổ biến"
              className="w-[130px] shrink-0"
              options={FILTER_OPTIONS.popular}
            />

            <SimpleSelect
              value={`${sortBy}-${isAscending ? 'asc' : 'desc'}`}
              onValueChange={(value) => {
                const [field, direction] = value.split('-')
                setSortBy(field)
                setIsAscending(direction === 'asc')
              }}
              placeholder="Sắp xếp"
              className="w-[130px] shrink-0"
              options={FILTER_OPTIONS.sort}
            />

            <Button onClick={handleResetFilters} variant="outline" size="default" className="shrink-0">
              Đặt lại
            </Button>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Subscription Plans Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-2">Đang tải danh sách subscription plans...</span>
        </div>
      ) : subscriptionList.length === 0 ? (
        <div className="text-center py-12">
          <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Chưa có subscription plans</h3>
          <p className="text-muted-foreground">Sử dụng nút "Thêm gói mới" ở trên để tạo subscription plan đầu tiên</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {subscriptionList.map((subscription) => (
            <Card key={subscription.id} className={`relative ${subscription.is_popular ? 'ring-2 ring-yellow-500' : ''}`}>
              {subscription.is_popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge variant="default" className="bg-yellow-500 text-white">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Phổ biến
                  </Badge>
                </div>
              )}
              
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Crown className="mr-2 h-5 w-5 text-yellow-500" />
                    {subscription.name}
                  </CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <Menu className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditSubscription(subscription)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Chỉnh sửa
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600" 
                        onClick={() => handleDeleteSubscription(subscription)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Xóa gói
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription>{subscription.description || "Gói subscription Premium"}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className={`text-4xl font-bold ${subscription.is_popular ? 'text-yellow-600' : 'text-blue-600'}`}>
                    {formatPrice(subscription.price)}
                  </div>
                  <p className="text-muted-foreground">/{subscription.duration} ngày</p>
                  {subscription.duration >= 365 && (
                    <Badge variant="destructive" className="mt-2">
                      Tiết kiệm dài hạn
                    </Badge>
                  )}
                </div>

                {subscription.features && subscription.features.length > 0 && (
                  <div className="space-y-3">
                    {subscription.features.slice(0, 4).map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                    {subscription.features.length > 4 && (
                      <p className="text-xs text-muted-foreground">
                        +{subscription.features.length - 4} tính năng khác
                      </p>
                    )}
                  </div>
                )}

                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Trạng thái:</span>
                    <Badge variant={subscription.status === 1 ? "default" : "destructive"}>
                      {subscription.status === 1 ? "Hoạt động" : "Tạm khóa"}
                    </Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Thứ tự hiển thị:</span>
                    <span className="font-medium">{subscription.display_order}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Ngày tạo:</span>
                    <span className="font-medium">{formatDate(subscription.created_at)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {mounted && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Hiển thị {subscriptionList.length} trong tổng số {totalCount} subscription plans
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
              disabled={pageNumber <= 1 || isLoading}
            >
              Trước
            </Button>
            <span className="text-sm">
              Trang {pageNumber} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageNumber(prev => Math.min(totalPages, prev + 1))}
              disabled={pageNumber >= totalPages || isLoading}
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {selectedSubscriptionForEdit && (
        <SubscriptionForm
          mode="update"
          subscriptionData={selectedSubscriptionForEdit}
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          onSuccess={() => {
            handleCloseEditModal()
            handleFormSuccess()
          }}
        />
      )}
    </div>
  )
} 