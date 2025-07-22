"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Search, MoreHorizontal, Eye, Edit, Trash2, Loader2, Settings, RotateCw, AlertCircle, Clock, History, Download, BookOpen } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { SimpleSelect } from "@/components/ui/simple-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/lib/hooks/use-toast"
import { useAppSelector } from "@/lib/hooks"
import { booksApi, type Book, type BookListParams, type BookDetailResponse, type ResubmitBookRequest } from "@/lib/api/books"
import { referenceApi, type DropdownOption } from "@/lib/api/reference"
import CreateBookModal from "./create-book-modal"
import UpdateBookModal from "./update-book-modal"
import BookDetailModal from "./book-detail-modal"
import BookStatusModal, { useBookStatusModal } from "./book-status-modal"
import ApprovalHistoryModal from "./approval-history-modal"
import { useConfirmModal } from "@/components/ui/confirm-modal"

// Tách options ra khỏi component để tránh re-render
const FILTER_OPTIONS = {
  approval: [
    { value: "0", label: "Chờ duyệt" },
    { value: "1", label: "Đã duyệt" },
    { value: "2", label: "Từ chối" }
  ],
  status: [
    { value: "1", label: "Hoạt động" },
    { value: "0", label: "Tạm khóa" }
  ],
  premium: [
    { value: "premium", label: "Premium" },
    { value: "free", label: "Miễn phí" }
  ],
  sort: [
    { value: "title-asc", label: "Tên A→Z" },
    { value: "title-desc", label: "Tên Z→A" },
    { value: "author-asc", label: "Tác giả A→Z" },
    { value: "author-desc", label: "Tác giả Z→A" },
    { value: "createdat-desc", label: "Mới nhất" },
    { value: "createdat-asc", label: "Cũ nhất" },
    { value: "rating-desc", label: "Đánh giá cao" },
    { value: "rating-asc", label: "Đánh giá thấp" },
    { value: "totalviews-desc", label: "Xem nhiều" },
    { value: "totalviews-asc", label: "Xem ít" }
  ]
}

