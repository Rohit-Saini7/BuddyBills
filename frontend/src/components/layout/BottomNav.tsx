'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  {
    label: 'Groups',
    href: '/',
    icon: (active: boolean) => (
      <svg
        width='22'
        height='22'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <rect x='3' y='3' width='7' height='7' rx='1.5' />
        <rect x='14' y='3' width='7' height='7' rx='1.5' />
        <rect x='3' y='14' width='7' height='7' rx='1.5' />
        <rect x='14' y='14' width='7' height='7' rx='1.5' />
      </svg>
    ),
  },
  {
    label: 'Activity',
    href: '/activity',
    icon: (active: boolean) => (
      <svg
        width='22'
        height='22'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <path d='M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83' />
      </svg>
    ),
  },
  {
    label: 'Add',
    href: '/add-expense',
    isAction: true,
    icon: (_active: boolean) => (
      <svg
        width='24'
        height='24'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth={2.5}
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <line x1='12' y1='5' x2='12' y2='19' />
        <line x1='5' y1='12' x2='19' y2='12' />
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: (active: boolean) => (
      <svg
        width='22'
        height='22'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        strokeWidth={active ? 2.2 : 1.8}
        strokeLinecap='round'
        strokeLinejoin='round'
      >
        <circle cx='12' cy='12' r='3' />
        <path d='M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42' />
      </svg>
    ),
  },
];

/* ─── Mobile Bottom Nav ─── */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className='fixed right-0 bottom-0 left-0 z-50 lg:hidden'>
      {/* Top edge glow line */}
      <div className='h-px bg-linear-to-r from-transparent via-amber/30 to-transparent' />

      <div className='flex items-center justify-around border-t border-subtle bg-deep/90 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl'>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;

          if (item.isAction) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className='relative -mt-5'
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.92 }}
                  className='amber-glow flex h-14 w-14 items-center justify-center rounded-2xl bg-amber text-deep shadow-lg'
                >
                  {item.icon(false)}
                </motion.div>
                {/* Pulsing ring */}
                <div className='animate-pulse-amber pointer-events-none absolute inset-0 rounded-2xl' />
              </Link>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors duration-200 ${
                isActive
                  ? 'text-amber'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <div className='relative'>
                {item.icon(isActive)}
                {isActive && (
                  <motion.div
                    layoutId='nav-indicator'
                    className='absolute -bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-amber'
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </div>
              <span className='text-[10px] font-medium'>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ─── Desktop Sidebar Nav ─── */
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className='sticky top-0 hidden h-screen w-64 flex-col border-r border-subtle bg-deep/50 backdrop-blur-xl lg:flex'>
      {/* Logo */}
      <div className='border-b border-subtle px-6 py-6'>
        <Link
          href='/'
          className='font-heading text-xl font-bold tracking-tight text-text-primary'
        >
          Buddy<span className='text-amber'>Bills</span>
        </Link>
        <div className='mt-1.5 h-0.5 w-6 rounded-full bg-amber/40' />
      </div>

      {/* Nav Items */}
      <nav className='flex-1 space-y-1 px-3 py-4'>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;

          if (item.isAction) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className='amber-glow mt-4 flex items-center gap-3 rounded-xl bg-amber px-4 py-3 font-heading text-sm font-bold text-deep transition-colors hover:bg-amber/90'
              >
                {item.icon(false)}
                <span>Add Expense</span>
              </Link>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'border border-amber/15 bg-amber/10 text-amber'
                  : 'text-text-secondary hover:bg-elevated/50 hover:text-text-primary'
              }`}
            >
              {item.icon(isActive)}
              <span>{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId='sidebar-indicator'
                  className='ml-auto h-1.5 w-1.5 rounded-full bg-amber'
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className='border-t border-subtle px-6 py-4'>
        <p className='text-[11px] text-text-tertiary'>BuddyBills 2.0</p>
        <p className='text-[10px] text-text-tertiary/60'>Offline-First PWA</p>
      </div>
    </aside>
  );
}
