"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard, Target, Activity, PlusCircle, Settings, Users, Menu,
    Home, BarChart3, PlayCircle, ChevronDown, Brain, MessageCircle, FileText, ScanLine, Bot
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSidebar } from "@/lib/sidebar-context";

// ── Top items (no label needed) ──
const topItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Analytics', href: '/analytics-dashboard', icon: BarChart3 },
];

// ── Forecast section ──
const forecastItems = [
    { name: 'Forecast', href: '/forecast', icon: Target },
    { name: 'Deep Dive', href: '/accuracy-deep-dive', icon: Activity },
    { name: 'Planner', href: '/scenario-planner', icon: LayoutDashboard },
    { name: 'New Prediction', href: '/new-prediction', icon: PlusCircle },
    { name: 'Runs', href: '/runs', icon: PlayCircle },
];

// ── AI sub-items ──
const aiSubItems = [
    { name: 'Chat', href: '/ai-chat', icon: MessageCircle },
    { name: 'Report', href: '/ai-report', icon: FileText },
    { name: 'OCR', href: '/ai-ocr', icon: ScanLine },
    { name: 'Agent', href: '/ai-agent', icon: Bot },
];

// ── Compact NavLink ──
function NavLink({ item, isActive, isCollapsed }: {
    item: { name: string; href: string; icon: any };
    isActive: boolean;
    isCollapsed: boolean;
}) {
    return (
        <Link
            href={item.href}
            className={cn(
                "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors duration-150 group",
                isActive
                    ? "bg-blue-600/10 text-blue-400 border border-blue-600/20"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                isCollapsed && "justify-center px-2"
            )}
            title={isCollapsed ? item.name : undefined}
        >
            <item.icon className={cn(
                "w-4 h-4 transition-colors min-w-[16px]",
                isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
            )} />
            <span className={cn(
                "transition-all duration-200 whitespace-nowrap overflow-hidden",
                isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
            )}>
                {item.name}
            </span>
        </Link>
    );
}

// ── Section divider with label ──
function SectionDivider({ label, isCollapsed }: { label: string; isCollapsed: boolean }) {
    if (isCollapsed) {
        return <div className="my-1.5 mx-auto w-5 border-t border-slate-700/50" />;
    }
    return (
        <p className="px-2.5 pt-3 pb-1 text-[10px] font-semibold text-slate-600 uppercase tracking-widest select-none">
            {label}
        </p>
    );
}

