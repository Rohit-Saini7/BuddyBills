import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) { }

  // Find user by their unique Google ID
  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.userRepository.findOneBy({ google_id: googleId });
  }

  // Find user by email (useful for checking duplicates or finding members)
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

  // Find a user by internal ID (useful for JWT validation)
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOneBy({ id });
  }
}
