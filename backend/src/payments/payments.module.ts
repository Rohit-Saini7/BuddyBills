import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupsModule } from 'src/groups/groups.module';
import { Payment } from 'src/payments/entities/payment.entity';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]), // Correctly provides PaymentRepository here
    forwardRef(() => GroupsModule), // Imports GroupsModule because PaymentsService needs GroupsService
  ],
  // Controller is likely empty or removed if routes handled in GroupsController
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService] // Export PaymentsService so GroupsModule/GroupsController can use it
})
export class PaymentsModule { }
