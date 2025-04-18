import 'dotenv/config'; // Load .env variables FIRST
import { DataSource, DataSourceOptions } from 'typeorm';
import { ExpenseSplit } from './src/expenses/entities/expense-split.entity';
import { Expense } from './src/expenses/entities/expense.entity';
import { GroupMember } from './src/groups/entities/group-member.entity';
import { Group } from './src/groups/entities/group.entity';
import { Payment } from './src/payments/entities/payment.entity';
import { User } from './src/users/entities/user.entity';

// Ensure environment variables are loaded and valid before this point
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set.');
}

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false }, // Add if needed for Supabase connection
  entities: [
    User,
    Group,
    GroupMember,
    Expense,
    ExpenseSplit,
    Payment,
    // Add any other entities here
  ],
  // Path to migration files - adjust if needed
  migrations: [__dirname + '/src/database/migrations/*{.ts,.js}'],
  migrationsTableName: 'typeorm_migrations', // Table to track executed migrations
  logging: ['error', 'migration'], // Log errors and migration activity
  synchronize: false, // Ensure synchronize is false for CLI
};

const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource; // Export DataSource instance for CLI usage