export default function BookManagement() {
  const [bookList, setBookList] = useState<Book[]>([])
  const [rejectedBooks, setRejectedBooks] = useState<Book[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingRejected, setIsLoadingRejected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [premiumFilter, setPremiumFilter] = useState<string>("")
  const [sortBy, setSortBy] = useState<string>("createdat")
  const [isAscending, setIsAscending] = useState(false)
  const [pageNumber, setPageNumber] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedBookForEdit, setSelectedBookForEdit] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState("all")

  // Categories state
  const [categories, setCategories] = useState<DropdownOption[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)

  // Use refs to track API calls and prevent duplicates
  const hasLoadedCategoriesRef = useRef(false)
  const categoriesLoadingRef = useRef(false)

  // Book status modal
  const bookStatusModal = useBookStatusModal()

  const { access_token, user } = useAppSelector((state) => state.auth)
  const { toast } = useToast()
  const router = useRouter()

  // Kiểm tra quyền Admin và Staff
  const isAdmin = user?.app_role?.includes("Admin") || false
  const isStaff = user?.app_role?.includes("Staff") || false

  // Load categories
  const loadCategories = async () => {
    if (categoriesLoadingRef.current || hasLoadedCategoriesRef.current) {
      console.log("Categories already loaded or loading, skipping")
      return
    }
    
    categoriesLoadingRef.current = true
    setCategoriesLoading(true)
    
    try {
      console.log("Loading categories...")
      const categoryOptions = await referenceApi.getBookCategories()
      setCategories(categoryOptions)
      hasLoadedCategoriesRef.current = true
      console.log("Categories loaded:", categoryOptions.length)
    } catch (err: any) {
      console.error("Error loading categories:", err)
      toast({
        title: "Lỗi!",
        description: err.message || "Không thể tải danh sách danh mục.",
        variant: "destructive",
      })
    } finally {
      categoriesLoadingRef.current = false
      setCategoriesLoading(false)
    }
  }

  const fetchBookList = async (params: BookListParams = {}) => {
    if (!access_token || !mounted) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await booksApi.getList(params)
      setBookList(response.data)
      setTotalPages(response.totalPages)
      setTotalCount(response.totalCount)
      setPageNumber(response.pageNumber)
    } catch (err: any) {
      console.error("Error fetching book list:", err)
      toast({
        title: "Lỗi!",
        description: err.message || "Có lỗi xảy ra khi tải danh sách sách.",
        variant: "destructive",
      })
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchRejectedBooks = async () => {
    if (!access_token || !mounted || !isStaff) return

    setIsLoadingRejected(true)
    try {
      const params: BookListParams = {
        pageNumber: 1,
        pageSize: 50, // Show more rejected books for staff monitoring
        approvalStatus: 2, // Only rejected books
        sortBy: "createdat",
        isAscending: false, // Most recently updated first
      }
      
      const response = await booksApi.getList(params)
      setRejectedBooks(response.data)
    } catch (err: any) {
      console.error("Error fetching rejected books:", err)
    } finally {
      setIsLoadingRejected(false)
    }
  }

  // Initial mount - load categories once
  useEffect(() => {
    if (!mounted) {
      setMounted(true)
      loadCategories()
    }
  }, [mounted])

  // Load rejected books for staff
  useEffect(() => {
    if (mounted && isStaff) {
      fetchRejectedBooks()
    }
  }, [mounted, isStaff])

  // Reset page to 1 when filters change
  useEffect(() => {
    if (mounted) {
      setPageNumber(1)
    }
  }, [searchQuery, categoryFilter, approvalStatusFilter, statusFilter, premiumFilter, sortBy, isAscending, mounted])

  // Initial fetch and filter changes
  useEffect(() => {
    if (!mounted) return

    const params: BookListParams = {
      pageNumber,
      pageSize: 10,
      sortBy: sortBy as any,
      isAscending,
    }

    if (searchQuery.trim()) {
      params.search = searchQuery.trim()
    }

    if (categoryFilter) {
      params.categoryId = categoryFilter
    }

    if (approvalStatusFilter) {
      params.approvalStatus = parseInt(approvalStatusFilter) as 0 | 1 | 2
    }

    if (statusFilter) {
      params.status = parseInt(statusFilter) as 0 | 1
    }

    if (premiumFilter) {
      params.isPremium = premiumFilter === "premium"
    }

    const timeoutId = setTimeout(() => {
      fetchBookList(params)
    }, searchQuery.trim() ? 500 : 0)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, categoryFilter, approvalStatusFilter, statusFilter, premiumFilter, sortBy, isAscending, pageNumber, mounted])

  const handleResetFilters = () => {
    setSearchQuery("")
    setCategoryFilter("")
    setApprovalStatusFilter("")
    setStatusFilter("")
    setPremiumFilter("")
    setSortBy("createdat")
    setIsAscending(false)
    setPageNumber(1)
  }

  const handleViewBook = (bookId: string) => {
    setSelectedBookId(bookId)
    setIsDetailModalOpen(true)
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setSelectedBookId(null)
  }

  const handleEditBook = async (bookId: string): Promise<void> => {
    if (!access_token) return

    setSelectedBookForEdit(bookId)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setSelectedBookForEdit(null)
  }

  const handleReadBook = (bookId: string) => {
    const url = `/read/${bookId}`
    window.open(url, '_blank')
  }

  const handleDownloadBook = async (book: Book) => {
    if (!access_token) return

    try {
      const blob = await booksApi.download(book.id)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `${book.title}.epub`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: "Thành công!",
        description: `Đã tải xuống sách "${book.title}".`,
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

  const handleDeleteBook = (book: Book) => {
    if (!isAdmin) {
      toast({
        title: "Không có quyền!",
        description: "Chỉ Admin mới có quyền xóa sách.",
        variant: "destructive",
      })
      return
    }

    const confirmModal = useConfirmModal.getState()
    confirmModal.open({
      title: "Xác nhận xóa sách",
      description: "Bạn có chắc chắn muốn xóa sách sau không?",
      content: (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-900 border rounded-lg p-3 space-y-1">
            <p className="font-semibold text-gray-900 dark:text-gray-100">"{book.title}"</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Tác giả: {book.author}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">ID: {getShortId(book.id)}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="text-red-600 dark:text-red-400 text-lg leading-none">⚠️</span>
              <div className="space-y-1">
                <p className="text-red-800 dark:text-red-200 text-sm font-medium">
                  Hành động này không thể hoàn tác!
                </p>
                <p className="text-red-700 dark:text-red-300 text-xs">
                  Sẽ xóa tất cả dữ liệu liên quan: chapters, files, cover images
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      confirmText: "Xóa sách",
      confirmVariant: "destructive",
      onConfirm: async () => {
        if (!access_token) return

        try {
          await booksApi.delete(book.id)
          
          toast({
            title: "Thành công!",
            description: `Đã xóa sách "${book.title}" thành công.`,
            variant: "default",
          })

          // Refresh the book list
          const params: BookListParams = {
            pageNumber,
            pageSize: 10,
            sortBy: sortBy as any,
            isAscending,
          }

          if (searchQuery.trim()) params.search = searchQuery.trim()
          if (categoryFilter) params.categoryId = categoryFilter
          if (approvalStatusFilter) params.approvalStatus = parseInt(approvalStatusFilter) as 0 | 1 | 2
          if (statusFilter) params.status = parseInt(statusFilter) as 0 | 1
          if (premiumFilter) params.isPremium = premiumFilter === "premium"

          await fetchBookList(params)
        } catch (err: any) {
          console.error("Error deleting book:", err)
          toast({
            title: "Lỗi!",
            description: err.message || "Có lỗi xảy ra khi xóa sách.",
            variant: "destructive",
          })
          throw err // Re-throw to keep modal in loading state
        }
      }
    })
  }

  const handleResubmitBook = (book: Book) => {
    if (!isStaff) {
      toast({
        title: "Không có quyền!",
        description: "Chỉ Staff mới có quyền resubmit sách.",
        variant: "destructive",
      })
      return
    }

    if (book.approval_status !== 2) {
      toast({
        title: "Không thể resubmit!",
        description: "Chỉ có thể resubmit sách đang ở trạng thái bị từ chối.",
        variant: "destructive",
      })
      return
    }

    const confirmModal = useConfirmModal.getState()
    confirmModal.open({
      title: "Xác nhận resubmit sách",
      description: "Bạn có chắc chắn muốn gửi lại sách này để phê duyệt?",
      content: (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-900 border rounded-lg p-3 space-y-1">
            <p className="font-semibold text-gray-900 dark:text-gray-100">"{book.title}"</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Tác giả: {book.author}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">ID: {getShortId(book.id)}</p>
          </div>
          {book.approval_note && !book.approval_note.includes("[RESUBMITTED]") && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">Lý do từ chối:</h4>
              <p className="text-sm text-red-700 dark:text-red-300">{book.approval_note}</p>
            </div>
          )}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 text-lg leading-none">ℹ️</span>
              <div className="space-y-1">
                <p className="text-blue-800 dark:text-blue-200 text-sm font-medium">
                  Sách sẽ được chuyển về trạng thái "Chờ duyệt"
                </p>
                <p className="text-blue-700 dark:text-blue-300 text-xs">
                  Admin sẽ thấy sách này trong danh sách cần phê duyệt
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
      confirmText: "Resubmit sách",
      confirmVariant: "default",
      onConfirm: async () => {
        if (!access_token) return

        try {
          const resubmitData: ResubmitBookRequest = {
            resubmit_note: "Đã được chỉnh sửa và gửi lại để phê duyệt"
          }

          await booksApi.resubmit(book.id, resubmitData)
          
          toast({
            title: "Thành công!",
            description: `Đã resubmit sách "${book.title}" thành công. Sách đang chờ phê duyệt.`,
            variant: "default",
          })

          // Refresh data in background after modal closes - DON'T await here
          const params: BookListParams = {
            pageNumber,
            pageSize: 10,
            sortBy: sortBy as any,
            isAscending,
          }

          if (searchQuery.trim()) params.search = searchQuery.trim()
          if (categoryFilter) params.categoryId = categoryFilter
          if (approvalStatusFilter) params.approvalStatus = parseInt(approvalStatusFilter) as 0 | 1 | 2
          if (statusFilter) params.status = parseInt(statusFilter) as 0 | 1
          if (premiumFilter) params.isPremium = premiumFilter === "premium"

          // Execute refresh in background without waiting - this allows modal to close immediately
          Promise.all([
            fetchBookList(params),
            fetchRejectedBooks()
          ]).catch(err => {
            console.error("Error refreshing data after resubmit:", err)
            // Optionally show a toast for refresh errors, but don't block modal closing
          })

          // Return immediately so modal closes without delay
        } catch (err: any) {
          console.error("Error resubmitting book:", err)
          toast({
            title: "Lỗi!",
            description: err.message || "Có lỗi xảy ra khi resubmit sách.",
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN")
  }

  const formatRating = (rating: number) => {
    return rating > 0 ? rating.toFixed(1) : "N/A"
  }

  // Helper function to parse and format approval note
  const parseApprovalNote = (note: string) => {
    if (!note) return null

    const lines = note.split('\n')
    const resubmitLine = lines.find(line => line.includes('[RESUBMITTED'))
    const approvedLine = lines.find(line => line.includes('[APPROVED'))
    const rejectedLine = lines.find(line => line.includes('[REJECTED'))
    const rejectionNote = lines.find(line => 
      !line.includes('[RESUBMITTED') && 
      !line.includes('[APPROVED') && 
      !line.includes('[REJECTED')
    )

    return {
      resubmitNote: resubmitLine?.replace(/\[RESUBMITTED[^\]]*\]/, '').trim(),
      resubmitTimestamp: resubmitLine?.match(/\[RESUBMITTED[^\]]*\]/)?.[0],
      approvedNote: approvedLine,
      approvedTimestamp: approvedLine?.match(/\[APPROVED[^\]]*\]/)?.[0],
      rejectedNote: rejectedLine,
      rejectedTimestamp: rejectedLine?.match(/\[REJECTED[^\]]*\]/)?.[0],
      rejectionNote: rejectionNote?.trim(),
      hasResubmit: !!resubmitLine,
      hasApproved: !!approvedLine,
      hasRejected: !!rejectedLine
    }
  }

  const renderRejectedBooksTable = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          Sách bị từ chối ({rejectedBooks.length})
        </CardTitle>
        <CardDescription>
          Danh sách các sách bị từ chối cần được xem xét và chỉnh sửa
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoadingRejected ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2">Đang tải sách bị từ chối...</span>
          </div>
        ) : rejectedBooks.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="text-green-600 font-medium">Tuyệt vời! Không có sách nào bị từ chối</p>
              <p className="text-sm text-muted-foreground">Tất cả sách của bạn đều đã được phê duyệt hoặc đang chờ duyệt</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead className="min-w-[250px]">Sách</TableHead>
                  <TableHead className="w-[120px]">Tác giả</TableHead>
                  <TableHead className="w-[150px]">Lý do từ chối</TableHead>
                  <TableHead className="w-[100px]">Ngày từ chối</TableHead>
                  <TableHead className="w-[80px] text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rejectedBooks.map((book) => (
                  <TableRow key={book.id} className="bg-red-50/50 dark:bg-red-900/10">
                    <TableCell className="font-mono text-sm">
                      {getShortId(book.id)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-12 bg-gray-100 rounded flex items-center justify-center">
                          {book.cover_image_url ? (
                            <img 
                              src={book.cover_image_url} 
                              alt={book.title}
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                              <span className="text-xs text-gray-500">No Image</span>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap" title={book.title}>
                            {book.title}
                          </div>
                          {book.is_premium && (
                            <Badge variant="default" className="mt-1 text-xs">Premium</Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{book.author}</TableCell>
                                        <TableCell>
                      <div className="max-w-[150px]">
                        {book.approval_note ? (
                          <div className="space-y-2">
                            {(() => {
                              const parsed = parseApprovalNote(book.approval_note)
                              if (!parsed) return null
                              const lines = book.approval_note.split('\n').filter(line => line.trim())
                              const totalEntries = lines.length
                              
                              // Get latest entry for quick view
                              const latestEntry = lines[lines.length - 1] || ''
                              let latestType = 'Unknown'
                              let latestMessage = latestEntry
                              
                              if (latestEntry.includes('[APPROVED')) {
                                latestType = 'Approved'
                                latestMessage = latestEntry.replace(/\[APPROVED[^\]]*\]/, '').trim() || 'Đã duyệt'
                              } else if (latestEntry.includes('[REJECTED')) {
                                latestType = 'Rejected'
                                latestMessage = latestEntry.replace(/\[REJECTED[^\]]*\]/, '').trim() || 'Bị từ chối'
                              } else if (latestEntry.includes('[RESUBMITTED')) {
                                latestType = 'Resubmitted'
                                latestMessage = latestEntry.replace(/\[RESUBMITTED[^\]]*\]/, '').trim() || 'Đã resubmit'
                              }

                              return (
                                <>
                                  {/* Quick summary */}
                                  <div className={`rounded p-2 border text-xs ${
                                    book.approval_status === 1 
                                      ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
                                      : book.approval_status === 2 
                                      ? "bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                                      : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                                  }`}>
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-medium">
                                        {latestType}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {totalEntries} sự kiện
                                      </span>
                                    </div>
                                    <p className="line-clamp-2" title={latestMessage}>
                                      {latestMessage}
                                    </p>
                                  </div>
                                  
                                  {/* View full history button */}
                                  <ApprovalHistoryModal
                                    bookTitle={book.title}
                                    approvalNote={book.approval_note}
                                    currentStatus={book.approval_status}
                                    trigger={
                                      <Button variant="outline" size="sm" className="w-full text-xs">
                                        <History className="h-3 w-3 mr-1" />
                                        Xem lịch sử
                                      </Button>
                                    }
                                  />
                                </>
                              )
                            })()}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Không có ghi chú</span>
                        )}
                      </div>
                    </TableCell>
                                         <TableCell>
                       <span className="text-xs text-muted-foreground">
                         {formatDate(book.created_at)}
                       </span>
                     </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewBook(book.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditBook(book.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleResubmitBook(book)}
                          className="bg-orange-500 hover:bg-orange-600"
                        >
                          <RotateCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quản lý sách</h2>
          <p className="text-muted-foreground">
            Quản lý danh sách sách trong thư viện ({totalCount} sách)
          </p>
        </div>
        <CreateBookModal 
          onSuccess={() => {
            const params = {
              pageNumber,
              pageSize: 10,
              sortBy: sortBy as any,
              isAscending,
            }
            fetchBookList(params)
          }} 
        />
      </div>

      {/* Tab Navigation - Only show for Staff */}
      {isStaff && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tất cả sách
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Sách bị từ chối ({rejectedBooks.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-6">
            {/* Filters */}
            {mounted && (
              <div className="flex flex-col gap-4 pb-4 border-b">
                <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Tìm kiếm theo tiêu đề, tác giả, ISBN, nhà xuất bản, tags..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && e.currentTarget.blur()}
                    />
                  </div>

                  <SimpleSelect
                    value={categoryFilter}
                    onValueChange={setCategoryFilter}
                    placeholder="Danh mục"
                    className="w-[130px] shrink-0"
                    options={categories}
                  />

                  <SimpleSelect
                    value={approvalStatusFilter}
                    onValueChange={setApprovalStatusFilter}
                    placeholder="Phê duyệt"
                    className="w-[130px] shrink-0"
                    options={FILTER_OPTIONS.approval}
                  />

                  <SimpleSelect
                    value={statusFilter}
                    onValueChange={setStatusFilter}
                    placeholder="Trạng thái"
                    className="w-[130px] shrink-0"
                    options={FILTER_OPTIONS.status}
                  />

                  <SimpleSelect
                    value={premiumFilter}
                    onValueChange={setPremiumFilter}
                    placeholder="Loại"
                    className="w-[130px] shrink-0"
                    options={FILTER_OPTIONS.premium}
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

                  <Button 
                    onClick={handleResetFilters} 
                    variant="outline" 
                    size="default"
                    className="shrink-0"
                  >
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

            {/* Table */}
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">ID</TableHead>
                      <TableHead className="min-w-[280px]">Sách</TableHead>
                      <TableHead className="w-[120px] hidden md:table-cell">Tác giả</TableHead>
                      <TableHead className="w-[100px] hidden lg:table-cell">Danh mục</TableHead>
                      <TableHead className="w-[100px]">Phê duyệt</TableHead>
                      <TableHead className="w-[80px]">Loại</TableHead>
                      <TableHead className="w-[100px] hidden md:table-cell">Đánh giá</TableHead>
                      <TableHead className="w-[80px] hidden lg:table-cell">Lượt xem</TableHead>
                      <TableHead className="w-[80px] text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24">
                          <div className="flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : bookList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24">
                          <div className="flex items-center justify-center text-muted-foreground">
                            Không có dữ liệu sách
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      bookList.map((book) => (
                        <TableRow key={book.id}>
                          <TableCell className="font-mono text-sm">
                            {getShortId(book.id)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-12 bg-gray-100 rounded flex items-center justify-center">
                                {book.cover_image_url ? (
                                  <img 
                                    src={book.cover_image_url} 
                                    alt={book.title}
                                    className="w-full h-full object-cover rounded"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                                    <span className="text-xs text-gray-500">No Image</span>
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-medium max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap" title={book.title}>
                                  {book.title}
                                </div>
                                <div className="text-sm text-muted-foreground md:hidden">
                                  {book.author}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium hidden md:table-cell">
                            {book.author}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge variant="outline">{book.category_name}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={
                                  book.approval_status === 1 ? "default" : 
                                  book.approval_status === 2 ? "destructive" : "secondary"
                                }
                                className="whitespace-nowrap"
                              >
                                {book.approval_status === 0 ? "Chờ duyệt" : 
                                 book.approval_status === 1 ? "Đã duyệt" : 
                                 "Từ chối"}
                              </Badge>
                              {book.approval_status === 2 && isStaff && (
                                <div className="flex items-center gap-1">
                                  <RotateCw className="h-3 w-3 text-orange-500" />
                                  <span className="text-xs text-orange-600 font-medium">Resubmit</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={book.is_premium ? "default" : "secondary"} className="whitespace-nowrap">
                              {book.is_premium ? "Trả phí" : "Miễn phí"}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="flex items-center space-x-1">
                              <span className="text-sm font-medium">{formatRating(book.average_rating)}</span>
                              <span className="text-sm text-muted-foreground">({book.total_ratings})</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <span className="font-mono text-sm">
                              {book.total_views.toLocaleString()}
                            </span>
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
                              <DropdownMenuItem onClick={() => handleViewBook(book.id)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Xem chi tiết
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleReadBook(book.id)}>
                                <BookOpen className="mr-2 h-4 w-4" />
                                Đọc sách
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadBook(book)}>
                                <Download className="mr-2 h-4 w-4" />
                                Tải xuống
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditBook(book.id)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Chỉnh sửa
                              </DropdownMenuItem>
                              {isStaff && book.approval_status === 2 && (
                                <DropdownMenuItem onClick={() => handleResubmitBook(book)}>
                                  <RotateCw className="mr-2 h-4 w-4" />
                                  Resubmit
                                </DropdownMenuItem>
                              )}
                              {isAdmin && (
                                <DropdownMenuItem onClick={() => bookStatusModal.openModal({
                                  bookId: book.id,
                                  bookTitle: book.title,
                                  currentBookStatus: book.status,
                                  currentApprovalStatus: book.approval_status,
                                  currentPremium: book.is_premium,
                                })}>
                                  <Settings className="mr-2 h-4 w-4" />
                                  Quản lý trạng thái
                                </DropdownMenuItem>
                              )}
                              {isAdmin && (
                                <DropdownMenuItem 
                                  className="text-red-600" 
                                  onClick={() => handleDeleteBook(book)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Xóa sách
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Pagination */}
            {mounted && totalPages > 1 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Hiển thị {bookList.length} trong tổng số {totalCount} sách
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
          </TabsContent>

          <TabsContent value="rejected" className="space-y-6">
            {renderRejectedBooksTable()}
          </TabsContent>
        </Tabs>
      )}

      {/* For non-staff users, show the original layout */}
      {!isStaff && (
        <>
          {/* Filters */}
          {mounted && (
            <div className="flex flex-col gap-4 pb-4 border-b">
              <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Tìm kiếm theo tiêu đề, tác giả, ISBN, nhà xuất bản, tags..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  />
                </div>

                <SimpleSelect
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                  placeholder="Danh mục"
                  className="w-[130px] shrink-0"
                  options={categories}
                />

                <SimpleSelect
                  value={approvalStatusFilter}
                  onValueChange={setApprovalStatusFilter}
                  placeholder="Phê duyệt"
                  className="w-[130px] shrink-0"
                  options={FILTER_OPTIONS.approval}
                />

                <SimpleSelect
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                  placeholder="Trạng thái"
                  className="w-[130px] shrink-0"
                  options={FILTER_OPTIONS.status}
                />

                <SimpleSelect
                  value={premiumFilter}
                  onValueChange={setPremiumFilter}
                  placeholder="Loại"
                  className="w-[130px] shrink-0"
                  options={FILTER_OPTIONS.premium}
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

                <Button 
                  onClick={handleResetFilters} 
                  variant="outline" 
                  size="default"
                  className="shrink-0"
                >
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

          {/* Table */}
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead className="min-w-[280px]">Sách</TableHead>
                    <TableHead className="w-[120px] hidden md:table-cell">Tác giả</TableHead>
                    <TableHead className="w-[100px] hidden lg:table-cell">Danh mục</TableHead>
                    <TableHead className="w-[100px]">Phê duyệt</TableHead>
                    <TableHead className="w-[80px]">Loại</TableHead>
                    <TableHead className="w-[100px] hidden md:table-cell">Đánh giá</TableHead>
                    <TableHead className="w-[80px] hidden lg:table-cell">Lượt xem</TableHead>
                    <TableHead className="w-[80px] text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24">
                        <div className="flex items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : bookList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24">
                        <div className="flex items-center justify-center text-muted-foreground">
                          Không có dữ liệu sách
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    bookList.map((book) => (
                      <TableRow key={book.id}>
                        <TableCell className="font-mono text-sm">
                          {getShortId(book.id)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-12 bg-gray-100 rounded flex items-center justify-center">
                              {book.cover_image_url ? (
                                <img 
                                  src={book.cover_image_url} 
                                  alt={book.title}
                                  className="w-full h-full object-cover rounded"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 rounded flex items-center justify-center">
                                  <span className="text-xs text-gray-500">No Image</span>
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-medium max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap" title={book.title}>
                                {book.title}
                              </div>
                              <div className="text-sm text-muted-foreground md:hidden">
                                {book.author}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium hidden md:table-cell">
                          {book.author}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="outline">{book.category_name}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={
                                book.approval_status === 1 ? "default" : 
                                book.approval_status === 2 ? "destructive" : "secondary"
                              }
                              className="whitespace-nowrap"
                            >
                              {book.approval_status === 0 ? "Chờ duyệt" : 
                               book.approval_status === 1 ? "Đã duyệt" : 
                               "Từ chối"}
                            </Badge>
                                                         {book.approval_status === 2 && isStaff && (
                               <div className="flex items-center gap-1">
                                 <RotateCw className="h-3 w-3 text-orange-500" />
                                 <span className="text-xs text-orange-600 font-medium">Resubmit</span>
                               </div>
                             )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={book.is_premium ? "default" : "secondary"} className="whitespace-nowrap">
                            {book.is_premium ? "Trả phí" : "Miễn phí"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center space-x-1">
                            <span className="text-sm font-medium">{formatRating(book.average_rating)}</span>
                            <span className="text-sm text-muted-foreground">({book.total_ratings})</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="font-mono text-sm">
                            {book.total_views.toLocaleString()}
                          </span>
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
                              <DropdownMenuItem onClick={() => handleViewBook(book.id)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Xem chi tiết
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleReadBook(book.id)}>
                                <BookOpen className="mr-2 h-4 w-4" />
                                Đọc sách
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownloadBook(book)}>
                                <Download className="mr-2 h-4 w-4" />
                                Tải xuống
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditBook(book.id)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Chỉnh sửa
                              </DropdownMenuItem>
                              {isStaff && book.approval_status === 2 && (
                                <DropdownMenuItem onClick={() => handleResubmitBook(book)}>
                                  <RotateCw className="mr-2 h-4 w-4" />
                                  Resubmit
                                </DropdownMenuItem>
                              )}
                              {isAdmin && (
                                <DropdownMenuItem onClick={() => bookStatusModal.openModal({
                                  bookId: book.id,
                                  bookTitle: book.title,
                                  currentBookStatus: book.status,
                                  currentApprovalStatus: book.approval_status,
                                  currentPremium: book.is_premium,
                                })}>
                                  <Settings className="mr-2 h-4 w-4" />
                                  Quản lý trạng thái
                                </DropdownMenuItem>
                              )}
                              {isAdmin && (
                                <DropdownMenuItem 
                                  className="text-red-600" 
                                  onClick={() => handleDeleteBook(book)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Xóa sách
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Pagination */}
          {mounted && totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Hiển thị {bookList.length} trong tổng số {totalCount} sách
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
        </>
      )}

      {/* Modals */}
      {selectedBookId && (
        <BookDetailModal
          bookId={selectedBookId}
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
        />
      )}

      {selectedBookForEdit && (
        <UpdateBookModal
          bookId={selectedBookForEdit}
          open={isEditModalOpen}
          onOpenChange={(open) => {
            setIsEditModalOpen(open)
            if (!open) {
              handleCloseEditModal()
            }
          }}
          onSuccess={() => {
            handleCloseEditModal()
            fetchBookList({ pageNumber, pageSize: 10, sortBy: sortBy as any, isAscending })
          }}
        />
      )}

      {bookStatusModal.bookData && (
        <BookStatusModal
          bookId={bookStatusModal.bookData.bookId}
          bookTitle={bookStatusModal.bookData.bookTitle}
          currentBookStatus={bookStatusModal.bookData.currentBookStatus}
          currentApprovalStatus={bookStatusModal.bookData.currentApprovalStatus}
          currentPremium={bookStatusModal.bookData.currentPremium}
          open={bookStatusModal.isOpen}
          onOpenChange={bookStatusModal.closeModal}
          onSuccess={() => {
            bookStatusModal.closeModal()
            fetchBookList({ pageNumber, pageSize: 10, sortBy: sortBy as any, isAscending })
          }}
        >
          {/* No trigger needed - controlled externally */}
          <div />
        </BookStatusModal>
      )}

    </div>
  )
}
