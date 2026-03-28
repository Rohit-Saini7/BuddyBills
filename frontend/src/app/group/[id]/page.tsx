'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import { useAuth, getApiUrl } from '@/components/providers/AuthProvider';
import { useGroups } from '@/lib/hooks/useGroups';
import { useGroupMembers } from '@/lib/hooks/useGroupMembers';
import { useExpenses } from '@/lib/hooks/useExpenses';
import { useExpenseSplits } from '@/lib/hooks/useExpenseSplits';
import { useSettlements } from '@/lib/hooks/useSettlements';
import { AppShell } from '@/components/layout/AppShell';
import { GlassCard } from '@/components/ui/GlassCard';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { AvatarCircle } from '@/components/ui/AvatarCircle';
import { EmptyState } from '@/components/ui/EmptyState';
import { SettleUpModal } from '@/components/SettleUpModal';
import Link from 'next/link';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g = globalThis as any;

type ExpenseItem = {
  type: 'expense';
  id: string;
  updatedAt: string;
  data: {
    id: string;
    amount: number;
    updatedAt: string;
    isDeleted: boolean;
    description: string;
    groupId: string;
    paidById: string;
    splitType: string;
  };
};

type SettlementItem = {
  type: 'settlement';
  id: string;
  updatedAt: string;
  data: {
    id: string;
    amount: number;
    updatedAt: string;
    isDeleted: boolean;
    groupId: string;
    fromUserId: string;
    toUserId: string;
    note?: string;
  };
};

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

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.id as string;
  const { groups } = useGroups();
  const { expenses, loaded, deleteExpense, updateExpense } =
    useExpenses(groupId);
  const {
    getSplitsForGroup,
    getSplitsForExpense,
    createEqualSplits,
    deleteSplitsForExpense,
  } = useExpenseSplits(groupId);
  const { settlements, recordSettlement } = useSettlements(groupId);
  const { members: groupMembers } = useGroupMembers(groupId);
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const { token: authToken, user } = useAuth();
  // Confirmation modal state — holds the expense pending deletion
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string;
    description: string;
    amount: number;
  } | null>(null);
  // Edit modal state — holds the expense being edited
  const [editExpense, setEditExpense] = useState<{
    id: string;
    description: string;
    amount: number;
    paidById: string;
    splitType: string;
  } | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editPaidById, setEditPaidById] = useState('');
  const [editSelectedMembers, setEditSelectedMembers] = useState<Set<string>>(
    new Set()
  );
  const [editDeleteConfirm, setEditDeleteConfirm] = useState(false);

  const group = groups.find((g) => g.id === groupId);

  const generateInvite = useCallback(async () => {
    if (!authToken) {
      return;
    }
    setInviteLoading(true);
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ groupId }),
      });
      if (res.ok) {
        const data = await res.json();
        const url = `${g.location?.origin || ''}/invite/${data.token}`;
        setInviteLink(url);
      }
    } catch {
      // Silently fail
    } finally {
      setInviteLoading(false);
    }
  }, [authToken, groupId]);

  const copyInviteLink = useCallback(async () => {
    if (!inviteLink) {
      return;
    }
    try {
      await g.navigator?.clipboard?.writeText(inviteLink);
      setInviteCopied(true);
      setTimeout(() => setInviteCopied(false), 2000);
    } catch {
      // Fallback
    }
  }, [inviteLink]);

  // Compute real balances from splits + settlements
  const { memberBalances, balanceMap, idToName } = useMemo(() => {
    const expenseIds = expenses.map((e) => e.id);
    const groupSplits = getSplitsForGroup(expenseIds);

    // Build ID to Name Lookup Map
    const idToName: Record<string, string> = {};
    groupMembers.forEach((m) => {
      idToName[m.userId] = m.userName || m.userId;
    });

    // Track net balance: what each person paid minus what they owe
    const balances: Record<string, number> = {};

    // For each expense, the payer gets +amount credit
    expenses.forEach((e) => {
      balances[e.paidById] = (balances[e.paidById] || 0) + e.amount;
    });

    // For each split, the person owes that amount
    groupSplits.forEach((s) => {
      balances[s.userId] = (balances[s.userId] || 0) - s.amount;
    });

    // If no splits exist, fall back to equal split among payers (legacy behavior)
    if (groupSplits.length === 0 && expenses.length > 0) {
      const total = expenses.reduce((sum, e) => sum + e.amount, 0);
      const payers = [...new Set(expenses.map((e) => e.paidById))];
      const perPerson = payers.length > 0 ? total / payers.length : 0;
      payers.forEach((p) => {
        balances[p] = (balances[p] || 0) - perPerson;
      });
    }

    // Factor in settlements
    settlements.forEach((s) => {
      balances[s.fromUserId] = (balances[s.fromUserId] || 0) + s.amount;
      balances[s.toUserId] = (balances[s.toUserId] || 0) - s.amount;
    });

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const memberBalances = Object.entries(balances)
      .filter(([, b]) => Math.abs(b) > 0.005)
      .map(([id, balance]) => ({
        id,
        name: idToName[id] || id,
        balance: Math.round(balance * 100) / 100,
      }));

    return { memberBalances, totalSpent, balanceMap: balances, idToName };
  }, [expenses, settlements, getSplitsForGroup, groupMembers]);

  // Role checks
  const currentMember = groupMembers.find((m) => m.userId === user?.id);
  const isAdmin = currentMember?.role === 'ADMIN';

  const handleSettle = async (
    fromUserId: string,
    toUserId: string,
    amount: number
  ) => {
    await recordSettlement({
      groupId,
      fromUserId,
      toUserId,
      amount,
    });
  };

  // Merge expenses + settlements into a combined timeline
  const timeline = useMemo(() => {
    const items: Array<ExpenseItem | SettlementItem> = [];

    expenses.forEach((e) =>
      items.push({
        type: 'expense',
        id: e.id,
        updatedAt: e.updatedAt,
        data: e,
      })
    );
    settlements.forEach((s) =>
      items.push({
        type: 'settlement',
        id: s.id,
        updatedAt: s.updatedAt,
        data: s,
      })
    );

    return items.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [expenses, settlements]);

  return (
    <AppShell>
      {/* Top Bar */}
      <header className='px-5 pt-14 pb-4 lg:pt-8'>
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className='flex items-center gap-3'
        >
          <Link
            href='/'
            className='flex h-9 w-9 items-center justify-center rounded-xl bg-elevated text-text-secondary transition-colors hover:bg-elevated/80 hover:text-text-primary'
          >
            <svg
              width='18'
              height='18'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth={2}
              strokeLinecap='round'
              strokeLinejoin='round'
            >
              <path d='M19 12H5M12 19l-7-7 7-7' />
            </svg>
          </Link>
          <div className='min-w-0 flex-1'>
            <h1 className='truncate font-heading text-lg font-bold text-text-primary'>
              {group?.name || 'Group'}
            </h1>
            {group?.description && (
              <p className='truncate text-xs text-text-secondary'>
                {group.description}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className='flex items-center gap-2'>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (!inviteLink) {
                  generateInvite();
                }
                setShowInvite(true);
              }}
              className='rounded-lg border border-amber/20 bg-amber/10 px-3 py-1.5 text-xs font-semibold text-amber transition-colors hover:bg-amber/15'
            >
              Invite
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSettleUp(true)}
              className='rounded-lg border border-success/20 bg-success/10 px-3 py-1.5 text-xs font-semibold text-success transition-colors hover:bg-success/15'
            >
              Settle Up
            </motion.button>
          </div>
        </motion.div>
      </header>

      <div className='space-y-5 px-5'>
        {/* Member Balances — Horizontal scroll */}
        {memberBalances.length > 0 && (
          <div>
            <h2 className='mb-3 text-xs font-semibold tracking-wider text-text-secondary uppercase'>
              Member Balances
            </h2>
            <div className='-mx-5 no-scrollbar flex gap-3 overflow-x-auto px-5 pb-2 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0'>
              {memberBalances.map((member, i) => (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.06, duration: 0.35 }}
                  className='shrink-0'
                >
                  <GlassCard
                    hover={false}
                    delay={0}
                    className='flex min-w-22.5 flex-col items-center gap-2 p-3!'
                  >
                    <AvatarCircle name={member.name} size='md' />
                    <span className='max-w-20 truncate text-xs font-medium text-text-primary'>
                      {member.name}
                    </span>
                    <AmountDisplay amount={member.balance} size='sm' showSign />
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Timeline */}
        <div>
          <div className='mb-3 flex items-center justify-between'>
            <h2 className='text-xs font-semibold tracking-wider text-text-secondary uppercase'>
              Activity
            </h2>
            <span className='text-xs text-text-tertiary'>
              {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
              {settlements.length > 0 && (
                <>
                  {' '}
                  · {settlements.length} settlement
                  {settlements.length !== 1 ? 's' : ''}
                </>
              )}
            </span>
          </div>

          {loaded && timeline.length === 0 ? (
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
                  <path d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' />
                  <polyline points='17 8 12 3 7 8' />
                  <line x1='12' y1='3' x2='12' y2='15' />
                </svg>
              }
              title='No expenses yet'
              description='Add your first expense to start tracking.'
              action={{
                label: 'Add Expense',
                href: `/add-expense?groupId=${group?.id}`,
              }}
            />
          ) : (
            <div className='space-y-2.5 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0'>
              {timeline.map((item, i) => {
                if (item.type === 'settlement') {
                  const s = item.data;
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{
                        delay: 0.2 + i * 0.06,
                        duration: 0.35,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                    >
                      <div className='glass-card flex items-center gap-3 border-l-2 border-success/30 p-3.5'>
                        <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/10'>
                          <svg
                            width='16'
                            height='16'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth={2}
                            className='text-success'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                          >
                            <polyline points='20 6 9 17 4 12' />
                          </svg>
                        </div>
                        <div className='min-w-0 flex-1'>
                          <p className='text-sm font-medium text-text-primary'>
                            Payment
                          </p>
                          <p className='mt-0.5 text-xs text-text-secondary'>
                            <span className='text-text-tertiary'>
                              {idToName[s.fromUserId] || s.fromUserId}
                            </span>
                            <span className='mx-1 text-text-tertiary'>→</span>
                            <span className='text-text-tertiary'>
                              {idToName[s.toUserId] || s.toUserId}
                            </span>
                            <span className='mx-1.5 text-text-tertiary'>·</span>
                            <span className='text-text-tertiary'>
                              {timeAgo(s.updatedAt)}
                            </span>
                          </p>
                        </div>
                        <AmountDisplay amount={s.amount} size='md' />
                      </div>
                    </motion.div>
                  );
                }

                // Expense
                const expense = item.data;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.2 + i * 0.06,
                      duration: 0.35,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                  >
                    <div className='glass-card group flex items-center gap-3 p-3.5'>
                      <AvatarCircle
                        name={idToName[expense.paidById] || expense.paidById}
                        size='md'
                      />
                      <div className='min-w-0 flex-1'>
                        <p className='truncate text-sm font-medium text-text-primary'>
                          {expense.description}
                        </p>
                        <p className='mt-0.5 text-xs text-text-secondary'>
                          <span className='text-text-tertiary'>paid by</span>{' '}
                          {idToName[expense.paidById] || expense.paidById}
                          <span className='mx-1.5 text-text-tertiary'>·</span>
                          <span className='text-text-tertiary'>
                            {timeAgo(expense.updatedAt)}
                          </span>
                        </p>
                      </div>
                      <AmountDisplay amount={expense.amount} size='md' />
                      {/* Payer and group admins can edit. Others cannot.
                          TODO: Add "request edit" flow where non-admins can suggest
                          edits, creating an audit log entry visible to admins. */}
                      {(expense.paidById === user?.id || isAdmin) && (
                        <button
                          onClick={() => {
                            setEditExpense({
                              id: expense.id,
                              description: expense.description,
                              amount: expense.amount,
                              paidById: expense.paidById,
                              splitType: expense.splitType || 'EQUAL',
                            });
                            setEditDescription(expense.description);
                            setEditAmount(String(expense.amount));
                            setEditPaidById(expense.paidById);
                            // Pre-select members from existing splits; fallback to all members
                            const existingSplits = getSplitsForExpense(
                              expense.id
                            );
                            setEditSelectedMembers(
                              existingSplits.length > 0
                                ? new Set(existingSplits.map((s) => s.userId))
                                : new Set(groupMembers.map((m) => m.userId))
                            );
                            setEditDeleteConfirm(false);
                          }}
                          className='flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber/10 text-amber opacity-0 transition-all group-hover:opacity-100 hover:bg-amber/20'
                          title='Edit expense'
                        >
                          <svg
                            width='13'
                            height='13'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth={2}
                            strokeLinecap='round'
                            strokeLinejoin='round'
                          >
                            <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7' />
                            <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z' />
                          </svg>
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating "Add Expense" for this group */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
        className='fixed right-4 bottom-24 z-40 lg:right-8 lg:bottom-8'
      >
        <Link href={`/add-expense?groupId=${groupId}`}>
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            className='amber-glow flex h-14 w-14 items-center justify-center rounded-2xl bg-amber text-deep shadow-xl'
          >
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
          </motion.button>
        </Link>
      </motion.div>

      {/* Edit Expense Modal */}
      <AnimatePresence>
        {editExpense && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-50 flex items-center justify-center p-5'
          >
            <motion.div
              className='absolute inset-0 bg-black/60 backdrop-blur-sm'
              onClick={() => {
                setEditExpense(null);
                setEditDeleteConfirm(false);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className='glass-card-elevated relative z-10 w-full max-w-sm p-6'
            >
              {/* Header */}
              <div className='mb-4 flex items-center justify-between'>
                <h2 className='font-heading text-lg font-bold text-text-primary'>
                  Edit Expense
                </h2>
                {/* Delete toggle button */}
                <button
                  onClick={() => setEditDeleteConfirm((v) => !v)}
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    editDeleteConfirm
                      ? 'bg-danger/20 text-danger'
                      : 'bg-danger/10 text-danger/70 hover:bg-danger/20 hover:text-danger'
                  }`}
                  title='Delete expense'
                >
                  <svg
                    width='14'
                    height='14'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth={2}
                    strokeLinecap='round'
                    strokeLinejoin='round'
                  >
                    <polyline points='3 6 5 6 21 6' />
                    <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' />
                    <path d='M10 11v6M14 11v6' />
                    <path d='M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2' />
                  </svg>
                </button>
              </div>

              {/* Delete confirmation banner */}
              <AnimatePresence>
                {editDeleteConfirm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.18 }}
                    className='overflow-hidden'
                  >
                    <div className='rounded-xl border border-danger/20 bg-danger/10 p-3.5'>
                      <p className='mb-0.5 text-sm font-medium text-danger'>
                        {editExpense.description}
                      </p>
                      <p className='mb-3 text-xs text-danger/70'>
                        ₹{editExpense.amount.toFixed(2)} · This will be
                        permanently removed and balances will be recalculated.
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={async () => {
                          await deleteExpense(editExpense.id);
                          setEditExpense(null);
                          setEditDeleteConfirm(false);
                        }}
                        className='w-full rounded-lg border border-danger/30 bg-danger/20 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/25'
                      >
                        Confirm Delete
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className='space-y-4'>
                <div>
                  <label className='mb-1.5 block text-xs font-medium tracking-wider text-text-secondary uppercase'>
                    Description
                  </label>
                  <input
                    type='text'
                    maxLength={50}
                    value={editDescription}
                    onChange={(e) =>
                      setEditDescription((e.target as any).value)
                    }
                    className='w-full rounded-xl border border-subtle bg-elevated px-4 py-3 text-sm font-medium text-text-primary transition-all outline-none placeholder:text-text-tertiary focus:border-amber/30 focus:ring-1 focus:ring-amber/20'
                    placeholder='e.g. Dinner, cab ride...'
                  />
                </div>

                <div>
                  <label className='mb-1.5 block text-xs font-medium tracking-wider text-text-secondary uppercase'>
                    Amount (₹)
                  </label>
                  <input
                    type='text'
                    inputMode='decimal'
                    value={editAmount}
                    onChange={(e) => {
                      let raw = (e.target as any).value.replace(/[^0-9.]/g, '');
                      const parts = raw.split('.');
                      if (parts.length > 2) {
                        raw = parts[0] + '.' + parts.slice(1).join('');
                      }
                      setEditAmount(raw);
                    }}
                    className='w-full rounded-xl border border-subtle bg-elevated px-4 py-3 text-sm font-medium text-text-primary transition-all outline-none placeholder:text-text-tertiary focus:border-amber/30 focus:ring-1 focus:ring-amber/20'
                    placeholder='0.00'
                  />
                </div>

                <div>
                  <label className='mb-1.5 block text-xs font-medium tracking-wider text-text-secondary uppercase'>
                    Paid By
                  </label>
                  <select
                    value={editPaidById}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setEditPaidById((e.target as any).value)
                    }
                    className='w-full cursor-pointer appearance-none rounded-xl border border-subtle bg-elevated px-4 py-3 text-sm font-medium text-text-primary transition-all outline-none focus:border-amber/30 focus:ring-1 focus:ring-amber/20'
                  >
                    {groupMembers.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.userName || m.userId}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className='mb-1.5 block text-xs font-medium tracking-wider text-text-secondary uppercase'>
                    Split Between
                  </label>
                  <div className='flex flex-wrap gap-2'>
                    {groupMembers.map((m) => {
                      const isSelected = editSelectedMembers.has(m.userId);
                      const isPayer = m.userId === editPaidById;
                      return (
                        <button
                          key={m.userId}
                          type='button'
                          onClick={() => {
                            if (isPayer) {
                              return;
                            } // payer always included
                            setEditSelectedMembers((prev) => {
                              const next = new Set(prev);
                              if (next.has(m.userId)) {
                                next.delete(m.userId);
                              } else {
                                next.add(m.userId);
                              }
                              next.add(editPaidById); // always keep payer
                              return next;
                            });
                          }}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                            isSelected
                              ? 'border border-amber/25 bg-amber/15 text-amber'
                              : 'border border-subtle bg-elevated text-text-tertiary hover:border-amber/20'
                          }`}
                        >
                          {isSelected && (
                            <svg
                              width='11'
                              height='11'
                              viewBox='0 0 24 24'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth={3}
                              strokeLinecap='round'
                              strokeLinejoin='round'
                            >
                              <polyline points='20 6 9 17 4 12' />
                            </svg>
                          )}
                          {m.userName || m.userId}
                          {isPayer && (
                            <span className='text-[10px] text-amber/50'>
                              (payer)
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {/* Per-person preview */}
                  {parseFloat(editAmount) > 0 &&
                    editSelectedMembers.size > 0 && (
                      <p className='mt-2 text-xs text-text-tertiary'>
                        ₹
                        {(
                          parseFloat(editAmount) / editSelectedMembers.size
                        ).toFixed(2)}{' '}
                        per person · {editSelectedMembers.size} member
                        {editSelectedMembers.size !== 1 ? 's' : ''}
                      </p>
                    )}
                </div>
              </div>

              <div className='mt-5 flex gap-3'>
                <button
                  onClick={() => {
                    setEditExpense(null);
                    setEditDeleteConfirm(false);
                  }}
                  className='flex-1 rounded-xl border border-subtle py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-elevated/50'
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={!editDescription.trim() || !parseFloat(editAmount)}
                  onClick={async () => {
                    const newAmount = parseFloat(editAmount);
                    await updateExpense(editExpense.id, {
                      description: editDescription.trim(),
                      amount: newAmount,
                      paidById: editPaidById,
                    });
                    // Re-create splits for chosen members
                    const splitMembers =
                      editSelectedMembers.size > 0
                        ? [...editSelectedMembers]
                        : groupMembers.map((m) => m.userId);
                    await deleteSplitsForExpense(editExpense.id);
                    await createEqualSplits(
                      editExpense.id,
                      newAmount,
                      splitMembers
                    );
                    setEditExpense(null);
                    setEditDeleteConfirm(false);
                  }}
                  className='flex-1 rounded-xl border border-amber/25 bg-amber/15 py-2.5 text-sm font-semibold text-amber transition-colors hover:bg-amber/20 disabled:cursor-not-allowed disabled:opacity-40'
                >
                  Save Changes
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}

      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-50 flex items-center justify-center p-5'
          >
            <motion.div
              className='absolute inset-0 bg-black/60 backdrop-blur-sm'
              onClick={() => setConfirmDelete(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className='glass-card-elevated relative z-10 w-full max-w-sm p-6'
            >
              <div className='mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/10'>
                <svg
                  width='22'
                  height='22'
                  viewBox='0 0 24 24'
                  fill='none'
                  stroke='currentColor'
                  strokeWidth={2}
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  className='text-danger'
                >
                  <polyline points='3 6 5 6 21 6' />
                  <path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6' />
                  <path d='M10 11v6M14 11v6' />
                  <path d='M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2' />
                </svg>
              </div>
              <h2 className='mb-1 font-heading text-lg font-bold text-text-primary'>
                Delete Expense?
              </h2>
              <p className='mb-1 text-sm text-text-secondary'>
                <span className='font-medium text-text-primary'>
                  {confirmDelete.description}
                </span>
              </p>
              <p className='mb-5 text-xs text-text-tertiary'>
                ₹{confirmDelete.amount.toFixed(2)} · This will be permanently
                removed and balances will be recalculated.
              </p>
              <div className='flex gap-3'>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className='flex-1 rounded-xl border border-subtle py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-elevated/50'
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={async () => {
                    await deleteExpense(confirmDelete.id);
                    setConfirmDelete(null);
                  }}
                  className='flex-1 rounded-xl border border-danger/25 bg-danger/15 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/20'
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settle Up Modal */}
      <SettleUpModal
        open={showSettleUp}
        onClose={() => setShowSettleUp(false)}
        balances={balanceMap}
        groupId={groupId}
        onSettle={handleSettle}
        idToName={idToName}
      />

      {/* Invite Link Modal */}
      <AnimatePresence>
        {showInvite && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-50 flex items-center justify-center p-5'
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className='absolute inset-0 bg-black/60 backdrop-blur-sm'
              onClick={() => setShowInvite(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.25 }}
              className='glass-card-elevated relative z-10 w-full max-w-sm p-6'
            >
              <h2 className='mb-1 font-heading text-lg font-bold text-text-primary'>
                Invite to Group
              </h2>
              <p className='mb-5 text-xs text-text-secondary'>
                Share this link to invite someone to {group?.name}
              </p>

              {inviteLoading ? (
                <div className='flex items-center justify-center py-6'>
                  <div className='h-8 w-8 animate-spin rounded-full border-2 border-amber/30 border-t-amber' />
                </div>
              ) : inviteLink ? (
                <div className='space-y-3'>
                  <div className='flex items-center gap-2'>
                    <input
                      readOnly
                      value={inviteLink}
                      className='flex-1 rounded-xl border border-subtle bg-elevated px-3 py-2.5 font-mono text-xs text-text-primary outline-none'
                    />
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={copyInviteLink}
                      className='rounded-xl border border-amber/20 bg-amber/10 px-3 py-2.5 text-xs font-semibold text-amber'
                    >
                      {inviteCopied ? '✓ Copied' : 'Copy'}
                    </motion.button>
                  </div>
                  <p className='text-center text-[11px] text-text-tertiary'>
                    Link expires in 7 days
                  </p>
                </div>
              ) : (
                <p className='py-4 text-center text-sm text-text-tertiary'>
                  Could not generate invite link
                </p>
              )}

              <button
                onClick={() => setShowInvite(false)}
                className='mt-4 w-full rounded-xl border border-subtle py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-elevated/50'
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}
