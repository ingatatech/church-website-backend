import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { AuthProvider, UserStatus } from '../../../utils/enums';
import { PendingRegistration } from '../auth/interfaces/pending-registration.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email: email.toLowerCase() } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.usersRepo.create({
      ...data,
      email: data.email?.toLowerCase(),
    });
    return this.usersRepo.save(user);
  }

  async createPendingUser(pending: PendingRegistration): Promise<User> {
    const existing = await this.findByEmail(pending.email);
    if (existing) return existing;

    const user = this.usersRepo.create({
      fullName: pending.fullName,
      email: pending.email.toLowerCase(),
      status: UserStatus.pending,
      emailVerified: true,
      provider: AuthProvider.local,
    });
    return this.usersRepo.save(user);
  }

  async activateUser(userId: string, passwordHash: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) throw new Error('User not found');
    user.password = passwordHash;
    user.status = UserStatus.active;
    return this.usersRepo.save(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.usersRepo.update(id, data);
    const updated = await this.findById(id);
    if (!updated) throw new Error('User not found');
    return updated;
  }
}
