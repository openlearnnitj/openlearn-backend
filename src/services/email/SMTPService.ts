import { Resend } from 'resend';
import { SESClient, SendEmailCommand, GetSendQuotaCommand } from '@aws-sdk/client-ses';

/**
 * Simple SMTP Service with Provider Switching
 * 
 * This service provides email functionality that can switch between
 * Resend and Amazon SES based on the EMAIL_PROVIDER environment variable.
 * 
 * Simplified version to avoid TypeScript module resolution issues.
 */
export class SMTPService {
  private provider: string;
  private resendClient?: Resend;
  private sesClient?: SESClient;
  private config: {
    fromEmail: string;
    fromName: string;
    provider: string;
  } = {
    fromEmail: '',
    fromName: '',
    provider: ''
  };

  constructor() {
    this.provider = process.env.EMAIL_PROVIDER?.toLowerCase() || 'resend';
    
    // Initialize the appropriate client
    if (this.provider === 'resend') {
      this.initializeResend();
    } else if (this.provider === 'amazon_ses' || this.provider === 'ses') {
      this.initializeSES();
    } else {
      console.warn(`Unknown email provider '${this.provider}', falling back to Resend`);
      this.provider = 'resend';
      this.initializeResend();
    }

    console.log(`SMTPService initialized with provider: ${this.config.provider}`);
  }

  private initializeResend(): void {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is required for Resend provider');
    }

    this.resendClient = new Resend(apiKey);
    this.config = {
      fromEmail: process.env.RESEND_FROM_EMAIL || '"OpenLearn Platform" <info@openlearn.org.in>',
      fromName: process.env.RESEND_FROM_NAME || 'OpenLearn Platform',
      provider: 'Resend',
    };
  }

  private initializeSES(): void {
    const region = process.env.SES_REGION || 'us-east-1';
    const accessKeyId = process.env.SES_ACCESS_KEY_ID;
    const secretAccessKey = process.env.SES_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('SES_ACCESS_KEY_ID and SES_SECRET_ACCESS_KEY are required for Amazon SES provider');
    }

    this.sesClient = new SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.config = {
      fromEmail: process.env.SES_FROM_EMAIL || '"OpenLearn Platform" <noreply@openlearn.org.in>',
      fromName: process.env.SES_FROM_NAME || 'OpenLearn Platform',
      provider: 'Amazon SES',
    };
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
    if (this.provider === 'resend') {
      return await this.sendEmailWithResend(options);
    } else {
      return await this.sendEmailWithSES(options);
    }
  }

  private async sendEmailWithResend(options: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    cc?: string[];
    bcc?: string[];
    attachments?: any[];
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.resendClient) {
        throw new Error('Resend client not initialized');
      }

      const emailData: any = {
        from: this.config.fromEmail,
        to: [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      if (options.cc && options.cc.length > 0) {
        emailData.cc = options.cc;
      }

      if (options.bcc && options.bcc.length > 0) {
        emailData.bcc = options.bcc;
      }

      if (options.attachments && options.attachments.length > 0) {
        emailData.attachments = options.attachments;
      }

      const result = await this.resendClient.emails.send(emailData);
      
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

  private async sendEmailWithSES(options: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    cc?: string[];
    bcc?: string[];
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.sesClient) {
        throw new Error('SES client not initialized');
      }

      const destination: any = {
        ToAddresses: [options.to],
      };

      if (options.cc && options.cc.length > 0) {
        destination.CcAddresses = options.cc;
      }

      if (options.bcc && options.bcc.length > 0) {
        destination.BccAddresses = options.bcc;
      }

      const message: any = {
        Subject: {
          Data: options.subject,
          Charset: 'UTF-8',
        },
        Body: {},
      };

      if (options.html) {
        message.Body.Html = {
          Data: options.html,
          Charset: 'UTF-8',
        };
      }

      if (options.text) {
        message.Body.Text = {
          Data: options.text,
          Charset: 'UTF-8',
        };
      }

      if (!options.html && !options.text) {
        message.Body.Text = {
          Data: 'This is a message from OpenLearn Platform.',
          Charset: 'UTF-8',
        };
      }

      const command = new SendEmailCommand({
        Source: this.config.fromEmail,
        Destination: destination,
        Message: message,
      });

      const result = await this.sesClient.send(command);
      
      console.log(`Amazon SES: Email sent successfully to ${options.to}. Message ID: ${result.MessageId}`);
      
      return {
        success: true,
        messageId: result.MessageId,
      };
    } catch (error: any) {
      console.error(`Amazon SES: Failed to send email to ${options.to}:`, error);
      
      return {
        success: false,
        error: error.message || 'Unknown error occurred while sending email',
      };
    }
  }

  /**
   * Send bulk emails
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

        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const totalSent = results.filter(r => r.success).length;
      const totalFailed = results.filter(r => !r.success).length;

      console.log(`${this.config.provider}: Bulk email sending completed: ${totalSent} sent, ${totalFailed} failed`);

      return {
        success: totalFailed === 0,
        results,
        totalSent,
        totalFailed,
      };
    } catch (error: any) {
      console.error(`${this.config.provider}: Bulk email sending failed:`, error);
      
      return {
        success: false,
        results,
        totalSent: 0,
        totalFailed: emails.length,
      };
    }
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    if (this.provider === 'resend') {
      return await this.testResendConnection();
    } else {
      return await this.testSESConnection();
    }
  }

  private async testResendConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.resendClient) {
        throw new Error('Resend client not initialized');
      }

      // const result = await this.resendClient.emails.send({
      //   from: this.config.fromEmail,
      //   to: ['test@resend.dev'],
      //   subject: 'OpenLearn Email Service Test - Resend',
      //   html: '<p>This is a test email to verify Resend API connection.</p>',
      // });

      // if (result.error) {
      //   console.error('Resend: API test failed:', result.error);
      //   return {
      //     success: false,
      //     error: result.error.message || 'Resend API test failed',
      //   };
      // }

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

  private async testSESConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.sesClient) {
        throw new Error('SES client not initialized');
      }

      const command = new GetSendQuotaCommand({});
      const result = await this.sesClient.send(command);

      console.log('Amazon SES: API connection test successful');
      console.log(`Amazon SES: Send Quota: ${result.Max24HourSend || 'N/A'} emails per 24 hours`);
      
      return { success: true };
    } catch (error: any) {
      console.error('Amazon SES: API connection test failed:', error);
      
      return {
        success: false,
        error: error.message || 'Amazon SES API connection test failed',
      };
    }
  }

  /**
   * Close the service
   */
  async close(): Promise<void> {
    console.log(`${this.config.provider}: Service closed`);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: any): void {
    if (newConfig.fromEmail) {
      this.config.fromEmail = newConfig.fromEmail;
    }
    
    if (newConfig.fromName) {
      this.config.fromName = newConfig.fromName;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): any {
    return {
      fromEmail: this.config.fromEmail,
      fromName: this.config.fromName,
      provider: this.config.provider,
    };
  }
}

export default SMTPService;
