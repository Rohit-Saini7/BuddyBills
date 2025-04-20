import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException, // Import Inject
  forwardRef
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GroupsService } from '../groups/groups.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Payment } from './entities/payment.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,

    @Inject(forwardRef(() => GroupsService)) // Inject GroupsService
    private readonly groupsService: GroupsService,
  ) { }

  async createPayment(
    createPaymentDto: CreatePaymentDto,
    groupId: string,
    paidByUserId: string,
  ): Promise<Payment> {

    const { amount, paid_to_user_id, payment_date } = createPaymentDto;

    // 1. Basic Validation
    if (paidByUserId === paid_to_user_id) {
      throw new BadRequestException('Payer and Payee cannot be the same user.');
    }

    // 2. Check Payer's access to the group (implicitly checks group exists)
    // We also need to check if the PAYEE is in the group. findOneById only checks requester.
    // Let's use isMember check instead after ensuring group exists via findOneById by the payer.
    try {
      await this.groupsService.findOneById(groupId, paidByUserId); // Check payer access
    } catch (error) {
      console.error(`Access check failed for user ${paidByUserId} in group ${groupId}`, error);
      throw new ForbiddenException('You do not have access to record payments in this group.');
    }

    // 3. Check if Payee is a member of the group
    const isPayeeMember = await this.groupsService.isMember(groupId, paid_to_user_id);
    if (!isPayeeMember) {
      throw new BadRequestException('The payee is not a member of this group.');
    }

    // 4. Create and save the payment
    try {
      const payment = this.paymentRepository.create({
        group_id: groupId,
        paid_by_user_id: paidByUserId,
        paid_to_user_id: paid_to_user_id,
        amount: amount, // Already number type from DTO
        payment_date: payment_date || new Date().toISOString().split('T')[0] // Default to today if not provided
      });
      return await this.paymentRepository.save(payment);
      return {
        group_id: groupId,
        paid_by_user_id: paidByUserId,
        paid_to_user_id: paid_to_user_id,
        amount: amount, // Already number type from DTO
        payment_date: payment_date || new Date().toISOString().split('T')[0] // Default to today if not provided
      } as Payment; // Mocking the return for now
    } catch (error) {
      console.error("Failed to save payment:", error);
      throw new InternalServerErrorException('Could not record payment.');
    }
  }

  // --- Add find methods later if needed (e.g., list payments for group) ---
}
