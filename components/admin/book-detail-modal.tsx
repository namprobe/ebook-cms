"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, Book, FileText, Calendar, Tag, User, Building, Eye, Star, Users, AlertCircle, RotateCw, MessageSquare, CheckCircle, Download, BookOpen } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/lib/hooks/use-toast"
import { useAppSelector } from "@/lib/hooks"
import { booksApi, type BookDetailResponse, type ChapterResponse } from "@/lib/api/books"
import ApprovalHistoryModal from "./approval-history-modal"

interface BookDetailModalProps {
  bookId: string | null
  isOpen: boolean
  onClose: () => void
}

export default function BookDetailModal({ bookId, isOpen, onClose }: BookDetailModalProps) {
  const [bookDetail, setBookDetail] = useState<BookDetailResponse | null>(null)
  const [chapters, setChapters] = useState<ChapterResponse[]>([])
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isLoadingChapters, setIsLoadingChapters] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showChapters, setShowChapters] = useState(false)
  
  // Sử dụng ref để track việc đã fetch chưa
  const hasFetchedRef = useRef(false)
  const currentBookIdRef = useRef<string | null>(null)

  const { access_token } = useAppSelector((state) => state.auth)
  const { toast } = useToast()

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setBookDetail(null)
      setChapters([])
      setError(null)
      setShowChapters(false)
      hasFetchedRef.current = false
      currentBookIdRef.current = null
    }
  }, [isOpen])

  // Fetch book detail when modal opens - CHỈ 1 LẦN
  useEffect(() => {
    if (isOpen && bookId && access_token) {
      // Chỉ fetch nếu chưa fetch cho bookId này
      if (currentBookIdRef.current !== bookId && !hasFetchedRef.current) {
        currentBookIdRef.current = bookId
        hasFetchedRef.current = true
        fetchBookDetail()
      }
    }
  }, [isOpen, bookId, access_token])

  const fetchBookDetail = async () => {
    if (!bookId || !access_token) return

    setIsLoadingDetail(true)
    setError(null)

    try {
              const detail = await booksApi.getDetail(bookId)
      setBookDetail(detail)
    } catch (err: any) {
      console.error("Error fetching book detail:", err)
      setError(err.message)
      toast({
        title: "Lỗi!",
        description: err.message || "Có lỗi xảy ra khi tải thông tin sách.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const fetchBookChapters = async () => {
    if (!bookId || !access_token) return

    setIsLoadingChapters(true)

    try {
              const chaptersData = await booksApi.getChapters(bookId)
      setChapters(chaptersData)
      setShowChapters(true)
    } catch (err: any) {
      console.error("Error fetching book chapters:", err)
      toast({
        title: "Lỗi!",
        description: err.message || "Có lỗi xảy ra khi tải danh sách chapters.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingChapters(false)
    }
  }

  const toggleChapters = () => {
    if (showChapters) {
      setShowChapters(false)
    } else {
      fetchBookChapters()
    }
  }

  const handleDownload = async () => {
    if (!bookId || !bookDetail || !access_token) return

    try {
      const blob = await booksApi.download(bookId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `${bookDetail.title}.epub`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: "Thành công!",
        description: "Đã tải xuống sách.",
        variant: "default",
      })
    } catch (err: any) {
      console.error("Error downloading book:", err)
      toast({
        title: "Lỗi!",
        description: err.message || "Có lỗi xảy ra khi tải xuống sách.",
        variant: "destructive",
      })
    }
  }

  const handleReadBook = () => {
    if (bookId) {
      const url = `/read/${bookId}`
      window.open(url, '_blank')
    }
  }

  const getApprovalStatusBadge = (status: number) => {
    let text: string;
    switch (status) {
      case 0: text = "Chờ duyệt"; break;
      case 1: text = "Đã duyệt"; break;
      case 2: text = "Từ chối"; break;
      default: text = "Không xác định"; break;
    }
    
    switch (status) {
      case 0:
        return <Badge variant="secondary">{text}</Badge>
      case 1:
        return <Badge variant="default">{text}</Badge>
      case 2:
        return <Badge variant="destructive">{text}</Badge>
      default:
        return <Badge variant="outline">{text}</Badge>
    }
  }

  const getStatusBadge = (status: number) => {
    let text: string;
    switch (status) {
      case 0: text = "Tạm khóa"; break;
      case 1: text = "Hoạt động"; break;
      default: text = "Không xác định"; break;
    }
    
    switch (status) {
      case 0:
        return <Badge variant="secondary">{text}</Badge>
      case 1:
        return <Badge variant="default">{text}</Badge>
      default:
        return <Badge variant="outline">{text}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN")
  }

  const formatRating = (rating: number) => {
    return rating > 0 ? rating.toFixed(1) : "N/A"
  }

  const renderChapterItem = (chapter: ChapterResponse, level: number = 0) => {
    return (
      <div key={chapter.id} className={`pl-${level * 4}`}>
        <div className="flex items-center gap-2 py-1">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">{chapter.title}</span>
        </div>
        {chapter.child_chapters && chapter.child_chapters.length > 0 && (
          <div className="ml-4">
            {chapter.child_chapters.map((child) => renderChapterItem(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const renderApprovalNoteSection = () => {
    if (!bookDetail?.approval_note) return null

    const currentStatus = bookDetail.approval_status // 0: Pending, 1: Approved, 2: Rejected
    const lines = bookDetail.approval_note.split('\n').filter(line => line.trim())
    const totalEntries = lines.length
    
    // Get the latest entry for summary
    const latestEntry = lines[lines.length - 1] || ''
    
    let latestType = 'Unknown'
    let latestMessage = latestEntry
    let latestColor = 'text-gray-600'
    let latestBgColor = 'bg-gray-50 dark:bg-gray-900/20'
    let latestBorderColor = 'border-gray-200 dark:border-gray-800'
    let latestIcon = MessageSquare

    if (latestEntry.includes('[APPROVED')) {
      latestType = 'Đã duyệt'
      latestMessage = latestEntry.replace(/\[APPROVED[^\]]*\]/, '').trim() || 'Sách đã được phê duyệt'
      latestColor = 'text-green-600 dark:text-green-400'
      latestBgColor = 'bg-green-50 dark:bg-green-900/20'
      latestBorderColor = 'border-green-200 dark:border-green-800'
      latestIcon = CheckCircle
    } else if (latestEntry.includes('[REJECTED')) {
      latestType = 'Từ chối'
      latestMessage = latestEntry.replace(/\[REJECTED[^\]]*\]/, '').trim() || 'Sách bị từ chối'
      latestColor = 'text-red-600 dark:text-red-400'
      latestBgColor = 'bg-red-50 dark:bg-red-900/20'
      latestBorderColor = 'border-red-200 dark:border-red-800'
      latestIcon = AlertCircle
    } else if (latestEntry.includes('[RESUBMITTED')) {
      latestType = 'Resubmit'
      latestMessage = latestEntry.replace(/\[RESUBMITTED[^\]]*\]/, '').trim() || 'Đã gửi lại để phê duyệt'
      latestColor = 'text-blue-600 dark:text-blue-400'
      latestBgColor = 'bg-blue-50 dark:bg-blue-900/20'
      latestBorderColor = 'border-blue-200 dark:border-blue-800'
      latestIcon = RotateCw
    }

    const LatestIcon = latestIcon
      
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Lịch sử phê duyệt
          </h4>
          <ApprovalHistoryModal
            bookTitle={bookDetail.title}
            approvalNote={bookDetail.approval_note}
            currentStatus={currentStatus}
          />
        </div>
        
        {/* Latest Entry Summary */}
        <div className={`border rounded-lg p-4 ${latestBgColor} ${latestBorderColor}`}>
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 ${latestColor}`}>
              <LatestIcon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline" className="text-xs">
                  {latestType}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {totalEntries > 1 ? `${totalEntries} sự kiện` : '1 sự kiện'}
                </span>
              </div>
              <p className={`text-sm leading-relaxed ${
                latestType === 'Đã duyệt' ? 'text-green-800 dark:text-green-200' :
                latestType === 'Từ chối' ? 'text-red-800 dark:text-red-200' :
                latestType === 'Resubmit' ? 'text-blue-800 dark:text-blue-200' :
                'text-gray-800 dark:text-gray-200'
              }`}>
                {latestMessage}
              </p>
              {totalEntries > 1 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Và {totalEntries - 1} sự kiện khác trong lịch sử
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Chi tiết sách</DialogTitle>
          <DialogDescription>Thông tin chi tiết và chapters của sách</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          {isLoadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Đang tải thông tin sách...</span>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : bookDetail ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Book className="h-5 w-5" />
                      {bookDetail.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      {getApprovalStatusBadge(bookDetail.approval_status)}
                      {getStatusBadge(bookDetail.status)}
                      {bookDetail.is_premium && <Badge variant="secondary">Trả phí</Badge>}
                      {bookDetail.approval_status === 0 && bookDetail.approval_note?.includes("[RESUBMITTED]") && (
                        <div className="flex items-center gap-1">
                          <RotateCw className="h-3 w-3 text-blue-500" />
                          <span className="text-xs text-blue-600 font-medium">Resubmitted</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownload}
                      disabled={!access_token}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Tải xuống
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleReadBook}
                      disabled={!bookDetail.file_url}
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      Đọc sách
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Tác giả: {bookDetail.author}</span>
                    </div>
                    {bookDetail.publisher && (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Nhà xuất bản: {bookDetail.publisher}</span>
                      </div>
                    )}
                    {bookDetail.isbn && (
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">ISBN: {bookDetail.isbn}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Ngày xuất bản: {formatDate(bookDetail.published_date)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {bookDetail.cover_image_url && (
                    <div className="flex justify-center">
                      <img
                        src={bookDetail.cover_image_url}
                        alt={bookDetail.title}
                        className="max-w-32 max-h-48 object-cover rounded-lg shadow-md"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {bookDetail.description && (
                <div>
                  <h4 className="font-medium mb-2">Mô tả</h4>
                  <p className="text-sm text-muted-foreground">{bookDetail.description}</p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{formatRating(bookDetail.average_rating)}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Đánh giá</span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{bookDetail.total_ratings}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Lượt đánh giá</span>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Eye className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{bookDetail.total_views}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Lượt xem</span>
                </div>
              </div>

              {/* Tags */}
              {bookDetail.tags && (
                <div>
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {bookDetail.tags.split(",").map((tag, index) => (
                      <Badge key={index} variant="outline">
                        {tag.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Approval Note with improved styling */}
              {renderApprovalNoteSection()}

              <Separator />

              {/* Chapters Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">Chapters</h4>
                  {bookDetail.has_chapters && (
                    <Button
                      onClick={toggleChapters}
                      disabled={isLoadingChapters}
                      variant="outline"
                      size="sm"
                    >
                      {isLoadingChapters ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Đang tải...
                        </>
                      ) : showChapters ? (
                        "Ẩn chapters"
                      ) : (
                        "Hiển thị chapters"
                      )}
                    </Button>
                  )}
                </div>

                {!bookDetail.has_chapters ? (
                  <p className="text-sm text-muted-foreground">Sách này chưa có chapters.</p>
                ) : showChapters && chapters.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto border rounded-lg p-4">
                    {chapters.map((chapter) => renderChapterItem(chapter))}
                  </div>
                ) : showChapters && chapters.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Không có chapters nào.</p>
                ) : null}
              </div>

              {/* Technical Info */}
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <span className="font-medium">ID:</span> {bookDetail.id.slice(-8)}
                </div>
                <div>
                  <span className="font-medium">Số trang:</span> {bookDetail.page_count}
                </div>
                <div>
                  <span className="font-medium">Ngày tạo:</span> {formatDate(bookDetail.created_at)}
                </div>
                <div>
                  <span className="font-medium">Cập nhật:</span> {formatDate(bookDetail.created_at)}
                </div>
              </div>
            </div>
          ) : null}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
