import { SESClient, SendEmailCommand, GetSendQuotaCommand } from '@aws-sdk/client-ses';
import {
  EmailProviderInterface,
  EmailProviderConfig,
  EmailSendOptions,
  EmailSendResult,
  BulkEmailResult
} from '../interfaces/EmailProviderInterface';

/**
 * Amazon SES Email Provider Implementation
 * 
 * This class implements the EmailProviderInterface for Amazon SES service.
 * It handles all SES-specific logic and API interactions.
 */
export class AmazonSESProvider implements EmailProviderInterface {
  private sesClient: SESClient;
  private config: EmailProviderConfig;

  constructor(options?: {
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    fromEmail?: string;
    fromName?: string;
  }) {
    // Use provided options or environment variables
    const region = options?.region || process.env.SES_REGION || 'us-east-1';
    const accessKeyId = options?.accessKeyId || process.env.SES_ACCESS_KEY_ID;
    const secretAccessKey = options?.secretAccessKey || process.env.SES_SECRET_ACCESS_KEY;

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('SES_ACCESS_KEY_ID and SES_SECRET_ACCESS_KEY are required for Amazon SES provider');
    }

    // Initialize SES client
    this.sesClient = new SESClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    this.config = {
      fromEmail: options?.fromEmail || process.env.SES_FROM_EMAIL || '"OpenLearn Platform" <noreply@openlearn.org.in>',
      fromName: options?.fromName || process.env.SES_FROM_NAME || 'OpenLearn Platform',
      provider: 'Amazon SES',
      region,
      accessKeyId, // Store for config updates
      secretAccessKey, // Store for config updates
    };

    console.log(`Amazon SES Email Provider initialized for region: ${region}`);
  }

  /**
   * Send a single email using Amazon SES API
   */
  async sendEmail(options: EmailSendOptions): Promise<EmailSendResult> {
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
        Source: this.config.fromEmail,
        Destination: destination,
        Message: message,
      });

      // Send the email
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
   * Send bulk emails using Amazon SES
   */
  async sendBulkEmails(emails: Array<EmailSendOptions>): Promise<BulkEmailResult> {
    const results: Array<{ success: boolean; messageId?: string; error?: string; to: string }> = [];
    
    try {
      // Send emails in batches to avoid rate limiting
      const batchSize = 10; // SES has rate limits
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

        // Delay between batches to respect SES rate limits
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const totalSent = results.filter(r => r.success).length;
      const totalFailed = results.filter(r => !r.success).length;

      console.log(`Amazon SES: Bulk email sending completed: ${totalSent} sent, ${totalFailed} failed`);

      return {
        success: totalFailed === 0,
        results,
        totalSent,
        totalFailed,
      };
    } catch (error: any) {
      console.error('Amazon SES: Bulk email sending failed:', error);
      
      return {
        success: false,
        results,
        totalSent: 0,
        totalFailed: emails.length,
      };
    }
  }

  /**
   * Test Amazon SES API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Use GetSendQuota to verify the SES connection and credentials
      const command = new GetSendQuotaCommand({});
      const result = await this.sesClient.send(command);

      console.log('Amazon SES: API connection test successful');
      console.log(`Amazon SES: Send Quota: ${result.Max24HourSend || 'N/A'} emails per 24 hours`);
      console.log(`Amazon SES: Sent in last 24h: ${result.SentLast24Hours || 0}`);
      console.log(`Amazon SES: Send Rate: ${result.MaxSendRate || 'N/A'} emails per second`);
      
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
   * Close the connection (cleanup SES client)
   */
  async close(): Promise<void> {
    console.log('Amazon SES: Service closed');
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<EmailProviderConfig>): void {
    let needsClientReinit = false;

    if (newConfig.region && newConfig.region !== this.config.region) {
      this.config.region = newConfig.region;
      needsClientReinit = true;
    }

    if (newConfig.accessKeyId && newConfig.accessKeyId !== this.config.accessKeyId) {
      this.config.accessKeyId = newConfig.accessKeyId;
      needsClientReinit = true;
    }

    if (newConfig.secretAccessKey && newConfig.secretAccessKey !== this.config.secretAccessKey) {
      this.config.secretAccessKey = newConfig.secretAccessKey;
      needsClientReinit = true;
    }

    // Reinitialize SES client if credentials or region changed
    if (needsClientReinit) {
      this.sesClient = new SESClient({
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKeyId!,
          secretAccessKey: this.config.secretAccessKey!,
        },
      });
    }
    
    if (newConfig.fromEmail) {
      this.config.fromEmail = newConfig.fromEmail;
    }
    
    if (newConfig.fromName) {
      this.config.fromName = newConfig.fromName;
    }
  }

  /**
   * Get current configuration (without sensitive credentials)
   */
  getConfig(): EmailProviderConfig {
    return {
      fromEmail: this.config.fromEmail,
      fromName: this.config.fromName,
      provider: this.config.provider,
      region: this.config.region,
      // Don't expose credentials
    };
  }
}

export default AmazonSESProvider;
