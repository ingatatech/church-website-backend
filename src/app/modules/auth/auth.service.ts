import { HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as bcrypt from 'bcrypt';
import { UserStatus, AuthProvider } from '../../../utils/enums';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuditLogService } from '../audit/audit-log.service';
import { JwtTokenService } from '../../../libs/jwt/jwt-token.service';
import { OtpService } from '../../../libs/otp/otp.service';
import { EmailPublisher } from '../../../libs/pubsub/publishers/email.publisher';
import { VerificationOtpEmailService } from '../../../libs/pubsub/services/verification-otp-email.service';
import { MemoryStoreService } from '../../../libs/cache/memory-store.service';
import { I18nService } from '../../../libs/i18n/i18n.service';
import { sendError } from '../../../helpers/message/sendResult';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SetupPasswordDto } from './dto/setup-password.dto';
import { PendingRegistration } from './interfaces/pending-registration.interface';

@Injectable()
export class AuthService {
  private readonly PENDING_REG_TTL = 600;
  private readonly RESET_TOKEN_TTL = 300;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtTokenService: JwtTokenService,
    private readonly auditLogService: AuditLogService,
    private readonly otpService: OtpService,
    private readonly emailPublisher: EmailPublisher,
    private readonly verificationOtpEmail: VerificationOtpEmailService,
    private readonly memoryStore: MemoryStoreService,
    private readonly i18n: I18nService,
  ) {}

  // ─── Registration ────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    if (!dto.acceptTerms) {
      sendError(
        HttpStatus.BAD_REQUEST,
        this.i18n.t('auth.terms_required'),
        'BAD_REQUEST',
      );
    }

    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      sendError(
        HttpStatus.CONFLICT,
        this.i18n.t('auth.email_registered'),
        'CONFLICT',
      );
    }

    const requestId = randomUUID();
    const pending: PendingRegistration = {
      fullName: dto.fullName,
      email: dto.email,
      acceptTerms: dto.acceptTerms,
    };
    await this.memoryStore.set(
      this.pendingRegKey(requestId),
      JSON.stringify(pending),
      this.PENDING_REG_TTL,
    );

    const otp = await this.otpService.generate(requestId);
    await this.verificationOtpEmail.sendVerificationCode({
      requestId,
      email: dto.email,
      otp,
    });

    return {
      message: this.i18n.t('auth.code_sent_email'),
      requestId,
      channel: 'email',
      destination: dto.email,
    };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const pendingData = await this.memoryStore.get(
      this.pendingRegKey(dto.requestId),
    );
    if (!pendingData) {
      sendError(
        HttpStatus.BAD_REQUEST,
        this.i18n.t('auth.no_pending_registration'),
        'BAD_REQUEST',
      );
      return;
    }

    await this.otpService.verify(dto.requestId, dto.otp);

    const pending =
      typeof pendingData === 'string'
        ? (JSON.parse(pendingData) as PendingRegistration)
        : pendingData;

    const user = await this.usersService.createPendingUser(pending);
    await this.memoryStore.del(this.pendingRegKey(dto.requestId));

    void this.auditLogService.log({
      userId: user.id,
      action: 'REGISTER',
      module: 'auth',
      newValues: { email: user.email },
    });

    const tokens = await this.generateAndStoreTokens(user);
    return {
      message: this.i18n.t('auth.identifier_verified_email'),
      user: this.sanitize(user),
      ...tokens,
    };
  }

  async resendOtp(requestId: string) {
    const pending = await this.loadPendingRegistration(requestId);
    if (!pending) return;

    const otp = await this.otpService.generate(requestId);
    await this.verificationOtpEmail.sendVerificationCode({
      requestId,
      email: pending.email,
      otp,
    });

    return {
      message: this.i18n.t('auth.code_resent_email'),
      requestId,
      channel: 'email',
      destination: pending.email,
    };
  }

  async setupPassword(userId: string, dto: SetupPasswordDto) {
    if (dto.password !== dto.confirmPassword) {
      sendError(
        HttpStatus.BAD_REQUEST,
        this.i18n.t('auth.passwords_mismatch'),
        'BAD_REQUEST',
      );
    }

    const user = await this.usersService.findById(userId);
    if (!user) {
      sendError(
        HttpStatus.NOT_FOUND,
        this.i18n.t('auth.user_not_found'),
        'NOT_FOUND',
      );
      return;
    }

    if (user.status === UserStatus.active) {
      sendError(
        HttpStatus.CONFLICT,
        this.i18n.t('auth.password_already_set'),
        'CONFLICT',
      );
    }

    const hashed = await bcrypt.hash(dto.password, 10);
    const activated = await this.usersService.activateUser(userId, hashed);

    if (user.email) {
      this.emailPublisher
        .publishWelcomeEmail(user.email, user.fullName)
        .catch(() => undefined);
    }

    return { user: this.sanitize(activated) };
  }

  // ─── Session ─────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (user && user.status === UserStatus.pending) {
      sendError(
        HttpStatus.FORBIDDEN,
        this.i18n.t('auth.password_not_set'),
        'FORBIDDEN',
      );
    }
    if (user?.status === UserStatus.disabled) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user || !user.password)
      throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.usersService.update(user.id, { lastLogin: new Date() });

    void this.auditLogService.log({
      userId: user.id,
      action: 'LOGIN',
      module: 'auth',
      newValues: { email: user.email },
    });

    const tokens = await this.generateAndStoreTokens(user);
    return { user: this.sanitize(user), ...tokens };
  }

  async refresh(userId: string, refreshToken: string) {
    const isValid = await this.jwtTokenService.validateRefreshToken(
      userId,
      refreshToken,
    );
    if (!isValid)
      throw new UnauthorizedException('Invalid or expired refresh token');

    const user = await this.usersService.findById(userId);
    if (!user)
      throw new UnauthorizedException('Invalid or expired refresh token');

    return this.generateAndStoreTokens(user);
  }

  async logout(userId: string) {
    await this.jwtTokenService.revokeRefreshToken(userId);
    void this.auditLogService.log({ userId, action: 'LOGOUT', module: 'auth' });
    return { success: true };
  }

  async googleLogin(googleUser: {
    email: string;
    fullName: string;
    avatar: string;
  }) {
    let user = await this.usersService.findByEmail(googleUser.email);

    if (!user) {
      user = await this.usersService.create({
        email: googleUser.email,
        fullName: googleUser.fullName,
        avatar: googleUser.avatar,
        provider: AuthProvider.google,
        status: UserStatus.active,
        emailVerified: true,
      });
    }

    await this.usersService.update(user.id, { lastLogin: new Date() });
    void this.auditLogService.log({
      userId: user.id,
      action: 'GOOGLE_LOGIN',
      module: 'auth',
      newValues: { email: user.email },
    });

    const tokens = await this.generateAndStoreTokens(user);
    return { user: this.sanitize(user), ...tokens };
  }

  // ─── Forgot / Reset Password ─────────────────────────────────────────────

  async forgotPassword(email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      sendError(
        HttpStatus.NOT_FOUND,
        this.i18n.t('auth.no_account_found'),
        'NOT_FOUND',
      );
      return;
    }

    const requestId = randomUUID();
    await this.memoryStore.set(
      this.resetPasswordKey(requestId),
      user.id,
      this.PENDING_REG_TTL,
    );
    const otp = await this.otpService.generate(requestId);
    await this.emailPublisher
      .publishPasswordResetEmail(user.email, otp)
      .catch(() => undefined);

    return {
      message: this.i18n.t('auth.code_sent_email'),
      requestId,
      channel: 'email',
      destination: user.email,
    };
  }

  async forgotPasswordConfirmOtp(requestId: string, otp: string) {
    const storedUserId = await this.memoryStore.get(
      this.resetPasswordKey(requestId),
    );
    if (!storedUserId) {
      sendError(
        HttpStatus.BAD_REQUEST,
        this.i18n.t('auth.invalid_expired_request'),
        'BAD_REQUEST',
      );
      return;
    }

    await this.otpService.verify(requestId, otp);
    await this.memoryStore.del(this.resetPasswordKey(requestId));

    const resetToken = randomUUID();
    await this.memoryStore.set(
      this.resetTokenKey(resetToken),
      storedUserId,
      this.RESET_TOKEN_TTL,
    );

    return {
      message: this.i18n.t('auth.otp_verified_set_password'),
      resetToken,
    };
  }

  async resetPassword(
    resetToken: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    if (newPassword !== confirmPassword) {
      sendError(
        HttpStatus.BAD_REQUEST,
        this.i18n.t('auth.passwords_mismatch'),
        'BAD_REQUEST',
      );
    }

    const storedUserId = await this.memoryStore.get(
      this.resetTokenKey(resetToken),
    );
    if (!storedUserId) {
      sendError(
        HttpStatus.BAD_REQUEST,
        this.i18n.t('auth.invalid_expired_token'),
        'BAD_REQUEST',
      );
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    const user = await this.usersService.update(storedUserId, {
      password: hashed,
    });
    await this.memoryStore.del(this.resetTokenKey(resetToken));

    if (user.email) {
      this.emailPublisher
        .publishPasswordChangedEmail(user.email, user.fullName)
        .catch(() => undefined);
    }

    const tokens = await this.generateAndStoreTokens(user);
    return {
      message: this.i18n.t('auth.password_reset'),
      user: this.sanitize(user),
      ...tokens,
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  async profile(id: string) {
    const user = await this.usersService.findById(id);
    return user ? this.sanitize(user) : null;
  }

  private async loadPendingRegistration(
    requestId: string,
  ): Promise<PendingRegistration | null> {
    const data = await this.memoryStore.get(this.pendingRegKey(requestId));
    if (!data) {
      sendError(
        HttpStatus.BAD_REQUEST,
        this.i18n.t('auth.no_pending_registration'),
        'BAD_REQUEST',
      );
      return null;
    }
    return typeof data === 'string'
      ? (JSON.parse(data) as PendingRegistration)
      : data;
  }

  private async generateAndStoreTokens(user: User) {
    const tokens = await this.jwtTokenService.generateTokenPair({
      sub: user.id,
      email: user.email,
      phone: user.phone,
    });
    await this.jwtTokenService.storeRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  private sanitize(user: User) {
    const { password, ...safe } = user;
    void password;
    return safe;
  }

  private pendingRegKey = (id: string) => `pending_reg:${id}`;
  private setPasswordKey = (id: string) => `set_password:${id}`;
  private resetPasswordKey = (id: string) => `reset_password:${id}`;
  private resetTokenKey = (token: string) => `reset_token:${token}`;
}
