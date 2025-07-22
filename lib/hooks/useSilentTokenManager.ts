import { useEffect } from "react"
import { useAppSelector } from "@/lib/hooks"
import { silentTokenManager } from "@/lib/services/silentTokenManager"

/**
 * Hook để sync Silent Token Manager với Redux auth state
 * Tự động cleanup khi logout và initialize khi login
 */
export function useSilentTokenManager() {
  const { isAuthenticated } = useAppSelector((state) => state.auth)

  useEffect(() => {
    if (isAuthenticated) {
      // Khi đăng nhập thành công, khởi tạo Silent Token Manager
      silentTokenManager.initialize()
    } else {
      // Khi logout, cleanup Silent Token Manager
      silentTokenManager.cleanup()
    }
  }, [isAuthenticated])

  // Return some useful methods nếu cần
  return {
    forceRefresh: silentTokenManager.forceRefresh.bind(silentTokenManager),
    getCurrentToken: silentTokenManager.getCurrentToken.bind(silentTokenManager),
  }
} 