import {
  ExtractDocumentTypeFromTypedRxJsonSchema,
  toTypedRxJsonSchema,
  RxJsonSchema,
} from 'rxdb';

export const groupSchemaLiteral = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    description: { type: 'string' },
    updatedAt: { type: 'string', format: 'date-time' },
    isDeleted: { type: 'boolean' },
  },
  required: ['id', 'name', 'updatedAt', 'isDeleted'],
} as const;

export const groupMemberSchemaLiteral = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    groupId: { type: 'string' },
    userId: { type: 'string' },
    userName: { type: 'string' },
    role: { type: 'string' },
    updatedAt: { type: 'string', format: 'date-time' },
    isDeleted: { type: 'boolean' },
  },
  required: ['id', 'groupId', 'userId', 'role', 'updatedAt', 'isDeleted'],
} as const;

export const expenseSchemaLiteral = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    groupId: { type: 'string' },
    paidById: { type: 'string' },
    amount: { type: 'number' },
    description: { type: 'string' },
    splitType: { type: 'string' },
    updatedAt: { type: 'string', format: 'date-time' },
    isDeleted: { type: 'boolean' },
  },
  required: [
    'id',
    'groupId',
    'paidById',
    'amount',
    'description',
    'splitType',
    'updatedAt',
    'isDeleted',
  ],
} as const;

export const expenseSplitSchemaLiteral = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    expenseId: { type: 'string' },
    userId: { type: 'string' },
    amount: { type: 'number' },
    updatedAt: { type: 'string', format: 'date-time' },
    isDeleted: { type: 'boolean' },
  },
  required: ['id', 'expenseId', 'userId', 'amount', 'updatedAt', 'isDeleted'],
} as const;

export const settlementSchemaLiteral = {
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    groupId: { type: 'string' },
    fromUserId: { type: 'string' },
    toUserId: { type: 'string' },
    amount: { type: 'number' },
    note: { type: 'string' },
    updatedAt: { type: 'string', format: 'date-time' },
    isDeleted: { type: 'boolean' },
  },
  required: [
    'id',
    'groupId',
    'fromUserId',
    'toUserId',
    'amount',
    'updatedAt',
    'isDeleted',
  ],
} as const;

// --- Typed schemas ---

export const groupSchemaTyped = toTypedRxJsonSchema(groupSchemaLiteral);
export type GroupDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof groupSchemaTyped
>;
export const groupSchema: RxJsonSchema<GroupDocType> = groupSchemaLiteral;

export const groupMemberSchemaTyped = toTypedRxJsonSchema(
  groupMemberSchemaLiteral
);
export type GroupMemberDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof groupMemberSchemaTyped
>;
export const groupMemberSchema: RxJsonSchema<GroupMemberDocType> =
  groupMemberSchemaLiteral;

export const expenseSchemaTyped = toTypedRxJsonSchema(expenseSchemaLiteral);
export type ExpenseDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof expenseSchemaTyped
>;
export const expenseSchema: RxJsonSchema<ExpenseDocType> = expenseSchemaLiteral;

export const expenseSplitSchemaTyped = toTypedRxJsonSchema(
  expenseSplitSchemaLiteral
);
export type ExpenseSplitDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof expenseSplitSchemaTyped
>;
export const expenseSplitSchema: RxJsonSchema<ExpenseSplitDocType> =
  expenseSplitSchemaLiteral;

export const settlementSchemaTyped = toTypedRxJsonSchema(
  settlementSchemaLiteral
);
export type SettlementDocType = ExtractDocumentTypeFromTypedRxJsonSchema<
  typeof settlementSchemaTyped
>;
export const settlementSchema: RxJsonSchema<SettlementDocType> =
  settlementSchemaLiteral;
