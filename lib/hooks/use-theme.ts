"use client"

import { useTheme as useNextTheme } from "next-themes"
import { useEffect, useState } from "react"

export function useTheme() {
  const { theme, setTheme, systemTheme } = useNextTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const currentTheme = theme === "system" ? systemTheme : theme

  return {
    theme: mounted ? currentTheme : undefined,
    setTheme,
    mounted,
    isDark: mounted ? currentTheme === "dark" : false,
    isLight: mounted ? currentTheme === "light" : false,
  }
} 