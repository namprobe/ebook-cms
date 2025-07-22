"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Edit, Upload, FileText, Loader2 } from "lucide-react"
import { useAppSelector } from "@/lib/hooks"
import { useToast } from "@/lib/hooks/use-toast"
import { referenceApi, type DropdownOption } from "@/lib/api/reference"
import { booksApi, type BookDetailResponse } from "@/lib/api/books"
import { devLog } from "@/lib/config"

interface UpdateBookFormData {
  category_id: string
  tags: string
  isbn: string
  title?: string
  description?: string
  author?: string
  publisher?: string
  published_date?: string
}

interface UpdateBookFormProps {
  bookId?: string // Pass bookId to let modal fetch fresh data (preferred)
  bookData?: BookDetailResponse // Legacy support for existing bookData
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export default function UpdateBookForm({ bookId, bookData, trigger, open: externalOpen, onOpenChange: externalOnOpenChange, onSuccess }: UpdateBookFormProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fetchingBookData, setFetchingBookData] = useState(false)
  const [latestBookData, setLatestBookData] = useState<BookDetailResponse | null>(null)

  // Categories state
  const [categories, setCategories] = useState<DropdownOption[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)

  // Use refs to track API calls and prevent duplicates
  const hasLoadedCategoriesRef = useRef(false)
  const categoriesLoadingRef = useRef(false)
  const hasLoadedBookDataRef = useRef(false)
  const bookDataLoadingRef = useRef(false)
  const modalSessionRef = useRef<string | null>(null)

  // Use external open state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  
  const [formData, setFormData] = useState<UpdateBookFormData>({
    category_id: "",
    tags: "",
    isbn: "",
  })

  const { access_token, user } = useAppSelector((state) => state.auth)
  const { toast } = useToast()

  // Load categories
  const loadCategories = async () => {
    if (categoriesLoadingRef.current) {
      console.log("Categories already loading for update modal, skipping")
      return
    }
    
    categoriesLoadingRef.current = true
    setCategoriesLoading(true)
    
    try {
      devLog("Loading categories for update book form...")
      const categoryOptions = await referenceApi.getBookCategories()
      setCategories(categoryOptions)
      hasLoadedCategoriesRef.current = true
      devLog("Categories loaded for update:", categoryOptions.length)
    } catch (err: any) {
      console.error("Error loading categories:", err)
      toast({
        title: "Lỗi!",
        description: err.message || "Không thể tải danh sách danh mục.",
        variant: "destructive",
      })
    } finally {
      categoriesLoadingRef.current = false
      setCategoriesLoading(false)
    }
  }

  // Load data when modal opens
  useEffect(() => {
    const loadModalData = async () => {
      if (open) {
        const sessionId = `${Date.now()}-${Math.random()}`
        modalSessionRef.current = sessionId
        console.log("Update book modal opened, session:", sessionId)
        
        // Load categories first
        await loadCategories()
        
        // Then load book data if needed
        if (access_token && !bookDataLoadingRef.current && !hasLoadedBookDataRef.current) {
          const targetBookId = bookId || bookData?.id
          if (!targetBookId) return
          
          bookDataLoadingRef.current = true
          hasLoadedBookDataRef.current = true
          setFetchingBookData(true)
          
          try {
            devLog("Fetching latest book data for update...")
            const latestData = await booksApi.getDetail(targetBookId)
            setLatestBookData(latestData)
            devLog("Fetched latest book data for update:", latestData)
          } catch (err: any) {
            console.error("Error fetching latest book data:", err)
            toast({
              title: "Lỗi!",
              description: err.message || "Có lỗi xảy ra khi tải thông tin sách mới nhất.",
              variant: "destructive",
            })
            // Use the original bookData from props as fallback
            if (bookData) {
              setLatestBookData(bookData)
            }
          } finally {
            bookDataLoadingRef.current = false
            setFetchingBookData(false)
          }
        }
      } else {
        // Reset refs when modal closes to allow fresh data on next open
        hasLoadedCategoriesRef.current = false
        hasLoadedBookDataRef.current = false
        modalSessionRef.current = null
        console.log("Update book modal closed, refs reset")
      }
    }

    loadModalData()
  }, [open, bookId, bookData, access_token, toast])

