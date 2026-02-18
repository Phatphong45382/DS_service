import { cn } from "@/lib/utils"

interface PageHeaderProps {
    title: string
    description?: string
    children?: React.ReactNode
    className?: string
}

export function PageHeader({
    title,
    description,
    children,
    className,
}: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-4", className)}>
            <div className="space-y-1">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight font-display">
                    {title}
                </h1>
                {description && (
                    <p className="text-slate-500 text-sm font-medium">
                        {description}
                    </p>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-2">
                    {children}
                </div>
            )}
        </div>
    )
}
