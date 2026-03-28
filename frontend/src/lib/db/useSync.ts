// web/src/lib/db/useSync.ts
import { useEffect } from 'react';
import {
  replicateRxCollection,
  RxReplicationState,
} from 'rxdb/plugins/replication';
import { useRxDB } from '@/components/providers/RxDBProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';

function createReplication(
  collection: any,
  identifier: string,
  syncEndpoint: string,
  collectionPath: string,
  headers: Record<string, string>,
  onUnauthorized: () => void
) {
  return replicateRxCollection({
    collection,
    replicationIdentifier: identifier,
    live: true,
    retryTime: 5000,
    autoStart: true,
    pull: {
      async handler(lastCheckpoint: any, batchSize: number) {
        const minTimestamp = lastCheckpoint?.updatedAt || 0;
        try {
          const response = await fetch(
            `${syncEndpoint}/${collectionPath}?minTimestamp=${minTimestamp}&limit=${batchSize}`,
            { headers }
          );
          if (response.status === 401) {
            onUnauthorized();
            throw new Error('Unauthorized');
          }
          if (!response.ok) {
            throw new Error(`Pull failed: ${response.status}`);
          }
          const data = await response.json();
          if (data.documents) {
            data.documents = data.documents.map((doc: any) => {
              doc.isDeleted = doc.deleted;
              delete doc.deleted;
              return doc;
            });
          }
          return data;
        } catch (err) {
          console.error(`[RxDB PULL] ${collectionPath} error:`, err);
          return {
            documents: [],
            checkpoint: lastCheckpoint ?? { updatedAt: 0 },
          };
        }
      },
    },
    push: {
      batchSize: 10,
      async handler(docs: any) {
        if (!docs || docs.length === 0) {
          return [];
        }
        const mappedDocs = docs.map((row: any) => {
          const newDoc = { ...row.newDocumentState };
          newDoc.deleted = newDoc.isDeleted;
          delete newDoc.isDeleted;
          return { ...row, newDocumentState: newDoc };
        });
        console.log(
          `[RxDB PUSH] ${collectionPath} pushing ${mappedDocs.length} docs...`,
          mappedDocs
        );
        try {
          const response = await fetch(`${syncEndpoint}/${collectionPath}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ pushRow: mappedDocs }),
          });
          if (response.status === 401) {
            onUnauthorized();
            throw new Error('Unauthorized');
          }
          if (!response.ok) {
            const text = await response.text();
            throw new Error(`Push failed: ${response.status} - ${text}`);
          }
          const conflicts = await response.json();
          if (conflicts.length > 0) {
            console.warn(`[RxDB PUSH] ${collectionPath} conflicts:`, conflicts);
          }
          return conflicts;
        } catch (err) {
          console.error(`[RxDB PUSH] ${collectionPath} error:`, err);
          throw err; // Let RxDB retry
        }
      },
    },
  });
}

export function useSync() {
  const db = useRxDB();
  const { token, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!db || !isAuthenticated || !token) {
      return;
    }

    const apiBase =
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const syncEndpoint = `${apiBase}/sync`;

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const onUnauthorized = () => {
      logout();
      router.push('/landing');
    };

    console.log('[Sync] Starting replication with endpoint:', syncEndpoint);

    const replications: RxReplicationState<any, any>[] = [
      createReplication(
        db.groups,
        'groups-http-replication',
        syncEndpoint,
        'groups',
        headers,
        onUnauthorized
      ),
      createReplication(
        db.expenses,
        'expenses-http-replication',
        syncEndpoint,
        'expenses',
        headers,
        onUnauthorized
      ),
      createReplication(
        db.group_members,
        'group-members-http-replication',
        syncEndpoint,
        'group_members',
        headers,
        onUnauthorized
      ),
      createReplication(
        db.expense_splits,
        'expense-splits-http-replication',
        syncEndpoint,
        'expense_splits',
        headers,
        onUnauthorized
      ),
      createReplication(
        db.settlements,
        'settlements-http-replication',
        syncEndpoint,
        'settlements',
        headers,
        onUnauthorized
      ),
    ];

    return () => {
      replications.forEach((state) => {
        state.cancel();
      });
    };
  }, [db, token, isAuthenticated, logout, router]);
}
