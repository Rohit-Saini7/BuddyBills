'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRxDB } from '@/components/providers/RxDBProvider';
import { GroupDocType } from '@/lib/db/schema';
import { v7 as uuidv7 } from 'uuid';
import { useAuth } from '@/components/providers/AuthProvider';

export function useGroups() {
  const db = useRxDB();
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupDocType[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const sub = db.groups
      .find({ selector: { isDeleted: false } })
      .$.subscribe((docs) => {
        setGroups(docs.map((d) => d.toJSON() as GroupDocType));
        setLoaded(true);
      });
    return () => sub.unsubscribe();
  }, [db]);

  const createGroup = useCallback(
    async (name: string, description?: string) => {
      const id = uuidv7();
      const now = new Date().toISOString();
      await db.groups.upsert({
        id,
        name,
        description: description || '',
        updatedAt: now,
        isDeleted: false,
      });

      console.log('[createGroup] User object present:', !!user, user);

      if (user) {
        try {
          const memberId = uuidv7();
          console.log(
            `[createGroup] Inserting group member ${memberId} for group ${id} and user ${user.id || user.email}`
          );
          await db.group_members.upsert({
            id: memberId,
            groupId: id,
            userId: user.id || user.email || 'unknown',
            userName: user.name || user.email || 'unknown',
            role: 'ADMIN',
            updatedAt: now,
            isDeleted: false,
          });
          console.log('[createGroup] Member inserted locally.');
        } catch (err) {
          console.error('[createGroup] Error inserting group member:', err);
        }
      } else {
        console.warn(
          '[createGroup] No user object found! Cannot create member link.'
        );
      }

      return id;
    },
    [db, user]
  );

  const deleteGroup = useCallback(
    async (id: string) => {
      const doc = await db.groups.findOne(id).exec();
      if (doc) {
        await doc.patch({
          isDeleted: true,
          updatedAt: new Date().toISOString(),
        });
      }
    },
    [db]
  );

  return { groups, loaded, createGroup, deleteGroup };
}
