'use client';

import { SearchProvider } from "@/lib/search-context";
import { PlanningProvider } from "@/lib/planning-context";
import { SidebarProvider } from "@/lib/sidebar-context";

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <SearchProvider>
            <PlanningProvider>
                <SidebarProvider>
                    {children}
                </SidebarProvider>
            </PlanningProvider>
        </SearchProvider>
    );
}
