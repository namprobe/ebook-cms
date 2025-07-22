"use client"

import { useState, useEffect, useRef } from "react"
import { Settings, Loader2, Eye, Edit, RotateCw } from "lucide-react"

import { useAppSelector } from "@/lib/hooks"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SimpleSelect } from "@/components/ui/simple-select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/lib/hooks/use-toast"
import { booksApi, type Book, type BookListParams, type BookStatistics } from "@/lib/api/books"
import { referenceApi, type DropdownOption } from "@/lib/api/reference"
import BookStatusModal, { useBookStatusModal } from "./book-status-modal"
import BookDetailModal from "./book-detail-modal"

const FILTER_OPTIONS = {
  approval: [
    { value: "0", label: "Chờ duyệt" },
    { value: "1", label: "Đã duyệt" },
    { value: "2", label: "Từ chối" }
  ],
  sort: [
    { value: "createdat-desc", label: "Mới nhất" },
    { value: "createdat-asc", label: "Cũ nhất" },
    { value: "title-asc", label: "Tên A→Z" },
    { value: "title-desc", label: "Tên Z→A" },
  ]
}

export default function ApprovalManagement() {
  const [bookList, setBookList] = useState<Book[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("")
  const [approvalStatusFilter, setApprovalStatusFilter] = useState<string>("0") // Default to pending
  const [sortBy, setSortBy] = useState<string>("createdat")
  const [isAscending, setIsAscending] = useState(false)
  const [pageNumber, setPageNumber] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  
  // Statistics
  const [stats, setStats] = useState<BookStatistics>({
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    total_count: 0,
    active_count: 0,
    inactive_count: 0,
    premium_count: 0,
    free_count: 0
  })
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  
  // Categories
  const [categories, setCategories] = useState<DropdownOption[]>([])
  
  // Refs to prevent duplicate API calls
  const hasLoadedCategoriesRef = useRef(false)
  const categoriesLoadingRef = useRef(false)
  const hasLoadedStatsRef = useRef(false)
  const statsLoadingRef = useRef(false)
  
  // Modals
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const bookStatusModal = useBookStatusModal()

  const { access_token, user } = useAppSelector((state) => state.auth)
  const { toast } = useToast()

  // Kiểm tra quyền Admin
  const isAdmin = user?.app_role?.includes("Admin") || false

  // Load categories with duplicate prevention
  const loadCategories = async () => {
    if (categoriesLoadingRef.current || hasLoadedCategoriesRef.current) {
      console.log("Categories already loaded or loading for approval management, skipping")
      return
    }

    categoriesLoadingRef.current = true
    try {
      console.log("Loading categories for approval management...")
      const categoryOptions = await referenceApi.getBookCategories()
      setCategories(categoryOptions)
      hasLoadedCategoriesRef.current = true
      console.log("Categories loaded for approval:", categoryOptions.length)
    } catch (err: any) {
      console.error("Error loading categories:", err)
      toast({
        title: "Lỗi!",
        description: err.message || "Có lỗi xảy ra khi tải danh mục.",
        variant: "destructive",
      })
    } finally {
      categoriesLoadingRef.current = false
    }
  }

  // Load statistics using new dedicated API with duplicate prevention
  const loadStatistics = async (forceReload = false) => {
    if (!forceReload && (statsLoadingRef.current || hasLoadedStatsRef.current)) {
      console.log("Statistics already loaded or loading for approval management, skipping")
      return
    }

    statsLoadingRef.current = true
    try {
      setIsLoadingStats(true)
      console.log("Loading statistics for approval management...")
      const statistics = await booksApi.getStatistics()
      setStats(statistics)
      hasLoadedStatsRef.current = true
      console.log("Statistics loaded for approval:", statistics)
    } catch (err: any) {
      console.error("Error loading statistics:", err)
      toast({
        title: "Lỗi!",
        description: err.message || "Có lỗi xảy ra khi tải thống kê.",
        variant: "destructive",
      })
    } finally {
      statsLoadingRef.current = false
      setIsLoadingStats(false)
    }
  }

  // Fetch book list
  const fetchBookList = async (params: BookListParams = {}) => {
    if (!access_token) return

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

  // Initial load
  useEffect(() => {
    if (access_token && isAdmin) {
      loadCategories()
      loadStatistics()
    }
  }, [access_token, isAdmin])

  // Reset page when filters change
  useEffect(() => {
    setPageNumber(1)
  }, [searchQuery, categoryFilter, approvalStatusFilter, sortBy, isAscending])

  // Fetch data when filters change (optimized with useMemo for params)
  useEffect(() => {
    if (!access_token || !isAdmin) return

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

    // Use debounce only for search, immediate for others
    const delay = searchQuery.trim() ? 500 : 0
    const timeoutId = setTimeout(() => {
      fetchBookList(params)
    }, delay)

    return () => clearTimeout(timeoutId)
  }, [searchQuery, categoryFilter, approvalStatusFilter, sortBy, isAscending, pageNumber, access_token, isAdmin])

  const handleViewBook = (bookId: string) => {
    setSelectedBookId(bookId)
    setIsDetailModalOpen(true)
  }

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false)
    setSelectedBookId(null)
  }

  const handleRefreshData = async () => {
    // Refresh both statistics and book list in parallel
    const params: BookListParams = {
      pageNumber,
      pageSize: 10,
      sortBy: sortBy as any,
      isAscending,
    }

    if (searchQuery.trim()) params.search = searchQuery.trim()
    if (categoryFilter) params.categoryId = categoryFilter
    if (approvalStatusFilter) params.approvalStatus = parseInt(approvalStatusFilter) as 0 | 1 | 2

    // Force reload statistics when manually refreshing
    await Promise.all([
      loadStatistics(true), // forceReload = true
      fetchBookList(params)
    ])
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    })
  }

  const getShortId = (id: string) => {
    return id.slice(-8)
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Không có quyền truy cập</h3>
          <p className="text-muted-foreground">Chỉ Admin mới có quyền phê duyệt sách</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Phê duyệt sách mới</h2>
        <p className="text-muted-foreground">Phê duyệt các sách mới được tải lên hệ thống</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Chờ duyệt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {isLoadingStats ? "..." : stats.pending_count}
            </div>
            <p className="text-sm text-muted-foreground">Sách cần phê duyệt</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Đã duyệt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {isLoadingStats ? "..." : stats.approved_count}
            </div>
            <p className="text-sm text-muted-foreground">Sách đã được duyệt</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Từ chối</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {isLoadingStats ? "..." : stats.rejected_count}
            </div>
            <p className="text-sm text-muted-foreground">Sách bị từ chối</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 pb-4 border-b">
        <div className="flex-1">
          <Input
            placeholder="Tìm kiếm theo tiêu đề, tác giả..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        
        <SimpleSelect
          value={categoryFilter}
          onValueChange={setCategoryFilter}
          placeholder="Danh mục"
          className="w-[150px]"
          options={categories}
        />

        <SimpleSelect
          value={approvalStatusFilter}
          onValueChange={setApprovalStatusFilter}
          placeholder="Trạng thái phê duyệt"
          className="w-[150px]"
          options={FILTER_OPTIONS.approval}
        />

        <SimpleSelect
          value={`${sortBy}-${isAscending ? 'asc' : 'desc'}`}
          onValueChange={(value) => {
            const [field, direction] = value.split('-')
            setSortBy(field)
            setIsAscending(direction === 'asc')
          }}
          placeholder="Sắp xếp"
          className="w-[130px]"
          options={FILTER_OPTIONS.sort}
        />

        <Button onClick={handleRefreshData} variant="outline">
          Làm mới
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Books Table */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách sách ({totalCount})</CardTitle>
          <CardDescription>
            {approvalStatusFilter === "0" ? (
              <div className="space-y-1">
                <p>Ưu tiên xử lý các sách chờ duyệt.</p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <RotateCw className="h-3 w-3 text-blue-500" />
                    <span className="text-blue-600 font-medium">Resubmitted:</span>
                    <span className="text-muted-foreground">Sách đã được gửi lại sau khi bị từ chối</span>
                  </div>
                </div>
              </div>
            ) : "Danh sách sách theo trạng thái đã chọn"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">ID</TableHead>
                  <TableHead className="min-w-[250px]">Tên sách</TableHead>
                  <TableHead className="w-[150px]">Tác giả</TableHead>
                  <TableHead className="w-[120px]">Danh mục</TableHead>
                  <TableHead className="w-[100px]">Trạng thái</TableHead>
                  <TableHead className="w-[100px]">Ngày tải lên</TableHead>
                  <TableHead className="w-[120px] text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24">
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : bookList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24">
                      <div className="flex items-center justify-center text-muted-foreground">
                        {approvalStatusFilter === "0" ? "Không có sách nào cần phê duyệt" : "Không có dữ liệu"}
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
                        <Badge variant="outline">{book.category_name}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              book.approval_status === 1 ? "default" : 
                              book.approval_status === 2 ? "destructive" : "secondary"
                            }
                          >
                            {book.approval_status === 0 ? "Chờ duyệt" : 
                             book.approval_status === 1 ? "Đã duyệt" : 
                             "Từ chối"}
                          </Badge>
                          {book.approval_status === 0 && book.approval_note?.includes("[RESUBMITTED]") && (
                            <div className="flex items-center gap-1">
                              <RotateCw className="h-3 w-3 text-blue-500" />
                              <span className="text-xs text-blue-600 font-medium">Resubmitted</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(book.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
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
                            onClick={() => bookStatusModal.openModal({
                              bookId: book.id,
                              bookTitle: book.title,
                              currentBookStatus: book.status,
                              currentApprovalStatus: book.approval_status,
                              currentPremium: book.is_premium,
                            })}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
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

      {/* Modals */}
      {selectedBookId && (
        <BookDetailModal
          bookId={selectedBookId}
          isOpen={isDetailModalOpen}
          onClose={handleCloseDetailModal}
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
          onSuccess={handleRefreshData}
        >
          <div />
        </BookStatusModal>
      )}
    </div>
  )
} 