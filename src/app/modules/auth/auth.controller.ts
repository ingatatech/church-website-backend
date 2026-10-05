import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response } from 'express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SetupPasswordDto } from './dto/setup-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import {
  clearTokenCookies,
  setTokenCookies,
} from './helpers/cookie.helper';
import { sendResult } from '../../../helpers/message/sendResult';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Registration ────────────────────────────────────────────────────────

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Start registration — sends OTP to email' })
  @ApiResponse({ status: 200, description: 'OTP sent' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return sendResult(HttpStatus.OK, result.message, {
      requestId: result.requestId,
      channel: result.channel,
      destination: result.destination,
    });
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify OTP and complete registration' })
  @ApiResponse({ status: 200, description: 'Email verified, account created' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  async verifyOtp(
    @Res({ passthrough: true }) res: Response,
    @Body() dto: VerifyOtpDto,
  ) {
    const result = await this.authService.verifyOtp(dto);
    return this.deliver(res, result!, HttpStatus.OK, result!.message);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Resend OTP to email for pending registration' })
  @ApiBody({ schema: { properties: { requestId: { type: 'string' } } } })
  @ApiResponse({ status: 200, description: 'OTP resent' })
  async resendOtp(@Body('requestId') requestId: string) {
    const result = await this.authService.resendOtp(requestId);
    return sendResult(HttpStatus.OK, result!.message, {
      requestId: result!.requestId,
      channel: result!.channel,
      destination: result!.destination,
    });
  }

  @Post('setup-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set password for a newly verified account' })
  @ApiResponse({ status: 200, description: 'Password set, account activated' })
  async setupPassword(
    @CurrentUser() user: { id: string },
    @Body() dto: SetupPasswordDto,
  ) {
    const result = await this.authService.setupPassword(user.id, dto);
    return sendResult(HttpStatus.OK, 'Password set up successfully', result);
  }

  // ─── Session ─────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Res({ passthrough: true }) res: Response,
    @Body() dto: LoginDto,
  ) {
    const result = await this.authService.login(dto);
    return this.deliver(res, result, HttpStatus.OK, 'Login successful');
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt-refresh'))
  @ApiOperation({ summary: 'Rotate tokens using a valid refresh token' })
  @ApiResponse({ status: 200, description: 'New token pair issued' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: { id: string; refreshToken: string },
  ) {
    const tokens = await this.authService.refresh(user.id, user.refreshToken);
    setTokenCookies(res, tokens);
    return sendResult(HttpStatus.OK, 'Tokens refreshed', null);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: { id: string },
  ) {
    await this.authService.logout(user.id);
    clearTokenCookies(res);
    return sendResult(HttpStatus.OK, 'Logged out successfully', null);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  @ApiResponse({ status: 200, description: 'Current user returned' })
  async me(@CurrentUser() user: { id: string }) {
    const profile = await this.authService.profile(user.id);
    return sendResult(HttpStatus.OK, 'Current user', profile);
  }

  // ─── Forgot / Reset Password ─────────────────────────────────────────────

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Send password-reset OTP to email' })
  @ApiResponse({ status: 200, description: 'OTP sent' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(dto.email);
    return sendResult(HttpStatus.OK, result!.message, {
      requestId: result!.requestId,
      channel: result!.channel,
      destination: result!.destination,
    });
  }

  @Post('forgot-password/verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify OTP for password reset — returns resetToken' })
  @ApiResponse({ status: 200, description: 'OTP verified, resetToken issued' })
  async forgotPasswordVerifyOtp(@Body() dto: VerifyOtpDto) {
    const result = await this.authService.forgotPasswordConfirmOtp(dto.requestId, dto.otp);
    return sendResult(HttpStatus.OK, result!.message, { resetToken: result!.resetToken });
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Reset password using resetToken' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  async resetPassword(
    @Res({ passthrough: true }) res: Response,
    @Body() dto: ResetPasswordDto,
  ) {
    const result = await this.authService.resetPassword(
      dto.resetToken,
      dto.newPassword,
      dto.confirmPassword,
    );
    return this.deliver(res, result!, HttpStatus.OK, result!.message);
  }

  // ─── Google OAuth ─────────────────────────────────────────────────────────

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Redirect to Google login' })
  googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback — issues tokens' })
  async googleCallback(@Req() req: any, @Res() res: Response) {
    const result = await this.authService.googleLogin(req.user);
    const { accessToken, refreshToken, ...rest } = result as any;
    setTokenCookies(res, { accessToken, refreshToken });
    return res.json(sendResult(HttpStatus.OK, 'Google login successful', rest));
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private deliver(
    res: Response,
    result: { accessToken: string; refreshToken: string; [key: string]: any },
    status: number,
    message: string,
  ) {
    const { accessToken, refreshToken, ...rest } = result;
    setTokenCookies(res, { accessToken, refreshToken });
    return sendResult(status, message, rest);
  }
}
