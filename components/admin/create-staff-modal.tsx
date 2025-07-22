"use client"

import StaffForm from "./staff-form"

interface CreateStaffModalProps {
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export default function CreateStaffModal({ trigger, open, onOpenChange, onSuccess }: CreateStaffModalProps) {
  return (
    <StaffForm
      mode="create"
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
    />
  )
}
