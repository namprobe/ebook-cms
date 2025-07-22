import type React from "react"
import { Inter } from "next/font/google"
import "./globals.css"
import { Providers } from "./providers"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { ConfirmModal } from "@/components/ui/confirm-modal"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>
          <ThemeProvider 
            attribute="class" 
            defaultTheme="dark" 
            enableSystem 
            disableTransitionOnChange
            storageKey="booklify-theme"
          >
            <div id="root" className="min-h-screen">
              {children}
              <Toaster />
              <ConfirmModal />
            </div>
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}

export const metadata = {
  generator: 'v0.dev'
};
