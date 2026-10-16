import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { AuthProvider, UserRole, UserStatus } from '../../../utils/enums';
import { PendingRegistration } from '../auth/interfaces/pending-registration.interface';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';

export type SafeUser = Omit<User, 'password'>;

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
    if (!user) throw new NotFoundException('User not found');
    user.password = passwordHash;
    user.status = UserStatus.active;
    return this.usersRepo.save(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    await this.usersRepo.update(id, data);
    const updated = await this.findById(id);
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  // ==========================================
  // ADMIN MANAGEMENT METHODS
  // ==========================================

  async listUsers(query?: AdminUserQueryDto): Promise<{ items: SafeUser[]; total: number }> {
    const qb = this.usersRepo.createQueryBuilder('user');

    if (query?.search?.trim()) {
      const term = `%${query.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(user.fullName) LIKE :term OR LOWER(user.email) LIKE :term OR LOWER(COALESCE(user.phone, \'\')) LIKE :term)',
        { term },
      );
    }

    if (query?.role && query.role !== 'all') {
      qb.andWhere('user.role = :role', { role: query.role });
    }

    if (query?.status && query.status !== 'all') {
      qb.andWhere('user.status = :status', { status: query.status });
    }

    qb.orderBy('user.createdAt', 'DESC');

    const [users, total] = await qb.getManyAndCount();

    const safeUsers: SafeUser[] = users.map((u) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...safe } = u;
      return safe as SafeUser;
    });

    return { items: safeUsers, total };
  }

  async updateRole(
    targetUserId: string,
    newRole: UserRole,
    currentUserId: string,
  ): Promise<SafeUser> {
    const target = await this.findById(targetUserId);
    if (!target) {
      throw new NotFoundException('User account not found');
    }

    if (target.id === currentUserId && newRole !== UserRole.admin) {
      throw new BadRequestException('You cannot remove your own administrator access.');
    }

    target.role = newRole;

    // If granting administrator role, ensure user is verified & active
    if (newRole === UserRole.admin) {
      target.emailVerified = true;
      if (target.status === UserStatus.pending) {
        target.status = UserStatus.active;
      }
    }

    const saved = await this.usersRepo.save(target);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safe } = saved;
    return safe as SafeUser;
  }

  async updateStatus(
    targetUserId: string,
    newStatus: UserStatus,
    currentUserId: string,
  ): Promise<SafeUser> {
    const target = await this.findById(targetUserId);
    if (!target) {
      throw new NotFoundException('User account not found');
    }

    if (target.id === currentUserId && newStatus === UserStatus.disabled) {
      throw new BadRequestException('You cannot disable your own administrator account.');
    }

    target.status = newStatus;

    const saved = await this.usersRepo.save(target);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safe } = saved;
    return safe as SafeUser;
  }

  async deleteUser(
    targetUserId: string,
    currentUserId: string,
  ): Promise<{ message: string }> {
    const target = await this.findById(targetUserId);
    if (!target) {
      throw new NotFoundException('User account not found');
    }

    if (target.id === currentUserId) {
      throw new BadRequestException('You cannot delete your own administrator account.');
    }

    await this.usersRepo.remove(target);
    return { message: 'User deleted successfully' };
  }
}
