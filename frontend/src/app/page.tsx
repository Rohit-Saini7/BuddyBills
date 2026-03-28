'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/AuthProvider';
import { useGroups } from '@/lib/hooks/useGroups';
import { useExpenses } from '@/lib/hooks/useExpenses';
import { useExpenseSplits } from '@/lib/hooks/useExpenseSplits';
import { useSettlements } from '@/lib/hooks/useSettlements';
import { useGroupMembers } from '@/lib/hooks/useGroupMembers';
import { usePushNotifications } from '@/lib/hooks/usePushNotifications';
import { AppShell } from '@/components/layout/AppShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { AvatarGroup } from '@/components/ui/AvatarCircle';
import { EmptyState } from '@/components/ui/EmptyState';
import Link from 'next/link';

/* ─── Create Group Modal ─── */
function CreateGroupModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { createGroup } = useGroups();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      return;
    }
    setSubmitting(true);
    await createGroup(name.trim(), description.trim());
    setName('');
    setDescription('');
    setSubmitting(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className='fixed inset-0 z-50 flex items-center justify-center p-5'
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='absolute inset-0 bg-black/60 backdrop-blur-sm'
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.25 }}
            className='glass-card-elevated relative z-10 w-full max-w-sm p-6'
          >
            <h2 className='mb-4 font-heading text-lg font-bold text-text-primary'>
              Create Group
            </h2>

            <div className='space-y-3'>
              <div>
                <label className='mb-1.5 block text-xs font-medium tracking-wider text-text-secondary uppercase'>
                  Group Name
                </label>
                <input
                  type='text'
                  defaultValue={name}
                  onInput={(e) => setName((e.target as any).value)}
                  placeholder='e.g. Goa Trip 🏖️'
                  className='w-full rounded-xl border border-subtle bg-elevated px-4 py-3 text-sm font-medium text-text-primary transition-all outline-none placeholder:text-text-tertiary focus:border-amber/30 focus:ring-1 focus:ring-amber/20'
                  autoFocus
                />
              </div>

              <div>
                <label className='mb-1.5 block text-xs font-medium tracking-wider text-text-secondary uppercase'>
                  Description
                </label>
                <input
                  type='text'
                  defaultValue={description}
                  onInput={(e) => setDescription((e.target as any).value)}
                  placeholder='e.g. Beach weekend with the boys'
                  className='w-full rounded-xl border border-subtle bg-elevated px-4 py-3 text-sm font-medium text-text-primary transition-all outline-none placeholder:text-text-tertiary focus:border-amber/30 focus:ring-1 focus:ring-amber/20'
                />
              </div>
            </div>

            <div className='mt-6 flex gap-3'>
              <button
                onClick={onClose}
                className='flex-1 rounded-xl border border-subtle py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-elevated/50'
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleSubmit}
                disabled={!name.trim() || submitting}
                className='amber-glow flex-1 rounded-xl bg-linear-to-r from-amber to-[#E8942A] py-3 font-heading text-sm font-bold text-deep shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-30'
              >
                {submitting ? 'Creating...' : 'Create'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Balance Summary Card ─── */
function BalanceSummaryCard({
  totalOwed,
  totalOwe,
}: {
  totalOwed: number;
  totalOwe: number;
}) {
  const netBalance = totalOwed - totalOwe;

  return (
    <GlassCard variant='amber' className='relative overflow-hidden' delay={0.1}>
      {/* Decorative background gradient */}
      <div className='pointer-events-none absolute inset-0 bg-linear-to-br from-amber/8 via-transparent to-transparent' />
      <div className='pointer-events-none absolute top-0 right-0 h-32 w-32 rounded-full bg-amber/5 blur-3xl' />

      <div className='relative'>
        <div className='flex items-center gap-2 sm:gap-6'>
          <div className='mr-auto'>
            <p className='mb-1 text-xs font-medium tracking-widest text-text-secondary uppercase'>
              Net Balance
            </p>
            <AmountDisplay amount={netBalance} size='xl' showSign />
          </div>
          <div className='h-10 w-px bg-subtle' />
          <div>
            <p className='mb-0.5 text-[10px] tracking-wider text-text-tertiary uppercase'>
              You&apos;re owed
            </p>
            <AmountDisplay amount={totalOwed} size='sm' />
          </div>
          <div className='h-6 w-px bg-subtle' />
          <div>
            <p className='mb-0.5 text-[10px] tracking-wider text-text-tertiary uppercase'>
              You owe
            </p>
            <AmountDisplay amount={-totalOwe} size='sm' />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

/* ─── Group Card ─── */
function GroupCard({
  group,
  index,
  totalSpent,
}: {
  group: { id: string; name: string; description?: string };
  index: number;
  totalSpent: number;
}) {
  const { members } = useGroupMembers(group.id);
  const memberNames =
    members.length > 0 ? members.map((m) => m.userName ?? m.userId) : ['You'];
  return (
    <Link href={`/group/${group.id}`}>
      <GlassCard
        delay={0.15 + index * 0.08}
        className='flex flex-col gap-3 transition-transform active:scale-[0.98]'
      >
        <div className='flex items-start justify-between'>
          <div className='min-w-0 flex-1'>
            <h3 className='truncate font-heading text-base font-semibold text-text-primary'>
              {group.name}
            </h3>
            {group.description && (
              <p className='mt-0.5 truncate text-xs text-text-secondary'>
                {group.description}
              </p>
            )}
          </div>
        </div>

        <div className='flex items-center justify-between'>
          <AvatarGroup
            names={memberNames.length > 0 ? memberNames : ['You']}
            max={4}
            size='sm'
          />
          <div className='flex items-center gap-1.5 text-text-tertiary'>
            <span className='text-[11px] font-medium'>
              <AmountDisplay
                amount={totalSpent}
                size='sm'
                className='text-text-secondary!'
              />
              <span className='ml-0.5 text-text-tertiary'>total</span>
            </span>
          </div>
        </div>
      </GlassCard>
    </Link>
  );
}

/* ─── Dashboard Page ─── */
export default function DashboardPage() {
  const { groups, loaded } = useGroups();
  const { expenses } = useExpenses();
  const { splits } = useExpenseSplits();
  const { settlements } = useSettlements();
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Activate push notifications after login
  usePushNotifications();

  // Redirect to landing if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/landing');
    }
  }, [authLoading, isAuthenticated, router]);

  // Compute per-group stats from expenses
  const groupStats = groups.map((group) => {
    const groupExpenses = expenses.filter((e) => e.groupId === group.id);
    const totalSpent = groupExpenses.reduce((sum, e) => sum + e.amount, 0);
    return { ...group, totalSpent };
  });

  // Compute real balance from splits + settlements for the current user
  const { totalOwed, totalOwe } = useMemo(() => {
    const currentUserId = user?.id || user?.email || 'You';

    let totalOwed = 0; // others owe me
    let totalOwe = 0; // I owe others

    // For each expense I paid, others owe me their split share
    expenses.forEach((e) => {
      if (e.paidById === currentUserId) {
        // I'm owed for splits that aren't mine
        const expenseSplits = splits.filter(
          (s) => s.expenseId === e.id && s.userId !== currentUserId
        );
        totalOwed += expenseSplits.reduce((sum, s) => sum + s.amount, 0);
      }
    });

    // For splits where I owe money (but I'm not the payer)
    splits.forEach((s) => {
      if (s.userId === currentUserId) {
        const expense = expenses.find((e) => e.id === s.expenseId);
        if (expense && expense.paidById !== currentUserId) {
          totalOwe += s.amount;
        }
      }
    });

    // Factor in settlements
    settlements.forEach((s) => {
      if (s.fromUserId === currentUserId) {
        // I paid someone, reducing what I owe
        totalOwe = Math.max(0, totalOwe - s.amount);
      }
      if (s.toUserId === currentUserId) {
        // Someone paid me, reducing what they owe me
        totalOwed = Math.max(0, totalOwed - s.amount);
      }
    });

    return {
      totalOwed: Math.round(totalOwed * 100) / 100,
      totalOwe: Math.round(totalOwe * 100) / 100,
    };
  }, [expenses, splits, settlements, user]);

  return (
    <AppShell>
      {/* Header — hidden on desktop since sidebar has logo */}
      <header className='px-5 pt-14 pb-2 lg:pt-8'>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className='flex items-center justify-between'
        >
          <div>
            <h1 className='font-heading text-2xl font-bold tracking-tight text-text-primary lg:hidden'>
              Buddy
              <span className='text-amber'>Bills</span>
            </h1>
            <h1 className='hidden font-heading text-2xl font-bold tracking-tight text-text-primary lg:block'>
              Dashboard
            </h1>
            <div className='mt-1 h-0.5 w-8 rounded-full bg-amber/50 lg:hidden' />
          </div>
        </motion.div>
      </header>

      <div className='mt-4 space-y-4 px-5'>
        {/* Balance Summary */}
        <BalanceSummaryCard totalOwed={totalOwed} totalOwe={totalOwe} />

        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className='flex items-center justify-between pt-2'
        >
          <h2 className='font-heading text-sm font-semibold tracking-wider text-text-secondary uppercase'>
            Your Groups
          </h2>
          <div className='flex items-center gap-3'>
            <span className='text-xs font-medium text-text-tertiary'>
              {groups.length} group{groups.length !== 1 ? 's' : ''}
            </span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowCreateModal(true)}
              className='flex items-center gap-1.5 rounded-lg border border-amber/20 bg-amber/10 px-3 py-1.5 text-xs font-semibold text-amber transition-colors hover:bg-amber/15'
            >
              <svg
                width='12'
                height='12'
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
              New
            </motion.button>
          </div>
        </motion.div>

        {/* Groups List */}
        {loaded && groups.length > 0 ? (
          <div className='grid grid-cols-1 space-y-3 lg:grid-cols-2 lg:gap-4 lg:space-y-0'>
            {groupStats.map((group, i) => (
              <GroupCard
                key={group.id}
                group={group}
                index={i}
                totalSpent={group.totalSpent}
              />
            ))}
          </div>
        ) : loaded ? (
          <EmptyState
            icon={
              <svg
                width='48'
                height='48'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth={1.2}
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <path d='M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2' />
                <circle cx='9' cy='7' r='4' />
                <line x1='19' y1='8' x2='19' y2='14' />
                <line x1='22' y1='11' x2='16' y2='11' />
              </svg>
            }
            title='No groups yet'
            description='Create your first group and start splitting expenses with friends.'
            action={{
              label: 'Create Group',
              onClick: () => setShowCreateModal(true),
            }}
          />
        ) : null}
      </div>

      <CreateGroupModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </AppShell>
  );
}
