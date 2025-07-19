import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';
import { SMTPService } from './SMTPService';

export interface PasswordResetOTPEmailData {
  userName: string;
  userEmail: string;
  otp: string;
  requestTime: string;
  expiryTime: string;
  expiryMinutes: number;
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
 * Service for sending OTP-based password reset emails
 * Handles template loading, compilation, and email sending
 */
export class PasswordResetOTPEmailService {
  
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
   * Send password reset OTP email
   */
  static async sendPasswordResetOTP(data: PasswordResetOTPEmailData): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> {
    try {
      // Load and compile template
      const htmlContent = await this.getCompiledTemplate('password-reset-otp', data);
      const textContent = this.generateTextContent(data);
      
      // Send email using SMTP service
      const smtpService = this.getSmtpService();
      const result = await smtpService.sendEmail({
        to: data.userEmail,
        subject: `Your OpenLearn Password Reset Code: ${data.otp}`,
        html: htmlContent,
        text: textContent
      });

      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error
      };
      
    } catch (error) {
      console.error('Password reset OTP email error:', error);
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
   * Generate plain text content for password reset OTP email
   */
  private static generateTextContent(data: PasswordResetOTPEmailData): string {
    return `
Hello ${data.userName},

We received a request to reset the password for your OpenLearn account associated with ${data.userEmail}.

Your verification code is: ${data.otp}

IMPORTANT: This verification code will expire in ${data.expiryMinutes} minutes for security reasons.

How to use this code:
1. Go to the password reset page on OpenLearn
2. Enter this 6-digit verification code: ${data.otp}
3. Create your new password
4. You're all set!

Security Notice:
- If you didn't request this password reset, you can safely ignore this email
- Never share this verification code with anyone
- OpenLearn staff will never ask for this code
- This code can only be used once
- If you enter the wrong code 5 times, you'll need to request a new one

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
   * Send test OTP email to verify template rendering
   */
  static async sendTestOTPEmail(recipientEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
      const testData: PasswordResetOTPEmailData = {
        userName: 'Test User',
        userEmail: recipientEmail,
        otp: '123456',
        requestTime: new Date().toLocaleString(),
        expiryTime: new Date(Date.now() + 10 * 60 * 1000).toLocaleString(),
        expiryMinutes: 10,
        ipAddress: '192.168.1.100'
      };

      const result = await this.sendPasswordResetOTP(testData);
      return { success: result.success, error: result.error };
      
    } catch (error) {
      console.error('Test OTP email error:', error);
      return { success: false, error: 'Failed to send test email' };
    }
  }

  /**
   * Send test success email to verify template rendering
   */
  static async sendTestSuccessEmail(recipientEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
      const testData: PasswordResetSuccessEmailData = {
        userName: 'Test User',
        userEmail: recipientEmail,
        loginUrl: 'https://openlearn.example.com/login',
        resetTime: new Date().toLocaleString(),
        ipAddress: '192.168.1.100'
      };

      const result = await this.sendPasswordResetSuccessEmail(testData);
      return { success: result.success, error: result.error };
      
    } catch (error) {
      console.error('Test success email error:', error);
      return { success: false, error: 'Failed to send test email' };
    }
  }
}
