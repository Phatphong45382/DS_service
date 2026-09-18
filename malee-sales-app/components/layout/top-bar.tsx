interface TopBarProps {
    title?: string;
    description?: string;
    action?: React.ReactNode;
}

export function TopBar({ title, description, action }: TopBarProps) {
    // Don't render TopBar at all if no title and no action
    if (!title && !action) return null;

    return (
        <header className="bg-white border-b border-slate-200">
            {/* Keeping TopBar minimal as per feedback */}
            <div className="px-6 py-3.5 flex items-center justify-between gap-4">
                {/* The title keeps its width; the description is the one thing allowed to give way,
                    so wide controls on the right (date range, filters) truncate it instead of covering it. */}
                <div className="flex items-center gap-4 min-w-0">
                    {title && (
                        <span className="text-lg font-bold text-slate-800 tracking-tight shrink-0">{title}</span>
                    )}
                    {title && description && (
                        <>
                            <div className="h-4 w-px bg-slate-300 mx-2 shrink-0" />
                            <span className="text-sm text-slate-500 font-normal truncate min-w-0 hidden md:block" title={description}>{description}</span>
                        </>
                    )}
                </div>
                {action && (
                    <div className="flex items-center shrink-0 justify-end">
                        {action}
                    </div>
                )}
            </div>
        </header>
    );
}
