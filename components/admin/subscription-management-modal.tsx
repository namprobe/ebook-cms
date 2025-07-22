"use client"

import { useState } from "react"
import { X, Crown, Calendar, Gift, ToggleLeft, ToggleRight, XCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usersApi, type SubscriptionManagementRequest, type UserDetail } from "@/lib/api/users"
import { useToast } from "@/lib/hooks/use-toast"

interface SubscriptionManagementModalProps {
  userDetail: UserDetail
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function SubscriptionManagementModal({
  userDetail,
  isOpen,
  onClose,
  onSuccess
}: SubscriptionManagementModalProps) {
  const [selectedAction, setSelectedAction] = useState<string>("")
  const [durationDays, setDurationDays] = useState<string>("30")
  const [reason, setReason] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (!selectedAction) {
      toast({
        title: "Lỗi!",
        description: "Vui lòng chọn hành động.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const request: SubscriptionManagementRequest = {
        action: selectedAction as any,
        subscription_id: userDetail.subscription?.id,
        duration_days: selectedAction === 'extend' || selectedAction === 'gift' ? parseInt(durationDays) : undefined,
        reason: reason.trim() || undefined
      }

      const message = await usersApi.manageSubscription(userDetail.id, request)
      
      toast({
        title: "Thành công!",
        description: message,
        variant: "default",
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      toast({
        title: "Lỗi!",
        description: err.message || "Có lỗi xảy ra khi quản lý subscription.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getActionDescription = (action: string) => {
    switch (action) {
      case 'extend':
        return "Gia hạn subscription hiện tại"
      case 'cancel':
        return "Hủy subscription hiện tại"
      case 'gift':
        return "Tặng subscription mới cho user"
      case 'toggle_auto_renew':
        return "Bật/tắt tự động gia hạn"
      case 're_subscription':
        return "Kích hoạt lại subscription với bằng chứng thanh toán"
      default:
        return ""
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN")
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold">Quản lý Subscription</h3>
            <p className="text-sm text-muted-foreground">
              Người dùng: {userDetail.full_name || userDetail.username}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Current Subscription Info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Crown className="h-4 w-4" />
              Trạng thái hiện tại
            </h4>
            
            {userDetail.subscription ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Gói:</span>
                  <span className="font-medium">{userDetail.subscription.subscription.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Trạng thái:</span>
                  <Badge variant={userDetail.subscription.is_active ? "default" : "destructive"}>
                    {userDetail.subscription.is_active ? "Đang hoạt động" : "Hết hạn"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ngày bắt đầu:</span>
                  <span>{formatDate(userDetail.subscription.start_date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ngày hết hạn:</span>
                  <span>{formatDate(userDetail.subscription.end_date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tự động gia hạn:</span>
                  <div className="flex items-center gap-1">
                    {userDetail.subscription.auto_renew ? (
                      <ToggleRight className="h-4 w-4 text-green-600" />
                    ) : (
                      <ToggleLeft className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-sm">
                      {userDetail.subscription.auto_renew ? "Bật" : "Tắt"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Còn lại:</span>
                  <span className="font-medium">
                    {Math.max(0, Math.ceil((new Date(userDetail.subscription.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} ngày
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <XCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-muted-foreground">Người dùng chưa có subscription</p>
              </div>
            )}
          </div>

          {/* Action Selection */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="action">Hành động</Label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn hành động" />
                </SelectTrigger>
                <SelectContent>
                  {userDetail.subscription && (
                    <>
                      <SelectItem value="extend">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Gia hạn subscription</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="cancel">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4" />
                          <span>Hủy subscription</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="toggle_auto_renew">
                        <div className="flex items-center gap-2">
                          <ToggleRight className="h-4 w-4" />
                          <span>Bật/tắt tự động gia hạn</span>
                        </div>
                      </SelectItem>
                    </>
                  )}
                  <SelectItem value="gift">
                    <div className="flex items-center gap-2">
                      <Gift className="h-4 w-4" />
                      <span>Tặng Premium</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="re_subscription">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      <span>Re-subscription</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {selectedAction && (
                <p className="text-sm text-muted-foreground mt-1">
                  {getActionDescription(selectedAction)}
                </p>
              )}
            </div>

            {/* Duration Input (for extend/gift/re_subscription actions) */}
            {(selectedAction === 'extend' || selectedAction === 'gift' || selectedAction === 're_subscription') && (
              <div>
                <Label htmlFor="duration">Số ngày</Label>
                <Input
                  id="duration"
                  type="number"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  placeholder="Nhập số ngày"
                  min="1"
                  max="365"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedAction === 'extend' ? 'Gia hạn thêm' : selectedAction === 're_subscription' ? 'Kích hoạt lại' : 'Tặng'} {durationDays} ngày {selectedAction === 'extend' ? 'cho subscription hiện tại' : 'subscription'}
                </p>
              </div>
            )}

            {/* Payment Proof URL (for re_subscription action) */}
            {selectedAction === 're_subscription' && (
              <div>
                <Label htmlFor="paymentProof">Bằng chứng thanh toán *</Label>
                <Input
                  id="paymentProof"
                  type="url"
                  placeholder="https://example.com/payment-proof.jpg"
                  required
                />
                <p className="text-sm text-muted-foreground mt-1">
                  URL hình ảnh bằng chứng thanh toán từ khách hàng
                </p>
              </div>
            )}

            {/* Reason Input */}
            <div>
              <Label htmlFor="reason">Lý do (tuỳ chọn)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập lý do thực hiện hành động này..."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50 dark:bg-gray-800/50">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedAction || isLoading}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Đang xử lý...
              </>
            ) : (
              'Thực hiện'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
} 