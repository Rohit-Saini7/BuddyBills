'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRxDB } from '@/components/providers/RxDBProvider';
import { GroupMemberDocType } from '@/lib/db/schema';
import { v7 as uuidv7 } from 'uuid';

export function useGroupMembers(groupId?: string) {
  const db = useRxDB();
  const [members, setMembers] = useState<GroupMemberDocType[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!groupId) {
      setMembers([]);
      setLoaded(true);
      return;
    }

    const sub = db.group_members
      .find({ selector: { groupId, isDeleted: false } })
      .$.subscribe((docs) => {
        setMembers(docs.map((d) => d.toJSON() as GroupMemberDocType));
        setLoaded(true);
      });
    return () => sub.unsubscribe();
  }, [db, groupId]);

  const addMember = useCallback(
    async (groupId: string, userId: string, role: string = 'MEMBER') => {
      const id = uuidv7();
      await db.group_members.upsert({
        id,
        groupId,
        userId,
        role,
        updatedAt: new Date().toISOString(),
        isDeleted: false,
      });
      return id;
    },
    [db]
  );

  const removeMember = useCallback(
    async (id: string) => {
      const doc = await db.group_members.findOne(id).exec();
      if (doc) {
        await doc.patch({
          isDeleted: true,
          updatedAt: new Date().toISOString(),
        });
      }
    },
    [db]
  );

  return { members, loaded, addMember, removeMember };
}
