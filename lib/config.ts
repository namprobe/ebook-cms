// Cấu hình môi trường cho ứng dụng
export const config = {
  // API Base URLs
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5123/api/cms',
  referenceApiBaseUrl: process.env.NEXT_PUBLIC_REFERENCE_API_BASE_URL || 'http://localhost:5123/api/common/reference',
  
  // API Endpoints
  api: {
    auth: {
      login: '/auth/login',
      refresh: '/auth/refresh',
    },
    staff: {
      list: '/staff/list',
      create: '/staff',
      getById: (staffId: string) => `/staff/${staffId}`,
      update: (staffId: string) => `/staff/${staffId}`,
    },
    books: {
      list: '/books/list',
      create: '/books',
      update: (bookId: string) => `/books/${bookId}`,
      updateStatus: (bookId: string) => `/books/${bookId}/manage-status`,
      resubmit: (bookId: string) => `/books/${bookId}/resubmit`,
      getDetail: (bookId: string) => `/books/${bookId}`,
      getChapters: (bookId: string) => `/books/${bookId}/chapters`,
      delete: (bookId: string) => `/books/${bookId}`,
      download: (bookId: string) => `/books/${bookId}/download`,
      statistics: '/books/statistics',
    },
    categories: {
      list: '/book-categories/list',
      create: '/book-categories',
      getById: (id: string) => `/book-categories/${id}`,
      update: (id: string) => `/book-categories/${id}`,
      delete: (id: string) => `/book-categories/${id}`,
      getAll: '/book-categories',
    },
    users: {
      list: '/users/list',
      getById: (userId: string) => `/users/${userId}`,
      updateStatus: (userId: string) => `/users/${userId}/status`,
    },
    subscriptions: {
      list: '/subscription',
      create: '/subscription',
      getById: (subscriptionId: string) => `/subscription/${subscriptionId}`,
      update: (subscriptionId: string) => `/subscription/${subscriptionId}`,
      delete: (subscriptionId: string) => `/subscription/${subscriptionId}`,
      statistics: '/subscription/statistics',
    },
  },
  
  // Reference API Endpoints (for dropdowns)
  referenceApi: {
    bookCategories: '/book-categories',
  },
  
  // Environment
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
}

// Helper function để tạo full URL
export const getApiUrl = (endpoint: string): string => {
  return `${config.apiBaseUrl}${endpoint}`
}

// Helper function để tạo reference API URL
export const getReferenceApiUrl = (endpoint: string): string => {
  return `${config.referenceApiBaseUrl}${endpoint}`
}

// Helper function để log trong development
export const devLog = (message: string, data?: any) => {
  if (config.isDevelopment) {
    console.log(`[DEV] ${message}`, data || '')
  }
}

// Handle API errors globally
export function handleApiError(response: Response, error?: any) {
  if (response.status === 401) {
    // Token expired or invalid - auto logout
    console.warn("🔒 Token expired, auto-logout...")
    
    // Clear localStorage directly
    localStorage.removeItem("access_token")
    localStorage.removeItem("user")
    // Không lưu returnPath - luôn về dashboard sau khi login lại
    localStorage.removeItem("returnPath")
    
    // Dispatch logout event để Silent Token Manager cleanup
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("authLogout"))
    }
    
    // Redirect to login
    if (typeof window !== "undefined") {
      window.location.href = "/login"
    }
    
    throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.")
  }
  
  // Re-throw other errors
  if (error) throw error
}

// Enhanced fetch wrapper với Silent Token Manager
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  // Lazy import để tránh circular dependency
  const { silentTokenManager } = await import("@/lib/services/silentTokenManager")
  
  // Lấy fresh token từ Silent Token Manager
  const freshToken = await silentTokenManager.getCurrentToken()
  
  if (!freshToken) {
    // Không có token hoặc token hết hạn
    handleApiError(new Response(null, { status: 401 }))
    throw new Error("No valid token")
  }

  // Thêm token vào headers
  const enhancedHeaders = new Headers(options.headers)
  enhancedHeaders.set('Authorization', `Bearer ${freshToken}`)

  // Thực hiện request với fresh token
  const response = await fetch(url, {
    ...options,
    headers: enhancedHeaders,
  })

  // Nếu vẫn 401 sau khi đã có fresh token, có thể server có vấn đề
  if (response.status === 401) {
    console.warn("🔒 Got 401 even with fresh token, handling as auth error...")
    handleApiError(response)
  }

  return response
}

// Simple fetch wrapper không có auto-refresh (cho login, etc.)
export async function simpleFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return fetch(url, options)
}

// Debug environment variables
if (config.isDevelopment) {
  console.log('[DEV] Environment Variables Check:')
  console.log('[DEV] NEXT_PUBLIC_API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL)
  console.log('[DEV] NEXT_PUBLIC_REFERENCE_API_BASE_URL:', process.env.NEXT_PUBLIC_REFERENCE_API_BASE_URL)
  console.log('[DEV] Config apiBaseUrl:', config.apiBaseUrl)
  console.log('[DEV] Config referenceApiBaseUrl:', config.referenceApiBaseUrl)
}
