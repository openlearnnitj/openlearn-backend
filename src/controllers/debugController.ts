import { Request, Response } from 'express';
import { EmailProviderFactory } from '../services/email/EmailProviderFactory';
import { EmailProvider } from '../services/email/interfaces/EmailProviderInterface';

export class DebugController {
  /**
   * Test email provider creation
   */
  static async testEmailProvider(req: Request, res: Response) {
    try {
      const { provider } = req.body;
      
      if (!provider || !Object.values(EmailProvider).includes(provider)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid provider. Must be one of: ' + Object.values(EmailProvider).join(', ')
        });
      }

      const emailProvider = new EmailProviderFactory().createProvider(provider as EmailProvider);
      const config = emailProvider.getConfig();

      return res.json({
        success: true,
        data: {
          provider: config.provider,
          fromEmail: config.fromEmail,
          fromName: config.fromName
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Test email provider connection
   */
  static async testEmailConnection(req: Request, res: Response) {
    try {
      const emailProvider = EmailProviderFactory.createFromEnvironment();
      const connectionTest = await emailProvider.testConnection();

      return res.json({
        success: connectionTest.success,
        data: {
          provider: emailProvider.getConfig().provider,
          connectionSuccess: connectionTest.success,
          error: connectionTest.error
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Send test email
   */
  static async sendTestEmail(req: Request, res: Response) {
    try {
      const { to, subject, html, text } = req.body;

      if (!to || !subject) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: to, subject'
        });
      }

      const emailProvider = EmailProviderFactory.createFromEnvironment();
      const result = await emailProvider.sendEmail({
        to,
        subject,
        html: html || `<h1>${subject}</h1><p>Test email from OpenLearn Backend</p>`,
        text: text || `${subject}\n\nTest email from OpenLearn Backend`
      });

      return res.json({
        success: result.success,
        data: {
          provider: emailProvider.getConfig().provider,
          messageId: result.messageId,
          error: result.error
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
