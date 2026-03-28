import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const jwt = app.get(JwtService);

  const users = await prisma.user.findMany();
  const groups = await prisma.group.findMany();
  const members = await prisma.groupMember.findMany();

  console.log('--- USERS ---');
  console.log(users);
  console.log('\n--- GROUPS ---');
  console.log(groups);
  console.log('\n--- MEMBERS ---');
  console.log(members);

  if (users.length > 0) {
    const user = users[0];
    console.log('\n--- JWT TOKEN ---');
    console.log(jwt.sign({ sub: user.id, email: user.email }));
  }

  await app.close();
}
bootstrap();
