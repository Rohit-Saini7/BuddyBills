'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRxDB } from '@/components/providers/RxDBProvider';
import { ExpenseSplitDocType } from '@/lib/db/schema';
import { v7 as uuidv7 } from 'uuid';

export function useExpenseSplits(groupId?: string) {
  const db = useRxDB();
  const [splits, setSplits] = useState<ExpenseSplitDocType[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sub = db.expense_splits
      .find({ selector: { isDeleted: false } })
      .$.subscribe((docs) => {
        setSplits(docs.map((d) => d.toJSON() as ExpenseSplitDocType));
        setLoaded(true);
      });
    return () => sub.unsubscribe();
  }, [db]);

  /**
   * Get splits for a specific expense
   */
  const getSplitsForExpense = useCallback(
    (expenseId: string) => {
      return splits.filter((s) => s.expenseId === expenseId);
    },
    [splits]
  );

  /**
   * Get all splits for expenses in a specific group.
   * Requires an expense list to look up groupId.
   */
  const getSplitsForGroup = useCallback(
    (expenseIds: string[]) => {
      const idSet = new Set(expenseIds);
      return splits.filter((s) => idSet.has(s.expenseId));
    },
    [splits]
  );

  /**
   * Create split records for an expense (equal split)
   */
  const createEqualSplits = useCallback(
    async (expenseId: string, totalAmount: number, memberIds: string[]) => {
      const perPerson = totalAmount / memberIds.length;
      const now = new Date().toISOString();

      for (const userId of memberIds) {
        await db.expense_splits.upsert({
          id: uuidv7(),
          expenseId,
          userId,
          amount: Math.round(perPerson * 100) / 100, // round to 2 decimals
          updatedAt: now,
          isDeleted: false,
        });
      }
    },
    [db]
  );

  /**
   * Delete all splits for an expense (soft delete)
   */
  const deleteSplitsForExpense = useCallback(
    async (expenseId: string) => {
      const docs = await db.expense_splits
        .find({ selector: { expenseId, isDeleted: false } })
        .exec();
      const now = new Date().toISOString();
      for (const doc of docs) {
        await doc.patch({ isDeleted: true, updatedAt: now });
      }
    },
    [db]
  );

  return {
    splits,
    loaded,
    getSplitsForExpense,
    getSplitsForGroup,
    createEqualSplits,
    deleteSplitsForExpense,
  };
}
