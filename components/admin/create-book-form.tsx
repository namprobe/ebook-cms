"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, Upload, FileText, Loader2 } from "lucide-react"
import { useAppSelector } from "@/lib/hooks"
import { useToast } from "@/lib/hooks/use-toast"
import { referenceApi, type DropdownOption } from "@/lib/api/reference"
import { booksApi, type CreateBookRequest } from "@/lib/api/books"
import { devLog } from "@/lib/config"

interface CreateBookFormData {
  category_id: string
  is_premium: boolean
  tags: string
  isbn: string
}

interface CreateBookFormProps {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export default function CreateBookForm({ trigger, open: externalOpen, onOpenChange: externalOnOpenChange, onSuccess }: CreateBookFormProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Categories state
  const [categories, setCategories] = useState<DropdownOption[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)

  // Use refs to track API calls and prevent duplicates
  const hasLoadedCategoriesRef = useRef(false)
  const categoriesLoadingRef = useRef(false)
  const modalSessionRef = useRef<string | null>(null)

  // Use external open state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  
  const [formData, setFormData] = useState<CreateBookFormData>({
    category_id: "",
    is_premium: false,
    tags: "",
    isbn: "",
  })

  const { access_token, user } = useAppSelector((state) => state.auth)
  const { toast } = useToast()

  // Check if user is Admin
  const isAdmin = user?.app_role?.includes('Admin') || false

  // Load categories
  const loadCategories = async () => {
    if (categoriesLoadingRef.current || hasLoadedCategoriesRef.current) {
      console.log("Categories already loaded or loading, skipping")
      return
    }
    
    categoriesLoadingRef.current = true
    setCategoriesLoading(true)
    
    try {
      devLog("Loading categories for create book form...")
      const categoryOptions = await referenceApi.getBookCategories()
      setCategories(categoryOptions)
      hasLoadedCategoriesRef.current = true
      devLog("Categories loaded:", categoryOptions.length)
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

  // Reset session when modal opens/closes
  useEffect(() => {
    if (open) {
      const sessionId = `${Date.now()}-${Math.random()}`
      modalSessionRef.current = sessionId
      console.log("Create book modal opened, session:", sessionId)
      
      // Load categories if not already loaded
      if (!hasLoadedCategoriesRef.current) {
        loadCategories()
      }
    } else {
      // Reset refs when modal closes
      hasLoadedCategoriesRef.current = false
      modalSessionRef.current = null
      console.log("Create book modal closed, refs reset")
    }
  }, [open])

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

    // Validation
    if (!selectedFile) {
      toast({
        title: "Lỗi!",
        description: "File EPUB là bắt buộc khi tạo sách mới",
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
      const requestData: CreateBookRequest = {
        file: selectedFile,
        category_id: formData.category_id,
        is_premium: isAdmin ? formData.is_premium : false,
        tags: formData.tags || undefined,
        isbn: formData.isbn || undefined,
      }

      const result = await booksApi.create(requestData)
      
      toast({
        title: "Thành công!",
        description: "Sách đã được tạo thành công. Metadata đã được tự động trích xuất từ file EPUB.",
        variant: "default",
      })

      setOpen(false)
      resetForm()
      onSuccess?.()
    } catch (err: any) {
      devLog("Book creation error:", err.message)

      toast({
        title: "Lỗi!",
        description: err.message || "Có lỗi xảy ra khi tạo sách.",
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
      is_premium: false,
      tags: "",
      isbn: "",
    })
    setSelectedFile(null)
    setError(null)
    setCategories([])
    setCategoriesLoading(false)
    
    // Reset refs for next session
    hasLoadedCategoriesRef.current = false
    categoriesLoadingRef.current = false
  }

  const defaultTrigger = (
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      Thêm sách mới
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tạo sách mới từ EPUB</DialogTitle>
          <DialogDescription>
            Upload file EPUB để tạo sách mới. Metadata (tiêu đề, tác giả, nhà xuất bản, ảnh bìa) sẽ được tự động trích xuất từ file. ISBN có thể nhập thủ công nếu cần.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div>
            <Label htmlFor="file">File EPUB (bắt buộc)</Label>
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
              File EPUB sẽ được phân tích để trích xuất metadata tự động.
            </p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="category">Danh mục sách (bắt buộc)</Label>
              <Select value={formData.category_id} onValueChange={(value) => setFormData({ ...formData, category_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn danh mục sách" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="isbn">ISBN (tùy chọn)</Label>
              <Input
                id="isbn"
                value={formData.isbn}
                onChange={(e) => setFormData({ ...formData, isbn: e.target.value })}
                placeholder="Nhập mã ISBN nếu có"
                maxLength={20}
              />
              <p className="text-sm text-muted-foreground mt-1">
                ISBN sẽ được tự động trích xuất từ EPUB nếu có. Bạn có thể nhập thủ công nếu file không chứa thông tin này.
              </p>
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

            {/* Admin-only premium switch */}
            {isAdmin && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_premium"
                    checked={formData.is_premium}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_premium: checked })}
                  />
                  <Label htmlFor="is_premium">Sách Premium (có phí)</Label>
                </div>
              </div>
            )}
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
            <Button type="submit" disabled={isLoading || categoriesLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tạo...
                </>
              ) : categoriesLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang tải danh mục...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Tạo sách
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 