'use client';

import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { useSidebar } from "@/lib/sidebar-context";

interface MainLayoutProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
    action?: React.ReactNode;
}

export function MainLayout({ children, title, description, action }: MainLayoutProps) {
    const { isCollapsed, isInitialized } = useSidebar();

    // Optional: Prevent transition on initial load to avoid flicker
    // But since we have fixed position, maybe it's fine.

    return (
        <div className="flex min-h-screen bg-blue-50">
            <Sidebar />

            {/* Main content area - add left margin to account for fixed sidebar */}
            <div className={`flex-1 flex flex-col transition-[margin-left] duration-300 ${isCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
                <TopBar title={title} description={description} action={action} />

                <main className="flex-1 p-4 md:px-8 md:pb-8 md:pt-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
