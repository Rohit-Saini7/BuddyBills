import { Injectable, NotFoundException } from '@nestjs/common'; // Import NotFoundException
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  // --- Method to fetch current user based on ID from JWT ---
  async findMeById(userId: string): Promise<User> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      // This case should be rare if the JWT is valid, but handle defensively
      throw new NotFoundException('User not found.');
    }
    // The ClassSerializerInterceptor will handle converting this User entity
    // to UserResponseDto based on the controller's return type hint.
    return user;
  }

  // Keep other methods like findByGoogleId, createFromGoogleProfile, findByEmail, findById etc.
  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findOneBy({ google_id: googleId });
  }
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email: email });
  }

  // Create a new user from Google profile data
  async createFromGoogleProfile(profile: {
    id: string;
    emails?: { value: string; verified: boolean; }[];
    displayName: string;
    photos?: { value: string; }[];
  }): Promise<User> {
    const newUser = this.userRepository.create({
      google_id: profile.id,
      email: profile?.emails?.[0].value ?? '', // Assuming first email is primary
      name: profile.displayName,
      avatar_url: profile.photos?.[0]?.value,
    });
    return this.userRepository.save(newUser);
  }
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }
}
