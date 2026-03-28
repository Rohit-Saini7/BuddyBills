import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

export interface OAuthProfile {
  provider: string;
  providerId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

export interface AuthResult {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Find or create a user from an OAuth profile, then return a JWT.
   */
  async validateOAuthUser(profile: OAuthProfile): Promise<AuthResult> {
    // Try to find existing user by provider+providerId
    let user = await this.prisma.user.findUnique({
      where: {
        provider_providerId: {
          provider: profile.provider,
          providerId: profile.providerId,
        },
      },
    });

    if (!user) {
      // Try to find by email (user may have logged in with a different provider)
      user = await this.prisma.user.findUnique({
        where: { email: profile.email },
      });

      if (user) {
        // Link this provider to the existing account
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            provider: profile.provider,
            providerId: profile.providerId,
            avatarUrl: profile.avatarUrl || user.avatarUrl,
            name: profile.name || user.name,
          },
        });
      } else {
        // Create new user
        user = await this.prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name || null,
            avatarUrl: profile.avatarUrl || null,
            provider: profile.provider,
            providerId: profile.providerId,
          },
        });
      }
    }

    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwt.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  /**
   * Validate a JWT payload and return the user.
   */
  async validateJwtPayload(payload: { sub: string; email: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.deleted) return null;
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    };
  }
}
