"use client"

import { create } from 'zustand'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2 } from 'lucide-react'
import { useCallback } from 'react'

interface ConfirmModalStore {
  isOpen: boolean
  title: string
  description?: string
  content?: React.ReactNode
  isLoading?: boolean
  cancelText?: string
  confirmText?: string
  confirmVariant?: 'default' | 'destructive'
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  open: (config: Omit<ConfirmModalStore, 'isOpen' | 'open' | 'close'>) => void
  close: () => void
}

const useConfirmModal = create<ConfirmModalStore>((set) => ({
  isOpen: false,
  title: '',
  description: '',
  content: null,
  isLoading: false,
  cancelText: 'Hủy bỏ',
  confirmText: 'Xác nhận',
  confirmVariant: 'default',
  onConfirm: () => {},
  onCancel: () => {},
  open: (config) => set({ isOpen: true, ...config }),
  close: () => set({ isOpen: false }),
}))

export function ConfirmModal() {
  const {
    isOpen,
    title,
    description,
    content,
    isLoading,
    cancelText,
    confirmText,
    confirmVariant,
    onConfirm,
    onCancel,
    close,
  } = useConfirmModal()

  const handleConfirm = useCallback(async () => {
    try {
      await onConfirm()
    } finally {
      close()
    }
  }, [onConfirm, close])

  const handleCancel = useCallback(() => {
    if (!isLoading) {
      if (onCancel) {
        onCancel()
      }
      close()
    }
  }, [onCancel, close, isLoading])

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        
        {content}
        
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading}
            variant={confirmVariant}
            className={confirmVariant === 'destructive' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : ''}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { useConfirmModal } 