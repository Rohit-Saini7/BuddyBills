import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule } from "@nestjs/config"; // Import
import { UsersModule } from "./users/users.module";
import { ExpensesModule } from "./expenses/expenses.module";
import { PaymentsModule } from "./payments/payments.module";
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UsersModule,
    ExpensesModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
