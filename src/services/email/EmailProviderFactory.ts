import {
  EmailProviderInterface,
  EmailProvider,
  EmailProviderFactory as IEmailProviderFactory
} from './interfaces/EmailProviderInterface';
import ResendProvider from './providers/ResendProvider';
import AmazonSESProvider from './providers/AmazonSESProvider';
import MailtrapProvider from './providers/MailtrapProvider';

/**
 * Email Provider Factory
 * 
 * This factory creates the appropriate email provider based on configuration.
 * It centralizes provider creation logic and makes it easy to switch between providers.
 */
export class EmailProviderFactory implements IEmailProviderFactory {
  
  /**
   * Create an email provider based on the specified type
   */
  createProvider(provider: EmailProvider): EmailProviderInterface {
    switch (provider) {
      case EmailProvider.RESEND:
        return new ResendProvider();
        
      case EmailProvider.AMAZON_SES:
        return new AmazonSESProvider();
        
      case EmailProvider.MAILTRAP:
        return new MailtrapProvider();
        
      default:
        throw new Error(`Unsupported email provider: ${provider}`);
    }
  }

  /**
   * Create a provider based on environment configuration
   */
  static createFromEnvironment(): EmailProviderInterface {
    const rawProvider = process.env.EMAIL_PROVIDER;
    const providerName = rawProvider?.toLowerCase() || 'resend';
    
    // Only log once during initialization to avoid spam
    if (!EmailProviderFactory._initialized) {
      console.log(`[EmailProviderFactory] EMAIL_PROVIDER env: "${rawProvider}" -> using: "${providerName}"`);
      EmailProviderFactory._initialized = true;
    }
    
    switch (providerName) {
      case 'resend':
        return new ResendProvider();
        
      case 'amazon_ses':
      case 'ses':
        return new AmazonSESProvider();
        
      case 'mailtrap':
        return new MailtrapProvider();
        
      default:
        console.warn(`[EmailProviderFactory] Unknown email provider '${providerName}', falling back to Resend`);
        return new ResendProvider();
    }
  }

  private static _initialized = false;

  /**
   * Get available providers
   */
  static getAvailableProviders(): string[] {
    return Object.values(EmailProvider);
  }

  /**
   * Validate provider configuration
   */
  static validateProviderConfig(provider: EmailProvider): { valid: boolean; missing: string[] } {
    const missing: string[] = [];

    switch (provider) {
      case EmailProvider.RESEND:
        if (!process.env.RESEND_API_KEY) missing.push('RESEND_API_KEY');
        if (!process.env.RESEND_FROM_EMAIL) missing.push('RESEND_FROM_EMAIL');
        break;
        
      case EmailProvider.AMAZON_SES:
        if (!process.env.SES_ACCESS_KEY_ID) missing.push('SES_ACCESS_KEY_ID');
        if (!process.env.SES_SECRET_ACCESS_KEY) missing.push('SES_SECRET_ACCESS_KEY');
        if (!process.env.SES_FROM_EMAIL) missing.push('SES_FROM_EMAIL');
        if (!process.env.SES_REGION) missing.push('SES_REGION');
        break;
        
      case EmailProvider.MAILTRAP:
        if (!process.env.MAILTRAP_API_TOKEN) missing.push('MAILTRAP_API_TOKEN');
        if (!process.env.MAILTRAP_FROM_EMAIL) missing.push('MAILTRAP_FROM_EMAIL');
        break;
    }

    return {
      valid: missing.length === 0,
      missing
    };
  }
}

export default EmailProviderFactory;
