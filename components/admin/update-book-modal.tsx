"use client"

import UpdateBookForm from "./update-book-form"
import { BookDetailResponse } from "@/lib/api/books"

interface UpdateBookModalProps {
  bookId?: string // Pass bookId to let modal fetch fresh data
  bookData?: BookDetailResponse // Legacy support for existing bookData
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export default function UpdateBookModal({ bookId, bookData, trigger, open, onOpenChange, onSuccess }: UpdateBookModalProps) {
  return (
    <UpdateBookForm
      bookId={bookId}
      bookData={bookData}
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
    />
  )
}
