# OpenLearn Modular Email Service Documentation

## Overview

The OpenLearn platform now features a **modular email service** that allows seamless switching between different email providers (Resend and Amazon SES) using environment variables. This design provides flexibility to start with one provider and migrate to another without code changes.

## Architecture

```
┌─────────────────────┐
│   EmailService      │
│ (Main Orchestrator) │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│    SMTPService      │
│ (Compatibility      │
│     Layer)          │
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│ EmailProviderFactory│
│ (Provider Selector) │
└─────────┬───────────┘
          │
      ┌───▼───┐
      │       │
┌─────▼─┐   ┌─▼────────┐
│Resend │   │Amazon SES│
│Provider│   │ Provider │
└───────┘   └──────────┘
```

## Current Configuration

### Active Provider: Resend
The system is currently configured to use **Resend** as the email provider.

### Environment Variables
```bash
# Primary email provider selection
EMAIL_PROVIDER=resend

# Resend Configuration (Currently Active)
RESEND_API_KEY=your-resend-api-key
RESEND_FROM_EMAIL="OpenLearn Platform" <info@openlearn.org.in>
RESEND_FROM_NAME=OpenLearn Platform

# Amazon SES Configuration (Ready for Future Use)
SES_REGION=eu-north-1
SES_ACCESS_KEY_ID=your-aws-access-key-id
SES_SECRET_ACCESS_KEY=your-aws-secret-access-key
SES_FROM_EMAIL="OpenLearn Platform" <info@openlearn.org.in>
SES_FROM_NAME=OpenLearn Platform
```

## How to Use

### Using the Current System (No Changes Required)

The existing code continues to work without any modifications:

```typescript
import SMTPService from './services/email/SMTPService';

const smtpService = new SMTPService();

// Send email (same interface as before)
const result = await smtpService.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to OpenLearn',
  html: '<h1>Welcome!</h1>',
  text: 'Welcome!'
});
```

### Switching Providers

To switch from Resend to Amazon SES:

1. **Update Environment Variable**:
   ```bash
   EMAIL_PROVIDER=amazon_ses
   ```

2. **Ensure SES Configuration**:
   - Verify SES credentials are set
   - Confirm sender email is verified in AWS SES

3. **Restart Application**:
   ```bash
   npm run dev
   ```

## Provider Features

### Resend Provider
- ✅ **Easy Setup**: Simple API key configuration
- ✅ **Developer Friendly**: Great for development and testing
- ✅ **Built-in Templates**: Rich template system
- ✅ **Analytics**: Detailed email analytics
- ✅ **Test Mode**: Built-in test email endpoint

### Amazon SES Provider
- ✅ **Cost Effective**: Lower costs for high-volume sending
- ✅ **Enterprise Grade**: AWS infrastructure reliability
- ✅ **Advanced Features**: Bounce/complaint handling
- ✅ **Global Reach**: Multiple AWS regions
- ✅ **Integration**: Works with other AWS services

## Testing

### Test Current Provider
```bash
npm run test:email-providers
```

### Check Configuration
```bash
npm run test:ses  # For SES-specific testing when provider is set to amazon_ses
```

## Provider Configuration Validation

The system automatically validates required environment variables for each provider:

### Resend Requirements
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

### Amazon SES Requirements
- `SES_ACCESS_KEY_ID`
- `SES_SECRET_ACCESS_KEY`
- `SES_FROM_EMAIL`
- `SES_REGION`

## Migration Timeline

### Phase 1: Current State (Resend)
- ✅ **Status**: Active
- ✅ **Provider**: Resend
- ✅ **Configuration**: Complete
- ✅ **Testing**: Ready

### Phase 2: Amazon SES Preparation
- ⏳ **Status**: Ready for activation
- ⏳ **Provider**: Amazon SES
- ✅ **Configuration**: Pre-configured
- ✅ **Testing**: Available

### Phase 3: Migration (When Ready)
1. Update `EMAIL_PROVIDER=amazon_ses`
2. Verify SES sender domain
3. Request SES production access (if needed)
4. Restart application
5. Monitor email delivery

## Benefits of Modular Design

### 1. **Zero Code Changes**
- Switch providers by changing one environment variable
- Existing email sending code remains unchanged
- No deployment required for provider switches

### 2. **Backwards Compatibility**
- All existing SMTPService calls work identically
- Same return types and error handling
- Consistent API across providers

### 3. **Easy Testing**
- Test both providers independently
- Validate configurations before switching
- Rollback capability by changing environment variable

### 4. **Future Extensibility**
- Easy to add new providers (SMTP, SendGrid, etc.)
- Provider-specific optimizations
- A/B testing between providers

## Troubleshooting

### Common Issues

1. **"Provider not found" Error**
   - Check `EMAIL_PROVIDER` environment variable
   - Supported values: `resend`, `amazon_ses`

2. **"Missing configuration" Error**
   - Verify all required environment variables are set
   - Check for typos in variable names

3. **"API connection failed" Error**
   - Validate API keys/credentials
   - Check network connectivity
   - Verify sender email is verified (for SES)

### Debug Commands

```bash
# Check environment configuration
npm run test:email-providers

# Test specific provider
EMAIL_PROVIDER=resend npm run test:email-providers
EMAIL_PROVIDER=amazon_ses npm run test:email-providers

# Validate SES setup
npm run check:ses
```

## Developer Notes

### Adding New Providers

To add a new email provider:

1. Create provider class implementing `EmailProviderInterface`
2. Add provider to `EmailProvider` enum
3. Update `EmailProviderFactory`
4. Add configuration validation
5. Update documentation

### Provider Interface

```typescript
interface EmailProviderInterface {
  sendEmail(options: EmailSendOptions): Promise<EmailSendResult>;
  sendBulkEmails(emails: Array<EmailSendOptions>): Promise<BulkEmailResult>;
  testConnection(): Promise<{ success: boolean; error?: string }>;
  close(): Promise<void>;
  updateConfig(newConfig: Partial<EmailProviderConfig>): void;
  getConfig(): EmailProviderConfig;
}
```

## Support

### Resend Support
- [Resend Documentation](https://resend.com/docs)
- [Resend API Reference](https://resend.com/docs/api-reference)

### Amazon SES Support  
- [SES Developer Guide](https://docs.aws.amazon.com/ses/)
- [SES API Reference](https://docs.aws.amazon.com/ses/latest/APIReference/)

### OpenLearn Support
- Check logs: `docker compose logs -f openlearn-backend`
- Debug email: `npm run debug:email`
- Contact: Backend development team

---

*Last Updated: Current - Modular Email Service Implementation*
*Next Review: After production deployment and provider performance evaluation*
