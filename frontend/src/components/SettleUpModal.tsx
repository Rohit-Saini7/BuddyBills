'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AmountDisplay } from '@/components/ui/AmountDisplay';
import { AvatarCircle } from '@/components/ui/AvatarCircle';

interface DebtEdge {
  from: string;
  to: string;
  amount: number;
}

/**
 * Minimize the number of transactions using a greedy net-balance approach.
 */
function minimizeTransactions(balances: Record<string, number>): DebtEdge[] {
  const entries = Object.entries(balances).filter(
    ([, b]) => Math.abs(b) > 0.01
  );
  // positive = is owed, negative = owes
  const creditors = entries
    .filter(([, b]) => b > 0)
    .sort((a, b) => b[1] - a[1]);
  const debtors = entries.filter(([, b]) => b < 0).sort((a, b) => a[1] - b[1]); // most negative first

  const result: DebtEdge[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor[1], -debtor[1]);
    if (amount > 0.01) {
      result.push({
        from: debtor[0],
        to: creditor[0],
        amount: Math.round(amount * 100) / 100,
      });
    }
    creditor[1] -= amount;
    debtor[1] += amount;
    if (creditor[1] < 0.01) {
      ci++;
    }
    if (debtor[1] > -0.01) {
      di++;
    }
  }

  return result;
}

interface SettleUpModalProps {
  open: boolean;
  onClose: () => void;
  balances: Record<string, number>; // userId -> net balance (positive = is owed)
  groupId: string;
  onSettle: (from: string, to: string, amount: number) => Promise<void>;
  idToName?: Record<string, string>;
}

export function SettleUpModal({
  open,
  onClose,
  balances,
  groupId,
  onSettle,
  idToName = {},
}: SettleUpModalProps) {
  const [settlingIdx, setSettlingIdx] = useState<number | null>(null);
  const [settledSet, setSettledSet] = useState<Set<number>>(new Set());

  const transactions = minimizeTransactions({ ...balances });

  const handleSettle = async (idx: number, edge: DebtEdge) => {
    setSettlingIdx(idx);
    await onSettle(edge.from, edge.to, edge.amount);
    setSettledSet((prev) => new Set([...prev, idx]));
    setSettlingIdx(null);
  };

  const allSettled = settledSet.size === transactions.length;

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
            className='glass-card-elevated relative z-10 max-h-[80vh] w-full max-w-sm overflow-y-auto p-6'
          >
            <h2 className='mb-1 font-heading text-lg font-bold text-text-primary'>
              Settle Up
            </h2>
            <p className='mb-5 text-xs text-text-secondary'>
              Suggested payments to settle all debts
            </p>

            {transactions.length === 0 ? (
              <div className='py-8 text-center'>
                <div className='mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-success/15'>
                  <svg
                    width='28'
                    height='28'
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
                <p className='font-heading font-semibold text-text-primary'>
                  All settled!
                </p>
                <p className='mt-1 text-xs text-text-secondary'>
                  No outstanding balances in this group.
                </p>
              </div>
            ) : (
              <div className='space-y-3'>
                {transactions.map((edge, i) => {
                  const isSettled = settledSet.has(i);
                  const isSettling = settlingIdx === i;

                  return (
                    <motion.div
                      key={`${edge.from}-${edge.to}`}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: isSettled ? 0.4 : 1, x: 0 }}
                      transition={{ delay: i * 0.06, duration: 0.3 }}
                      className={`glass-card p-3.5 ${isSettled ? 'pointer-events-none' : ''}`}
                    >
                      <div className='flex items-center gap-3'>
                        <AvatarCircle
                          name={idToName[edge.from] || edge.from}
                          size='sm'
                        />
                        <div className='min-w-0 flex-1'>
                          <p className='text-sm font-medium text-text-primary'>
                            <span className='inline-block max-w-[70px] truncate align-bottom text-text-secondary'>
                              {idToName[edge.from] || edge.from}
                            </span>
                            <span className='mx-1.5 text-text-tertiary'>→</span>
                            <span className='inline-block max-w-[70px] truncate align-bottom text-text-secondary'>
                              {idToName[edge.to] || edge.to}
                            </span>
                          </p>
                        </div>
                        <AmountDisplay amount={edge.amount} size='md' />
                      </div>

                      {!isSettled && (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => handleSettle(i, edge)}
                          disabled={isSettling}
                          className='mt-3 w-full rounded-xl border border-success/20 bg-success/10 py-2 text-xs font-semibold text-success transition-colors hover:bg-success/15 disabled:cursor-not-allowed disabled:opacity-50'
                        >
                          {isSettling ? 'Recording...' : 'Record Payment'}
                        </motion.button>
                      )}
                      {isSettled && (
                        <p className='mt-2 text-center text-[11px] font-medium text-success'>
                          ✓ Settled
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            <div className='mt-5 flex gap-3'>
              <button
                onClick={onClose}
                className='flex-1 rounded-xl border border-subtle py-3 text-sm font-medium text-text-secondary transition-colors hover:bg-elevated/50'
              >
                {allSettled || transactions.length === 0 ? 'Done' : 'Close'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
