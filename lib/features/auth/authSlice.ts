import { createSlice, createAsyncThunk } from "@reduxjs/toolkit"
import { getApiUrl, config, devLog } from "@/lib/config"

export interface User {
  username: string
  email: string
  app_role: string[]
  is_active: boolean
}

export interface AuthState {
  user: User | null
  access_token: string | null
  token_expires_in: number | null
  token_expires_at: string | null // ISO string datetime
  isLoading: boolean
  isRefreshing: boolean // Separate loading state for refresh
  error: string | null
  isAuthenticated: boolean
  lastRefreshAttempt: number | null // Timestamp to prevent spam refresh
}

const initialState: AuthState = {
  user: null,
  access_token: null,
  token_expires_in: null,
  token_expires_at: null,
  isLoading: false,
  isRefreshing: false,
  error: null,
  isAuthenticated: false,
  lastRefreshAttempt: null,
}

type Credentials = { email: string; password: string }

async function loginRequest(body: Record<string, string>) {
  const url = getApiUrl(config.api.auth.login)
  
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("Invalid response format from server")
  }

  if (!res.ok || data.result !== "success") {
    const msg = data?.message || `HTTP Error: ${res.status}`
    throw new Error(msg)
  }

  return data.data
}

// Try different payload variants for login
async function smartLogin({ email, password }: Credentials) {
  const variants: Record<string, string>[] = [
    // 1) username only (try first as server expects username)
    { username: email, password },
    // 2) email only  
    { email, password },
    // 3) both fields same
    { email, username: email, password },
  ]

  let lastError: Error | null = null
  for (const body of variants) {
    try {
      return await loginRequest(body)
    } catch (err: any) {
      lastError = err
      // If validation/missing field error → try next variant
      if (/validation|thiếu trường/i.test(err.message)) continue
      // If other error (DB error/wrong password) → stop
      break
    }
  }
  throw lastError ?? new Error("Đăng nhập thất bại")
}

export const loginUser = createAsyncThunk("auth/loginUser", async (credentials: Credentials, { rejectWithValue }) => {
  try {
    const data = await smartLogin(credentials)
    
    // Debug: Log the response data to check if token_expires_at is present
    console.log("🔑 Login response data:", data)
    
    // Save to localStorage
    localStorage.setItem("access_token", data.access_token)
    localStorage.setItem("user", JSON.stringify(data))
    return data
  } catch (error: any) {
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      return rejectWithValue("Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.")
    }
    // Normalize error message
    const friendly =
      error.message === "Database error occurred"
        ? "Thông tin đăng nhập không hợp lệ hoặc hệ thống đang gặp sự cố."
        : error.message
    return rejectWithValue(friendly)
  }
})

// Silent refresh token - hoàn toàn không ảnh hưởng UI
export const silentRefreshToken = createAsyncThunk(
  "auth/silentRefreshToken", 
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as { auth: AuthState }
      const currentTime = Date.now()
      
      // Prevent spam refresh (only allow 1 refresh per 30 seconds)
      if (state.auth.lastRefreshAttempt && currentTime - state.auth.lastRefreshAttempt < 30000) {
        devLog("🔄 Refresh blocked - too frequent attempts")
        return rejectWithValue("Too frequent refresh attempts")
      }
      
      const token = state.auth.access_token || localStorage.getItem("access_token")

      if (!token) {
        throw new Error("No token available for refresh")
      }

      const url = getApiUrl(config.api.auth.refresh)
      
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      const text = await res.text()
      let data
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error("Invalid response format from server")
      }

      if (!res.ok || data.result !== "success") {
        const msg = data?.message || `HTTP Error: ${res.status}`
        throw new Error(msg)
      }

      devLog("🔄 Silent token refresh successful")

      // Save new token to localStorage silently
      localStorage.setItem("access_token", data.data.access_token)
      localStorage.setItem("user", JSON.stringify(data.data))
      
      return data.data
    } catch (error: any) {
      devLog("🔄 Silent token refresh failed:", error.message)
      
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        return rejectWithValue("Network error")
      }
      
      return rejectWithValue(error.message)
    }
  }
)

// Legacy refresh token (kept for compatibility)
export const refreshToken = createAsyncThunk("auth/refreshToken", async (_, { rejectWithValue, getState }) => {
  try {
    const state = getState() as { auth: AuthState }
    const token = state.auth.access_token || localStorage.getItem("access_token")

    if (!token) {
      throw new Error("No token available for refresh")
    }

    const url = getApiUrl(config.api.auth.refresh)
    
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    })

    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error("Invalid response format from server")
    }

    if (!res.ok || data.result !== "success") {
      const msg = data?.message || `HTTP Error: ${res.status}`
      throw new Error(msg)
    }

    devLog("🔄 Token refresh successful:", data.data)

    // Save new token to localStorage
    localStorage.setItem("access_token", data.data.access_token)
    localStorage.setItem("user", JSON.stringify(data.data))
    
    return data.data
  } catch (error: any) {
    devLog("🔄 Token refresh failed:", error.message)
    
    if (error.name === "TypeError" && error.message.includes("fetch")) {
      return rejectWithValue("Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.")
    }
    
    // If refresh fails, we should logout
    return rejectWithValue(error.message)
  }
})

