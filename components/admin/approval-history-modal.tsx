"use client"

import { useState, useMemo } from "react"
import { History, Clock, CheckCircle, XCircle, RotateCw, FileText, AlertCircle } from "lucide-react"

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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface ApprovalHistoryEntry {
  type: 'APPROVED' | 'REJECTED' | 'RESUBMITTED' | 'PENDING' | 'NOTE'
  timestamp: string
  message: string
  icon: any
  color: string
  bgColor: string
  borderColor: string
}

interface ApprovalHistoryModalProps {
  bookTitle: string
  approvalNote: string
  currentStatus: number // 0: Pending, 1: Approved, 2: Rejected
  trigger?: React.ReactNode
}

export default function ApprovalHistoryModal({ 
  bookTitle, 
  approvalNote, 
  currentStatus,
  trigger 
}: ApprovalHistoryModalProps) {
  const [open, setOpen] = useState(false)

  // Parse approval note và sắp xếp theo thời gian
  const historyEntries = useMemo(() => {
    if (!approvalNote) return []

    const lines = approvalNote.split('\n').filter(line => line.trim())
    const entries: ApprovalHistoryEntry[] = []

    lines.forEach(line => {
      let type: ApprovalHistoryEntry['type'] = 'NOTE'
      let icon = FileText
      let color = 'text-gray-600'
      let bgColor = 'bg-gray-50 dark:bg-gray-900/20'
      let borderColor = 'border-gray-200 dark:border-gray-800'
      let message = line.trim()
      let timestamp = ''

      if (line.includes('[APPROVED')) {
        type = 'APPROVED'
        icon = CheckCircle
        color = 'text-green-600 dark:text-green-400'
        bgColor = 'bg-green-50 dark:bg-green-900/20'
        borderColor = 'border-green-200 dark:border-green-800'
        
        const timestampMatch = line.match(/\[APPROVED[^\]]*\]/)
        if (timestampMatch) {
          timestamp = timestampMatch[0]
          message = line.replace(timestampMatch[0], '').trim() || 'Sách đã được phê duyệt'
        }
      } else if (line.includes('[REJECTED')) {
        type = 'REJECTED'
        icon = XCircle
        color = 'text-red-600 dark:text-red-400'
        bgColor = 'bg-red-50 dark:bg-red-900/20'
        borderColor = 'border-red-200 dark:border-red-800'
        
        const timestampMatch = line.match(/\[REJECTED[^\]]*\]/)
        if (timestampMatch) {
          timestamp = timestampMatch[0]
          message = line.replace(timestampMatch[0], '').trim() || 'Sách bị từ chối'
        }
      } else if (line.includes('[RESUBMITTED')) {
        type = 'RESUBMITTED'
        icon = RotateCw
        color = 'text-blue-600 dark:text-blue-400'
        bgColor = 'bg-blue-50 dark:bg-blue-900/20'
        borderColor = 'border-blue-200 dark:border-blue-800'
        
        const timestampMatch = line.match(/\[RESUBMITTED[^\]]*\]/)
        if (timestampMatch) {
          timestamp = timestampMatch[0]
          message = line.replace(timestampMatch[0], '').trim() || 'Sách đã được gửi lại để phê duyệt'
        }
      } else if (line.includes('[PENDING')) {
        type = 'PENDING'
        icon = Clock
        color = 'text-yellow-600 dark:text-yellow-400'
        bgColor = 'bg-yellow-50 dark:bg-yellow-900/20'
        borderColor = 'border-yellow-200 dark:border-yellow-800'
        
        const timestampMatch = line.match(/\[PENDING[^\]]*\]/)
        if (timestampMatch) {
          timestamp = timestampMatch[0]
          message = line.replace(timestampMatch[0], '').trim() || 'Chuyển về trạng thái chờ duyệt'
        }
      } else if (line.includes('[NOTE')) {
        type = 'NOTE'
        icon = FileText
        color = 'text-gray-600 dark:text-gray-400'
        bgColor = 'bg-gray-50 dark:bg-gray-900/20'
        borderColor = 'border-gray-200 dark:border-gray-800'
        
        const timestampMatch = line.match(/\[NOTE[^\]]*\]/)
        if (timestampMatch) {
          timestamp = timestampMatch[0]
          message = line.replace(timestampMatch[0], '').trim() || 'Ghi chú'
        }
      }

      entries.push({
        type,
        timestamp,
        message,
        icon,
        color,
        bgColor,
        borderColor
      })
    })

    // Sắp xếp theo thời gian (mới nhất trước)
    return entries.sort((a, b) => {
      // Extract timestamp for comparison
      const getTimestamp = (entry: ApprovalHistoryEntry) => {
        const match = entry.timestamp.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/)
        return match ? new Date(match[1] + ' UTC').getTime() : 0
      }
      
      return getTimestamp(b) - getTimestamp(a)
    })
  }, [approvalNote])

  const getStatusText = (status: number) => {
    switch (status) {
      case 0: return "Chờ duyệt"
      case 1: return "Đã duyệt"
      case 2: return "Từ chối"
      default: return "Không xác định"
    }
  }

  const getStatusIcon = (status: number) => {
    switch (status) {
      case 0: return <Clock className="h-4 w-4 text-yellow-500" />
      case 1: return <CheckCircle className="h-4 w-4 text-green-500" />
      case 2: return <XCircle className="h-4 w-4 text-red-500" />
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const match = timestamp.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/)
    if (match) {
      const date = new Date(match[1] + ' UTC')
      return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'UTC'
      }) + ' UTC'
    }
    return timestamp
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <History className="h-4 w-4 mr-2" />
            Xem lịch sử đầy đủ
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Lịch sử phê duyệt
          </DialogTitle>
          <DialogDescription>
            Lịch sử phê duyệt đầy đủ cho sách: <strong>{bookTitle}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Trạng thái hiện tại:</span>
              {getStatusIcon(currentStatus)}
              <Badge variant={
                currentStatus === 1 ? "default" : 
                currentStatus === 2 ? "destructive" : "secondary"
              }>
                {getStatusText(currentStatus)}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {historyEntries.length} sự kiện trong lịch sử
            </div>
          </div>

          <Separator />

          {/* History Timeline */}
          <ScrollArea className="max-h-[50vh]">
            {historyEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Chưa có lịch sử phê duyệt</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historyEntries.map((entry, index) => {
                  const Icon = entry.icon
                  return (
                    <div key={index} className="relative">
                      {/* Timeline line */}
                      {index < historyEntries.length - 1 && (
                        <div className="absolute left-6 top-12 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
                      )}
                      
                      {/* Entry */}
                      <div className={`border rounded-lg p-4 ${entry.bgColor} ${entry.borderColor}`}>
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className={`mt-0.5 ${entry.color}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">
                                {entry.type === 'APPROVED' && 'Đã duyệt'}
                                {entry.type === 'REJECTED' && 'Từ chối'}
                                {entry.type === 'RESUBMITTED' && 'Resubmit'}
                                {entry.type === 'PENDING' && 'Chờ duyệt'}
                                {entry.type === 'NOTE' && 'Ghi chú'}
                              </Badge>
                              {entry.timestamp && (
                                <span className="text-xs text-muted-foreground">
                                  {formatTimestamp(entry.timestamp)}
                                </span>
                              )}
                            </div>
                            
                            <p className={`text-sm leading-relaxed ${
                              entry.type === 'APPROVED' ? 'text-green-800 dark:text-green-200' :
                              entry.type === 'REJECTED' ? 'text-red-800 dark:text-red-200' :
                              entry.type === 'RESUBMITTED' ? 'text-blue-800 dark:text-blue-200' :
                              entry.type === 'PENDING' ? 'text-yellow-800 dark:text-yellow-200' :
                              'text-gray-800 dark:text-gray-200'
                            }`}>
                              {entry.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
} 