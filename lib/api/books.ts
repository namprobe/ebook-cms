import { getApiUrl, config, devLog, authFetch } from "@/lib/config"

export interface CreateBookRequest {
  file: File
  category_id: string
  is_premium?: boolean
  tags?: string
  isbn?: string
}

export interface BookStatusRequest {
  status?: 0 | 1 // 0: Inactive, 1: Active
  approval_status?: 0 | 1 | 2 // 0: Pending, 1: Approved, 2: Rejected
  approval_note?: string
  is_premium?: boolean
}

export interface ResubmitBookRequest {
  resubmit_note?: string
}

export interface Book {
  id: string
  title: string
  author: string
  description: string
  category_id: string
  category_name: string
  approval_status: 0 | 1 | 2 // 0: Pending, 1: Approved, 2: Rejected
  approval_status_string: string // String representation
  status: 0 | 1 // 0: Inactive, 1: Active
  status_string: string // String representation
  cover_image_url: string
  is_premium: boolean
  average_rating: number
  total_ratings: number
  total_views: number
  published_date: string
  created_at: string
  approval_note?: string // Available for resubmitted books
}

export interface BookDetail extends Book {
  isbn?: string
  publisher?: string
  status: 0 | 1 // 0: Inactive, 1: Active
  status_string: string // String representation
  has_chapters: boolean
  tags?: string
  file_path?: string
  file_url?: string
  page_count: number
  modified_at: string
  approval_note?: string
}

export interface BookDetailResponse {
  id: string
  title: string
  author: string
  description: string
  category_id: string
  category_name: string
  approval_status: 0 | 1 | 2 // 0: Pending, 1: Approved, 2: Rejected
  approval_status_string: string // String representation
  cover_image_url: string
  is_premium: boolean
  average_rating: number
  total_ratings: number
  total_views: number
  published_date: string
  created_at: string
  isbn?: string
  publisher?: string
  status: 0 | 1 // 0: Inactive, 1: Active
  status_string: string // String representation
  has_chapters: boolean
  tags?: string
  file_path?: string
  file_url?: string
  page_count: number
  modified_at: string
  approval_note?: string
}

export interface ChapterResponse {
  id: string
  title: string
  order: number
  href?: string
  cfi?: string
  parent_chapter_id?: string
  child_chapters?: ChapterResponse[]
}

export interface BookListParams {
  // Tìm kiếm kết hợp tất cả trường text (title, author, isbn, publisher, tags)
  search?: string
  // Lọc theo danh mục
  categoryId?: string
  // Lọc theo trạng thái phê duyệt (0: Pending, 1: Approved, 2: Rejected)
  approvalStatus?: 0 | 1 | 2
  // Lọc theo trạng thái sách (0: Active, 1: Inactive)
  status?: 0 | 1
  // Lọc theo loại sách có phí
  isPremium?: boolean
  // Lọc theo sách có chapters
  hasChapters?: boolean
  // Lọc theo khoảng ngày xuất bản
  publishedDateFrom?: string
  publishedDateTo?: string
  // Lọc theo rating
  minRating?: number
  maxRating?: number
  minTotalRatings?: number
  minTotalViews?: number
  maxTotalViews?: number
  // Sắp xếp
  sortBy?: "title" | "author" | "isbn" | "publisher" | "approvalstatus" | "status" | "ispremium" | "pagecount" | "publisheddate" | "createdat" | "rating" | "totalratings" | "totalviews"
  isAscending?: boolean
  // Phân trang
  pageNumber?: number
  pageSize?: number
}

export interface BookListResponse {
  data: Book[]
  pageNumber: number
  pageSize: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export interface BookStatistics {
  pending_count: number
  approved_count: number
  rejected_count: number
  total_count: number
  active_count: number
  inactive_count: number
  premium_count: number
  free_count: number
}

export const booksApi = {
  // Tạo sách mới từ EPUB
  create: async (data: CreateBookRequest) => {
    const formData = new FormData()

    formData.append("file", data.file)
    formData.append("category_id", data.category_id)

    if (data.is_premium !== undefined) formData.append("is_premium", data.is_premium.toString())
    if (data.tags) formData.append("tags", data.tags)
    if (data.isbn) formData.append("isbn", data.isbn)

    const response = await authFetch(getApiUrl(config.api.books.create), {
      method: "POST",
      body: formData,
    })

    const result = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Tạo sách thất bại")
    }

    return result.data
  },

  // Cập nhật sách
  update: async (bookId: string, updateData: FormData) => {
    const response = await authFetch(getApiUrl(config.api.books.update(bookId)), {
      method: "PATCH",
      body: updateData,
    })

    const result = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Cập nhật sách thất bại")
    }

