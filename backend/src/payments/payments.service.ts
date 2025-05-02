import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  forwardRef,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GroupsService } from "../groups/groups.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { Payment } from "./entities/payment.entity";

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,

    @Inject(forwardRef(() => GroupsService))
    private readonly groupsService: GroupsService
  ) { }

  async createPayment(
    createPaymentDto: CreatePaymentDto,
    groupId: string,
    paidByUserId: string
  ): Promise<Payment> {
    const { amount, paid_to_user_id, payment_date } = createPaymentDto;

    if (paidByUserId === paid_to_user_id) {
      throw new BadRequestException("Payer and Payee cannot be the same user.");
    }

    try {
      await this.groupsService.findOneById(groupId, paidByUserId);
    } catch (error) {
      console.error(
        `Access check failed for user ${paidByUserId} in group ${groupId}`,
        error
      );
      throw new ForbiddenException(
        "You do not have access to record payments in this group."
      );
    }

    const isPayeeMember = await this.groupsService.isMember(
      groupId,
      paid_to_user_id
    );
    if (!isPayeeMember) {
      throw new BadRequestException("The payee is not a member of this group.");
    }

    try {
      const payment = this.paymentRepository.create({
        group_id: groupId,
        paid_by_user_id: paidByUserId,
        paid_to_user_id: paid_to_user_id,
        amount: amount,
        payment_date: payment_date || new Date().toISOString().split("T")[0],
      });
      return await this.paymentRepository.save(payment);
    } catch (error) {
      console.error("Failed to save payment:", error);
      throw new InternalServerErrorException("Could not record payment.");
    }
  }

  //* --- Add find methods later if needed (e.g., list payments for group) ---
}
