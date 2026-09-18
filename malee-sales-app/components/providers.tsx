'use client';

import { SearchProvider } from "@/lib/search-context";
import { PlanningProvider } from "@/lib/planning-context";
import { SidebarProvider } from "@/lib/sidebar-context";
import { ApiErrorToasts } from "@/components/api-error-toasts";

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <SearchProvider>
            <PlanningProvider>
                <SidebarProvider>
                    {children}
                    <ApiErrorToasts />
                </SidebarProvider>
            </PlanningProvider>
        </SearchProvider>
    );
}
