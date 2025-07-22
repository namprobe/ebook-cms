import { getApiUrl, config, devLog } from "@/lib/config"
import { shouldRefreshToken, isTokenExpired } from "@/lib/features/auth/authSlice"

class SilentTokenManager {
  private refreshPromise: Promise<string> | null = null
  private lastRefreshAttempt: number = 0
  private refreshInterval: NodeJS.Timeout | null = null
  private isInitialized: boolean = false

  // Khởi tạo token manager - chỉ chạy 1 lần
  initialize() {
    if (this.isInitialized) return
    this.isInitialized = true

    // Kiểm tra token mỗi 30 giây
    this.refreshInterval = setInterval(() => {
      this.checkAndRefreshToken()
    }, 30000)

    // Kiểm tra ngay lập tức khi khởi tạo
    this.checkAndRefreshToken()

    devLog("🔧 Silent Token Manager initialized")
  }

  // Dọn dẹp khi logout
  cleanup() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }
    this.refreshPromise = null
    this.lastRefreshAttempt = 0
    this.isInitialized = false
    devLog("🔧 Silent Token Manager cleaned up")
  }

  // Kiểm tra và refresh token nếu cần
  private async checkAndRefreshToken(): Promise<void> {
    try {
      const userStr = localStorage.getItem("user")
      const token = localStorage.getItem("access_token")

      if (!userStr || !token) return

      const user = JSON.parse(userStr)
      const tokenExpiresAt = user.token_expires_at

      if (!tokenExpiresAt) return

      // Nếu token đã hết hạn - không làm gì (để AuthGuard xử lý logout)
      if (isTokenExpired(tokenExpiresAt)) {
        devLog("🔧 Token expired, letting AuthGuard handle logout")
        return
      }

      // Nếu token cần refresh
      if (shouldRefreshToken(tokenExpiresAt)) {
        await this.silentRefresh()
      }
    } catch (error) {
      devLog("🔧 Error in checkAndRefreshToken:", error)
    }
  }

  // Refresh token một cách silent
  async silentRefresh(): Promise<string> {
    const currentTime = Date.now()

    // Tránh spam refresh (chỉ cho phép 1 lần mỗi 30 giây)
    if (currentTime - this.lastRefreshAttempt < 30000) {
      devLog("🔧 Refresh blocked - too frequent attempts")
      throw new Error("Too frequent refresh attempts")
    }

    // Nếu đang có refresh request, chờ kết quả
    if (this.refreshPromise) {
      devLog("🔧 Refresh already in progress, waiting...")
      return this.refreshPromise
    }

    this.lastRefreshAttempt = currentTime

    // Tạo refresh promise
    this.refreshPromise = this.performRefresh()
    
    try {
      const newToken = await this.refreshPromise
      return newToken
    } finally {
      // Reset promise sau khi hoàn thành
      this.refreshPromise = null
    }
  }

  // Thực hiện refresh request
  private async performRefresh(): Promise<string> {
    const token = localStorage.getItem("access_token")
    
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

    devLog("🔧 Silent token refresh successful")

    // Update localStorage ngay lập tức
    const newUserData = data.data
    localStorage.setItem("access_token", newUserData.access_token)
    localStorage.setItem("user", JSON.stringify(newUserData))

    // Dispatch event để các component khác có thể listen (nếu cần)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("tokenRefreshed", {
        detail: { 
          access_token: newUserData.access_token,
          token_expires_at: newUserData.token_expires_at
        }
      }))
    }

    return newUserData.access_token
  }

  // Public method để force refresh (dùng trong emergency)
  async forceRefresh(): Promise<string> {
    this.lastRefreshAttempt = 0 // Reset để cho phép refresh
    return this.silentRefresh()
  }

  // Lấy token hiện tại (fresh token)
  async getCurrentToken(): Promise<string | null> {
    const token = localStorage.getItem("access_token")
    const userStr = localStorage.getItem("user")

    if (!token || !userStr) return null

    try {
      const user = JSON.parse(userStr)
      const tokenExpiresAt = user.token_expires_at

      // Nếu token hết hạn
      if (isTokenExpired(tokenExpiresAt)) {
        return null
      }

      // Nếu token cần refresh, refresh và trả về token mới
      if (shouldRefreshToken(tokenExpiresAt)) {
        devLog("🔧 Token needs refresh, getting fresh token...")
        return await this.silentRefresh()
      }

      // Token còn tốt
      return token
    } catch (error) {
      devLog("🔧 Error getting current token:", error)
      return null
    }
  }
}

// Singleton instance
export const silentTokenManager = new SilentTokenManager()

// Auto-initialize khi import (chỉ client-side)
if (typeof window !== "undefined") {
  // Delay một chút để đảm bảo Redux store đã sẵn sàng
  setTimeout(() => {
    silentTokenManager.initialize()
  }, 1000)
} 