export function Sidebar() {
    const pathname = usePathname();
    const { isCollapsed, setIsCollapsed } = useSidebar();
    const [aiExpanded, setAiExpanded] = useState(
        pathname.startsWith('/ai-')
    );

    const isAiActive = pathname.startsWith('/ai-');

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    "hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:h-screen bg-slate-900 border-r border-slate-800 transition-[width] duration-300 z-40",
                    isCollapsed ? "md:w-16" : "md:w-56"
                )}
            >
                {/* Header / Logo */}
                <div className={cn(
                    "h-14 flex items-center border-b border-slate-800 transition-all",
                    isCollapsed ? "justify-center px-0" : "px-4"
                )}>
                    <div className="flex items-center gap-2.5 w-full">
                        <button
                            suppressHydrationWarning
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className={cn(
                                "p-1.5 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors",
                                isCollapsed && "mx-auto"
                            )}
                        >
                            <Menu className="w-4 h-4" />
                        </button>
                        <div className={cn(
                            "flex items-center gap-2.5 overflow-hidden transition-all duration-300 opacity-100",
                            isCollapsed ? "w-0 opacity-0 hidden" : "w-auto"
                        )}>
                            <div className="w-7 h-7 min-w-[28px] bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                                <span className="text-white font-bold text-xs">S</span>
                            </div>
                            <div className="whitespace-nowrap">
                                <h1 className="text-sm font-bold text-white font-display tracking-tight leading-tight">SSCI</h1>
                                <p className="text-[10px] text-slate-500 font-medium">Demand forecast</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className={cn(
                    "flex-1 py-2 transition-all overflow-y-auto",
                    isCollapsed ? "px-1.5" : "px-3"
                )}>
                    {/* Top items — no label */}
                    <div className="space-y-0.5">
                        {topItems.map((item) => (
                            <NavLink
                                key={item.name}
                                item={item}
                                isActive={pathname === item.href}
                                isCollapsed={isCollapsed}
                            />
                        ))}
                    </div>

                    {/* Forecast section */}
                    <SectionDivider label="Forecast" isCollapsed={isCollapsed} />
                    <div className="space-y-0.5">
                        {forecastItems.map((item) => (
                            <NavLink
                                key={item.name}
                                item={item}
                                isActive={pathname === item.href}
                                isCollapsed={isCollapsed}
                            />
                        ))}
                    </div>

                    {/* GenAI Group */}
                    {isCollapsed ? (
                        <>
                            <div className="my-1.5 mx-auto w-5 border-t border-slate-700/50" />
                            <Link
                                href="/ai-chat"
                                className={cn(
                                    "flex items-center justify-center px-2 py-1.5 rounded-md text-[13px] font-medium transition-colors duration-150 group",
                                    isAiActive
                                        ? "bg-violet-600/10 text-violet-400 border border-violet-600/20"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                )}
                                title="GenAI"
                            >
                                <Brain className={cn(
                                    "w-4 h-4 transition-colors min-w-[16px]",
                                    isAiActive ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300"
                                )} />
                            </Link>
                        </>
                    ) : (
                        <div>
                            <SectionDivider label="GenAI" isCollapsed={false} />
                            <button
                                onClick={() => setAiExpanded(!aiExpanded)}
                                className={cn(
                                    "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-colors duration-150 group",
                                    isAiActive
                                        ? "bg-violet-600/10 text-violet-400 border border-violet-600/20"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                )}
                            >
                                <Brain className={cn(
                                    "w-4 h-4 transition-colors min-w-[16px]",
                                    isAiActive ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300"
                                )} />
                                <span className="flex-1 text-left">AI Features</span>
                                <ChevronDown className={cn(
                                    "w-3.5 h-3.5 transition-transform duration-200",
                                    aiExpanded ? "rotate-180" : ""
                                )} />
                            </button>
                            {aiExpanded && (
                                <div className="mt-0.5 ml-3 pl-3 border-l border-slate-700/40 space-y-0.5">
                                    {aiSubItems.map((item) => {
                                        const isActive = pathname === item.href;
                                        return (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                className={cn(
                                                    "flex items-center gap-2 px-2.5 py-1 rounded-md text-[12px] font-medium transition-colors duration-150 group",
                                                    isActive
                                                        ? "bg-violet-600/10 text-violet-400"
                                                        : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                                                )}
                                            >
                                                <item.icon className={cn(
                                                    "w-3.5 h-3.5 transition-colors",
                                                    isActive ? "text-violet-400" : "text-slate-600 group-hover:text-slate-400"
                                                )} />
                                                <span>{item.name}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </nav>

                {/* Settings + User — compact footer */}
                <div className={cn(
                    "border-t border-slate-800",
                    isCollapsed ? "px-1.5 py-1.5" : "px-3 py-2"
                )}>
                    <NavLink
                        item={{ name: 'Settings', href: '/settings', icon: Settings }}
                        isActive={pathname === '/settings'}
                        isCollapsed={isCollapsed}
                    />
                    <div className={cn(
                        "flex items-center gap-2.5 rounded-md hover:bg-slate-800 transition-colors cursor-pointer mt-1",
                        isCollapsed ? "justify-center p-0" : "px-2.5 py-1.5"
                    )}>
                        <div className="w-6 h-6 min-w-[24px] bg-white rounded-full flex items-center justify-center border border-slate-600">
                            <Users className="w-3 h-3 text-slate-500" />
                        </div>
                        <div className={cn(
                            "flex-1 min-w-0 transition-all duration-300 overflow-hidden",
                            isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
                        )}>
                            <p className="text-[12px] font-medium text-slate-300 truncate">Admin User</p>
                            <p className="text-[10px] text-slate-500 truncate">admin@ssci.com</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Mobile Sidebar */}
            <Sheet>
                <SheetTrigger asChild>
                    <button
                        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 rounded-lg shadow-md border border-slate-800 text-slate-200"
                        suppressHydrationWarning
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                </SheetTrigger>
                <SheetContent side="left" className="w-56 p-0 bg-slate-900 border-r border-slate-800">
                    <div className="h-14 flex items-center px-4 border-b border-slate-800">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 min-w-[28px] bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                                <span className="text-white font-bold text-xs">S</span>
                            </div>
                            <div>
                                <h1 className="text-sm font-bold text-white">SSCI</h1>
                                <p className="text-[10px] text-slate-500">Demand forecast</p>
                            </div>
                        </div>
                    </div>
                    <nav className="px-3 py-3 overflow-y-auto">
                        {/* Top items */}
                        <div className="space-y-0.5">
                            {topItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link key={item.name} href={item.href}
                                        className={cn(
                                            "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 group",
                                            isActive
                                                ? "bg-blue-600/10 text-blue-400 border border-blue-600/20"
                                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                        )}>
                                        <item.icon className={cn("w-4 h-4", isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Forecast */}
                        <p className="px-2.5 pt-3 pb-1 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">Forecast</p>
                        <div className="space-y-0.5">
                            {forecastItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link key={item.name} href={item.href}
                                        className={cn(
                                            "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 group",
                                            isActive
                                                ? "bg-blue-600/10 text-blue-400 border border-blue-600/20"
                                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                        )}>
                                        <item.icon className={cn("w-4 h-4", isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* GenAI */}
                        <p className="px-2.5 pt-3 pb-1 text-[10px] font-semibold text-slate-600 uppercase tracking-widest">GenAI</p>
                        <div className="space-y-0.5">
                            {aiSubItems.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link key={item.name} href={item.href}
                                        className={cn(
                                            "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 group",
                                            isActive
                                                ? "bg-violet-600/10 text-violet-400 border border-violet-600/20"
                                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                        )}>
                                        <item.icon className={cn("w-4 h-4", isActive ? "text-violet-400" : "text-slate-500 group-hover:text-slate-300")} />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>

                        {/* Settings */}
                        <div className="mt-3 pt-3 border-t border-slate-800/50">
                            <Link href="/settings"
                                className={cn(
                                    "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[13px] font-medium transition-all duration-150 group",
                                    pathname === '/settings'
                                        ? "bg-blue-600/10 text-blue-400 border border-blue-600/20"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                )}>
                                <Settings className={cn("w-4 h-4", pathname === '/settings' ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300")} />
                                <span>Settings</span>
                            </Link>
                        </div>
                    </nav>
                </SheetContent>
            </Sheet>
        </>
    );
}
