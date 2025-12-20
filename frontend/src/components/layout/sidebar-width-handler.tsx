"use client";

import { useEffect } from 'react';
import { useSidebar } from '@/contexts/sidebar-context';

export function SidebarWidthHandler({ children }: { children: React.ReactNode }) {
    const { isCollapsed } = useSidebar();

    useEffect(() => {
        // Update CSS variable for sidebar width
        document.documentElement.style.setProperty(
            '--sidebar-width',
            isCollapsed ? '80px' : '256px'
        );
    }, [isCollapsed]);

    return <>{children}</>;
}
