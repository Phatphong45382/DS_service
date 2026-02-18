"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { LayoutDashboard, Target, Bell, PlusCircle, Settings, Users, Menu, Home, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSidebar } from "@/lib/sidebar-context";

const navigation = [
    { name: 'Home', href: '/', icon: Home },
    // { name: 'Overview', href: '/overview', icon: LayoutDashboard },
    { name: 'Analytics Dashboard', href: '/analytics-dashboard', icon: BarChart3 },
    { name: 'Accuracy Deep Dive', href: '/accuracy-deep-dive', icon: Target },
    { name: 'Scenario Planner', href: '/scenario-planner', icon: LayoutDashboard }, // Changed Icon to distinguish
    // { name: 'Monitoring & Alerts', href: '/monitoring', icon: Bell },
    { name: 'New Prediction', href: '/new-prediction', icon: PlusCircle },
    { name: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const { isCollapsed, setIsCollapsed } = useSidebar();

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className={cn(
                    "hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:h-screen bg-slate-900 border-r border-slate-800 transition-[width] duration-300 z-40",
                    isCollapsed ? "md:w-20" : "md:w-64"
                )}
            >
                {/* Header / Logo */}
                <div className={cn(
                    "h-16 flex items-center border-b border-slate-800 transition-all",
                    isCollapsed ? "justify-center px-0" : "px-6"
                )}>
                    <div className="flex items-center gap-3 w-full">
                        {/* Toggle Button */}
                        <button
                            suppressHydrationWarning
                            onClick={() => setIsCollapsed(!isCollapsed)}
                            className={cn(
                                "p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors",
                                isCollapsed && "mx-auto"
                            )}
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        {/* Logo Text - Hidden when collapsed */}
                        <div className={cn(
                            "flex items-center gap-3 overflow-hidden transition-all duration-300 opacity-100",
                            isCollapsed ? "w-0 opacity-0 hidden" : "w-auto"
                        )}>
                            <div className="w-8 h-8 min-w-[32px] bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                                <span className="text-white font-bold text-sm">S</span>
                            </div>
                            <div className="whitespace-nowrap">
                                <h1 className="text-base font-bold text-white font-display tracking-tight">SSCI</h1>
                                <p className="text-xs text-slate-400 font-medium">Demand forecast</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className={cn(
                    "flex-1 py-6 space-y-1 transition-all",
                    isCollapsed ? "px-2" : "px-4"
                )}>
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-200 group",
                                    isActive
                                        ? "bg-blue-600/10 text-blue-400 shadow-sm border border-blue-600/20"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200",
                                    isCollapsed && "justify-center px-2"
                                )}
                                title={isCollapsed ? item.name : undefined}
                            >
                                <item.icon className={cn(
                                    "w-5 h-5 transition-colors min-w-[20px]",
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
                    })}
                </nav>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800">
                    <div className={cn(
                        "flex items-center gap-3 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer",
                        isCollapsed ? "justify-center p-0" : "px-3 py-2"
                    )}>
                        <div className="w-8 h-8 min-w-[32px] bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
                            <Users className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className={cn(
                            "flex-1 min-w-0 transition-all duration-300 overflow-hidden",
                            isCollapsed ? "w-0 opacity-0 hidden" : "w-auto opacity-100"
                        )}>
                            <p className="text-sm font-medium text-slate-200 truncate">Admin User</p>
                            <p className="text-xs text-slate-500 truncate">admin@ssci.com</p>
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
                <SheetContent side="left" className="w-64 p-0 bg-slate-900 border-r border-slate-800">
                    {/* Logo */}
                    <div className="h-16 flex items-center px-6 border-b border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 min-w-[32px] bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                                <span className="text-white font-bold text-sm">S</span>
                            </div>
                            <div>
                                <h1 className="text-base font-bold text-white">SSCI</h1>
                                <p className="text-xs text-slate-400">Demand forecast</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="px-4 py-6 space-y-1">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
                                        isActive
                                            ? "bg-blue-600/10 text-blue-400 shadow-sm border border-blue-600/20"
                                            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                    )}
                                >
                                    <item.icon className={cn(
                                        "w-5 h-5 transition-colors",
                                        isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"
                                    )} />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </SheetContent>
            </Sheet>
        </>
    );
}
