import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async sendVerificationCode(phone: string, code: string) {
    const provider = (process.env.SMS_PROVIDER ?? 'mock').toLowerCase();
    if (provider === 'mock' || provider === 'console') {
      this.logger.log(`SMS mock send to ${phone}: ${code}`);
      return { delivered: true, provider: 'mock' as const };
    }

    // Placeholder for external SMS integrations (Twilio/Solapi/etc).
    // Fallback to log to avoid silent drops in non-prod misconfiguration.
    this.logger.warn(`Unknown SMS_PROVIDER=${provider}; falling back to mock delivery for ${phone}`);
    this.logger.log(`SMS fallback send to ${phone}: ${code}`);
    return { delivered: true, provider: 'mock' as const };
  }
}
