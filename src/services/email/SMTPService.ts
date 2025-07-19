import nodemailer from 'nodemailer';
import { SMTPConfig } from '../../types';
import config from '../../config/environment';

/**
 * SMTP Service for sending emails
 * Handles the actual email delivery using nodemailer
 */
export class SMTPService {
  private transporter: nodemailer.Transporter;
  private smtpConfig: SMTPConfig;

  constructor(smtpConfig?: SMTPConfig) {
    this.smtpConfig = smtpConfig || this.getDefaultSMTPConfig();
    this.transporter = this.createTransporter();
  }

  /**
   * Get default SMTP configuration from environment variables
   */
  private getDefaultSMTPConfig(): SMTPConfig {
    return {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      password: process.env.SMTP_PASSWORD || '',
      fromName: process.env.SMTP_FROM_NAME || 'OpenLearn Platform',
      fromEmail: process.env.SMTP_FROM_EMAIL || 'noreply@openlearn.org.in',
      replyTo: process.env.SMTP_REPLY_TO || undefined,
    };
  }

  /**
   * Create nodemailer transporter
   */
  private createTransporter(): nodemailer.Transporter {
    return nodemailer.createTransport({
      host: this.smtpConfig.host,
      port: this.smtpConfig.port,
      secure: this.smtpConfig.secure,
      auth: {
        user: this.smtpConfig.user,
        pass: this.smtpConfig.password,
      },
      pool: true, // Use connection pooling
      maxConnections: 5, // Limit concurrent connections
      maxMessages: 100, // Limit messages per connection
      rateDelta: 1000, // Rate limiting: 1 second
      rateLimit: 10, // Rate limiting: 10 emails per rateDelta
    });
  }

  /**
   * Send a single email
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: any[];
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const mailOptions = {
        from: `"${this.smtpConfig.fromName}" <${this.smtpConfig.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments,
        replyTo: this.smtpConfig.replyTo,
        headers: {
          'List-Unsubscribe': `<mailto:unsubscribe@openlearn.org.in?subject=Unsubscribe>`,
          'X-Mailer': 'OpenLearn Platform v1.0',
        },
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      console.log(`Email sent successfully to ${options.to}. Message ID: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      console.error(`Failed to send email to ${options.to}:`, error);
      
      return {
        success: false,
        error: error.message || 'Unknown error occurred while sending email',
      };
    }
  }

  /**
   * Test SMTP connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.transporter.verify();
      console.log('SMTP connection test successful');
      
      return { success: true };
    } catch (error: any) {
      console.error('SMTP connection test failed:', error);
      
      return {
        success: false,
        error: error.message || 'SMTP connection test failed',
      };
    }
  }

  /**
   * Close the SMTP connection
   */
  async close(): Promise<void> {
    if (this.transporter) {
      this.transporter.close();
    }
  }

  /**
   * Update SMTP configuration
   */
  updateConfig(newConfig: Partial<SMTPConfig>): void {
    this.smtpConfig = { ...this.smtpConfig, ...newConfig };
    this.transporter = this.createTransporter();
  }

  /**
   * Get current SMTP configuration (without password)
   */
  getConfig(): Omit<SMTPConfig, 'password'> {
    const { password, ...configWithoutPassword } = this.smtpConfig;
    return configWithoutPassword;
  }
}

export default SMTPService;
