'use client';

import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";
import { useSidebar } from "@/lib/sidebar-context";

interface MainLayoutProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
    action?: React.ReactNode;
    mainClassName?: string;
}

export function MainLayout({ children, title, description, action, mainClassName }: MainLayoutProps) {
    const { isCollapsed, isInitialized } = useSidebar();

    return (
        <div className="flex h-screen bg-background overflow-hidden">
            <Sidebar />

            {/* Main content area - add left margin to account for fixed sidebar */}
            <div className={`flex-1 flex flex-col h-full overflow-hidden transition-[margin-left] duration-300 ${isCollapsed ? 'md:ml-16' : 'md:ml-56'}`}>
                <TopBar title={title} description={description} action={action} />

                <main className={mainClassName || "flex-1 p-4 md:px-6 md:pb-6 md:pt-5 overflow-auto"}>
                    {children}
                </main>
            </div>
        </div>
    );
}
