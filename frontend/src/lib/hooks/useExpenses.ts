'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRxDB } from '@/components/providers/RxDBProvider';
import { ExpenseDocType } from '@/lib/db/schema';
import { v7 as uuidv7 } from 'uuid';

export function useExpenses(groupId?: string) {
  const db = useRxDB();
  const [expenses, setExpenses] = useState<ExpenseDocType[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const selector: Record<string, any> = { isDeleted: false };
    if (groupId) {
      selector.groupId = groupId;
    }

    const sub = db.expenses
      .find({
        selector,
        sort: [{ updatedAt: 'desc' }],
      })
      .$.subscribe((docs) => {
        setExpenses(docs.map((d) => d.toJSON() as ExpenseDocType));
        setLoaded(true);
      });
    return () => sub.unsubscribe();
  }, [db, groupId]);

  const addExpense = useCallback(
    async (data: {
      groupId: string;
      paidById: string;
      amount: number;
      description: string;
      splitType?: string;
    }) => {
      const id = uuidv7();
      await db.expenses.upsert({
        id,
        groupId: data.groupId,
        paidById: data.paidById,
        amount: data.amount,
        description: data.description,
        splitType: data.splitType || 'EQUAL',
        updatedAt: new Date().toISOString(),
        isDeleted: false,
      });
      return id;
    },
    [db]
  );

  const deleteExpense = useCallback(
    async (id: string) => {
      const doc = await db.expenses.findOne(id).exec();
      if (doc) {
        await doc.patch({
          isDeleted: true,
          updatedAt: new Date().toISOString(),
        });
      }
    },
    [db]
  );

  const updateExpense = useCallback(
    async (
      id: string,
      data: { amount?: number; description?: string; paidById?: string }
    ) => {
      const doc = await db.expenses.findOne(id).exec();
      if (doc) {
        await doc.patch({
          ...data,
          updatedAt: new Date().toISOString(),
        });
      }
    },
    [db]
  );

  return { expenses, loaded, addExpense, updateExpense, deleteExpense };
}
