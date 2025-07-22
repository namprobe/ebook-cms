"use client"

import { useState, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, Loader2, X } from "lucide-react"
import { useAppSelector } from "@/lib/hooks"
import { useToast } from "@/lib/hooks/use-toast"
import { subscriptionsApi, type CreateSubscriptionRequest, type UpdateSubscriptionRequest, type SubscriptionResponse } from "@/lib/api/subscriptions"
import { Badge } from "@/components/ui/badge"

interface SubscriptionFormData {
  name: string
  description: string
  price: number
  duration: number
  features: string[]
  is_popular: boolean
  display_order: number
  status: 0 | 1 // 0: Inactive, 1: Active
}

interface SubscriptionFormProps {
  // Mode configuration
  mode: "create" | "update"
  
  // For update mode
  subscriptionId?: string
  subscriptionData?: SubscriptionResponse
  
  // Common props
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export default function SubscriptionForm(props: SubscriptionFormProps) {
  const { mode, subscriptionId, subscriptionData, trigger, open: externalOpen, onOpenChange: externalOnOpenChange, onSuccess } = props
  
  const [internalOpen, setInternalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [featureInput, setFeatureInput] = useState("")
  const [fetchingData, setFetchingData] = useState(false)
  const [latestData, setLatestData] = useState<SubscriptionResponse | null>(null)
  
  // Sử dụng ref để track việc đã fetch chưa và tránh duplicate API calls
  const hasFetchedRef = useRef(false)
  const currentSubscriptionIdRef = useRef<string | null>(null)

  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen
  
  const [formData, setFormData] = useState<SubscriptionFormData>({
    name: "",
    description: "",
    price: 99000,
    duration: 30,
    features: [],
    is_popular: false,
    display_order: 0,
    status: 1, // Active by default
  })

  const { access_token, user } = useAppSelector((state) => state.auth)
  const { toast } = useToast()

  const isAdmin = user?.app_role?.includes('Admin') || false
  const isUpdateMode = mode === "update"

  // Reset refs when modal closes
  useEffect(() => {
    if (!open) {
      setLatestData(null)
      hasFetchedRef.current = false
      currentSubscriptionIdRef.current = null
    }
  }, [open])

  // Fetch latest data for update mode - CHỈ 1 LẦN
  useEffect(() => {
    const fetchLatestData = async () => {
      if (isUpdateMode && open && access_token) {
        const targetId = subscriptionId || subscriptionData?.id
        if (!targetId) return

        // Chỉ fetch nếu chưa fetch cho targetId này
        if (currentSubscriptionIdRef.current !== targetId && !hasFetchedRef.current) {
          currentSubscriptionIdRef.current = targetId
          hasFetchedRef.current = true
          
          setFetchingData(true)
          try {
            const latest = await subscriptionsApi.getDetail(targetId)
            setLatestData(latest)
          } catch (err: any) {
            console.error("Error fetching latest subscription data:", err)
            if (subscriptionData) {
              setLatestData(subscriptionData)
            }
          } finally {
            setFetchingData(false)
          }
        } else if (subscriptionData && !latestData) {
          // Nếu đã có subscriptionData và chưa có latestData, sử dụng subscriptionData
          setLatestData(subscriptionData)
        }
      }
    }

    fetchLatestData()
  }, [isUpdateMode, subscriptionId, open, access_token, subscriptionData, latestData])

  // Initialize form data
  useEffect(() => {
    if (isUpdateMode && latestData && open) {
      setFormData({
        name: latestData.name || "",
        description: latestData.description || "",
        price: latestData.price || 99000,
        duration: latestData.duration || 30,
        features: latestData.features || [],
        is_popular: latestData.is_popular || false,
        display_order: latestData.display_order || 0,
        status: latestData.status || 1,
      })
    } else if (!isUpdateMode) {
      // Reset to default for create mode
      resetForm()
    }
  }, [isUpdateMode, latestData, open])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      resetForm()
      // Reset refs được handle bởi useEffect
    }
  }

