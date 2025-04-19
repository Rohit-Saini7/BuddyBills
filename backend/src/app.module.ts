import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

// Root App Components (usually for health checks or general setup)
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

// Feature Modules
import { AuthModule } from "./auth/auth.module";
import { ExpensesModule } from "./expenses/expenses.module";
import { GroupsModule } from "./groups/groups.module";
import { PaymentsModule } from "./payments/payments.module";
import { UsersController } from './users.controller';
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    // --- Core Modules ---

    // Configuration Module (loads .env variables)
    ConfigModule.forRoot({
      isGlobal: true, // Make ConfigService available everywhere
      envFilePath: ".env", // Explicitly point to .env file
    }),

    // Database Module (TypeORM)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule], // Import ConfigModule to inject ConfigService
      inject: [ConfigService], // Inject ConfigService
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        // List your entities here
        // entities: [User, /* Other entities */],
        entities: [__dirname + '/../**/*.entity{.ts,.js}'], // Or use auto-loading
        synchronize: false,
        ssl: true,
        // ssl: configService.get<string>('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false, // Supabase requires SSL in production
        logging: true, // Enable for debugging DB queries
      }),
    }),

    // --- Feature Modules ---
    // Import all your application feature modules here
    AuthModule,
    UsersModule,
    GroupsModule,
    ExpensesModule,
    PaymentsModule,
  ],
  // Root controller (optional, usually for things like /health)
  controllers: [AppController, UsersController],
  // Root service (optional)
  providers: [AppService],
})
export class AppModule { }
