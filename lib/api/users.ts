import { getApiUrl, config, devLog, authFetch } from "@/lib/config"

export interface UpdateUserStatusRequest {
  is_active: boolean
}

export interface User {
  id: string
  full_name: string
  first_name: string
  last_name: string
  username: string
  email: string
  phone?: string
  gender?: number // 0: Unknown, 1: Male, 2: Female, 3: Other
  gender_name?: string
  is_active: boolean
  created_at: string
  status: number // Entity status
  status_string: string
  has_active_subscription: boolean
}

export interface UserDetail extends User {
  birthday?: string
  address?: string
  avatar_url?: string
  subscription?: {
    id: string
    subscription_id: string
    subscription: {
      id: string
      name: string
      description: string
      price: number
      duration_days: number
      features: string[]
    }
    start_date: string
    end_date: string
    is_active: boolean
    auto_renew: boolean
  }
  has_active_subscription: boolean
  subscription_history?: UserSubscriptionHistory[]
  payment_history?: PaymentHistory[]
}

export interface UserSubscriptionHistory {
  id: string
  subscription_name: string
  start_date: string
  end_date: string
  is_active: boolean
  auto_renew: boolean
  price: number
  status: string
}

export interface PaymentHistory {
  id: string
  amount: number
  payment_method: string
  payment_status: string
  payment_date: string
  transaction_id?: string
  description?: string
  currency: string
}

export interface SubscriptionManagementRequest {
  action: 'extend' | 'cancel' | 'gift' | 'toggle_auto_renew' | 're_subscription'
  subscription_id?: string
  duration_days?: number
  reason?: string
  payment_proof_url?: string
  payment_method?: string
  payment_amount?: number
  auto_renew?: boolean
}

export interface UserListParams {
  // Tìm kiếm kết hợp tất cả trường text (full_name, username, email)
  searchKeyword?: string
  // Lọc theo giới tính (0: Unknown, 1: Male, 2: Female, 3: Other)
  gender?: number
  // Lọc theo trạng thái tài khoản (true: Hoạt động, false: Không hoạt động)
  isActive?: boolean
  // Lọc theo trạng thái subscription (true: Có subscription, false: Không có subscription)
  hasActiveSubscription?: boolean
  // Sắp xếp
  sortBy?: "name" | "firstname" | "email" | "username" | "gender" | "createdat"
  isAscending?: boolean
  // Phân trang
  pageNumber?: number
  pageSize?: number
}

export interface UserListResponse {
  data: User[]
  pageNumber: number
  pageSize: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export const usersApi = {
  // Lấy danh sách người dùng với lọc, sắp xếp và phân trang
  getList: async (params: UserListParams): Promise<UserListResponse> => {
    const searchParams = new URLSearchParams()
    
    if (params.searchKeyword) searchParams.append("searchKeyword", params.searchKeyword)
    if (params.gender !== undefined) searchParams.append("gender", params.gender.toString())
    if (params.isActive !== undefined) searchParams.append("isActive", params.isActive.toString())
    if (params.hasActiveSubscription !== undefined) searchParams.append("hasActiveSubscription", params.hasActiveSubscription.toString())
    if (params.sortBy) searchParams.append("sortBy", params.sortBy)
    if (params.isAscending !== undefined) searchParams.append("isAscending", params.isAscending.toString())
    if (params.pageNumber) searchParams.append("pageNumber", params.pageNumber.toString())
    if (params.pageSize) searchParams.append("pageSize", params.pageSize.toString())

    const url = getApiUrl(`${config.api.users.list}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`)
    devLog("Users API request URL:", url)
    
    const response = await authFetch(url)

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.message || "Lấy danh sách người dùng thất bại")
    }

    const result = await response.json()
    if (result.result !== "success") {
      throw new Error(result.message || "Lấy danh sách người dùng thất bại")
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

  // Lấy thông tin chi tiết người dùng
  getDetail: async (userId: string): Promise<UserDetail> => {
    const response = await authFetch(getApiUrl(config.api.users.getById(userId)))

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.message || "Lấy thông tin người dùng thất bại")
    }

    const result = await response.json()
    if (result.result !== "success") {
      throw new Error(result.message || "Lấy thông tin người dùng thất bại")
    }

    return result.data
  },

  // Cập nhật trạng thái tài khoản người dùng (chỉ Admin)
  updateStatus: async (userId: string, data: UpdateUserStatusRequest): Promise<string> => {
    const response = await authFetch(getApiUrl(config.api.users.updateStatus(userId)), {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.message || "Cập nhật trạng thái người dùng thất bại")
    }

    const result = await response.json()
    if (result.result !== "success") {
      throw new Error(result.message || "Cập nhật trạng thái người dùng thất bại")
    }

    return result.message
  },

  // Lấy lịch sử subscription của user
  getSubscriptionHistory: async (userId: string): Promise<UserSubscriptionHistory[]> => {
    const response = await authFetch(getApiUrl(`${config.api.users.getById(userId)}/subscriptions`))

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.message || "Lấy lịch sử subscription thất bại")
    }

    const result = await response.json()
    if (result.result !== "success") {
      throw new Error(result.message || "Lấy lịch sử subscription thất bại")
    }

    return result.data
  },

  // Lấy lịch sử thanh toán của user
  getPaymentHistory: async (userId: string): Promise<PaymentHistory[]> => {
    const response = await authFetch(getApiUrl(`${config.api.users.getById(userId)}/payments`))

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.message || "Lấy lịch sử thanh toán thất bại")
    }

    const result = await response.json()
    if (result.result !== "success") {
      throw new Error(result.message || "Lấy lịch sử thanh toán thất bại")
    }

    return result.data
  },

  // Quản lý subscription (Admin only)
  manageSubscription: async (userId: string, data: SubscriptionManagementRequest): Promise<string> => {
    const response = await authFetch(getApiUrl(`${config.api.users.getById(userId)}/subscription/manage`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const result = await response.json()
      throw new Error(result.message || "Quản lý subscription thất bại")
    }

    const result = await response.json()
    if (result.result !== "success") {
      throw new Error(result.message || "Quản lý subscription thất bại")
    }

    return result.message
  },
} 