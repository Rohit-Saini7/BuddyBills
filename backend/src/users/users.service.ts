import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) { }

  async findMeById(userId: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException("User not found.");
    }
    return user;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findOneBy({ google_id: googleId });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email: email });
  }

  async createFromGoogleProfile(profile: {
    id: string;
    emails?: { value: string; verified: boolean }[];
    displayName: string;
    photos?: { value: string }[];
  }): Promise<User> {
    const newUser = this.userRepository.create({
      google_id: profile.id,
      email: profile?.emails?.[0].value ?? "",
      name: profile.displayName,
      avatar_url: profile.photos?.[0]?.value,
    });
    return this.userRepository.save(newUser);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }
}