    return result.data
  },

  // Cập nhật trạng thái sách (chỉ Admin)
  updateStatus: async (bookId: string, data: BookStatusRequest) => {
    const response = await authFetch(getApiUrl(config.api.books.updateStatus(bookId)), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.message || "Cập nhật trạng thái sách thất bại")
    }

    const result = await response.json()
    if (result.result !== "success") {
      throw new Error(result.message || "Cập nhật trạng thái sách thất bại")
    }

    return result.data
  },

  // Lấy danh sách sách với lọc, sắp xếp và phân trang
  getList: async (params: BookListParams): Promise<BookListResponse> => {
    const searchParams = new URLSearchParams()
    
    if (params.search) searchParams.append("search", params.search)
    if (params.categoryId) searchParams.append("categoryId", params.categoryId)
    if (params.approvalStatus !== undefined) searchParams.append("approvalStatus", params.approvalStatus.toString())
    if (params.status !== undefined) searchParams.append("status", params.status.toString())
    if (params.isPremium !== undefined) searchParams.append("isPremium", params.isPremium.toString())
    if (params.hasChapters !== undefined) searchParams.append("hasChapters", params.hasChapters.toString())
    if (params.publishedDateFrom) searchParams.append("publishedDateFrom", params.publishedDateFrom)
    if (params.publishedDateTo) searchParams.append("publishedDateTo", params.publishedDateTo)
    if (params.minRating !== undefined) searchParams.append("minRating", params.minRating.toString())
    if (params.maxRating !== undefined) searchParams.append("maxRating", params.maxRating.toString())
    if (params.minTotalRatings !== undefined) searchParams.append("minTotalRatings", params.minTotalRatings.toString())
    if (params.minTotalViews !== undefined) searchParams.append("minTotalViews", params.minTotalViews.toString())
    if (params.maxTotalViews !== undefined) searchParams.append("maxTotalViews", params.maxTotalViews.toString())
    if (params.sortBy) searchParams.append("sortBy", params.sortBy)
    if (params.isAscending !== undefined) searchParams.append("isAscending", params.isAscending.toString())
    if (params.pageNumber) searchParams.append("pageNumber", params.pageNumber.toString())
    if (params.pageSize) searchParams.append("pageSize", params.pageSize.toString())

    const url = getApiUrl(`${config.api.books.list}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`)
    devLog("Books API request URL:", url)
    
    const response = await authFetch(url)

    const result = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Lấy danh sách sách thất bại")
    }

    return {
      data: result.data.data,
      pageNumber: result.data.pageNumber,
      pageSize: result.data.pageSize,
      totalPages: result.data.totalPages,
      totalCount: result.data.totalCount,
      hasPreviousPage: result.data.hasPreviousPage,
      hasNextPage: result.data.hasNextPage,
    }
  },

  // Lấy thông tin chi tiết sách (không có chapters)
  getDetail: async (bookId: string): Promise<BookDetailResponse> => {
    const response = await authFetch(getApiUrl(config.api.books.getDetail(bookId)))

    const result = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Lấy thông tin sách thất bại")
    }

    return result.data
  },

  // Lấy danh sách chapters của sách
  getChapters: async (bookId: string): Promise<ChapterResponse[]> => {
    const response = await authFetch(getApiUrl(config.api.books.getChapters(bookId)))

    const result = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Lấy danh sách chapters thất bại")
    }

    return result.data
  },

  // Xóa sách (chỉ Admin)
  delete: async (bookId: string) => {
    const response = await authFetch(getApiUrl(config.api.books.delete(bookId)), {
      method: "DELETE",
    })

    const result = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Xóa sách thất bại")
    }

    return result.data
  },

  // Lấy thống kê sách
  getStatistics: async (): Promise<BookStatistics> => {
    const response = await authFetch(getApiUrl(config.api.books.statistics))

    const result = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Lấy thống kê sách thất bại")
    }

    return result.data
  },

  // Resubmit sách bị từ chối (Staff/Admin)
  resubmit: async (bookId: string, data: ResubmitBookRequest) => {
    const response = await authFetch(getApiUrl(config.api.books.resubmit(bookId)), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.message || "Resubmit sách thất bại")
    }

    const result = await response.json()
    if (result.result !== "success") {
      throw new Error(result.message || "Resubmit sách thất bại")
    }

    // API chỉ trả về Result (success/failure), không có data
    return result
  },

  // Download sách (Admin/Staff)
  download: async (bookId: string) => {
    const response = await authFetch(getApiUrl(config.api.books.download(bookId)))

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.message || "Download sách thất bại")
    }

    // Return blob for file download
    return response.blob()
  },
}
