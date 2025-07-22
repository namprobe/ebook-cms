"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Plus, Edit, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/lib/hooks/use-toast"
import { useAppSelector } from "@/lib/hooks"
import { categoriesApi, type CreateCategoryRequest, type UpdateCategoryRequest, type BookCategory } from "@/lib/api/categories"

interface CategoryFormModalProps {
  mode: "create" | "update"
  category?: BookCategory // Chỉ cần khi mode = "update"
  trigger?: React.ReactNode // Custom trigger button
  open?: boolean // External control of open state
  onOpenChange?: (open: boolean) => void // External control callback
  onSuccess?: () => void
}

export default function CategoryFormModal({ mode, category, trigger, open: externalOpen, onOpenChange: externalOnOpenChange, onSuccess }: CategoryFormModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  
  // Use external open state if provided, otherwise use internal state
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<CreateCategoryRequest & { isActive?: boolean }>({
    name: "",
    description: "",
    isActive: true,
  })

  const { access_token } = useAppSelector((state) => state.auth)
  const { toast } = useToast()

  // Load category data khi mode = update
  useEffect(() => {
    if (mode === "update" && category && open) {
      setFormData({
        name: category.name,
        description: category.description,
        isActive: category.status === "Active",
      })
    } else if (mode === "create" && open) {
      setFormData({
        name: "",
        description: "",
        isActive: true,
      })
    }
  }, [mode, category, open])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!access_token) return

    setIsLoading(true)

    try {
      if (mode === "create") {
        await categoriesApi.create({
          name: formData.name,
          description: formData.description,
        })
        toast({
          title: "Thành công!",
          description: "Danh mục đã được tạo thành công.",
          variant: "default",
        })
      } else if (mode === "update" && category) {
        const updateData: UpdateCategoryRequest = {}
        
        // Chỉ gửi các field thay đổi
        if (formData.name !== category.name) {
          updateData.name = formData.name
        }
        if (formData.description !== category.description) {
          updateData.description = formData.description
        }
        if (formData.isActive !== (category.status === "Active")) {
          updateData.isActive = formData.isActive
        }

        await categoriesApi.update(category.id, updateData)
        toast({
          title: "Thành công!",
          description: "Danh mục đã được cập nhật thành công.",
          variant: "default",
        })
      }
      
      setOpen(false)
      onSuccess?.()
    } catch (err: any) {
      console.error(`Error ${mode}ing category:`, err)
      
      toast({
        title: "Lỗi!",
        description: err.message || `Có lỗi xảy ra khi ${mode === "create" ? "tạo" : "cập nhật"} danh mục.`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const defaultTrigger = mode === "create" ? (
    <Button>
      <Plus className="mr-2 h-4 w-4" />
      Thêm danh mục
    </Button>
  ) : (
    <Button variant="outline" size="sm">
      <Edit className="h-3 w-3 mr-1" />
      Sửa
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!externalOpen && (
        <DialogTrigger asChild>
          {trigger || defaultTrigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Tạo danh mục sách mới" : "Cập nhật danh mục sách"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create" 
              ? "Thêm danh mục mới để phân loại sách trong thư viện"
              : "Cập nhật thông tin danh mục sách"
            }
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Tên danh mục *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ví dụ: Tiểu thuyết"
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả về danh mục này..."
                disabled={isLoading}
                rows={3}
              />
            </div>

            {mode === "update" && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                  disabled={isLoading}
                />
                <Label htmlFor="isActive">Kích hoạt danh mục</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
              Hủy
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {mode === "create" ? "Đang tạo..." : "Đang cập nhật..."}
                </>
              ) : (
                mode === "create" ? "Tạo danh mục" : "Cập nhật danh mục"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 