import { getApiUrl, config, devLog, authFetch } from "@/lib/config"

export interface CreateSubscriptionRequest {
  name: string
  description?: string
  price: number
  duration: number
  features: string[]
  is_popular: boolean
  display_order: number
  status: 0 | 1 // 0: Inactive, 1: Active
}

export interface UpdateSubscriptionRequest {
  name?: string
  description?: string
  price?: number
  duration?: number
  features?: string[]
  is_popular?: boolean
  display_order?: number
  status?: 0 | 1 // 0: Inactive, 1: Active
}

export interface SubscriptionResponse {
  id: string
  name: string
  description: string
  price: number
  duration: number
  features: string[]
  is_popular: boolean
  display_order: number
  status: 0 | 1 // 0: Inactive, 1: Active
  created_at: string
}

export interface SubscriptionFilterModel {
  name?: string
  minPrice?: number
  maxPrice?: number
  minDuration?: number
  maxDuration?: number
  status?: 0 | 1 // 0: Inactive, 1: Active
  isPopular?: boolean
  // Base filter properties
  sortBy?: "name" | "price" | "duration" | "createdat" | "modifiedat" | "displayorder"
  isAscending?: boolean
  pageNumber?: number
  pageSize?: number
}

export interface SubscriptionListResponse {
  data: SubscriptionResponse[]
  pageNumber: number
  pageSize: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export interface SubscriptionStatistics {
  totalPlans: number
  activeSubscribers: number
  revenue: number
  popularPlan: string
}

export const subscriptionsApi = {
  // Tạo subscription plan mới
  create: async (data: CreateSubscriptionRequest) => {
    const response = await authFetch(getApiUrl(config.api.subscriptions.create), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Tạo subscription plan thất bại")
    }

    return result.data
  },

  // Cập nhật subscription plan
  update: async (subscriptionId: string, data: UpdateSubscriptionRequest) => {
    const response = await authFetch(getApiUrl(config.api.subscriptions.update(subscriptionId)), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Cập nhật subscription plan thất bại")
    }

    return result.data
  },

  // Lấy danh sách subscription plans với lọc, sắp xếp và phân trang
  getList: async (params: SubscriptionFilterModel): Promise<SubscriptionListResponse> => {
    const searchParams = new URLSearchParams()
    
    // Use searchKeyword instead of name for global search
    if (params.name) searchParams.append("searchKeyword", params.name)
    if (params.minPrice !== undefined) searchParams.append("minPrice", params.minPrice.toString())
    if (params.maxPrice !== undefined) searchParams.append("maxPrice", params.maxPrice.toString())
    if (params.minDuration !== undefined) searchParams.append("minDuration", params.minDuration.toString())
    if (params.maxDuration !== undefined) searchParams.append("maxDuration", params.maxDuration.toString())
    if (params.status !== undefined) searchParams.append("status", params.status.toString())
    if (params.isPopular !== undefined) searchParams.append("isPopular", params.isPopular.toString())
    if (params.sortBy) searchParams.append("sortBy", params.sortBy)
    if (params.isAscending !== undefined) searchParams.append("isAscending", params.isAscending.toString())
    if (params.pageNumber) searchParams.append("pageNumber", params.pageNumber.toString())
    if (params.pageSize) searchParams.append("pageSize", params.pageSize.toString())

    const url = getApiUrl(`${config.api.subscriptions.list}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`)
    devLog("Subscriptions API request URL:", url)
    
    const response = await authFetch(url)

    const result = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Lấy danh sách subscription plans thất bại")
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

  // Lấy thông tin chi tiết subscription plan
  getDetail: async (subscriptionId: string): Promise<SubscriptionResponse> => {
    const response = await authFetch(getApiUrl(config.api.subscriptions.getById(subscriptionId)))

    const result = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Lấy thông tin subscription plan thất bại")
    }

    return result.data
  },

  // Xóa subscription plan (chỉ Admin)
  delete: async (subscriptionId: string) => {
    const response = await authFetch(getApiUrl(config.api.subscriptions.delete(subscriptionId)), {
      method: "DELETE",
    })

    const result = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Xóa subscription plan thất bại")
    }

    return result.data
  },

  // Lấy thống kê subscription (tạm thời dùng mock data)
  getStatistics: async (): Promise<SubscriptionStatistics> => {
    // TODO: Implement real API when backend is ready
    // const response = await authFetch(getApiUrl(config.api.subscriptions.statistics))
    
    // Mock data để tránh lỗi 404
    await new Promise(resolve => setTimeout(resolve, 300)) // Giả lập delay API
    
    return {
      totalPlans: 3,
      activeSubscribers: 1250,
      revenue: 15750000,
      popularPlan: "Premium Monthly"
    }
  },
} 