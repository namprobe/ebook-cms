import { getReferenceApiUrl, config, devLog } from "@/lib/config"

// Interface cho dropdown option
export interface DropdownOption {
  value: string
  label: string
}

// Interface cho book category reference
export interface BookCategoryReference {
  id: string
  name: string
  status?: string // Optional vì có thể không có trong response
}

// Response interface cho reference APIs
export interface ReferenceResponse<T> {
  result: string
  data: T[]
  message: string
}

export const referenceApi = {
  // Lấy danh sách book categories cho dropdown (KHÔNG cần token)
  getBookCategories: async (): Promise<DropdownOption[]> => {
    const url = getReferenceApiUrl(config.referenceApi.bookCategories)
    devLog("Reference API - Book Categories URL:", url)
    
    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          // Không có Authorization header vì reference API không cần token
        },
      })

      const result: ReferenceResponse<BookCategoryReference> = await response.json()
      
      if (!response.ok || result.result !== "success") {
        throw new Error(result.message || "Lấy danh sách danh mục thất bại")
      }

      // Transform data to dropdown options
      const options: DropdownOption[] = result.data
        .filter(category => !category.status || category.status === "Active") // Lấy tất cả nếu không có status, hoặc chỉ lấy Active
        .map(category => ({
          value: category.id,
          label: category.name
        }))

      devLog("Book categories for dropdown loaded:", { total: result.data.length, filtered: options.length, options })
      return options
      
    } catch (error: any) {
      devLog("Reference API error:", error.message)
      throw error
    }
  },

  // Có thể thêm các reference APIs khác ở đây (KHÔNG cần token)
  // getAuthors: async (): Promise<DropdownOption[]> => { ... }
  // getPublishers: async (): Promise<DropdownOption[]> => { ... }
}
