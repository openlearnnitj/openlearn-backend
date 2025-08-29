import nodemailer from 'nodemailer';
import {
  EmailProviderInterface,
  EmailProviderConfig,
  EmailSendOptions,
  EmailSendResult,
  BulkEmailResult
} from '../interfaces/EmailProviderInterface';

/**
 * Mailtrap Email Provider Implementation
 * 
 * This class implements the EmailProviderInterface for Mailtrap service.
 * It handles all Mailtrap-specific logic and SMTP interactions.
 */
export class MailtrapProvider implements EmailProviderInterface {
  private transporter: nodemailer.Transporter;
  private config: EmailProviderConfig;

  constructor(options?: {
    apiToken?: string;
    fromEmail?: string;
    fromName?: string;
  }) {
    const apiToken = options?.apiToken || process.env.MAILTRAP_API_TOKEN;
    if (!apiToken) {
      throw new Error('MAILTRAP_API_TOKEN is required for Mailtrap provider');
    }

    this.config = {
      fromEmail: options?.fromEmail || process.env.MAILTRAP_FROM_EMAIL || 'noreply@openlearn.org.in',
      fromName: options?.fromName || process.env.MAILTRAP_FROM_NAME || 'OpenLearn Platform',
      provider: 'mailtrap'
    };

    // Create Mailtrap SMTP transporter
    this.transporter = nodemailer.createTransport({
      host: "live.smtp.mailtrap.io",
      port: 587,
      secure: false, // Use STARTTLS
      auth: {
        user: "api",
        pass: apiToken
      }
    });
  }

  /**
   * Send a single email using Mailtrap
   */
  async sendEmail(options: EmailSendOptions): Promise<EmailSendResult> {
    try {
      const mailOptions = {
        from: `${this.config.fromName} <${this.config.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments
      };

      const result = await this.transporter.sendMail(mailOptions);

      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Send bulk emails using Mailtrap
   */
  async sendBulkEmails(emails: EmailSendOptions[]): Promise<BulkEmailResult> {
    const results: Array<{ success: boolean; messageId?: string; error?: string; to: string }> = [];
    let totalSent = 0;
    let totalFailed = 0;

    for (const email of emails) {
      const result = await this.sendEmail(email);
      
      results.push({
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        to: email.to
      });
      
      if (result.success) {
        totalSent++;
      } else {
        totalFailed++;
      }
    }

    return {
      success: totalFailed === 0,
      results,
      totalSent,
      totalFailed
    };
  }

  /**
   * Test the connection to Mailtrap
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.transporter.verify();
      
      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Mailtrap connection test failed'
      };
    }
  }

  /**
   * Close the transporter connection
   */
  async close(): Promise<void> {
    this.transporter.close();
  }

  /**
   * Get provider configuration
   */
  getConfig(): EmailProviderConfig {
    return { ...this.config };
  }

  /**
   * Update provider configuration
   */
  updateConfig(config: Partial<EmailProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export default MailtrapProvider;
