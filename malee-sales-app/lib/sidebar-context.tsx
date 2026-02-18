'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface SidebarContextType {
    isCollapsed: boolean;
    setIsCollapsed: (collapsed: boolean) => void;
    isInitialized: boolean;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [isCollapsed, setIsCollapsedState] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load state from localStorage on mount
    useEffect(() => {
        const savedState = localStorage.getItem('sidebar-collapsed');
        if (savedState) {
            setIsCollapsedState(JSON.parse(savedState));
        }
        setIsInitialized(true);
    }, []);

    const setIsCollapsed = (collapsed: boolean) => {
        setIsCollapsedState(collapsed);
        localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
    };

    return (
        <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed, isInitialized }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}
