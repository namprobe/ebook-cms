import { getApiUrl, config, devLog, authFetch } from "@/lib/config"
import { referenceApi, type DropdownOption } from "./reference"

export interface BookCategory {
  id: string
  name: string
  description: string
  status: string
  books_count: number
  created_at: string
}

export interface CreateCategoryRequest {
  name: string
  description: string
}

export interface UpdateCategoryRequest {
  name?: string
  description?: string
  isActive?: boolean
}

export interface CategoryListParams {
  name?: string
  description?: string
  status?: number
  sortBy?: "name" | "description" | "status" | "createdat" | "bookscount"
  isAscending?: boolean
  pageNumber?: number
  pageSize?: number
}

export interface CategoryListResponse {
  data: BookCategory[]
  pageNumber: number
  pageSize: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export const categoriesApi = {
  // Tạo danh mục sách mới
  create: async (data: CreateCategoryRequest): Promise<BookCategory> => {
    const response = await authFetch(getApiUrl(config.api.categories.create), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Tạo danh mục thất bại")
    }

    return result.data
  },

  // Lấy danh sách danh mục với lọc, sắp xếp và phân trang
  getList: async (params: CategoryListParams): Promise<CategoryListResponse> => {
    const searchParams = new URLSearchParams()
    
    if (params.name) searchParams.append("name", params.name)
    if (params.description) searchParams.append("description", params.description)
    if (params.status !== undefined) searchParams.append("status", params.status.toString())
    if (params.sortBy) searchParams.append("sortBy", params.sortBy)
    if (params.isAscending !== undefined) searchParams.append("isAscending", params.isAscending.toString())
    if (params.pageNumber) searchParams.append("pageNumber", params.pageNumber.toString())
    if (params.pageSize) searchParams.append("pageSize", params.pageSize.toString())

    const url = getApiUrl(`${config.api.categories.list}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`)
    devLog("Categories list API request URL:", url)
    
    const response = await authFetch(url)

    const result = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Lấy danh sách danh mục thất bại")
    }

    return {
      data: result.data,
      pageNumber: result.pageNumber,
      pageSize: result.pageSize,
      totalPages: result.totalPages,
      totalCount: result.totalCount,
      hasPreviousPage: result.hasPreviousPage,
      hasNextPage: result.hasNextPage,
    }
  },

  // Lấy danh sách danh mục (phương thức cũ - giữ để tương thích)
  getAll: async (): Promise<BookCategory[]> => {
    const response = await authFetch(getApiUrl(config.api.categories.getAll))

    const result = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Lấy danh sách danh mục thất bại")
    }

    return result.data
  },

  // Lấy chi tiết danh mục theo ID
  getById: async (id: string): Promise<BookCategory> => {
    const response = await authFetch(getApiUrl(config.api.categories.getById(id)))

    const result = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Lấy thông tin danh mục thất bại")
    }

    return result.data
  },

  // Cập nhật danh mục
  update: async (id: string, data: UpdateCategoryRequest): Promise<BookCategory> => {
    const response = await authFetch(getApiUrl(config.api.categories.update(id)), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Cập nhật danh mục thất bại")
    }

    return result.data
  },

  // Xóa danh mục
  delete: async (id: string): Promise<void> => {
    const response = await authFetch(getApiUrl(config.api.categories.delete(id)), {
      method: "DELETE",
    })

    const result = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Xóa danh mục thất bại")
    }
  },

  // Lấy danh sách categories cho dropdown (sử dụng reference API)
  getForDropdown: async (): Promise<DropdownOption[]> => {
    return await referenceApi.getBookCategories()
  },
}
