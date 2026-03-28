import { createRxDatabase, RxDatabase, RxCollection } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import {
  groupSchema,
  groupMemberSchema,
  expenseSchema,
  expenseSplitSchema,
  settlementSchema,
  GroupDocType,
  GroupMemberDocType,
  ExpenseDocType,
  ExpenseSplitDocType,
  SettlementDocType,
} from './schema';

export type BuddyBillsCollections = {
  groups: RxCollection<GroupDocType>;
  group_members: RxCollection<GroupMemberDocType>;
  expenses: RxCollection<ExpenseDocType>;
  expense_splits: RxCollection<ExpenseSplitDocType>;
  settlements: RxCollection<SettlementDocType>;
};

export type BuddyBillsDatabase = RxDatabase<BuddyBillsCollections>;

let dbPromise: Promise<BuddyBillsDatabase> | null = null;

const createDatabase = async (): Promise<BuddyBillsDatabase> => {
  const db = await createRxDatabase<BuddyBillsCollections>({
    name: 'buddybillsdb_v2',
    storage: getRxStorageDexie(),
    multiInstance: true, // Needed for multiple browser tabs
    eventReduce: true,
  });

  await db.addCollections({
    groups: { schema: groupSchema },
    group_members: { schema: groupMemberSchema },
    expenses: { schema: expenseSchema },
    expense_splits: { schema: expenseSplitSchema },
    settlements: { schema: settlementSchema },
  });

  return db;
};

export const getDatabase = (): Promise<BuddyBillsDatabase> => {
  if (!dbPromise) {
    dbPromise = createDatabase();
  }
  return dbPromise;
};
