'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useRxDB } from '@/components/providers/RxDBProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { AppShell } from '@/components/layout/AppShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { AvatarCircle } from '@/components/ui/AvatarCircle';

export default function SettingsPage() {
  const db = useRxDB();
  const { user, isAuthenticated, logout } = useAuth();
  const [clearing, setClearing] = useState(false);

  const handleClearData = async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = globalThis as any;
    if (!w.confirm('This will delete all local data. Are you sure?')) {
      return;
    }
    setClearing(true);
    try {
      await db.remove();
      w.location.href = '/';
    } catch {
      setClearing(false);
      w.alert('Failed to clear data. Please try again.');
    }
  };

  return (
    <AppShell>
      <header className='px-5 pt-14 pb-4 lg:pt-8'>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className='font-heading text-2xl font-bold tracking-tight text-text-primary'>
            Settings
          </h1>
        </motion.div>
      </header>

      <div className='space-y-4 px-5 pb-10'>
        {/* Profile */}
        <GlassCard delay={0.1} hover={false}>
          <div className='flex items-center gap-4'>
            <AvatarCircle name={user?.name || 'You'} size='lg' />
            <div className='min-w-0 flex-1'>
              <h3 className='truncate font-heading text-base font-semibold text-text-primary'>
                {isAuthenticated
                  ? user?.name || user?.email || 'User'
                  : 'Local User'}
              </h3>
              <p className='truncate text-sm text-text-secondary'>
                {isAuthenticated
                  ? user?.email
                  : 'Sign in to sync across devices'}
              </p>
            </div>
            {isAuthenticated && (
              <button
                onClick={logout}
                className='shrink-0 rounded-lg bg-danger/10 px-3 py-1.5 text-xs font-medium text-danger transition-colors hover:bg-danger/20'
              >
                Sign out
              </button>
            )}
          </div>
        </GlassCard>

        {/* Danger Zone */}
        <div className='pt-2'>
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClearData}
            disabled={clearing}
            className='w-full rounded-xl border border-danger/20 py-3 text-sm font-medium text-danger transition-colors hover:bg-danger/5 disabled:opacity-50'
          >
            {clearing ? 'Clearing...' : 'Clear Local Data'}
          </motion.button>
        </div>
      </div>
    </AppShell>
  );
}
