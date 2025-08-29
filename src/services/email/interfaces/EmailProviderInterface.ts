/**
 * Email Provider Interface
 * 
 * This interface defines the contract that all email providers must implement.
 * This allows the email service to work with different providers (Resend, Amazon SES, etc.)
 * without changing the core business logic.
 */

export interface EmailProviderConfig {
  fromEmail: string;
  fromName: string;
  provider: string;
  [key: string]: any; // Allow additional provider-specific config
}

export interface EmailSendOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  cc?: string[];
  bcc?: string[];
  attachments?: any[];
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BulkEmailResult {
  success: boolean;
  results: Array<{ success: boolean; messageId?: string; error?: string; to: string }>;
  totalSent: number;
  totalFailed: number;
}

export interface EmailProviderInterface {
  /**
   * Send a single email
   */
  sendEmail(options: EmailSendOptions): Promise<EmailSendResult>;

  /**
   * Send multiple emails in batch
   */
  sendBulkEmails(emails: Array<EmailSendOptions>): Promise<BulkEmailResult>;

  /**
   * Test the provider connection/configuration
   */
  testConnection(): Promise<{ success: boolean; error?: string }>;

  /**
   * Close/cleanup the provider
   */
  close(): Promise<void>;

  /**
   * Update provider configuration
   */
  updateConfig(newConfig: Partial<EmailProviderConfig>): void;

  /**
   * Get current provider configuration (without sensitive data)
   */
  getConfig(): EmailProviderConfig;
}

export enum EmailProvider {
  RESEND = 'resend',
  AMAZON_SES = 'amazon_ses',
  MAILTRAP = 'mailtrap',
  SMTP = 'smtp' // For future SMTP support
}

export interface EmailProviderFactory {
  createProvider(provider: EmailProvider): EmailProviderInterface;
}
