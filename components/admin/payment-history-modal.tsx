"use client"

import { useState, useEffect } from "react"
import { X, CreditCard, Calendar, DollarSign, CheckCircle, XCircle, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { usersApi, type PaymentHistory } from "@/lib/api/users"
import { useToast } from "@/lib/hooks/use-toast"

interface PaymentHistoryModalProps {
  userId: string
  userName: string
  isOpen: boolean
  onClose: () => void
}

export default function PaymentHistoryModal({
  userId,
  userName,
  isOpen,
  onClose
}: PaymentHistoryModalProps) {
  const [payments, setPayments] = useState<PaymentHistory[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (isOpen && userId) {
      fetchPaymentHistory()
    }
  }, [isOpen, userId])

  const fetchPaymentHistory = async () => {
    setIsLoading(true)
    try {
      const history = await usersApi.getPaymentHistory(userId)
      setPayments(history)
    } catch (err: any) {
      toast({
        title: "Lỗi!",
        description: err.message || "Có lỗi xảy ra khi tải lịch sử thanh toán.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit", 
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const formatAmount = (amount: number, currency: string) => {
    return `${amount.toLocaleString()} ${currency}`
  }

  const getPaymentStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> Thành công</Badge>
      case 'failed':
      case 'error':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Thất bại</Badge>
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Đang xử lý</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'vnpay':
        return <span className="text-blue-600 font-semibold">VNPay</span>
      case 'momo':
        return <span className="text-pink-600 font-semibold">MoMo</span>
      case 'credit_card':
        return <span className="flex items-center gap-1"><CreditCard className="h-3 w-3" /> Credit Card</span>
      default:
        return <span>{method}</span>
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h3 className="text-lg font-semibold">Lịch sử thanh toán</h3>
            <p className="text-sm text-muted-foreground">Người dùng: {userName}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Đang tải lịch sử thanh toán...</p>
              </div>
            </div>
          ) : payments.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-muted-foreground">Chưa có lịch sử thanh toán</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ngày thanh toán</TableHead>
                      <TableHead>Số tiền</TableHead>
                      <TableHead>Phương thức</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Mã giao dịch</TableHead>
                      <TableHead>Mô tả</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(payment.payment_date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">
                            {formatAmount(payment.amount, payment.currency)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getPaymentMethodIcon(payment.payment_method)}
                        </TableCell>
                        <TableCell>
                          {getPaymentStatusBadge(payment.payment_status)}
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {payment.transaction_id || "N/A"}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {payment.description || "Không có mô tả"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50 dark:bg-gray-800/50">
          <div className="text-sm text-muted-foreground">
            Tổng cộng {payments.length} giao dịch
          </div>
          <Button onClick={onClose}>Đóng</Button>
        </div>
      </div>
    </div>
  )
} 