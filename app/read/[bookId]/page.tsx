"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams } from "next/navigation"
import { Download, List, X, ChevronLeft, ChevronRight, Loader2, Pin, PinOff, Menu } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useToast } from "@/lib/hooks/use-toast"
import { useAppSelector } from "@/lib/hooks"
import { booksApi, type BookDetailResponse, type ChapterResponse } from "@/lib/api/books"
import AuthGuard from "@/components/auth/auth-guard"
import { useSilentTokenManager } from "@/lib/hooks/useSilentTokenManager"

interface EpubLocation {
  start: {
    cfi: string
  }
}

export default function ReadBookPage() {
  const params = useParams()
  const { toast } = useToast()
  const { access_token } = useAppSelector((state: any) => state.auth)
  
  // Initialize Silent Token Manager for authentication
  useSilentTokenManager()
  
  const bookId = params.bookId as string
  
  // State
  const [bookDetail, setBookDetail] = useState<BookDetailResponse | null>(null)
  const [chapters, setChapters] = useState<ChapterResponse[]>([])
  const [epubNavigation, setEpubNavigation] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showToc, setShowToc] = useState(false)
  const [currentLocation, setCurrentLocation] = useState<string>("")
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number>(-1)
  const [isReady, setIsReady] = useState(false)
  const [showUI, setShowUI] = useState(true)
  const [isPinned, setIsPinned] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isCompact, setIsCompact] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(240)
  
  // Touch gesture states
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)
  
  // Refs
  const viewerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<any>(null)
  const renditionRef = useRef<any>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check if mobile and compact screen sizes
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth
      setIsMobile(width < 768)
      setIsCompact(width < 1360) // Under 1360px should use overlay
      
      // Calculate responsive sidebar width for shift mode
      if (width >= 1360) {
        const responsiveWidth = Math.min(320, Math.max(200, width * 0.18)) // 18% of screen width, min 200px, max 320px
        setSidebarWidth(responsiveWidth)
      }
    }
    
    const handleResize = () => {
      checkScreenSize()
      // Resize EPUB only on actual window resize, not sidebar toggle
      if (renditionRef.current && isReady) {
        setTimeout(() => {
          renditionRef.current.resize()
        }, 100)
      }
    }
    
    checkScreenSize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isReady])



  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (showToc && !isMobile) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showToc, isMobile])

  // Load book details and chapters in parallel
  useEffect(() => {
    if (bookId && access_token) {
      Promise.all([
        loadBookDetail(),
        loadBookChapters()
      ]).finally(() => {
        setIsLoading(false)
      })
    }
  }, [bookId, access_token])

  // Initialize EPUB reader when book detail is loaded
  useEffect(() => {
    if (bookDetail?.file_url && viewerRef.current && !bookRef.current) {
      initializeEpubReader()
    }

    // Cleanup on unmount
    return () => {
      cleanup()
    }
  }, [bookDetail])

  // Note: Removed resize logic when sidebar toggles to prevent text reflow and position changes

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Function to flatten nested chapter structure for easier searching
  const flattenChapters = useCallback((chapters: any[], parentIndex = -1): any[] => {
    const flattened: any[] = []
    
    chapters.forEach((chapter, index) => {
      const flatChapter = {
        ...chapter,
        flatIndex: flattened.length,
        parentIndex: parentIndex,
        displayIndex: parentIndex >= 0 ? `${parentIndex + 1}.${index + 1}` : `${index + 1}`
      }
      flattened.push(flatChapter)
      
      // Recursively flatten child chapters
      if (chapter.child_chapters && chapter.child_chapters.length > 0) {
        const childFlattened = flattenChapters(chapter.child_chapters, flattened.length - 1)
        flattened.push(...childFlattened)
      }
    })
    
    return flattened
  }, [])

  // Function to find current chapter in nested structure
  const findCurrentChapterInNested = useCallback((cfi: string, navigation: any[]): { parentIndex: number, childIndex: number } | null => {
    try {
      console.log("=== FINDING CURRENT CHAPTER IN NESTED STRUCTURE ===")
      console.log("Current CFI:", cfi)
      
      // Method 1: Check current section href from rendition
      if (bookRef.current && renditionRef.current?.location?.start?.href) {
        const currentSection = renditionRef.current.location.start.href
        console.log("Current section href:", currentSection)
        
        // Search in nested structure
        for (let parentIdx = 0; parentIdx < navigation.length; parentIdx++) {
          const parent = navigation[parentIdx]
          
          // Check parent href
          if (parent.href && currentSection.includes(parent.href)) {
            console.log(`✓ Found in parent: ${parent.title || parent.label} (index ${parentIdx})`)
            return { parentIndex: parentIdx, childIndex: -1 }
          }
          
          // Check child chapters
          if (parent.child_chapters && parent.child_chapters.length > 0) {
            for (let childIdx = 0; childIdx < parent.child_chapters.length; childIdx++) {
              const child = parent.child_chapters[childIdx]
              if (child.href && currentSection.includes(child.href)) {
                console.log(`✓ Found in child: ${child.title || child.label} (parent ${parentIdx}, child ${childIdx})`)
                return { parentIndex: parentIdx, childIndex: childIdx }
              }
            }
          }
        }
      }
      
      // Method 2: Extract chapter number from CFI
      const chapterMatch = cfi.match(/ch(\d+)\.xhtml/i)
      if (chapterMatch && chapterMatch[1]) {
        const chapterNum = parseInt(chapterMatch[1], 10)
        console.log(`Extracted chapter number: ${chapterNum}`)
        
        // Search for matching chapter in nested structure
        for (let parentIdx = 0; parentIdx < navigation.length; parentIdx++) {
          const parent = navigation[parentIdx]
          
          if (parent.child_chapters && parent.child_chapters.length > 0) {
            for (let childIdx = 0; childIdx < parent.child_chapters.length; childIdx++) {
              const child = parent.child_chapters[childIdx]
              if (child.href && child.href.includes(`ch${chapterNum.toString().padStart(2, '0')}.xhtml`)) {
                console.log(`✓ Matched chapter ${chapterNum} to child: ${child.title || child.label}`)
                return { parentIndex: parentIdx, childIndex: childIdx }
              }
            }
          }
        }
      }
      
      console.log("❌ Could not find current chapter")
      return null
    } catch (error) {
      console.log("❌ Error finding current chapter:", error)
      return null
    }
  }, [])

  // Function to find current chapter based on CFI
  const findCurrentChapter = useCallback((cfi: string, navigation: any[]) => {
    const result = findCurrentChapterInNested(cfi, navigation)
    if (result) {
      // Create a unique index for nested chapters: parentIndex * 1000 + childIndex
      // This allows us to distinguish between parent and child chapters
      const uniqueIndex = result.parentIndex * 1000 + (result.childIndex + 1)
      
      if (uniqueIndex !== currentChapterIndex) {
        console.log(`🎯 Setting current chapter to unique index: ${uniqueIndex}`)
        console.log(`  - Parent: ${result.parentIndex}, Child: ${result.childIndex}`)
        setCurrentChapterIndex(uniqueIndex)
      }
    }
  }, [currentChapterIndex, findCurrentChapterInNested])

  // Update current chapter when navigation or location changes
  useEffect(() => {
    if (epubNavigation.length > 0 && currentLocation) {
      console.log("useEffect: Finding current chapter for location:", currentLocation)
      findCurrentChapter(currentLocation, epubNavigation)
    }
  }, [epubNavigation, currentLocation, findCurrentChapter])

  // UI auto-hide functionality with useCallback to prevent infinite loops
  const showUITemporarily = useCallback(() => {
    if (isPinned) return
    
    setShowUI(true)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    timeoutRef.current = setTimeout(() => {
      if (!isPinned) {
        setShowUI(false)
      }
    }, 5000) // 5 seconds
  }, [isPinned])

  const toggleUI = useCallback(() => {
    // If UI is pinned, don't toggle when clicking EPUB content
    if (isPinned) return
    
    setShowUI(prev => !prev)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    
    if (!showUI && !isPinned) {
      timeoutRef.current = setTimeout(() => {
        setShowUI(false)
      }, 5000) // 5 seconds
    }
  }, [showUI, isPinned])

  // Prevent UI hiding when clicking on UI elements
  const handleUIClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (!isPinned) {
      timeoutRef.current = setTimeout(() => {
        setShowUI(false)
      }, 5000) // 5 seconds
    }
  }, [isPinned])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle arrow keys if not typing in an input/textarea/contenteditable
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || 
          target.tagName === 'TEXTAREA' || 
          target.contentEditable === 'true' ||
          target.isContentEditable) {
        return
      }

      // Handle arrow key navigation
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handlePrevPage()
        showUITemporarily()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleNextPage()
        showUITemporarily()
      } else {
        // For other keys, just show UI
        showUITemporarily()
      }
    }

    if (isReady) {
      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [isReady, showUITemporarily])

  // Event listeners for interactions
  useEffect(() => {
    if (isPinned) {
      setShowUI(true)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      return
    }

    const handleInteraction = () => {
      showUITemporarily()
    }

    // Add event listeners for all types of interactions (excluding keydown as it's handled separately)
    document.addEventListener('mousemove', handleInteraction, { passive: true })
    document.addEventListener('wheel', handleInteraction, { passive: true })

    // Initial timeout - longer delay on first load
    timeoutRef.current = setTimeout(() => {
      if (!isPinned) {
        setShowUI(false)
      }
    }, 8000) // 8 seconds on initial load

    return () => {
      document.removeEventListener('mousemove', handleInteraction)
      document.removeEventListener('wheel', handleInteraction)
    }
  }, [isPinned, showUITemporarily])

  // Touch gesture handling
  useEffect(() => {
    if (!isReady || !renditionRef.current) return

    const handleTouchStart = (e: TouchEvent) => {
      // Only handle touches on the EPUB content, not UI elements
      const target = e.target as Element
      if (target.closest('button') || target.closest('header') || target.closest('.sidebar')) {
        return
      }
      
      const touch = e.touches[0]
      setTouchStart({ x: touch.clientX, y: touch.clientY })
      setTouchEnd(null)
    }

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      setTouchEnd({ x: touch.clientX, y: touch.clientY })
    }

    const handleTouchEnd = () => {
      if (!touchStart || !touchEnd) return

      const deltaX = touchStart.x - touchEnd.x
      const deltaY = touchStart.y - touchEnd.y
      const minSwipeDistance = 50

      // Only register horizontal swipes (not vertical scrolling)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0) {
          // Swipe left - next page
          handleNextPage()
        } else {
          // Swipe right - previous page
          handlePrevPage()
        }
      }

      setTouchStart(null)
      setTouchEnd(null)
    }

    const viewerElement = viewerRef.current
    if (viewerElement) {
      viewerElement.addEventListener('touchstart', handleTouchStart, { passive: true })
      viewerElement.addEventListener('touchmove', handleTouchMove, { passive: true })
      viewerElement.addEventListener('touchend', handleTouchEnd, { passive: true })

      return () => {
        viewerElement.removeEventListener('touchstart', handleTouchStart)
        viewerElement.removeEventListener('touchmove', handleTouchMove)
        viewerElement.removeEventListener('touchend', handleTouchEnd)
      }
    }
  }, [isReady, touchStart, touchEnd])

  const loadBookDetail = async () => {
    try {
      const detail = await booksApi.getDetail(bookId)
      setBookDetail(detail)
    } catch (err: any) {
      console.error("Error loading book detail:", err)
      setError(err.message || "Không thể tải thông tin sách")
      toast({
        title: "Lỗi!",
        description: err.message || "Không thể tải thông tin sách.",
        variant: "destructive",
      })
    }
  }

  const loadBookChapters = async () => {
    try {
      const chaptersData = await booksApi.getChapters(bookId)
      setChapters(chaptersData)
    } catch (err: any) {
      console.error("Error loading chapters:", err)
      // Don't show error for chapters as it's fallback only
    }
  }

  const initializeEpubReader = async () => {
    if (!bookDetail?.file_url || !viewerRef.current) return

    try {
      console.log("Starting EPUB initialization...")
      
      // Add timeout for EPUB loading
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("EPUB loading timeout")), 15000)
      )
      
      // Dynamic import epubjs
      const ePub = await Promise.race([
        import('epubjs'),
        timeoutPromise
      ]) as any
      
      console.log("EPUBjs loaded successfully")
      
      // Create book
      const book: any = new (ePub as any).default(bookDetail.file_url)
      bookRef.current = book
      console.log("Book created")

      // Create rendition
      const rendition: any = book.renderTo(viewerRef.current, {
        width: "100%",
        height: "100%",
        spread: "none",
        flow: "paginated",
        allowScriptedContent: false,
        allowPopups: false
      })
      renditionRef.current = rendition
      console.log("Rendition created")

      // Display the book with timeout
      await Promise.race([
        rendition.display(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Rendition display timeout")), 10000)
        )
      ])
      console.log("Book displayed")

      // Set up event listeners
      rendition.on("relocated", (location: EpubLocation) => {
        const cfi = location.start.cfi
        setCurrentLocation(cfi)
        
        // Save reading position to localStorage
        try {
          localStorage.setItem(`booklify-reading-position-${bookId}`, JSON.stringify({
            cfi: cfi,
            timestamp: Date.now()
          }))
        } catch (error) {
          console.log("Could not save reading position:", error)
        }
        
        // Find current chapter based on CFI
        if (epubNavigation.length > 0) {
          findCurrentChapter(cfi, epubNavigation)
        } else if (chapters.length > 0) {
          findCurrentChapter(cfi, chapters)
        }
      })

      // Add click handler to EPUB content to toggle UI
      rendition.on("rendered", () => {
        const iframe = rendition.getContents()
        iframe.forEach((content: any) => {
          if (content.document) {
            content.document.addEventListener('click', () => {
              toggleUI()
            })
          }
        })
      })

      // Wait for book ready with timeout
      await Promise.race([
        book.ready,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Book ready timeout")), 10000)
        )
      ])
      console.log("Book ready")
      
      // Extract navigation from EPUB
      console.log("EPUB book navigation:", book.navigation)
      if (book.navigation) {
        // Try different navigation structures
        let tocData = book.navigation.toc || book.navigation.landmarks || book.navigation
        if (Array.isArray(tocData)) {
          console.log("EPUB TOC found:", tocData)
          setEpubNavigation(tocData)
          
          // Find current chapter immediately after setting navigation
          if (currentLocation) {
            findCurrentChapter(currentLocation, tocData)
          }
          
          // Restore reading position after navigation is loaded
          try {
            const savedPosition = localStorage.getItem(`booklify-reading-position-${bookId}`)
            if (savedPosition) {
              const { cfi } = JSON.parse(savedPosition)
              if (cfi && cfi !== '') {
                console.log("Restoring reading position:", cfi)
                await Promise.race([
                  rendition.display(cfi),
                  new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Position restore timeout")), 5000)
                  )
                ])
                findCurrentChapter(cfi, tocData)
              }
            }
          } catch (error) {
            console.log("Could not restore reading position:", error)
          }
        } else {
          console.log("No valid TOC structure found, using chapters from database")
        }
      } else {
        console.log("No EPUB navigation found, using chapters from database")
      }
      
      setIsReady(true)
      console.log("EPUB initialization completed successfully")

    } catch (err: any) {
      console.error("Error initializing EPUB reader:", err)
      setError(`Không thể khởi tạo trình đọc sách: ${err.message}`)
      
      // Try to fallback to chapters from database
      if (chapters.length > 0) {
        console.log("Falling back to chapters from database")
        setIsReady(true)
      } else {
        toast({
          title: "Lỗi!",
          description: err.message || "Không thể khởi tạo trình đọc sách.",
          variant: "destructive",
        })
      }
    }
  }

  const cleanup = () => {
    // Reset body overflow
    document.body.style.overflow = 'unset'
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (renditionRef.current) {
      renditionRef.current.destroy()
      renditionRef.current = null
    }
    if (bookRef.current) {
      bookRef.current.destroy()
      bookRef.current = null
    }
  }

  const handlePrevPage = async () => {
    if (renditionRef.current) {
      try {
        await renditionRef.current.prev()
      } catch (err) {
        console.log("Already at first page")
      }
    }
  }

  const handleNextPage = async () => {
    if (renditionRef.current) {
      try {
        await renditionRef.current.next()
      } catch (err) {
        console.log("Already at last page")
      }
    }
  }

  const handleDownload = async () => {
    if (!bookDetail || !access_token) return

    try {
      const blob = await booksApi.download(bookId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `${bookDetail.title}.epub`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast({
        title: "Thành công!",
        description: "Đã tải xuống sách.",
        variant: "default",
      })
    } catch (err: any) {
      console.error("Error downloading book:", err)
      toast({
        title: "Lỗi!",
        description: err.message || "Có lỗi xảy ra khi tải xuống sách.",
        variant: "destructive",
      })
    }
  }

  const renderChapterItem = (chapter: ChapterResponse, level: number = 0, parentIndex: number = 0, childIndex: number = -1) => {
    // Calculate unique index: parentIndex * 1000 + (childIndex + 1)
    const uniqueIndex = parentIndex * 1000 + (childIndex + 1)
    const isCurrentChapter = currentChapterIndex === uniqueIndex
    
    return (
      <div key={chapter.id} className={`pl-${level * 3}`}>
        <button
          className={`flex items-center gap-2 py-3 px-3 w-full text-left rounded-lg transition-all duration-200 border group ${
            isCurrentChapter 
              ? 'bg-primary/10 text-primary border-primary/20 font-medium' 
              : 'hover:bg-primary/5 hover:text-primary border-transparent hover:border-primary/20'
          }`}
          onClick={() => {
            console.log("Navigate to chapter:", chapter.title)
          }}
        >
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            isCurrentChapter 
              ? 'bg-primary' 
              : 'bg-muted-foreground/30'
          }`} />
          <span className="text-sm leading-relaxed">{chapter.title}</span>
        </button>
        {chapter.child_chapters && chapter.child_chapters.length > 0 && (
          <div className="ml-3 mt-1">
            {chapter.child_chapters.map((child, idx) => 
              renderChapterItem(child, level + 1, parentIndex, idx)
            )}
          </div>
        )}
      </div>
    )
  }

  const renderEpubNavItem = (navItem: any, level: number = 0, parentIndex: number = 0, childIndex: number = -1) => {
    // Calculate unique index: parentIndex * 1000 + (childIndex + 1)
    const uniqueIndex = parentIndex * 1000 + (childIndex + 1)
    const isCurrentChapter = currentChapterIndex === uniqueIndex
    
    return (
      <div key={navItem.id || navItem.href} className={`pl-${level * 3}`}>
        <button
          className={`flex items-center gap-2 py-3 px-3 w-full text-left rounded-lg transition-all duration-200 border group ${
            isCurrentChapter 
              ? 'bg-primary/10 text-primary border-primary/20 font-medium' 
              : 'hover:bg-primary/5 hover:text-primary border-transparent hover:border-primary/20'
          }`}
          onClick={async () => {
            if (renditionRef.current && navItem.href) {
              try {
                await renditionRef.current.display(navItem.href)
              } catch (err) {
                console.error("Error navigating to chapter:", err)
              }
            }
          }}
        >
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
            isCurrentChapter 
              ? 'bg-primary' 
              : 'bg-primary/40 group-hover:bg-primary'
          }`} />
          <span className="text-sm leading-relaxed">{navItem.label || navItem.title}</span>
        </button>
        {navItem.child_chapters && navItem.child_chapters.length > 0 && (
          <div className="ml-3 mt-1">
            {navItem.child_chapters.map((subitem: any, idx: number) => 
              renderEpubNavItem(subitem, level + 1, parentIndex, idx)
            )}
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <AuthGuard requiredRoles={["Admin", "Staff"]}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-lg">Đang tải sách...</span>
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (error || !bookDetail) {
    return (
      <AuthGuard requiredRoles={["Admin", "Staff"]}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-bold text-red-600">Lỗi tải sách</h1>
            <p className="text-muted-foreground">{error || "Không thể tải thông tin sách"}</p>
            <Button onClick={() => window.close()}>
              Đóng tab
            </Button>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard requiredRoles={["Admin", "Staff"]}>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Table of Contents Sidebar - Responsive width in all modes */}
        {showToc && (
          <div className={`fixed left-0 bg-background/95 backdrop-blur border-r shadow-xl transition-all duration-500 ease-in-out sidebar ${
            isCompact 
              ? 'w-72 sm:w-64 top-0 bottom-0' // Under 1360px: overlay mode, responsive width
              : 'top-0 bottom-0' // 1360px+: sidebar mode with responsive width
          }`} 
          style={{
            zIndex: 9999,
            ...(isCompact ? {} : { width: `${sidebarWidth}px` })
          }}
          onClick={handleUIClick}>
            <div className={`flex items-center justify-between p-3 sm:p-4 border-b bg-background/90 ${!isMobile ? 'pt-24' : 'pt-4'}`}>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowToc(false)}
                  className="hover:bg-primary/10 hover:text-primary h-8 w-8 p-0"
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <h3 className="font-semibold flex items-center gap-2 text-sm sm:text-base">
                  {/* <List className="h-4 w-4" /> */}
                  Mục lục
                </h3>
              </div>
              {/* Removed X button - TOC button will handle toggle */}
            </div>
            
            <div 
              className="p-3 sm:p-4 overflow-y-auto flex-1 overscroll-contain pb-6 [&::-webkit-scrollbar]:hidden"
              style={{ 
                overscrollBehavior: 'contain',
                height: isMobile 
                  ? 'calc(100vh - 4rem)' // Mobile: account for smaller header without X button
                  : 'calc(100vh - 8rem)', // Desktop: account for smaller header
                scrollbarWidth: 'none', // Firefox
                msOverflowStyle: 'none' // IE and Edge
              }}
              onScroll={(e) => e.stopPropagation()}
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {epubNavigation.length > 0 ? (
                <div className="space-y-1 sm:space-y-2">
                  {epubNavigation.map((navItem, index) => renderEpubNavItem(navItem, 0, index))}
                </div>
              ) : chapters.length > 0 ? (
                <div className="space-y-1 sm:space-y-2">
                  <div className="mb-4 px-2 py-1 text-xs font-medium text-muted-foreground bg-muted/30 rounded-md border border-muted">
                    📑 Chapters từ database
                  </div>
                  {chapters.map((chapter, index) => renderChapterItem(chapter, 0, index))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="text-4xl mb-2">📖</div>
                  <p className="text-sm text-muted-foreground">Không có mục lục</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Sách này không có danh sách chương</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content Area - Dynamic margin to match sidebar width */}
        <div className={`min-h-screen flex flex-col overflow-hidden transition-all duration-500 ease-in-out`}
             style={{
               marginLeft: showToc && !isCompact ? `${sidebarWidth}px` : '0px'
             }}>
          {/* Header - Dynamic positioning */}
          <header className={`fixed right-0 z-50 flex items-center justify-between p-3 sm:p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95 transition-all duration-500 ease-in-out ${
            showUI || isPinned ? 'top-0 translate-y-0 opacity-100' : '-top-20 -translate-y-full opacity-0'
          }`} 
          style={{
            left: showToc && !isCompact ? `${sidebarWidth}px` : '0px'
          }}
          onClick={handleUIClick}>
            <div className="flex items-center gap-2 sm:gap-4">
              <div>
                <h1 className="font-semibold text-base sm:text-lg">{bookDetail.title}</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Tác giả: {bookDetail.author}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {(epubNavigation.length > 0 || chapters.length > 0) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowToc(!showToc)}
                  className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  <List className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Mục lục</span>
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden sm:inline">Tải xuống</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPinned(!isPinned)}
                className={`h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm ${isPinned ? "bg-primary/10 border-primary/20" : ""}`}
              >
                {isPinned ? <Pin className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" /> : <PinOff className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />}
                <span className="hidden sm:inline">{isPinned ? "Đã ghim" : "Ghim UI"}</span>
              </Button>
            </div>
          </header>

          {/* EPUB Content Area - Better space utilization */}
          <div className="flex-1 relative pt-16 sm:pt-20 pb-12 sm:pb-16 overflow-hidden">
            <div className="absolute inset-0 top-16 sm:top-20 bottom-12 sm:bottom-16 flex justify-center">
              <div className={`w-full mx-auto ${
                isCompact ? 'px-4 max-w-full' : 'px-8 max-w-5xl xl:max-w-6xl'
              }`}>
                <div 
                  ref={viewerRef}
                  className="w-full h-full"
                  style={{ minHeight: '500px' }}
                />
              </div>
            </div>

            {/* Navigation Arrows - Dynamic positioning for shift mode */}
            {isReady && (
              <>
                <button
                  onClick={handlePrevPage}
                  className={`fixed top-1/2 -translate-y-1/2 bg-background/60 hover:bg-background/80 backdrop-blur-sm border border-border/30 rounded-full shadow-lg transition-all duration-500 ease-in-out hover:scale-105 hover:shadow-xl z-20 ${
                    isCompact 
                      ? 'left-2 p-2.5 w-11 h-11' // Under 1360px: overlay mode
                      : 'p-3.5 w-14 h-14' // 1360px+: shift mode with dynamic positioning
                  } ${
                    showUI || isPinned ? 'opacity-80 hover:opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                  style={{
                    left: !isCompact ? (showToc ? `${sidebarWidth + 24}px` : '24px') : undefined
                  }}
                >
                  <ChevronLeft className={`text-foreground/70 ${isCompact ? 'h-5 w-5' : 'h-6 w-6'}`} />
                </button>

                <button
                  onClick={handleNextPage}
                  className={`fixed top-1/2 -translate-y-1/2 bg-background/60 hover:bg-background/80 backdrop-blur-sm border border-border/30 rounded-full shadow-lg transition-all duration-500 ease-in-out hover:scale-105 hover:shadow-xl z-20 ${
                    isCompact 
                      ? 'right-2 p-2.5 w-11 h-11' // Under 1360px: overlay mode
                      : 'right-6 p-3.5 w-14 h-14' // 1360px+: shift mode
                  } ${
                    showUI || isPinned ? 'opacity-80 hover:opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                >
                  <ChevronRight className={`text-foreground/70 ${isCompact ? 'h-5 w-5' : 'h-6 w-6'}`} />
                </button>
              </>
            )}

            {/* Loading indicator for EPUB */}
            {!isReady && bookDetail?.file_url && (
              <div className="fixed inset-0 flex items-center justify-center bg-background/50 z-60">
                <div className="flex items-center gap-3 bg-background p-4 sm:p-6 rounded-lg shadow-lg">
                  <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                  <span className="text-sm sm:text-base">Đang khởi tạo trình đọc...</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Navigation Bar - Better mobile design */}
          {isReady && (
            <footer className={`fixed right-0 z-50 p-3 sm:p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/95 transition-all duration-500 ease-in-out ${
              showUI || isPinned ? 'bottom-0 translate-y-0 opacity-100' : '-bottom-20 translate-y-full opacity-0'
            }`}
            style={{
              left: showToc && !isCompact ? `${sidebarWidth}px` : '0px'
            }}
            onClick={handleUIClick}>
              <div className="flex items-center justify-between">
                <div className="text-xs sm:text-sm text-muted-foreground truncate flex-1 mr-4">
                  {bookDetail.title} - {bookDetail.author}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
                  Ch: {currentChapterIndex >= 0 ? "?" : "?"} | CFI: {currentLocation ? currentLocation.slice(-8) : "N/A"}
                </div>
              </div>
            </footer>
          )}
        </div>
      </div>
    </AuthGuard>
  )
} 