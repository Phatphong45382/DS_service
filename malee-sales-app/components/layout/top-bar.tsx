interface TopBarProps {
    title?: string;
    description?: string;
    action?: React.ReactNode;
}

export function TopBar({ title = "Executive Summary", description, action }: TopBarProps) {
    return (
        <header className="bg-white border-b border-slate-200">
            {/* Keeping TopBar minimal as per feedback */}
            <div className="px-6 py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 shrink-0">
                    <span className="text-sm font-bold text-slate-800 tracking-tight">{title}</span>
                    {description && (
                        <>
                            <div className="h-4 w-px bg-slate-300 mx-2" />
                            <span className="text-sm text-slate-500 font-normal truncate max-w-[500px] hidden md:block">{description}</span>
                        </>
                    )}
                </div>
                {action && (
                    <div className="flex items-center min-w-0 flex-1 justify-end">
                        {action}
                    </div>
                )}
            </div>
        </header>
    );
}
