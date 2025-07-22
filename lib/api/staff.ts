import { getApiUrl, config, devLog, authFetch } from "@/lib/config"

export interface CreateStaffRequest {
  first_name: string
  last_name: string
  staff_code: string 
  email: string
  phone: string
  address: string
  password: string
  position: 2 | 3 // 2: Staff, 3: LibraryManager (Administrator removed from system)
}

export interface UpdateStaffRequest {
  first_name?: string
  last_name?: string
  email?: string
  phone?: string
  address?: string
  position?: 2 | 3 // 2: Staff, 3: LibraryManager (Administrator removed from system)
  is_active?: boolean // Re-add this since backend PATCH endpoint supports it
}

export interface Staff {
  id: string
  first_name: string
  last_name: string
  full_name: string
  staff_code: string
  email: string
  phone: string
  address: string
  position: string
  position_id: number
  is_active: boolean
  created_at: string
}

export interface StaffListParams {
  staffCode?: string
  fullName?: string
  email?: string
  phone?: string
  position?: number // 2: Staff, 3: LibraryManager (Administrator excluded from system)
  isActive?: boolean
  sortBy?: 'staffcode' | 'fullname' | 'email' | 'phone' | 'position' | 'createdat'
  isAscending?: boolean
  pageNumber?: number
  pageSize?: number
}

export interface StaffListResponse {
  result: string
  data: Staff[]
  message: string
  pageNumber: number
  pageSize: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export interface StaffDetailResponse {
  result: string
  data: Staff
  message: string
}

export const staffApi = {
  // Lấy danh sách nhân viên
  getList: async (params: StaffListParams = {}): Promise<StaffListResponse> => {
    const searchParams = new URLSearchParams()
    
    // Thêm các tham số lọc
    if (params.staffCode) searchParams.append('staffCode', params.staffCode)
    if (params.fullName) searchParams.append('fullName', params.fullName)
    if (params.email) searchParams.append('email', params.email)
    if (params.phone) searchParams.append('phone', params.phone)
    if (params.position !== undefined) searchParams.append('position', params.position.toString())
    if (params.isActive !== undefined) searchParams.append('isActive', params.isActive.toString())
    
    // Thêm tham số sắp xếp
    if (params.sortBy) searchParams.append('sortBy', params.sortBy)
    if (params.isAscending !== undefined) searchParams.append('isAscending', params.isAscending.toString())
    
    // Thêm tham số phân trang
    searchParams.append('pageNumber', (params.pageNumber || 1).toString())
    searchParams.append('pageSize', (params.pageSize || 10).toString())

    const url = getApiUrl(`${config.api.staff.list}?${searchParams.toString()}`)
    devLog("Staff list API request URL:", url)
    
    const response = await authFetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const result = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Lấy danh sách nhân viên thất bại")
    }

    return result
  },

  // Lấy thông tin chi tiết nhân viên
  getById: async (staffId: string): Promise<Staff> => {
    const url = getApiUrl(config.api.staff.getById(staffId))
    devLog("Get staff detail API request URL:", url)
    
    const response = await authFetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    const result: StaffDetailResponse = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Lấy thông tin nhân viên thất bại")
    }

    return result.data
  },

  // Tạo nhân viên mới
  create: async (data: CreateStaffRequest) => {
    const response = await authFetch(getApiUrl(config.api.staff.create), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Tạo nhân viên thất bại")
    }

    return result.data
  },

  // Cập nhật thông tin nhân viên (PATCH - Partial Update) - KHÔNG bao gồm status
  update: async (staffId: string, data: UpdateStaffRequest): Promise<Staff> => {
    const url = getApiUrl(config.api.staff.update(staffId))
    devLog("Update staff API request URL:", url)
    devLog("Update staff data:", data)
    
    const response = await authFetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    })

    const result: StaffDetailResponse = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Cập nhật thông tin nhân viên thất bại")
    }

    return result.data
  },

  // Toggle trạng thái hoạt động của nhân viên (sử dụng PATCH endpoint)
  toggleActive: async (staffId: string, isActive: boolean): Promise<Staff> => {
    const url = getApiUrl(config.api.staff.update(staffId))
    devLog("Toggle staff status API request URL:", url)
    devLog("Toggle staff status data:", { isActive })
    
    const response = await authFetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ is_active: isActive }),
    })

    const result: StaffDetailResponse = await response.json()
    if (!response.ok || result.result !== "success") {
      throw new Error(result.message || "Thay đổi trạng thái nhân viên thất bại")
    }

    return result.data
  },
}
