"use client"

import { Badge } from "@/components/ui/badge"

interface StatusBadgeProps {
  status: "success" | "running" | "failed"
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const variants = {
    success: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    running: "bg-blue-100 text-blue-700 hover:bg-blue-100",
    failed: "bg-red-100 text-red-700 hover:bg-red-100",
  }

  const labels = {
    success: "Success",
    running: "Running",
    failed: "Failed",
  }

  return (
    <Badge className={variants[status]} variant="secondary">
      {labels[status]}
    </Badge>
  )
}
