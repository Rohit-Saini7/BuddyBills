'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams, useRouter } from 'next/navigation';
import { useGroups } from '@/lib/hooks/useGroups';
import { useExpenses } from '@/lib/hooks/useExpenses';
import { useExpenseSplits } from '@/lib/hooks/useExpenseSplits';
import { useGroupMembers } from '@/lib/hooks/useGroupMembers';
import { useAuth } from '@/components/providers/AuthProvider';
import { AppShell } from '@/components/layout/AppShell';
import { GlassCard } from '@/components/ui/GlassCard';
import Link from 'next/link';

export default function AddExpensePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedGroupId = searchParams.get('groupId');
  const { user } = useAuth();

  const { groups, loaded: groupsLoaded } = useGroups();
  const { addExpense } = useExpenses();
  const { createEqualSplits } = useExpenseSplits();

  const defaultUserId = user?.id || user?.email || 'unknown';
  const defaultUserName = user?.name || user?.email || 'You';

  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(preselectedGroupId || '');
  const [paidBy, setPaidBy] = useState(defaultUserId);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { members: groupMembers } = useGroupMembers(selectedGroup);

  // Initialize the payer as a member
  const allMembers = useMemo(() => {
    const map = new Map<string, string>();

    // Always map the current logged-in user
    map.set(defaultUserId, defaultUserName);

    // In case there's an ad-hoc paidBy selected
    if (paidBy && !map.has(paidBy)) {
      map.set(paidBy, paidBy);
    }

    // Add actual group members
    groupMembers.forEach((m) => {
      if (m.userId) {
        map.set(m.userId, m.userName || m.userId);
      }
    });

    console.log('[DEBUG] allMembers map:', map);

    return Array.from(map.entries())
      .filter(([id]) => id.trim())
      .map(([id, name]) => ({ id, name }));
  }, [paidBy, groupMembers, defaultUserId, defaultUserName]);

  // Selected members for the split (default: all)
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set()
  );

  // Ensure paidBy is always selected
  const effectiveSelected = useMemo(() => {
    if (selectedMembers.size === 0) {
      // Default: everyone is selected
      return new Set(allMembers.map((m) => m.id));
    }
    const s = new Set(selectedMembers);
    s.add(paidBy); // payer is always included
    return s;
  }, [selectedMembers, allMembers, paidBy]);

  const numAmount = parseFloat(amount) || 0;
  const splitCount = effectiveSelected.size || 1;
  const perPerson = numAmount / splitCount;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = (e.currentTarget as any).value.replace(/[^0-9.]/g, '');
    const parts = raw.split('.');
    if (parts.length > 2) {
      raw = parts[0] + '.' + parts.slice(1).join('');
    }
    if (parseFloat(raw) > 9999999) {
      return;
    } // Max limit ~ 1 Crore
    setAmount(raw);
  };

  const displayAmount = useMemo(() => {
    if (!amount) {
      return '';
    }
    const parts = amount.split('.');
    const intVal = parseInt(parts[0] || '0', 10);
    const intStr = isNaN(intVal)
      ? parts[0] === '-'
        ? '-'
        : ''
      : new Intl.NumberFormat('en-IN').format(intVal);
    return parts.length > 1 ? `${intStr}.${parts[1]}` : intStr;
  }, [amount]);

  const syncDescription = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDescription((e.currentTarget as any).value);
  };

  const toggleMember = (id: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(
        prev.size === 0 ? allMembers.map((m) => m.id) : prev
      );
      if (next.has(id) && id !== paidBy) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!numAmount || !description.trim() || !selectedGroup) {
      return;
    }

    setSubmitting(true);

    // Create the expense
    const expenseId = await addExpense({
      groupId: selectedGroup,
      paidById: paidBy,
      amount: numAmount,
      description: description.trim(),
      splitType: 'EQUAL',
    });

    // Create equal splits for selected members
    const splitMembers = [...effectiveSelected];
    await createEqualSplits(expenseId, numAmount, splitMembers);

    setSubmitting(false);
    setSuccess(true);

    // Navigate back after a brief moment
    setTimeout(() => {
      if (preselectedGroupId) {
        router.push(`/group/${preselectedGroupId}`);
      } else {
        router.push('/');
      }
    }, 600);
  };

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
            href={preselectedGroupId ? `/group/${preselectedGroupId}` : '/'}
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
          <h1 className='font-heading text-lg font-bold text-text-primary'>
            Add Expense
          </h1>
        </motion.div>
      </header>

      <div className='space-y-6 px-5'>
        {/* Success State */}
        {success ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className='flex flex-col items-center py-16'
          >
            <div className='mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/15'>
              <svg
                width='32'
                height='32'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth={2.5}
                className='text-success'
                strokeLinecap='round'
                strokeLinejoin='round'
              >
                <polyline points='20 6 9 17 4 12' />
              </svg>
            </div>
            <p className='font-heading text-lg font-bold text-text-primary'>
              Expense Added!
            </p>
            <p className='mt-1 text-sm text-text-secondary'>Redirecting...</p>
          </motion.div>
        ) : (
          <>
            {/* Amount Input — Hero Element */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className='flex flex-col items-center py-8'
            >
              <p className='mb-3 text-xs tracking-widest text-text-secondary uppercase'>
                Amount
              </p>
              <div className='flex items-baseline gap-1'>
                <span className='font-heading text-2xl font-bold text-amber/60'>
                  ₹
                </span>
                <input
                  type='text'
                  inputMode='decimal'
                  value={displayAmount}
                  onChange={handleAmountChange}
                  placeholder='0'
                  autoFocus
                  className='w-60 border-none bg-transparent text-center font-heading text-5xl font-bold text-amber tabular-nums caret-amber outline-none placeholder:text-amber/20'
                />
              </div>
              <div className='mt-4 h-0.5 w-24 rounded-full bg-amber/20' />
            </motion.div>

            {/* Description */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <label className='mb-2 block text-xs font-medium tracking-wider text-text-secondary uppercase'>
                What&apos;s it for?
              </label>
              <input
                type='text'
                maxLength={50}
                value={description}
                onChange={syncDescription}
                placeholder='e.g. Dinner, cab ride... (max 50 chars)'
                className='w-full rounded-xl border border-subtle bg-elevated px-4 py-3 text-sm font-medium text-text-primary transition-all outline-none placeholder:text-text-tertiary focus:border-amber/30 focus:ring-1 focus:ring-amber/20'
              />
            </motion.div>

            {/* Group Selector */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <label className='mb-2 block text-xs font-medium tracking-wider text-text-secondary uppercase'>
                Group
              </label>
              {groups.length === 0 && groupsLoaded ? (
                <p className='text-sm text-text-tertiary'>
                  No groups yet.{' '}
                  <Link href='/' className='text-amber underline'>
                    Create one first.
                  </Link>
                </p>
              ) : (
                <div className='no-scrollbar flex gap-2 overflow-x-auto pb-1'>
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroup(group.id)}
                      className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition-all ${
                        selectedGroup === group.id
                          ? 'border border-amber/25 bg-amber/15 text-amber'
                          : 'border border-subtle bg-elevated text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      {group.name}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Paid By */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <label className='mb-2 block text-xs font-medium tracking-wider text-text-secondary uppercase'>
                Paid by
              </label>
              <select
                value={paidBy}
                onChange={(e) => setPaidBy((e.currentTarget as any).value)}
                className='w-full appearance-none rounded-xl border border-subtle bg-elevated px-4 py-3 text-sm font-medium text-text-primary transition-all outline-none focus:border-amber/30 focus:ring-1 focus:ring-amber/20'
              >
                {allMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </motion.div>

            {/* Split Among — Member Selector */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <label className='mb-2 block text-xs font-medium tracking-wider text-text-secondary uppercase'>
                Split equally among
              </label>

              <p className='mb-3 text-xs text-text-tertiary'>
                Tap to toggle members. All members are selected by default.
              </p>

              {/* Member chips */}
              <div className='flex flex-wrap gap-2'>
                {allMembers.map((member) => {
                  const isSelected = effectiveSelected.has(member.id);
                  const isPayer = member.id === paidBy;

                  return (
                    <button
                      key={member.id}
                      onClick={() => toggleMember(member.id)}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                        isSelected
                          ? 'border border-amber/25 bg-amber/15 text-amber'
                          : 'border border-subtle bg-elevated text-text-tertiary'
                      }`}
                    >
                      {isSelected && (
                        <svg
                          width='12'
                          height='12'
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
                      {member.name}
                      {isPayer && (
                        <span className='text-[10px] text-amber/50'>
                          (payer)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Split preview */}
              {numAmount > 0 && effectiveSelected.size > 0 && (
                <GlassCard hover={false} delay={0} className='mt-3 p-3!'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-2'>
                      <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-amber/10'>
                        <svg
                          width='16'
                          height='16'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth={2}
                          className='text-amber'
                        >
                          <path
                            d='M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                          />
                        </svg>
                      </div>
                      <div>
                        <p className='text-sm font-medium text-text-primary'>
                          ₹{perPerson.toFixed(2)} per person
                        </p>
                        <p className='text-[11px] text-text-tertiary'>
                          Split among {splitCount} member
                          {splitCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className='text-xs font-medium text-text-tertiary'>
                      ₹{numAmount.toFixed(0)} total
                    </div>
                  </div>
                </GlassCard>
              )}
            </motion.div>

            {/* Submit Button */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className='pt-2 pb-4'
            >
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                disabled={
                  !amount || !description || !selectedGroup || submitting
                }
                onClick={handleSubmit}
                className='amber-glow w-full rounded-2xl bg-linear-to-r from-amber to-[#E8942A] py-3.5 font-heading text-base font-bold text-deep shadow-lg transition-all disabled:cursor-not-allowed disabled:opacity-30'
              >
                {submitting ? 'Adding...' : 'Add Expense'}
              </motion.button>
            </motion.div>
          </>
        )}
      </div>
    </AppShell>
  );
}
