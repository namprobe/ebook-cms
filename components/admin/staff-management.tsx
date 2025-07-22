"use client"

import { useState, useEffect } from "react"
import { Search, Filter, Plus, Eye, Edit, Trash2, UserCheck, UserX, X, ArrowUp, ArrowDown, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { SimpleSelect } from "@/components/ui/simple-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/lib/hooks/use-toast"
import { useAppSelector } from "@/lib/hooks"
import { staffApi, type Staff, type StaffListParams } from "@/lib/api/staff"
import CreateStaffModal from "./create-staff-modal"
import StaffDetailModal from "./staff-detail-modal"
import UpdateStaffModal from "./update-staff-modal"
import { useConfirmModal } from "@/components/ui/confirm-modal"

export default function StaffManagement() {
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [positionFilter, setPositionFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [sortBy, setSortBy] = useState<string>("createdat")
  const [isAscending, setIsAscending] = useState(false)
  const [pageNumber, setPageNumber] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [mounted, setMounted] = useState(false)

  // Modal states
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedStaffForEdit, setSelectedStaffForEdit] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const { access_token } = useAppSelector((state) => state.auth)
  const { toast } = useToast()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Reset page to 1 when filters change
  useEffect(() => {
    if (mounted) {
      setPageNumber(1)
    }
  }, [searchQuery, positionFilter, statusFilter, sortBy, isAscending, mounted])

  const fetchStaffList = async (params: StaffListParams = {}) => {
    if (!access_token) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await staffApi.getList(params)
      setStaffList(response.data)
      setTotalPages(response.totalPages)
      setTotalCount(response.totalCount)
      setPageNumber(response.pageNumber)
    } catch (err: any) {
      console.error("Error fetching staff list:", err)
      
      // Show error toast
      toast({
        title: "Lỗi!",
        description: err.message || "Có lỗi xảy ra khi tải danh sách nhân viên.",
        variant: "destructive",
      })
      
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Initial fetch và filter changes - combined để tránh duplicate calls
  useEffect(() => {
    if (!mounted) return

    const params: StaffListParams = {
      pageNumber: pageNumber,
      pageSize: 10,
      sortBy: sortBy as any,
      isAscending,
    }

    if (searchQuery.trim()) {
      params.fullName = searchQuery.trim()
    }

    if (positionFilter) {
      params.position = parseInt(positionFilter)
    }

    if (statusFilter) {
      params.isActive = statusFilter === "active"
    }

    // Debounce cho search text để tránh quá nhiều API calls
    const timeoutId = setTimeout(() => {
      fetchStaffList(params)
    }, searchQuery.trim() ? 500 : 0) // 500ms debounce cho search, ngay lập tức cho dropdown

    return () => clearTimeout(timeoutId)
  }, [searchQuery, positionFilter, statusFilter, sortBy, isAscending, pageNumber, mounted, access_token])

  const handleResetFilters = () => {
    setSearchQuery("")
    setPositionFilter("")
    setStatusFilter("")
    setSortBy("createdat")
    setIsAscending(false)
    // fetchStaffList sẽ tự động được gọi qua useEffect
  }

  const handlePageChange = (newPage: number) => {
    const params: StaffListParams = {
      pageNumber: newPage,
      pageSize: 10,
      sortBy: sortBy as any,
      isAscending,
    }

    if (searchQuery.trim()) {
      params.fullName = searchQuery.trim()
    }

    if (positionFilter) {
      params.position = parseInt(positionFilter)
    }

    if (statusFilter) {
      params.isActive = statusFilter === "active"
    }

    fetchStaffList(params)
  }

  const handleViewStaff = (staffId: string) => {
    setSelectedStaffId(staffId)
    setIsDetailModalOpen(true)
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setSelectedStaffId(null)
  }

  const handleEditStaff = (staffId: string) => {
    setSelectedStaffForEdit(staffId)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedStaffForEdit(null)
  }

  const handleToggleStaffActive = (staff: Staff) => {
    const newStatus = !staff.is_active
    const confirmModal = useConfirmModal.getState()
    
    confirmModal.open({
      title: `${newStatus ? 'Kích hoạt' : 'Vô hiệu hóa'} tài khoản nhân viên`,
      description: `Bạn có chắc chắn muốn ${newStatus ? 'kích hoạt lại' : 'vô hiệu hóa'} tài khoản nhân viên sau không?`,
      content: (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-900 border rounded-lg p-3 space-y-1">
            <p className="font-semibold text-gray-900 dark:text-gray-100">{staff.full_name}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Email: {staff.email}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Chức vụ: {staff.position}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">ID: {getShortId(staff.id)}</p>
          </div>
          {!newStatus && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <span className="text-yellow-600 dark:text-yellow-400 text-lg leading-none">⚠️</span>
                <div className="space-y-1">
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm font-medium">
                    Nhân viên sẽ không thể đăng nhập!
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300 text-xs">
                    Tài khoản sẽ bị khóa và không thể truy cập hệ thống
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ),
      confirmText: newStatus ? "Kích hoạt" : "Vô hiệu hóa",
      confirmVariant: newStatus ? "default" : "destructive",
      onConfirm: async () => {
        try {
          await staffApi.toggleActive(staff.id, newStatus)
          
          toast({
            title: "Thành công!",
            description: `Nhân viên đã được ${newStatus ? 'kích hoạt' : 'vô hiệu hóa'} thành công.`,
            variant: "default",
          })
          
          // Refresh the staff list
          const params: StaffListParams = {
            pageNumber,
            pageSize: 10,
            sortBy: sortBy as any,
            isAscending,
          }

          if (searchQuery.trim()) {
            params.fullName = searchQuery.trim()
          }

          if (positionFilter) {
            params.position = parseInt(positionFilter)
          }

          if (statusFilter) {
            params.isActive = statusFilter === "active"
          }

          await fetchStaffList(params)
        } catch (err: any) {
          console.error("Error toggling staff status:", err)
          toast({
            title: "Lỗi!",
            description: err.message || "Có lỗi xảy ra khi thay đổi trạng thái nhân viên.",
            variant: "destructive",
          })
          throw err // Re-throw to keep modal in loading state
        }
      }
    })
  }

  const getShortId = (id: string) => {
    return id.slice(-8)
  }

  const getPositionBadgeVariant = (positionId: number) => {
    switch (positionId) {
      case 0: return "outline" // Unknown
      case 1: return "default" // Administrator (legacy data)
      case 2: return "secondary" // Staff
      case 3: return "destructive" // LibraryManager
      default: return "outline"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quản lý nhân viên</h2>
          <p className="text-muted-foreground">
            Quản lý danh sách nhân viên trong hệ thống ({totalCount} nhân viên)
          </p>
        </div>
        <CreateStaffModal onSuccess={() => fetchStaffList({ pageNumber, pageSize: 10 })} />
      </div>

      {/* Bộ lọc và tìm kiếm */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm theo tên hoặc email..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && e.currentTarget.blur()}
          />
        </div>

        {mounted && (
          <>
            <SimpleSelect
              value={positionFilter}
              onValueChange={setPositionFilter}
              placeholder="Chức vụ"
              className="w-[120px]"
              options={[
                { value: "2", label: "Staff" },
                { value: "3", label: "Library Manager" }
              ]}
            />

            <SimpleSelect
              value={statusFilter}
              onValueChange={setStatusFilter}
              placeholder="Trạng thái"
              className="w-[110px]"
              options={[
                { value: "active", label: "Hoạt động" },
                { value: "inactive", label: "Tạm khóa" }
              ]}
            />

            <SimpleSelect
              value={`${sortBy}-${isAscending ? 'asc' : 'desc'}`}
              onValueChange={(value) => {
                const [field, direction] = value.split('-')
                setSortBy(field)
                setIsAscending(direction === 'asc')
              }}
              placeholder="Sắp xếp"
              className="w-[120px]"
              options={[
                { value: "fullname-asc", label: "Tên A→Z" },
                { value: "fullname-desc", label: "Tên Z→A" },
                { value: "email-asc", label: "Email A→Z" },
                { value: "email-desc", label: "Email Z→A" },
                { value: "createdat-desc", label: "Mới nhất" },
                { value: "createdat-asc", label: "Cũ nhất" },
                { value: "position-asc", label: "Chức vụ A→Z" },
                { value: "position-desc", label: "Chức vụ Z→A" }
              ]}
            />
          </>
        )}

        <Button onClick={handleResetFilters} disabled={isLoading} variant="outline" size="sm">
          Đặt lại
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Bảng danh sách nhân viên */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Họ tên</TableHead>
              <TableHead>Mã nhân viên</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Số điện thoại</TableHead>
              <TableHead>Chức vụ</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Đang tải dữ liệu...
                </TableCell>
              </TableRow>
            ) : staffList.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Không có dữ liệu nhân viên
                </TableCell>
              </TableRow>
            ) : (
              staffList.map((staff) => (
                <TableRow key={staff.id}>
                  <TableCell className="font-mono text-sm">
                    {getShortId(staff.id)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {staff.full_name}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">
                      {staff.staff_code || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>{staff.email || "N/A"}</TableCell>
                  <TableCell>{staff.phone || "N/A"}</TableCell>
                  <TableCell>
                    <Badge variant={getPositionBadgeVariant(staff.position_id)}>
                      {staff.position}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={staff.is_active ? "default" : "destructive"}>
                      {staff.is_active ? "Hoạt động" : "Không hoạt động"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Mở menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewStaff(staff.id)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Xem chi tiết
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditStaff(staff.id)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleToggleStaffActive(staff)}>
                          {staff.is_active ? (
                            <>
                              <UserX className="mr-2 h-4 w-4" />
                              Vô hiệu hóa
                            </>
                          ) : (
                            <>
                              <UserCheck className="mr-2 h-4 w-4" />
                              Kích hoạt
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Hiển thị {staffList.length} trong tổng số {totalCount} nhân viên
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pageNumber - 1)}
              disabled={pageNumber <= 1}
            >
              Trước
            </Button>
            <span className="text-sm">
              Trang {pageNumber} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pageNumber + 1)}
              disabled={pageNumber >= totalPages}
            >
              Sau
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedStaffId && (
        <StaffDetailModal 
          staffId={selectedStaffId}
          open={isDetailModalOpen}
          onOpenChange={(open) => {
            setIsDetailModalOpen(open)
            if (!open) {
              handleCloseDetailModal()
            }
          }}
        />
      )}

      {selectedStaffForEdit && (
        <UpdateStaffModal 
          staffId={selectedStaffForEdit}
          open={isEditModalOpen}
          onOpenChange={(open) => {
            setIsEditModalOpen(open)
            if (!open) {
              handleCloseEditModal()
            }
          }}
          onSuccess={() => {
            handleCloseEditModal()
            fetchStaffList({ pageNumber, pageSize: 10, sortBy: sortBy as any, isAscending })
          }}
        />
      )}
    </div>
  )
}
