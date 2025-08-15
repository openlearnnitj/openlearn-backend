import { Resend } from 'resend';
import {
  EmailProviderInterface,
  EmailProviderConfig,
  EmailSendOptions,
  EmailSendResult,
  BulkEmailResult
} from '../interfaces/EmailProviderInterface';

/**
 * Resend Email Provider Implementation
 * 
 * This class implements the EmailProviderInterface for Resend service.
 * It handles all Resend-specific logic and API interactions.
 */
export class ResendProvider implements EmailProviderInterface {
  private resend: Resend;
  private config: EmailProviderConfig;

  constructor(options?: {
    apiKey?: string;
    fromEmail?: string;
    fromName?: string;
  }) {
    const apiKey = options?.apiKey || process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is required for Resend provider');
    }

    this.resend = new Resend(apiKey);
    this.config = {
      fromEmail: options?.fromEmail || process.env.RESEND_FROM_EMAIL || '"OpenLearn Platform" <info@openlearn.org.in>',
      fromName: options?.fromName || process.env.RESEND_FROM_NAME || 'OpenLearn Platform',
      provider: 'Resend',
      apiKey, // Store for config updates
    };

    console.log('Resend Email Provider initialized');
  }

  /**
   * Send a single email using Resend API
   */
  async sendEmail(options: EmailSendOptions): Promise<EmailSendResult> {
    try {
      const emailData: any = {
        from: this.config.fromEmail,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      // Add CC if provided
      if (options.cc && options.cc.length > 0) {
        emailData.cc = options.cc;
      }

      // Add BCC if provided
      if (options.bcc && options.bcc.length > 0) {
        emailData.bcc = options.bcc;
      }

      // Add attachments if provided
      if (options.attachments && options.attachments.length > 0) {
        emailData.attachments = options.attachments;
      }

      const result = await this.resend.emails.send(emailData);
      
      if (result.error) {
        console.error(`Resend: Failed to send email to ${options.to}:`, result.error);
        return {
          success: false,
          error: result.error.message || 'Unknown error occurred while sending email',
        };
      }

      console.log(`Resend: Email sent successfully to ${options.to}. Message ID: ${result.data?.id}`);
      
      return {
        success: true,
        messageId: result.data?.id,
      };
    } catch (error: any) {
      console.error(`Resend: Failed to send email to ${options.to}:`, error);
      
      return {
        success: false,
        error: error.message || 'Unknown error occurred while sending email',
      };
    }
  }

  /**
   * Send bulk emails using Resend
   */
  async sendBulkEmails(emails: Array<EmailSendOptions>): Promise<BulkEmailResult> {
    const results: Array<{ success: boolean; messageId?: string; error?: string; to: string }> = [];
    
    try {
      // Send emails in batches to avoid rate limiting
      const batchSize = 10;
      const batches = [];
      
      for (let i = 0; i < emails.length; i += batchSize) {
        batches.push(emails.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const batchPromises = batch.map(async (email) => {
          const result = await this.sendEmail(email);
          return { ...result, to: email.to };
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Small delay between batches to respect rate limits
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const totalSent = results.filter(r => r.success).length;
      const totalFailed = results.filter(r => !r.success).length;

      console.log(`Resend: Bulk email sending completed: ${totalSent} sent, ${totalFailed} failed`);

      return {
        success: totalFailed === 0,
        results,
        totalSent,
        totalFailed,
      };
    } catch (error: any) {
      console.error('Resend: Bulk email sending failed:', error);
      
      return {
        success: false,
        results,
        totalSent: 0,
        totalFailed: emails.length,
      };
    }
  }

  /**
   * Test Resend API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Send a test email to Resend's test endpoint
      const result = await this.resend.emails.send({
        from: this.config.fromEmail,
        to: ['test@resend.dev'], // Resend's test email that accepts all emails
        subject: 'OpenLearn Email Service Test - Resend',
        html: '<p>This is a test email to verify Resend API connection.</p>',
      });

      if (result.error) {
        console.error('Resend: API test failed:', result.error);
        return {
          success: false,
          error: result.error.message || 'Resend API test failed',
        };
      }

      console.log('Resend: API connection test successful');
      return { success: true };
    } catch (error: any) {
      console.error('Resend: API connection test failed:', error);
      
      return {
        success: false,
        error: error.message || 'Resend API connection test failed',
      };
    }
  }

  /**
   * Close the connection (no-op for Resend as it uses HTTP API)
   */
  async close(): Promise<void> {
    console.log('Resend: Service closed (no persistent connection)');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<EmailProviderConfig>): void {
    if (newConfig.apiKey) {
      this.resend = new Resend(newConfig.apiKey);
      this.config.apiKey = newConfig.apiKey;
    }
    
    if (newConfig.fromEmail) {
      this.config.fromEmail = newConfig.fromEmail;
    }
    
    if (newConfig.fromName) {
      this.config.fromName = newConfig.fromName;
    }
  }

  /**
   * Get current configuration (without API key)
   */
  getConfig(): EmailProviderConfig {
    return {
      fromEmail: this.config.fromEmail,
      fromName: this.config.fromName,
      provider: this.config.provider,
      // Don't expose the API key
    };
  }
}

export default ResendProvider;
