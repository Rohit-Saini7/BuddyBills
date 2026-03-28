'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRxDB } from '@/components/providers/RxDBProvider';
import { AppShell } from '@/components/layout/AppShell';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { AvatarCircle } from '@/components/ui/AvatarCircle';
import { EmptyState } from '@/components/ui/EmptyState';
import { ExpenseDocType, GroupDocType } from '@/lib/db/schema';

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) {
    return 'just now';
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return `${hrs}h ago`;
  }
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ActivityPage() {
  const db = useRxDB();
  const [expenses, setExpenses] = useState<ExpenseDocType[]>([]);
  const [groups, setGroups] = useState<Record<string, GroupDocType>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Subscribe to all expenses
    const expSub = db.expenses
      .find({
        selector: { isDeleted: false },
        sort: [{ updatedAt: 'desc' }],
      })
      .$.subscribe((docs) => {
        setExpenses(docs.map((d) => d.toJSON() as ExpenseDocType));
        setLoaded(true);
      });

    // Subscribe to all groups for name lookup
    const groupSub = db.groups
      .find({ selector: { isDeleted: false } })
      .$.subscribe((docs) => {
        const map: Record<string, GroupDocType> = {};
        docs.forEach((d) => {
          const json = d.toJSON() as GroupDocType;
          map[json.id] = json;
        });
        setGroups(map);
      });

    return () => {
      expSub.unsubscribe();
      groupSub.unsubscribe();
    };
  }, [db]);

  return (
    <AppShell>
      {/* Header */}
      <header className='px-5 pt-14 pb-4 lg:pt-8'>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className='font-heading text-2xl font-bold tracking-tight text-text-primary'>
            Activity
          </h1>
          <p className='mt-1 text-xs text-text-secondary'>
            Recent expenses across all groups
          </p>
        </motion.div>
      </header>

      <div className='px-5 lg:max-w-2xl'>
        {loaded && expenses.length === 0 ? (
          <EmptyState
            icon={
              <svg
                width='40'
                height='40'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth={1.2}
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <path d='M22 12h-4l-3 9L9 3l-3 9H2' />
              </svg>
            }
            title='No activity yet'
            description='Expenses will appear here as you add them to your groups.'
          />
        ) : (
          /* Timeline */
          <div className='relative'>
            {/* Timeline line */}
            <div className='absolute top-2 bottom-2 left-[18px] w-px bg-linear-to-b from-amber/30 via-subtle to-transparent' />

            <div className='space-y-1'>
              {expenses.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: 0.1 + i * 0.06,
                    duration: 0.35,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  className='relative flex gap-3 py-2.5'
                >
                  {/* Timeline dot */}
                  <div className='relative z-10 mt-1 shrink-0'>
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${i === 0 ? 'amber-glow-subtle bg-amber' : 'border border-subtle bg-elevated'}`}
                    />
                  </div>

                  {/* Card */}
                  <div className='glass-card flex flex-1 items-center gap-3 p-3'>
                    <AvatarCircle name={item.paidById} size='sm' />
                    <div className='min-w-0 flex-1'>
                      <p className='truncate text-sm font-medium text-text-primary'>
                        {item.description}
                      </p>
                      <p className='mt-0.5 text-[11px] text-text-tertiary'>
                        {item.paidById}
                        <span className='mx-1'>·</span>
                        {groups[item.groupId]?.name || 'Unknown Group'}
                        <span className='mx-1'>·</span>
                        {timeAgo(item.updatedAt)}
                      </p>
                    </div>
                    <AmountDisplay amount={item.amount} size='sm' />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