// Check if user is already logged in
export const checkAuthStatus = createAsyncThunk("auth/checkAuthStatus", async (_, { rejectWithValue }) => {
  try {
    const token = localStorage.getItem("access_token")
    const userStr = localStorage.getItem("user")

    if (!token || !userStr) {
      throw new Error("No authentication found")
    }

    let user
    try {
      user = JSON.parse(userStr)
    } catch (parseError) {
      // Clear corrupted data
      localStorage.removeItem("access_token")
      localStorage.removeItem("user")
      throw new Error("Corrupted authentication data")
    }

    // Validate user object has required fields
    if (!user.username || !user.email || !user.app_role) {
      // Clear invalid data
      localStorage.removeItem("access_token")
      localStorage.removeItem("user")
      throw new Error("Invalid authentication data")
    }

    // Check if token is still valid by checking expiration time (UTC)
    if (user.token_expires_at) {
      const expiresAt = new Date(user.token_expires_at) // Backend trả UTC time
      const now = new Date() // Local time sẽ tự động convert sang UTC để so sánh
      
      devLog("Token expiration check:", {
        expiresAt: expiresAt.toISOString(),
        now: now.toISOString(),
        isExpired: now >= expiresAt
      })
      
      if (now >= expiresAt) {
        // Token has expired
        devLog("Token đã hết hạn, clearing localStorage...")
        localStorage.removeItem("access_token")
        localStorage.removeItem("user")
        throw new Error("Token expired")
      }
    }

    // Token is still valid
    return { ...user, access_token: token }

  } catch (error: any) {
    return rejectWithValue(error.message)
  }
})

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null
      state.access_token = null
      state.token_expires_in = null
      state.token_expires_at = null
      state.isAuthenticated = false
      state.error = null
      state.lastRefreshAttempt = null
      localStorage.removeItem("access_token")
      localStorage.removeItem("user")
    },
    clearError: (state) => {
      state.error = null
    },
    // Action để update token silently mà không trigger re-render
    updateTokenSilently: (state, action) => {
      // Chỉ update nếu thực sự khác biệt
      if (state.access_token !== action.payload.access_token) {
        state.access_token = action.payload.access_token
        state.token_expires_in = action.payload.token_expires_in
        state.token_expires_at = action.payload.token_expires_at
        // Không update timestamp để tránh re-render component con
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = {
          username: action.payload.username,
          email: action.payload.email,
          app_role: action.payload.app_role,
          is_active: action.payload.is_active,
        }
        state.access_token = action.payload.access_token
        state.token_expires_in = action.payload.token_expires_in
        state.token_expires_at = action.payload.token_expires_at
        state.isAuthenticated = true
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
        state.isAuthenticated = false
      })
      // Check status
      .addCase(checkAuthStatus.pending, (state) => {
        state.isLoading = true
      })
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isLoading = false
        state.user = {
          username: action.payload.username,
          email: action.payload.email,
          app_role: action.payload.app_role,
          is_active: action.payload.is_active,
        }
        state.access_token = action.payload.access_token
        state.token_expires_in = action.payload.token_expires_in
        state.token_expires_at = action.payload.token_expires_at
        state.isAuthenticated = true
      })
      .addCase(checkAuthStatus.rejected, (state, action) => {
        state.isLoading = false
        state.isAuthenticated = false
      })
      // Silent refresh - HOÀN TOÀN KHÔNG ẢNH HƯỞNG UI
      .addCase(silentRefreshToken.pending, (state) => {
        state.lastRefreshAttempt = Date.now()
        // KHÔNG set isRefreshing để tránh UI re-render
      })
      .addCase(silentRefreshToken.fulfilled, (state, action) => {
        // Chỉ update nếu thực sự khác biệt để tránh re-render
        if (state.access_token !== action.payload.access_token) {
          state.access_token = action.payload.access_token
          state.token_expires_in = action.payload.token_expires_in
          state.token_expires_at = action.payload.token_expires_at
        }
        // Không update user info vì sẽ giống nhau
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(silentRefreshToken.rejected, (state, action) => {
        // Nếu silent refresh thất bại, KHÔNG logout ngay lập tức
        // Chờ đến khi token thực sự expire
        const errorMsg = action.payload as string
        if (!errorMsg.includes("Too frequent")) {
          devLog("Silent refresh failed, but keeping session alive for now:", errorMsg)
        }
      })
      // Regular refresh token - với UI feedback
      .addCase(refreshToken.pending, (state) => {
        state.isRefreshing = true
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.isRefreshing = false
        // Only update if actually changed to prevent unnecessary re-renders
        if (state.access_token !== action.payload.access_token) {
          state.access_token = action.payload.access_token
          state.token_expires_in = action.payload.token_expires_in
          state.token_expires_at = action.payload.token_expires_at
        }
        // User info should be same, only update if needed
        if (state.user?.username !== action.payload.username) {
          state.user = {
            username: action.payload.username,
            email: action.payload.email,
            app_role: action.payload.app_role,
            is_active: action.payload.is_active,
          }
        }
        state.isAuthenticated = true
        state.error = null
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.isRefreshing = false
        // If refresh fails, logout user
        state.user = null
        state.access_token = null
        state.token_expires_in = null
        state.token_expires_at = null
        state.isAuthenticated = false
        state.error = action.payload as string
        localStorage.removeItem("access_token")
        localStorage.removeItem("user")
      })
  },
})

export const { logout, clearError, updateTokenSilently } = authSlice.actions
export default authSlice.reducer

// Utility function to check if token needs refreshing (when < 2 minutes remaining)
export const shouldRefreshToken = (tokenExpiresAt: string | null): boolean => {
  if (!tokenExpiresAt) return false
  
  const expiresAt = new Date(tokenExpiresAt)
  const now = new Date()
  const minutesUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60)
  
  // Refresh when < 2 minutes remaining
  return minutesUntilExpiry < 2 && minutesUntilExpiry > 0
}

// Function to check if token is expired
export const isTokenExpired = (tokenExpiresAt: string | null): boolean => {
  if (!tokenExpiresAt) return false
  
  const expiresAt = new Date(tokenExpiresAt)
  const now = new Date()
  
  return now >= expiresAt
}
