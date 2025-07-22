"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, UserPlus, Edit } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SimpleSelect } from "@/components/ui/simple-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/lib/hooks/use-toast"
import { useAppSelector } from "@/lib/hooks"
import { staffApi, type Staff, type CreateStaffRequest, type UpdateStaffRequest } from "@/lib/api/staff"

// Position options mapping với backend enum StaffPosition (excluding Administrator)
const POSITION_OPTIONS = [
  { value: "2", label: "Staff" }, 
  { value: "3", label: "Library Manager" }
]

interface StaffFormData {
  first_name: string
  last_name: string
  staff_code: string
  email: string
  phone: string
  address: string
  password?: string // Only for create mode
  position: number
  // is_active removed from form - handled separately via toggle status action in management
}

interface StaffFormProps {
  mode: 'create' | 'update'
  staffId?: string // Pass staffId to let modal fetch fresh data (preferred for update mode)
  staffData?: Staff // Legacy support for existing staffData
  trigger?: React.ReactNode // Custom trigger component
  open?: boolean // External control of open state
  onOpenChange?: (open: boolean) => void // External control callback
  onSuccess?: () => void
  onCancel?: () => void
  initialData?: Staff // For update mode - if provided, won't fetch again (internal use)
}

export default function StaffForm({ mode, staffId, staffData, trigger, open: externalOpen, onOpenChange: externalOnOpenChange, onSuccess, onCancel, initialData }: StaffFormProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fetchingStaffData, setFetchingStaffData] = useState(false)
  const [latestStaffData, setLatestStaffData] = useState<Staff | null>(null)

  // Use refs to track API calls and prevent duplicates (especially in React StrictMode)
  const hasLoadedStaffDataRef = useRef(false)
  const staffDataLoadingRef = useRef(false)
  const modalSessionRef = useRef<string | null>(null)

  // Use external open state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  
  const [formData, setFormData] = useState<StaffFormData>({
    first_name: "",
    last_name: "",
    staff_code: "",
    email: "",
    phone: "",
    address: "",
    password: "",
    position: 2, // Default to Staff
  })
  const [originalData, setOriginalData] = useState<Staff | null>(null)

  const { access_token, user } = useAppSelector((state) => state.auth)
  const { toast } = useToast()

  const isCreate = mode === 'create'
  const isUpdate = mode === 'update'
  const isAdmin = user?.app_role?.includes('Admin') || false

  // Get position options (Administrator position removed from system)
  const getPositionOptions = () => {
    // All users can only create Staff and Library Manager positions
    return POSITION_OPTIONS
  }

  // Reset session when modal opens/closes
  useEffect(() => {
    if (open) {
      const sessionId = `${Date.now()}-${Math.random()}`
      modalSessionRef.current = sessionId
      console.log("Staff modal opened, session:", sessionId)
    } else {
      // Reset refs when modal closes to allow fresh data on next open
      hasLoadedStaffDataRef.current = false
      modalSessionRef.current = null
      console.log("Staff modal closed, refs reset")
    }
  }, [open])

  // Fetch latest staff data when modal opens for update mode
  useEffect(() => {
    const fetchLatestStaffData = async () => {
      if (isUpdate && open && access_token && 
          !staffDataLoadingRef.current && !hasLoadedStaffDataRef.current) {
        
        // Prioritize staffId over staffData to get fresh data
        const targetStaffId = staffId || staffData?.id
        if (!targetStaffId) return
        
        staffDataLoadingRef.current = true
        hasLoadedStaffDataRef.current = true
        setFetchingStaffData(true)
        
        try {
          console.log("Fetching latest staff data for update...")
          const latestData = await staffApi.getById(targetStaffId)
          setLatestStaffData(latestData)
          console.log("Fetched latest staff data for update:", latestData)
        } catch (err: any) {
          console.error("Error fetching latest staff data:", err)
          toast({
            title: "Lỗi!",
            description: err.message || "Có lỗi xảy ra khi tải thông tin nhân viên mới nhất.",
            variant: "destructive",
          })
          // Use the original staffData from props as fallback
          if (staffData) {
            setLatestStaffData(staffData)
          }
        } finally {
          staffDataLoadingRef.current = false
          setFetchingStaffData(false)
        }
      }
    }

    fetchLatestStaffData()
  }, [isUpdate, staffId, staffData, open, access_token, toast])

  // Initialize form data using latest staff data
  useEffect(() => {
    if (isUpdate && latestStaffData && open) {
      setOriginalData(latestStaffData)
      setFormData({
        first_name: latestStaffData.first_name,
        last_name: latestStaffData.last_name,
        staff_code: latestStaffData.staff_code,
        email: latestStaffData.email,
        phone: latestStaffData.phone,
        address: latestStaffData.address,
        position: latestStaffData.position_id,
      })
    } else if (isCreate) {
      // Reset form for create mode
      setFormData({
        first_name: "",
        last_name: "",
        staff_code: "",
        email: "",
        phone: "",
        address: "",
        password: "",
        position: 2, // Default to Staff
      })
    }
  }, [isUpdate, latestStaffData, open, isCreate])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      resetForm()
    }
  }

  const resetForm = () => {
    if (isCreate) {
      setFormData({
        first_name: "",
        last_name: "",
        staff_code: "",
        email: "",
        phone: "",
        address: "",
        password: "",
        position: 2,
      })
    }
    setError(null)
    setLatestStaffData(null)
    setFetchingStaffData(false)
    
    // Reset refs for next session
    hasLoadedStaffDataRef.current = false
    staffDataLoadingRef.current = false
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!access_token) {
      toast({
        title: "Lỗi!",
        description: "Thiếu thông tin xác thực",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (isCreate) {
        // Create mode
        const createData: CreateStaffRequest = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          staff_code: formData.staff_code,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          password: formData.password!,
          position: formData.position as 2 | 3, // Map to proper enum values
        }

        await staffApi.create(createData)
        
        toast({
          title: "Thành công!",
          description: "Nhân viên đã được tạo thành công.",
          variant: "default",
        })
      } else {
        // Update mode
        if (!originalData) return

        // Build update payload (only include changed fields)
        const updatePayload: UpdateStaffRequest = {}
        
        if (formData.first_name !== originalData.first_name) {
          updatePayload.first_name = formData.first_name
        }
        
        if (formData.last_name !== originalData.last_name) {
          updatePayload.last_name = formData.last_name
        }
        
        if (formData.email !== originalData.email) {
          updatePayload.email = formData.email
        }
        
        if (formData.phone !== originalData.phone) {
          updatePayload.phone = formData.phone
        }
        
        if (formData.address !== originalData.address) {
          updatePayload.address = formData.address
        }
        
        if (formData.position !== originalData.position_id) {
          updatePayload.position = formData.position as 2 | 3
        }
        
        // Note: is_active is handled separately via toggle action in staff management

        // Always call API update, even if no changes detected
        // Backend will handle the actual update logic
        await staffApi.update(staffId!, updatePayload)
        
        toast({
          title: "Thành công!",
          description: "Thông tin nhân viên đã được cập nhật thành công.",
          variant: "default",
        })
      }

      setOpen(false)
      resetForm()
      onSuccess?.()
    } catch (err: any) {
      console.error(`Error ${isCreate ? 'creating' : 'updating'} staff:`, err)
      setError(err.message)
      toast({
        title: "Lỗi!",
        description: err.message || `Có lỗi xảy ra khi ${isCreate ? 'tạo' : 'cập nhật'} nhân viên.`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    if (isCreate) {
      setFormData({
        first_name: "",
        last_name: "",
        staff_code: "",
        email: "",
        phone: "",
        address: "",
        password: "",
        position: 2,
      })
    } else if (originalData) {
      setFormData({
        first_name: originalData.first_name,
        last_name: originalData.last_name,
        staff_code: originalData.staff_code,
        email: originalData.email,
        phone: originalData.phone,
        address: originalData.address,
        position: originalData.position_id,
      })
    }
    setError(null)
  }

  const defaultTrigger = isCreate ? (
    <Button>
      <UserPlus className="mr-2 h-4 w-4" />
      Thêm nhân viên mới
    </Button>
  ) : (
    <Button variant="outline" size="sm">
      <Edit className="mr-2 h-4 w-4" />
      Chỉnh sửa
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isCreate ? "Tạo nhân viên mới" : "Chỉnh sửa thông tin nhân viên"}
          </DialogTitle>
          <DialogDescription>
            {isCreate 
              ? "Điền thông tin để tạo tài khoản nhân viên mới trong hệ thống."
              : "Cập nhật thông tin chi tiết của nhân viên. Chỉ các trường được thay đổi sẽ được cập nhật."
            }
            {isUpdate && (
              <>
                <br />
                <span className="text-sm text-muted-foreground">
                  Lưu ý: Trạng thái hoạt động được quản lý riêng biệt thông qua menu thao tác.
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {fetchingStaffData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Đang tải thông tin nhân viên...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Thông tin cá nhân</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="first_name">Họ *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="Nguyễn"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="last_name">Tên *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Văn A"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="staff_code">Mã nhân viên *</Label>
                  <Input
                    id="staff_code"
                    value={formData.staff_code}
                    onChange={(e) => setFormData({ ...formData, staff_code: e.target.value })}
                    placeholder="S001"
                    required
                    disabled={isLoading || isUpdate} // Không cho edit mã nhân viên khi update
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="position">Chức vụ *</Label>
                  <SimpleSelect
                    value={formData.position.toString()}
                    onValueChange={(value) => setFormData({ ...formData, position: parseInt(value) })}
                    placeholder="Chọn chức vụ"
                    options={getPositionOptions()}
                    disabled={isLoading}
                  />
                </div>

                {isCreate && (
                  <div className="grid gap-2">
                    <Label htmlFor="password">Mật khẩu *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password || ""}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="Staff@123"
                      required
                      disabled={isLoading}
                    />
                  </div>
                )}
              </div>

              {/* Right Column: Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Thông tin liên hệ</h3>
                
                <div className="grid gap-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="staff@booklify.com"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">Số điện thoại *</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0123456789"
                    required
                    disabled={isLoading}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="address">Địa chỉ *</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Đường ABC, Quận XYZ, TP. HCM"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>

            {/* is_active switch removed - handled separately via toggle action in staff management */}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isLoading || fetchingStaffData}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isCreate ? "Đang tạo..." : "Đang cập nhật..."}
                  </>
                ) : fetchingStaffData ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang tải dữ liệu...
                  </>
                ) : (
                  <>
                    {isCreate ? (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Tạo nhân viên
                      </>
                    ) : (
                      <>
                        <Edit className="mr-2 h-4 w-4" />
                        Cập nhật
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
} 