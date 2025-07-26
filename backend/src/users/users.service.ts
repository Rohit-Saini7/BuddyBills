import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { StrategyProfile } from "src/auth/strategies/base-oauth-strategy.factory";
import { AuthProvider } from "src/users/dto/auth-provider.enum";
import { UserIdentity } from "src/users/entities/user-identity.entity";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";

export class LinkProviderDto {
  userId: string;
  provider: AuthProvider;
  providerId: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserIdentity)
    private readonly userIdentityRepository: Repository<UserIdentity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) { }

  async findByProvider(
    provider: AuthProvider,
    providerId: string
  ): Promise<User | null> {
    const identity = await this.userIdentityRepository.findOne({
      where: { provider, provider_id: providerId },
      relations: { user: true },
    });
    return identity?.user ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }

  async processProviderLogin(
    profile: StrategyProfile<AuthProvider>
  ): Promise<User> {
    const { provider, providerId, email, name, avatarUrl } = profile;

    const identity = await this.userIdentityRepository.findOne({
      where: { provider, provider_id: providerId },
      relations: { user: true },
    });

    if (identity) return identity.user;

    if (!email) {
      throw new BadRequestException("Email not provided by provider.");
    }

    const existingUser = await this.findByEmail(email);

    if (existingUser) {
      const identities = await this.userIdentityRepository.find({
        where: { user: { id: existingUser.id } },
      });

      const existingProviders = identities.map((i) => i.provider);

      const linkingToken = this.jwtService.sign(
        {
          sub: existingUser.id,
          provider,
          providerId,
        },
        {
          secret: this.configService.get<string>("JWT_LINKING_SECRET"),
          expiresIn: "5m",
        }
      );

      throw new ConflictException({
        message: "Email already registered. Please link your account.",
        linkingToken,
        existingProviders,
      });
    }

    const user = this.userRepository.create({
      email,
      name,
      avatar_url: avatarUrl,
    });
    await this.userRepository.save(user);

    const newIdentity = this.userIdentityRepository.create({
      provider,
      provider_id: providerId,
      user,
    });
    await this.userIdentityRepository.save(newIdentity);

    return user;
  }

  async linkProviderToUser(dto: LinkProviderDto): Promise<User> {
    const { userId, provider, providerId } = dto;

    const user = await this.findById(userId);
    if (!user) throw new NotFoundException("User not found.");

    const exists = await this.userIdentityRepository.findOneBy({
      provider,
      provider_id: providerId,
    });

    if (exists) return user;

    const identity = this.userIdentityRepository.create({
      provider,
      provider_id: providerId,
      user,
    });
    await this.userIdentityRepository.save(identity);

    return user;
  }
}
