import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AppController } from "./app.controller";
import { AppService } from "./app.service";

import { AuthModule } from "./auth/auth.module";
import { ExpensesModule } from "./expenses/expenses.module";
import { GroupsModule } from "./groups/groups.module";
import { PaymentsModule } from "./payments/payments.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    //* --- Core Modules ---
    //? Configuration Module (loads .env variables)
    ConfigModule.forRoot({
      isGlobal: true, //? Make ConfigService available everywhere
      envFilePath: ".env", //? Explicitly point to .env file
    }),

    //? Database Module (TypeORM)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get<string>("DB_HOST"),
        port: configService.get<number>("DB_PORT"),
        username: configService.get<string>("DB_USERNAME"),
        password: configService.get<string>("DB_PASSWORD"),
        database: configService.get<string>("DB_DATABASE"),
        entities: [__dirname + "/../**/*.entity{.ts,.js}"],
        synchronize: false,
        ssl: true,
        //* ssl: configService.get<string>('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false, //? Supabase requires SSL in production
        logging: true, //? Enable for debugging DB queries
      }),
    }),

    //* --- Feature Modules ---
    AuthModule,
    UsersModule,
    GroupsModule,
    ExpensesModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
