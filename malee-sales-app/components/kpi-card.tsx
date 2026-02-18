"use client"

import { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HelpCircle, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface KPICardProps {
  title?: string
  label?: string
  value: string
  delta?: string | number
  deltaType?: "positive" | "negative" | "neutral"
  deltaLabel?: string
  tooltip?: string
  definition?: string
  icon?: ReactNode
}

export function KPICard({
  title,
  label,
  value,
  delta,
  deltaType = "neutral",
  deltaLabel,
  tooltip,
  definition,
  icon,
}: KPICardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {label || title}
            </span>
            {(tooltip || definition) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{tooltip || definition}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {icon && <span className="text-muted-foreground">{icon}</span>}
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tabular-nums">{value}</span>
          {delta !== undefined && (
            <span
              className={cn(
                "text-xs font-medium flex items-center",
                (typeof delta === "number" ? delta > 0 : deltaType === "positive") && "text-emerald-600",
                (typeof delta === "number" ? delta < 0 : deltaType === "negative") && "text-red-600",
                deltaType === "neutral" && "text-muted-foreground"
              )}
            >
              {(typeof delta === "number" ? delta > 0 : deltaType === "positive") && (
                <TrendingUp className="h-3 w-3 mr-0.5" />
              )}
              {(typeof delta === "number" ? delta < 0 : deltaType === "negative") && (
                <TrendingDown className="h-3 w-3 mr-0.5" />
              )}
              {typeof delta === "number" ? `${delta > 0 ? "+" : ""}${delta.toFixed(1)}%${deltaLabel ? ` ${deltaLabel}` : ""}` : delta}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
