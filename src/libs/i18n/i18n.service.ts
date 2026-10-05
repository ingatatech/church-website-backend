import { Injectable } from '@nestjs/common';

@Injectable()
export class I18nService {
  private readonly messages: Record<string, string> = {
    'auth.terms_required': 'You must accept the terms and conditions.',
    'auth.email_registered': 'An account with this email address already exists.',
    'auth.code_sent_email': 'Verification code sent to your email address.',
    'auth.no_pending_registration': 'No pending registration found or verification request has expired.',
    'auth.identifier_verified_email': 'Email successfully verified.',
    'auth.code_resent_email': 'Verification code resent to your email address.',
    'auth.passwords_mismatch': 'Passwords do not match.',
    'auth.user_not_found': 'User account was not found.',
    'auth.password_already_set': 'Password has already been setup for this account.',
    'auth.password_not_set': 'Please set up your password before logging in.',
    'auth.incorrect_password': 'The password you entered is incorrect.',
    'auth.password_verified_otp_sent': 'Password verified. OTP sent to email.',
    'auth.invalid_expired_request': 'Invalid or expired request.',
    'auth.otp_verified_set_password': 'OTP verified. You may now set your new password.',
    'auth.invalid_expired_token': 'Invalid or expired token.',
    'auth.password_updated': 'Password updated successfully.',
    'auth.no_account_found': 'No account found with this email address.',
    'auth.password_reset': 'Password reset successfully.',
  };

  t(key: string, _args?: Record<string, any>): string {
    return this.messages[key] || key;
  }
}
