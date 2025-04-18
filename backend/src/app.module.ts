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
      imports: [ConfigModule], // Depends on ConfigModule
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        url: configService.get<string>("DATABASE_URL"), // Get DB URL from .env
        // Uncomment the ssl line below if your Supabase/Postgres requires SSL connection
        // and you encounter connection issues without it.
        // ssl: {
        //   rejectUnauthorized: false, // Necessary for some cloud providers/self-signed certs
        // },
        autoLoadEntities: true, // Automatically loads entities registered via forFeature() in modules
        synchronize: false, // *** IMPORTANT: Set to false now that we are using migrations ***
        logging: ["error", "warn"], // Configure logging levels (e.g., 'query', 'error', 'warn')
      }),
      inject: [ConfigService], // Inject ConfigService into the factory function
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
