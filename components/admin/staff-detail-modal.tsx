"use client"

import { useState, useEffect, useRef } from "react"
import { Eye, Loader2, Calendar, Mail, Phone, MapPin, Briefcase, Shield } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/lib/hooks/use-toast"
import { staffApi, type Staff } from "@/lib/api/staff"

interface StaffDetailModalProps {
  staffId: string
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function StaffDetailModal({ 
  staffId, 
  trigger, 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange 
}: StaffDetailModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [staffDetail, setStaffDetail] = useState<Staff | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Use refs to track API calls and prevent duplicates (especially in React StrictMode)
  const hasLoadedStaffDetailRef = useRef(false)
  const staffDetailLoadingRef = useRef(false)
  const modalSessionRef = useRef<string | null>(null)

  const { toast } = useToast()

  // Use external open state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen

  // Reset session when modal opens/closes
  useEffect(() => {
    if (open) {
      const sessionId = `${Date.now()}-${Math.random()}`
      modalSessionRef.current = sessionId
      console.log("Staff detail modal opened, session:", sessionId)
    } else {
      // Reset refs when modal closes to allow fresh data on next open
      hasLoadedStaffDetailRef.current = false
      modalSessionRef.current = null
      setStaffDetail(null)
      setError(null)
      console.log("Staff detail modal closed, refs reset")
    }
  }, [open])

  // Fetch staff detail when modal opens
  useEffect(() => {
    const fetchStaffDetail = async () => {
      if (open && staffId && 
          !staffDetailLoadingRef.current && !hasLoadedStaffDetailRef.current) {
        
        staffDetailLoadingRef.current = true
        hasLoadedStaffDetailRef.current = true
        setIsLoading(true)
        setError(null)

        try {
          console.log("Fetching staff detail for modal...")
          const staff = await staffApi.getById(staffId)
          setStaffDetail(staff)
          console.log("Fetched staff detail for modal:", staff)
        } catch (err: any) {
          console.error("Error fetching staff detail:", err)
          setError(err.message)
          toast({
            title: "Lỗi!",
            description: err.message || "Có lỗi xảy ra khi tải thông tin nhân viên.",
            variant: "destructive",
          })
        } finally {
          staffDetailLoadingRef.current = false
          setIsLoading(false)
        }
      }
    }

    fetchStaffDetail()
  }, [open, staffId, toast])

  const getPositionBadgeVariant = (positionId: number) => {
    switch (positionId) {
      case 0: return "outline" // Unknown
      case 1: return "default" // Administrator (legacy data)
      case 2: return "secondary" // Staff
      case 3: return "destructive" // LibraryManager
      default: return "outline"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getShortId = (id: string) => {
    return id.slice(-8)
  }

  const defaultTrigger = (
    <Button variant="ghost" size="sm">
      <Eye className="mr-2 h-4 w-4" />
      Xem chi tiết
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Thông tin chi tiết nhân viên</DialogTitle>
          <DialogDescription>
            Xem thông tin chi tiết và trạng thái của nhân viên trong hệ thống
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Đang tải thông tin...</span>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : staffDetail ? (
          <div className="space-y-6">
            {/* Header Info - Full Width */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{staffDetail.full_name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      ID: {getShortId(staffDetail.id)} • Mã NV: {staffDetail.staff_code || "N/A"}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Badge variant={getPositionBadgeVariant(staffDetail.position_id)}>
                      <Briefcase className="mr-1 h-3 w-3" />
                      {staffDetail.position}
                    </Badge>
                    <Badge variant={staffDetail.is_active ? "default" : "destructive"}>
                      <Shield className="mr-1 h-3 w-3" />
                      {staffDetail.is_active ? "Hoạt động" : "Không hoạt động"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Main Content Grid - 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Thông tin cá nhân
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Họ</label>
                      <p className="text-sm font-medium">{staffDetail.first_name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tên</label>
                      <p className="text-sm font-medium">{staffDetail.last_name}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Họ tên đầy đủ</label>
                    <p className="text-sm font-medium">{staffDetail.full_name}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Mã nhân viên</label>
                    <div className="flex items-center mt-1">
                      <Badge variant="outline" className="font-mono">
                        {staffDetail.staff_code || "N/A"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Right Column: Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Thông tin liên hệ
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <label className="text-sm font-medium text-muted-foreground">Email</label>
                        <p className="text-sm break-all">{staffDetail.email || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <label className="text-sm font-medium text-muted-foreground">Số điện thoại</label>
                        <p className="text-sm">{staffDetail.phone || "N/A"}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <label className="text-sm font-medium text-muted-foreground">Địa chỉ</label>
                        <p className="text-sm leading-relaxed">{staffDetail.address || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Information - Full Width */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Thông tin hệ thống
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Ngày tạo tài khoản</label>
                      <p className="text-sm">{formatDate(staffDetail.created_at)}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Trạng thái tài khoản</label>
                      <div className="mt-1">
                        <Badge variant={staffDetail.is_active ? "default" : "destructive"}>
                          {staffDetail.is_active ? "Đang hoạt động" : "Tạm khóa"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <div className="flex justify-end space-x-2 pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
} 