  // Initialize form data using latest book data (only when categories are also loaded)
  useEffect(() => {
    if (latestBookData && open && categories.length > 0) {
      const newFormData = {
        category_id: latestBookData.category_id || "",
        tags: latestBookData.tags || "",
        isbn: latestBookData.isbn || "",
        title: latestBookData.title || "",
        description: latestBookData.description || "",
        author: latestBookData.author || "",
        publisher: latestBookData.publisher || "",
        published_date: latestBookData.published_date ? new Date(latestBookData.published_date).toISOString().split('T')[0] : "",
      }
      devLog("Setting form data with book data")
      setFormData(newFormData)
    }
  }, [latestBookData, open, categories])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      resetForm()
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    
    if (file) {
      // Check if file is EPUB
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()

      if (fileExtension !== ".epub") {
        const errorMsg = "Hệ thống chỉ hỗ trợ file EPUB"
        setError(errorMsg)
        toast({
          title: "Lỗi!",
          description: errorMsg,
          variant: "destructive",
        })
        return
      }

      // Check file size (500MB)
      if (file.size > 500 * 1024 * 1024) {
        const errorMsg = "Kích thước file không được vượt quá 500MB"
        setError(errorMsg)
        toast({
          title: "Lỗi!",
          description: errorMsg,
          variant: "destructive",
        })
        return
      }

      setSelectedFile(file)
      setError(null)
      
      devLog("EPUB file selected successfully:", { 
        name: file.name, 
        size: `${(file.size / (1024 * 1024)).toFixed(2)}MB`
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!access_token) {
      toast({
        title: "Lỗi!",
        description: "Thiếu thông tin xác thực",
        variant: "destructive",
      })
      return
    }
    
    if (!formData.category_id) {
      toast({
        title: "Lỗi!",
        description: "Danh mục sách là bắt buộc",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const updateData = new FormData()
      
      // Add changed fields only (compare with latest book data)
      if (formData.title && formData.title !== latestBookData?.title) {
        updateData.append("title", formData.title)
      }
      if (formData.description && formData.description !== latestBookData?.description) {
        updateData.append("description", formData.description)
      }
      if (formData.author && formData.author !== latestBookData?.author) {
        updateData.append("author", formData.author)
      }
      if (formData.isbn && formData.isbn !== latestBookData?.isbn) {
        updateData.append("isbn", formData.isbn)
      }
      if (formData.publisher && formData.publisher !== latestBookData?.publisher) {
        updateData.append("publisher", formData.publisher)
      }
      if (formData.category_id && formData.category_id !== latestBookData?.category_id) {
        updateData.append("category_id", formData.category_id)
      }
      if (formData.tags !== latestBookData?.tags) {
        updateData.append("tags", formData.tags || "")
      }
      if (formData.published_date) {
        const newDate = new Date(formData.published_date).toISOString()
        const existingDate = latestBookData?.published_date ? new Date(latestBookData.published_date).toISOString() : ""
        if (newDate !== existingDate) {
          updateData.append("published_date", newDate)
        }
      }
      
      // Add file if selected
      if (selectedFile) {
        updateData.append("file", selectedFile)
      }

      const result = await booksApi.update(latestBookData!.id, updateData)
      
      const hasNewEpub = selectedFile && selectedFile.name.toLowerCase().endsWith('.epub')
      const successMessage = hasNewEpub 
        ? "Sách đã được cập nhật thành công. Metadata đã được tự động trích xuất từ file EPUB mới."
        : "Sách đã được cập nhật thành công."
      
      toast({
        title: "Thành công!",
        description: successMessage,
        variant: "default",
      })

      setOpen(false)
      resetForm()
      onSuccess?.()
    } catch (err: any) {
      devLog("Book update error:", err.message)

      toast({
        title: "Lỗi!",
        description: err.message || "Có lỗi xảy ra khi cập nhật sách.",
        variant: "destructive",
      })

      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      category_id: "",
      tags: "",
      isbn: "",
    })
    setSelectedFile(null)
    setError(null)
    setLatestBookData(null)
    setFetchingBookData(false)
    setCategories([])
    setCategoriesLoading(false)
    
    // Reset refs for next session
    hasLoadedCategoriesRef.current = false
    hasLoadedBookDataRef.current = false
    categoriesLoadingRef.current = false
    bookDataLoadingRef.current = false
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Edit className="mr-2 h-4 w-4" />
      Chỉnh sửa
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa thông tin sách</DialogTitle>
          <DialogDescription>
            Chỉnh sửa thông tin sách. Nếu upload file EPUB mới, metadata sẽ được tự động trích xuất và cập nhật.
          </DialogDescription>
        </DialogHeader>
        
        {fetchingBookData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Đang tải thông tin sách...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* File Upload */}
            <div>
              <Label htmlFor="file">File EPUB mới (tùy chọn)</Label>
              <div className="mt-2">
                <Input
                  id="file"
                  type="file"
                  accept=".epub"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    <FileText className="inline w-4 h-4 mr-1" />
                    {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(2)}MB)
                  </p>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Upload file EPUB mới sẽ thay thế file hiện tại và trích xuất metadata mới.
              </p>
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Basic Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Cấu hình cơ bản</h3>
                
                <div>
                  <Label htmlFor="category">Danh mục sách (bắt buộc)</Label>
                  {categories.length > 0 ? (
                    <Select 
                      key={`category-select-${categories.length}-${formData.category_id}`}
                      value={formData.category_id} 
                      onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue 
                          placeholder="Chọn danh mục sách"
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center space-x-2 p-2 border rounded">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Đang tải danh mục...</span>
                    </div>
                                      )}
                  </div>

                <div>
                  <Label htmlFor="isbn">ISBN</Label>
                  <Input
                    id="isbn"
                    value={formData.isbn}
                    onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                    placeholder="Nhập mã ISBN nếu có"
                    maxLength={20}
                  />
                </div>

                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                    placeholder="Nhập tags, phân cách bằng dấu phẩy"
                    maxLength={500}
                  />
                </div>
              </div>

              {/* Right Column: Metadata Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Thông tin chi tiết</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Tiêu đề</Label>
                    <Input
                      id="title"
                      value={formData.title || ""}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Nhập tiêu đề sách"
                    />
                  </div>
                  <div>
                    <Label htmlFor="author">Tác giả</Label>
                    <Input
                      id="author"
                      value={formData.author || ""}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      placeholder="Nhập tên tác giả"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="publisher">Nhà xuất bản</Label>
                    <Input
                      id="publisher"
                      value={formData.publisher || ""}
                      onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                      placeholder="Nhập nhà xuất bản"
                    />
                  </div>
                  <div>
                    <Label htmlFor="published_date">Ngày xuất bản</Label>
                    <Input
                      id="published_date"
                      type="date"
                      value={formData.published_date || ""}
                      onChange={(e) => setFormData({ ...formData, published_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Description - Full Width */}
            <div>
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description || ""}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Nhập mô tả sách"
                rows={3}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Hủy
              </Button>
              <Button type="submit" disabled={isLoading || categoriesLoading || fetchingBookData}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang cập nhật...
                  </>
                ) : fetchingBookData ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang tải dữ liệu...
                  </>
                ) : categoriesLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang tải danh mục...
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Cập nhật
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
} 