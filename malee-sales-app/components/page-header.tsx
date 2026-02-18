"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Breadcrumb {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: Breadcrumb[]
  action?: ReactNode
  children?: ReactNode
  className?: string
}

export function PageHeader({ title, description, breadcrumbs, action, children, className }: PageHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between pb-6", className)} {...(className ? {} : {})}>
      <div className="space-y-1">
        {breadcrumbs && (
          <nav className="flex items-center space-x-1 text-sm text-slate-500 mb-2">
            {breadcrumbs.map((crumb, i) => (
              <div key={i} className="flex items-center">
                {i > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-slate-900 transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="font-medium text-slate-900">{crumb.label}</span>
                )}
              </div>
            ))}
          </nav>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && (
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        )}
      </div>
      {(action || children) && (
        <div className="flex items-center space-x-2">{action || children}</div>
      )}
    </div>
  )
}
