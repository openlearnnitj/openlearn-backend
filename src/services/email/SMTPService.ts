import { SESClient, SendEmailCommand, GetSendQuotaCommand } from '@aws-sdk/client-ses';
import { SMTPConfig } from '../../types';
import config from '../../config/environment';

/**
 * Amazon SES Email Service for sending emails
 * Handles the actual email delivery using AWS SES API
 */
export class SMTPService {
  private sesClient: SESClient;
  private emailConfig: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    fromEmail: string;
    fromName: string;
  };

  constructor(options?: {
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  }) {
    // Use provided options or environment variables
    const region = options?.region || process.env.SES_REGION || 'us-east-1';
    const accessKeyId = options?.accessKeyId || process.env.SES_ACCESS_KEY_ID;
    const secretAccessKey = options?.secretAccessKey || process.env.SES_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('SES_ACCESS_KEY_ID and SES_SECRET_ACCESS_KEY are required');
    }

    // Initialize SES client
    this.sesClient = new SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.emailConfig = {
      region,
      accessKeyId,
      secretAccessKey,
      fromEmail: process.env.SES_FROM_EMAIL || '"OpenLearn Platform" <noreply@openlearn.org.in>',
      fromName: process.env.SES_FROM_NAME || 'OpenLearn Platform',
    };

    console.log(`SES Email Service initialized for region: ${region}`);
  }

  /**
   * Send a single email using Amazon SES API
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
      // Build the destination list
      const destination: any = {
        ToAddresses: [options.to],
      };

      // Add CC if provided
      if (options.cc && options.cc.length > 0) {
        destination.CcAddresses = options.cc;
      }

      // Add BCC if provided
      if (options.bcc && options.bcc.length > 0) {
        destination.BccAddresses = options.bcc;
      }

      // Create the email message
      const message: any = {
        Subject: {
          Data: options.subject,
          Charset: 'UTF-8',
        },
        Body: {},
      };

      // Add HTML content if provided
      if (options.html) {
        message.Body.Html = {
          Data: options.html,
          Charset: 'UTF-8',
        };
      }

      // Add text content if provided
      if (options.text) {
        message.Body.Text = {
          Data: options.text,
          Charset: 'UTF-8',
        };
      }

      // If no content provided, add default text
      if (!options.html && !options.text) {
        message.Body.Text = {
          Data: 'This is a message from OpenLearn Platform.',
          Charset: 'UTF-8',
        };
      }

      // Create the SES command
      const command = new SendEmailCommand({
        Source: this.emailConfig.fromEmail,
        Destination: destination,
        Message: message,
      });

      // Send the email
      const result = await this.sesClient.send(command);
      
      console.log(`Email sent successfully to ${options.to}. Message ID: ${result.MessageId}`);
      
      return {
        success: true,
        messageId: result.MessageId,
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
   * Test Amazon SES API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Instead of sending a test email (which requires verified recipients),
      // we'll use GetSendQuota to verify the SES connection and credentials
      const command = new GetSendQuotaCommand({});
      const result = await this.sesClient.send(command);

      console.log('Amazon SES API connection test successful');
      console.log(`Send Quota: ${result.Max24HourSend || 'N/A'} emails per 24 hours`);
      console.log(`Sent in last 24h: ${result.SentLast24Hours || 0}`);
      console.log(`Send Rate: ${result.MaxSendRate || 'N/A'} emails per second`);
      
      return { success: true };
    } catch (error: any) {
      console.error('Amazon SES API connection test failed:', error);
      
      return {
        success: false,
        error: error.message || 'Amazon SES API connection test failed',
      };
    }
  }

  /**
   * Close the connection (cleanup SES client)
   */
  async close(): Promise<void> {
    // SES client doesn't require explicit closing, but we can destroy it
    console.log('Amazon SES service closed');
  }

  /**
   * Update email configuration
   */
  updateConfig(newConfig: { 
    region?: string;
    accessKeyId?: string; 
    secretAccessKey?: string;
    fromEmail?: string; 
    fromName?: string;
  }): void {
    let needsClientReinit = false;

    if (newConfig.region && newConfig.region !== this.emailConfig.region) {
      this.emailConfig.region = newConfig.region;
      needsClientReinit = true;
    }

    if (newConfig.accessKeyId && newConfig.accessKeyId !== this.emailConfig.accessKeyId) {
      this.emailConfig.accessKeyId = newConfig.accessKeyId;
      needsClientReinit = true;
    }

    if (newConfig.secretAccessKey && newConfig.secretAccessKey !== this.emailConfig.secretAccessKey) {
      this.emailConfig.secretAccessKey = newConfig.secretAccessKey;
      needsClientReinit = true;
    }

    // Reinitialize SES client if credentials or region changed
    if (needsClientReinit) {
      this.sesClient = new SESClient({
        region: this.emailConfig.region,
        credentials: {
          accessKeyId: this.emailConfig.accessKeyId,
          secretAccessKey: this.emailConfig.secretAccessKey,
        },
      });
    }
    
    if (newConfig.fromEmail) {
      this.emailConfig.fromEmail = newConfig.fromEmail;
    }
    
    if (newConfig.fromName) {
      this.emailConfig.fromName = newConfig.fromName;
    }
  }

  /**
   * Get current email configuration (without sensitive credentials)
   */
  getConfig(): { 
    fromEmail: string; 
    fromName: string; 
    provider: string;
    region: string;
  } {
    return {
      fromEmail: this.emailConfig.fromEmail,
      fromName: this.emailConfig.fromName,
      provider: 'Amazon SES',
      region: this.emailConfig.region,
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
