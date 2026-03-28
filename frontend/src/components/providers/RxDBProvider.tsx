'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDatabase, BuddyBillsDatabase } from '@/lib/db/database';
import { useSync } from '@/lib/db/useSync';

const RxDBContext = createContext<BuddyBillsDatabase | null>(null);

function SyncInit() {
  useSync();
  return null;
}

export const RxDBProvider = ({ children }: { children: React.ReactNode }) => {
  const [db, setDb] = useState<BuddyBillsDatabase | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const initDB = async () => {
      try {
        const database = await getDatabase();
        if (mounted) {
          setDb(database);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
        console.error('Failed to initialize RxDB:', err);
      }
    };

    initDB();

    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <div className='p-4 text-red-500'>
        <h2 className='text-lg font-bold'>Local Database Error</h2>
        <p>
          Failed to initialize offline database. Please clear site data and
          refresh.
        </p>
        <p className='text-sm opacity-75'>{error.message}</p>
      </div>
    );
  }

  if (!db) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
      </div>
    );
  }

  return (
    <RxDBContext.Provider value={db}>
      {children}
      <SyncInit />
    </RxDBContext.Provider>
  );
};

export const useRxDB = () => {
  const context = useContext(RxDBContext);
  if (!context) {
    throw new Error('useRxDB must be used within an RxDBProvider');
  }
  return context;
};
