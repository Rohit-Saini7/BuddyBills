import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'src/auth/strategies/jwt.strategy';
import { UsersModule } from '../users/users.module'; // Import UsersModule
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategies/google.strategy'; // We will create this

@Module({
  imports: [
    ConfigModule, // Ensure ConfigService is available
    PassportModule,
    UsersModule, // Import UsersModule to use UsersService
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1d' }, // Token expires in 1 day (adjust as needed)
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  // Register Strategies and Service as providers
  providers: [AuthService, GoogleStrategy, JwtStrategy],
  // exports: [AuthService, JwtModule] // Export if needed elsewhere
})
export class AuthModule { }