  const handleAddFeature = () => {
    if (featureInput.trim() && !formData.features.includes(featureInput.trim())) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, featureInput.trim()]
      }))
      setFeatureInput("")
    }
  }

  const handleRemoveFeature = (featureToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter(feature => feature !== featureToRemove)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!access_token || !isAdmin) return

    if (!formData.name.trim() || formData.price < 5000 || formData.duration < 1) {
      toast({
        title: "Lỗi!",
        description: "Vui lòng kiểm tra thông tin nhập vào",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      if (isUpdateMode && latestData) {
        // Update mode - only send changed fields
        const updateData: UpdateSubscriptionRequest = {}

        if (formData.name !== latestData.name) updateData.name = formData.name.trim()
        if (formData.description !== latestData.description) updateData.description = formData.description.trim() || undefined
        if (formData.price !== latestData.price) updateData.price = formData.price
        if (formData.duration !== latestData.duration) updateData.duration = formData.duration
        if (JSON.stringify(formData.features) !== JSON.stringify(latestData.features)) updateData.features = formData.features
        if (formData.is_popular !== latestData.is_popular) updateData.is_popular = formData.is_popular
        if (formData.display_order !== latestData.display_order) updateData.display_order = formData.display_order
        if (formData.status !== latestData.status) updateData.status = formData.status

        await subscriptionsApi.update(latestData.id, updateData)
        
        toast({
          title: "Thành công!",
          description: "Subscription plan đã được cập nhật thành công.",
          variant: "default",
        })
      } else {
        // Create mode - send all data
        const requestData: CreateSubscriptionRequest = {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          price: formData.price,
          duration: formData.duration,
          features: formData.features,
          is_popular: formData.is_popular,
          display_order: formData.display_order,
          status: formData.status,
        }

        await subscriptionsApi.create(requestData)
        
        toast({
          title: "Thành công!",
          description: "Subscription plan đã được tạo thành công.",
          variant: "default",
        })
      }

      setOpen(false)
      resetForm()
      onSuccess?.()
    } catch (err: any) {
      toast({
        title: "Lỗi!",
        description: err.message || `Có lỗi xảy ra khi ${isUpdateMode ? 'cập nhật' : 'tạo'} subscription plan.`,
        variant: "destructive",
      })
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      price: 99000,
      duration: 30,
      features: [],
      is_popular: false,
      display_order: 0,
      status: 1, // Active by default
    })
    setFeatureInput("")
    setError(null)
  }

  if (!isAdmin) return null

  const title = isUpdateMode ? "Chỉnh sửa subscription plan" : "Tạo subscription plan mới"
  const description = isUpdateMode 
    ? "Cập nhật thông tin và tính năng của gói subscription." 
    : "Tạo gói subscription mới với các tính năng và mức giá phù hợp."
  const submitText = isUpdateMode ? "Cập nhật" : "Tạo gói"
  const Icon = isUpdateMode ? Edit : Plus

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant={isUpdateMode ? "outline" : "default"} size={isUpdateMode ? "sm" : "default"}>
            <Icon className="mr-2 h-4 w-4" />
            {isUpdateMode ? "Chỉnh sửa" : "Thêm gói mới"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        
        {isUpdateMode && fetchingData ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Đang tải thông tin...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Tên gói (bắt buộc)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Premium Tháng, Premium Năm"
                  maxLength={100}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả chi tiết về gói subscription"
                  maxLength={500}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Giá (VND)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                    min={5000}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="duration">Thời hạn (ngày)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                    min={1}
                    max={365}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="display_order">Thứ tự hiển thị</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => setFormData({ ...formData, display_order: Number(e.target.value) })}
                  min={0}
                />
              </div>
            </div>

            <div className="space-y-4">
              <Label>Tính năng</Label>
              <div className="flex space-x-2">
                <Input
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  placeholder="Nhập tính năng và nhấn Enter"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                />
                <Button type="button" onClick={handleAddFeature} variant="outline">
                  Thêm
                </Button>
              </div>
              
              {formData.features.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.features.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {feature}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => handleRemoveFeature(feature)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_popular"
                  checked={formData.is_popular}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_popular: checked })}
                />
                <Label htmlFor="is_popular">Gói phổ biến</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="status"
                  checked={formData.status === 1}
                  onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 1 : 0 })}
                />
                <Label htmlFor="status">Kích hoạt gói</Label>
              </div>
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
              <Button type="submit" disabled={isLoading || fetchingData}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUpdateMode ? "Đang cập nhật..." : "Đang tạo..."}
                  </>
                ) : (
                  <>
                    <Icon className="mr-2 h-4 w-4" />
                    {submitText}
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