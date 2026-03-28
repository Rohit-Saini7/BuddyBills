'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRxDB } from '@/components/providers/RxDBProvider';
import { SettlementDocType } from '@/lib/db/schema';
import { v7 as uuidv7 } from 'uuid';

export function useSettlements(groupId?: string) {
  const db = useRxDB();
  const [settlements, setSettlements] = useState<SettlementDocType[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const selector: Record<string, any> = { isDeleted: false };
    if (groupId) {
      selector.groupId = groupId;
    }

    const sub = db.settlements
      .find({
        selector,
        sort: [{ updatedAt: 'desc' }],
      })
      .$.subscribe((docs) => {
        setSettlements(docs.map((d) => d.toJSON() as SettlementDocType));
        setLoaded(true);
      });
    return () => sub.unsubscribe();
  }, [db, groupId]);

  const recordSettlement = useCallback(
    async (data: {
      groupId: string;
      fromUserId: string;
      toUserId: string;
      amount: number;
      note?: string;
    }) => {
      const id = uuidv7();
      await db.settlements.upsert({
        id,
        groupId: data.groupId,
        fromUserId: data.fromUserId,
        toUserId: data.toUserId,
        amount: data.amount,
        note: data.note || '',
        updatedAt: new Date().toISOString(),
        isDeleted: false,
      });
      return id;
    },
    [db]
  );

  return { settlements, loaded, recordSettlement };
}
