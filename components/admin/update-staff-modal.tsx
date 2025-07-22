"use client"

import StaffForm from "./staff-form"
import { Staff } from "@/lib/api/staff"

interface UpdateStaffModalProps {
  staffId: string
  staffData?: Staff // Legacy support for existing staffData
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onSuccess?: () => void
}

export default function UpdateStaffModal({ 
  staffId, 
  staffData, 
  trigger, 
  open, 
  onOpenChange, 
  onSuccess 
}: UpdateStaffModalProps) {
  return (
    <StaffForm
      mode="update"
      staffId={staffId}
      staffData={staffData}
      trigger={trigger}
      open={open}
      onOpenChange={onOpenChange}
      onSuccess={onSuccess}
    />
  )
} 