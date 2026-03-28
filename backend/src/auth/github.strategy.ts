import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get('GITHUB_CLIENT_ID', 'not-configured'),
      clientSecret: config.get('GITHUB_CLIENT_SECRET', 'not-configured'),
      callbackURL: config.get(
        'GITHUB_CALLBACK_URL',
        process.env.BACKEND_URL + '/api/auth/github/callback',
      ),
      scope: ['user:email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: any,
  ): Promise<any> {
    const { id, emails, displayName, username, photos } = profile;
    const user = {
      provider: 'github',
      providerId: id,
      email: emails?.[0]?.value || `${username}@github.com`,
      name: displayName || username,
      avatarUrl: photos?.[0]?.value,
    };
    done(null, user);
  }
}
