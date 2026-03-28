'use client';

import React from 'react';
import { BottomNav, SidebarNav } from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className='mesh-bg relative min-h-screen'>
      <div className='relative z-10 flex min-h-screen'>
        {/* Desktop sidebar */}
        <SidebarNav />

        {/* Main content area */}
        <div className='flex min-h-screen flex-1 flex-col'>
          <main className='custom-scrollbar flex-1 overflow-y-auto pb-24 lg:pb-8'>
            <div className='mx-auto max-w-md lg:max-w-4xl xl:max-w-5xl'>
              {children}
            </div>
          </main>

          {/* Mobile bottom navigation */}
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
