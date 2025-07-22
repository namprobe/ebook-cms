"use client"

import CreateBookForm from "./create-book-form"

interface CreateBookModalProps {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export default function CreateBookModal({ trigger, open, onOpenChange, onSuccess }: CreateBookModalProps) {
  return (
    <CreateBookForm
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
    />
  )
}
