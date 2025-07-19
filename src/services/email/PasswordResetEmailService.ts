import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';
import { SMTPService } from './SMTPService';

export interface PasswordResetEmailData {
  userName: string;
  userEmail: string;
  resetUrl: string;
  requestTime: string;
  expiryTime: string;
  ipAddress?: string;
}

export interface PasswordResetSuccessEmailData {
  userName: string;
  userEmail: string;
  loginUrl: string;
  resetTime: string;
  ipAddress?: string;
}

/**
 * Service for sending password reset related emails
 * Handles template loading, compilation, and email sending
 */
export class PasswordResetEmailService {
  
  private static templateCache = new Map<string, HandlebarsTemplateDelegate>();
  private static smtpService: SMTPService;

  /**
   * Initialize the SMTP service
   */
  private static getSmtpService(): SMTPService {
    if (!this.smtpService) {
      this.smtpService = new SMTPService();
    }
    return this.smtpService;
  }
  
  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(data: PasswordResetEmailData): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // Load and compile template
      const htmlContent = await this.getCompiledTemplate('password-reset', data);
      const textContent = this.generateTextContent(data);
      
      // Send email using SMTP service
      const smtpService = this.getSmtpService();
      const result = await smtpService.sendEmail({
        to: data.userEmail,
        subject: 'Reset Your OpenLearn Password',
        html: htmlContent,
        text: textContent
      });

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error
      };
      
    } catch (error) {
      console.error('Password reset email error:', error);
      return {
        success: false,
        error: 'Failed to send password reset email'
      };
    }
  }

  /**
   * Send password reset success confirmation email
   */
  static async sendPasswordResetSuccessEmail(data: PasswordResetSuccessEmailData): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // Load and compile template
      const htmlContent = await this.getCompiledTemplate('password-reset-success', data);
      const textContent = this.generateSuccessTextContent(data);
      
      // Send email using SMTP service
      const smtpService = this.getSmtpService();
      const result = await smtpService.sendEmail({
        to: data.userEmail,
        subject: 'Password Reset Successful - OpenLearn',
        html: htmlContent,
        text: textContent
      });

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error
      };
      
    } catch (error) {
      console.error('Password reset success email error:', error);
      return {
        success: false,
        error: 'Failed to send password reset confirmation email'
      };
    }
  }

  /**
   * Load and compile email template
   */
  private static async getCompiledTemplate(templateName: string, data: any): Promise<string> {
    try {
      // Check cache first
      const cacheKey = templateName;
      if (this.templateCache.has(cacheKey)) {
        const template = this.templateCache.get(cacheKey)!;
        return template(data);
      }

      // Load template file
      const templatePath = path.join(__dirname, '../../templates/email', `${templateName}.html`);
      const templateContent = await fs.readFile(templatePath, 'utf-8');
      
      // Compile template
      const template = handlebars.compile(templateContent);
      
      // Cache compiled template
      this.templateCache.set(cacheKey, template);
      
      // Render with data
      return template(data);
      
    } catch (error) {
      console.error(`Template loading error for ${templateName}:`, error);
      throw new Error(`Failed to load email template: ${templateName}`);
    }
  }

  /**
   * Generate plain text content for password reset email
   */
  private static generateTextContent(data: PasswordResetEmailData): string {
    return `
Hello ${data.userName},

We received a request to reset the password for your OpenLearn account associated with ${data.userEmail}.

If you requested this password reset, use the following link to create a new password:
${data.resetUrl}

IMPORTANT: This password reset link will expire in 1 hour for security reasons.

Security Notice:
- If you didn't request this password reset, you can safely ignore this email
- Your password won't be changed unless you click the link above and create a new one
- For your security, this link can only be used once
- Never share this reset link with anyone

Request Details:
• Requested at: ${data.requestTime}
• IP Address: ${data.ipAddress || 'Unknown'}
• Expires at: ${data.expiryTime}

This email was sent from OpenLearn Platform.
If you have any questions, please contact our support team.

This is an automated message. Please do not reply to this email.
    `.trim();
  }

  /**
   * Generate plain text content for password reset success email
   */
  private static generateSuccessTextContent(data: PasswordResetSuccessEmailData): string {
    return `
Hello ${data.userName},

Your password has been successfully reset for your OpenLearn account (${data.userEmail}).

You can now log in to your account using your new password at:
${data.loginUrl}

Reset completed at: ${data.resetTime}
IP Address: ${data.ipAddress || 'Unknown'}

Security Tips:
- Keep your password secure and don't share it with anyone
- Use a strong, unique password that you don't use elsewhere
- Consider enabling two-factor authentication if available
- If you didn't make this change, contact support immediately

If you experience any issues logging in with your new password, please contact our support team for assistance.

This email was sent from OpenLearn Platform.
If you have any questions, please contact our support team.

This is an automated message. Please do not reply to this email.
    `.trim();
  }

  /**
   * Clear template cache (useful for development/testing)
   */
  static clearTemplateCache(): void {
    this.templateCache.clear();
  }

  /**
   * Validate email data before sending
   */
  private static validateEmailData(data: PasswordResetEmailData | PasswordResetSuccessEmailData): boolean {
    if (!data.userName || !data.userEmail) {
      return false;
    }
    
    if ('resetUrl' in data && !data.resetUrl) {
      return false;
    }
    
    if ('loginUrl' in data && !data.loginUrl) {
      return false;
    }
    
    return true;
  }

  /**
   * Send test email to verify template rendering
   */
  static async sendTestEmail(
    templateType: 'password-reset' | 'password-reset-success',
    recipientEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const testData = templateType === 'password-reset' ? {
        userName: 'Test User',
        userEmail: recipientEmail,
        resetUrl: 'https://openlearn.example.com/reset-password?token=test-token-123',
        requestTime: new Date().toLocaleString(),
        expiryTime: new Date(Date.now() + 60 * 60 * 1000).toLocaleString(),
        ipAddress: '192.168.1.100'
      } : {
        userName: 'Test User',
        userEmail: recipientEmail,
        loginUrl: 'https://openlearn.example.com/login',
        resetTime: new Date().toLocaleString(),
        ipAddress: '192.168.1.100'
      };

      if (templateType === 'password-reset') {
        const result = await this.sendPasswordResetEmail(testData as PasswordResetEmailData);
        return { success: result.success, error: result.error };
      } else {
        const result = await this.sendPasswordResetSuccessEmail(testData as PasswordResetSuccessEmailData);
        return { success: result.success, error: result.error };
      }
      
    } catch (error) {
      console.error('Test email error:', error);
      return { success: false, error: 'Failed to send test email' };
    }
  }
}
