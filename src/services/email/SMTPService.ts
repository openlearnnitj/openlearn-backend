import { Resend } from 'resend';
import { SMTPConfig } from '../../types';
import config from '../../config/environment';

/**
 * Resend Email Service for sending emails
 * Handles the actual email delivery using Resend API
 */
export class SMTPService {
  private resend: Resend;
  private emailConfig: {
    apiKey: string;
    fromEmail: string;
    fromName: string;
  };

  constructor(apiKey?: string) {
    const resendApiKey = apiKey || process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is required');
    }

    this.resend = new Resend(resendApiKey);
    this.emailConfig = {
      apiKey: resendApiKey,
      fromEmail: process.env.RESEND_FROM_EMAIL || '"OpenLearn Platform" <info@openlearn.org.in>',
      fromName: process.env.SMTP_FROM_NAME || 'OpenLearn Platform',
    };
  }

  /**
   * Send a single email using Resend API
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
      const emailData: any = {
        from: this.emailConfig.fromEmail,
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
        console.error(`Failed to send email to ${options.to}:`, result.error);
        return {
          success: false,
          error: result.error.message || 'Unknown error occurred while sending email',
        };
      }

      console.log(`Email sent successfully to ${options.to}. Message ID: ${result.data?.id}`);
      
      return {
        success: true,
        messageId: result.data?.id,
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
   * Test Resend API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Send a test email to verify the API key works
      const result = await this.resend.emails.send({
        from: this.emailConfig.fromEmail,
        to: ['test@resend.dev'], // Resend's test email that accepts all emails
        subject: 'OpenLearn Email Service Test',
        html: '<p>This is a test email to verify Resend API connection.</p>',
      });

      if (result.error) {
        console.error('Resend API test failed:', result.error);
        return {
          success: false,
          error: result.error.message || 'Resend API test failed',
        };
      }

      console.log('Resend API connection test successful');
      return { success: true };
    } catch (error: any) {
      console.error('Resend API connection test failed:', error);
      
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
    // No need to close anything for Resend API
    console.log('Resend service closed (no persistent connection)');
  }

  /**
   * Update email configuration
   */
  updateConfig(newConfig: { apiKey?: string; fromEmail?: string; fromName?: string }): void {
    if (newConfig.apiKey) {
      this.resend = new Resend(newConfig.apiKey);
      this.emailConfig.apiKey = newConfig.apiKey;
    }
    
    if (newConfig.fromEmail) {
      this.emailConfig.fromEmail = newConfig.fromEmail;
    }
    
    if (newConfig.fromName) {
      this.emailConfig.fromName = newConfig.fromName;
    }
  }

  /**
   * Get current email configuration (without API key)
   */
  getConfig(): { fromEmail: string; fromName: string; provider: string } {
    return {
      fromEmail: this.emailConfig.fromEmail,
      fromName: this.emailConfig.fromName,
      provider: 'Resend',
    };
  }

  /**
   * Send bulk emails (batch sending)
   */
  async sendBulkEmails(emails: Array<{
    to: string;
    subject: string;
    html?: string;
    text?: string;
  }>): Promise<{ 
    success: boolean; 
    results: Array<{ success: boolean; messageId?: string; error?: string; to: string }>;
    totalSent: number;
    totalFailed: number;
  }> {
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

      console.log(`Bulk email sending completed: ${totalSent} sent, ${totalFailed} failed`);

      return {
        success: totalFailed === 0,
        results,
        totalSent,
        totalFailed,
      };
    } catch (error: any) {
      console.error('Bulk email sending failed:', error);
      
      return {
        success: false,
        results,
        totalSent: 0,
        totalFailed: emails.length,
      };
    }
  }
}

export default SMTPService;
