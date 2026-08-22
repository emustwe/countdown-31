import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

// Sends transactional email (currently just password-reset OTPs). When EMAIL_ENABLED=true and SMTP
// is configured it sends real mail; otherwise it logs the message to the server console so the flow
// is fully testable in development without an SMTP server.
@Injectable()
export class MailService {
  private readonly logger = new Logger("MailService");
  private transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {}

  /** True only when email delivery is actually configured. */
  get live(): boolean {
    return this.config.get<string>("EMAIL_ENABLED") === "true" && !!this.config.get<string>("SMTP_HOST");
  }

  private getTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: this.config.getOrThrow<string>("SMTP_HOST"),
        port: Number(this.config.get<string>("SMTP_PORT") ?? "587"),
        secure: Number(this.config.get<string>("SMTP_PORT") ?? "587") === 465,
        auth: {
          user: this.config.getOrThrow<string>("SMTP_USER"),
          pass: this.config.getOrThrow<string>("SMTP_PASS"),
        },
      });
    }
    return this.transporter;
  }

  async sendPasswordResetOtp(email: string, otp: string): Promise<void> {
    const subject = "Your WM Tournaments password reset code";
    const text = `Your password reset code is ${otp}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`;
    if (!this.live) {
      if (process.env.NODE_ENV === "production") {
        // Fail loud, but NEVER print the code in production — that would leak it to logs.
        this.logger.error(`Cannot send password reset code to ${email}: email delivery is not configured (set EMAIL_ENABLED + SMTP_*).`);
      } else {
        // Dev fallback only — the OTP is printed so you can complete the flow without SMTP.
        this.logger.warn(`[DEV] Password reset OTP for ${email}: ${otp} (email delivery is disabled)`);
      }
      return;
    }
    await this.send(email, subject, text);
    this.logger.log(`Password reset OTP emailed to ${email}`);
  }

  async sendEmailVerificationOtp(email: string, otp: string): Promise<void> {
    const subject = "Verify your WM Tournaments email";
    const text = `Your email verification code is ${otp}. It expires in 15 minutes.`;
    if (!this.live) {
      if (process.env.NODE_ENV !== "production") {
        this.logger.warn(`[DEV] Email verification OTP for ${email}: ${otp} (email delivery is disabled)`);
      }
      return;
    }
    await this.send(email, subject, text);
    this.logger.log(`Verification OTP emailed to ${email}`);
  }

  /** A best-effort security notification (new login, password change, withdrawal). Never throws —
   * a delivery failure must not break the underlying action. */
  async sendSecurityNotice(email: string, subject: string, text: string): Promise<void> {
    try {
      if (!this.live) return;
      await this.send(email, `WM Tournaments — ${subject}`, text);
    } catch (err) {
      this.logger.warn(`Security notice to ${email} failed: ${(err as Error).message}`);
    }
  }

  private async send(to: string, subject: string, text: string): Promise<void> {
    const from = this.config.get<string>("SMTP_FROM") ?? this.config.get<string>("SMTP_USER") ?? "no-reply@wm.tournaments";
    await this.getTransporter().sendMail({ from, to, subject, text });
  }
}
