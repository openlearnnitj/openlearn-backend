# OpenLearn Email Service - Amazon SES Migration Guide

## Migration Overview

The OpenLearn platform has migrated from **Resend** to **Amazon SES (Simple Email Service)** for improved scalability, cost-effectiveness, and better integration with AWS ecosystem.

## Why Amazon SES?

### Benefits of Amazon SES
- ✅ **High Deliverability**: AWS's reputation and infrastructure
- ✅ **Cost-Effective**: Lower costs for high-volume email sending
- ✅ **Scalability**: Handle millions of emails with AWS infrastructure
- ✅ **Advanced Features**: Bounce/complaint handling, reputation tracking
- ✅ **AWS Integration**: Seamless integration with other AWS services
- ✅ **Real-time Statistics**: Detailed email sending metrics
- ✅ **Global Reach**: Multiple regions for optimal delivery

### Migration Benefits
- **Cost Reduction**: Approximately 60% lower costs for bulk emails
- **Better Analytics**: Built-in AWS CloudWatch metrics
- **Enterprise Features**: Advanced reputation management
- **Compliance**: Better GDPR and CAN-SPAM compliance tools

## Configuration Changes

### Environment Variables

**New SES Variables (Required):**
```bash
# Amazon SES Configuration
SES_REGION=us-east-1
SES_ACCESS_KEY_ID=your-aws-access-key-id
SES_SECRET_ACCESS_KEY=your-aws-secret-access-key
SES_FROM_EMAIL="OpenLearn Platform" <noreply@openlearn.org.in>
SES_FROM_NAME=OpenLearn Platform
```

**Legacy Resend Variables (Deprecated):**
```bash
# Legacy - Remove after migration
# RESEND_API_KEY=your-resend-api-key
# RESEND_FROM_EMAIL="OpenLearn Platform" <info@openlearn.org.in>
```

### AWS SES Setup Requirements

1. **AWS Account Setup**
   - Create AWS account or use existing
   - Set up IAM user with SES permissions
   - Generate access keys

2. **SES Configuration**
   - Verify sender email/domain
   - Request production access (remove sandbox)
   - Configure bounce/complaint handling
   - Set up SNS notifications (optional)

3. **Domain Verification**
   - Add TXT records to DNS
   - Verify domain ownership
   - Configure DKIM authentication

## Code Changes

### SMTPService Migration

The `SMTPService` class has been completely refactored:

**Before (Resend):**
```typescript
import { Resend } from 'resend';

export class SMTPService {
  private resend: Resend;
  
  constructor(apiKey?: string) {
    this.resend = new Resend(apiKey);
  }
}
```

**After (Amazon SES):**
```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

export class SMTPService {
  private sesClient: SESClient;
  
  constructor(options?: {
    region?: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  }) {
    this.sesClient = new SESClient({
      region: options?.region || process.env.SES_REGION,
      credentials: {
        accessKeyId: options?.accessKeyId || process.env.SES_ACCESS_KEY_ID,
        secretAccessKey: options?.secretAccessKey || process.env.SES_SECRET_ACCESS_KEY,
      },
    });
  }
}
```

### Email Sending Changes

**API Compatibility**: The email sending interface remains the same, ensuring no breaking changes to existing code:

```typescript
// This interface remains unchanged
const result = await smtpService.sendEmail({
  to: 'user@example.com',
  subject: 'Welcome to OpenLearn',
  html: '<h1>Welcome!</h1>',
  text: 'Welcome!',
  cc: ['admin@example.com'],
  bcc: ['monitoring@example.com']
});
```

## Testing the Migration

### Test Script Usage

A comprehensive test script has been created to verify SES functionality:

```bash
# Run SES email tests
npm run test:ses

# Production build test
npm run test:ses:prod
```

### Test Coverage

The test script verifies:
1. ✅ **HTML Email Sending**
2. ✅ **Plain Text Email Sending** 
3. ✅ **Mixed Content (HTML + Text)**
4. ✅ **CC Recipients**
5. ✅ **BCC Recipients**
6. ✅ **Connection Testing**
7. ✅ **Error Handling**
8. ✅ **Rate Limiting**

### Sample Test Output

```bash
🚀 Starting Amazon SES Email Tests
=====================================

✅ Environment variables validated
📧 From Email: "OpenLearn Platform" <noreply@openlearn.org.in>
🌍 Region: us-east-1

🔍 Testing SES connection...
✅ SES connection test successful

📤 Sending Test 1/6: Welcome Email (HTML)
   To: test@example.com
   ✅ Success - Message ID: 0000014a-f4d4-4f89-93c2-example (245ms)

📊 Test Results Summary
========================
✅ Successful: 6/6
❌ Failed: 0/6
⏱️  Average Duration: 180ms

🎉 All tests passed! Amazon SES integration is working correctly.
```

## Deployment Guide

### Development Environment

1. **Update Environment Variables**
   ```bash
   # Update .env file
   SES_REGION=us-east-1
   SES_ACCESS_KEY_ID=your-dev-access-key
   SES_SECRET_ACCESS_KEY=your-dev-secret-key
   SES_FROM_EMAIL="OpenLearn Dev" <dev@openlearn.org.in>
   ```

2. **Verify SES Sandbox**
   - Add test email addresses in AWS SES console
   - Verify recipient emails for sandbox testing

3. **Test the Integration**
   ```bash
   npm run test:ses
   ```

### Production Environment

1. **Request Production Access**
   - Submit AWS SES production access request
   - Provide business justification
   - Wait for approval (usually 24-48 hours)

2. **Update Production Environment**
   ```bash
   # Production environment variables
   SES_REGION=us-east-1
   SES_ACCESS_KEY_ID=your-prod-access-key
   SES_SECRET_ACCESS_KEY=your-prod-secret-key
   SES_FROM_EMAIL="OpenLearn Platform" <noreply@openlearn.org.in>
   ```

3. **Domain Configuration**
   - Verify sender domain
   - Configure DKIM signing
   - Set up bounce/complaint handling

## Monitoring and Analytics

### CloudWatch Metrics

Amazon SES automatically provides metrics in CloudWatch:

- **Send**: Number of emails sent
- **Bounce**: Number of bounced emails
- **Complaint**: Number of spam complaints
- **Delivery**: Successful deliveries
- **Reputation**: Sender reputation metrics

### Custom Monitoring

The existing OpenLearn monitoring continues to work:

```typescript
// Existing audit logging remains unchanged
await auditService.logAction({
  action: 'EMAIL_SENT',
  userId: user.id,
  details: {
    recipient: email.to,
    subject: email.subject,
    provider: 'Amazon SES',
    messageId: result.messageId
  }
});
```

## Troubleshooting

### Common Issues

1. **"Email address not verified" Error**
   - **Cause**: SES sandbox mode requires verified recipients
   - **Solution**: Verify email addresses in SES console or request production access

2. **"Access Denied" Error**
   - **Cause**: Insufficient IAM permissions
   - **Solution**: Ensure IAM user has `ses:SendEmail` permission

3. **"Invalid AWS credentials" Error**
   - **Cause**: Incorrect access keys
   - **Solution**: Verify access key ID and secret access key

4. **"Rate limit exceeded" Error**
   - **Cause**: Sending too many emails too quickly
   - **Solution**: Implement delays between emails or request rate limit increase

### SES Limits

**Sandbox Mode:**
- 200 emails per 24-hour period
- 1 email per second
- Only verified recipients

**Production Mode:**
- Custom limits (request based on needs)
- Higher sending rates
- Any verified sender to any recipient

### Debug Commands

```bash
# Test SES connection
npm run test:ses

# Check email worker status
npm run worker:email

# View email service logs
docker compose logs -f openlearn-backend

# Debug production email
npm run debug:email:prod
```

## Security Considerations

### AWS IAM Best Practices

1. **Minimal Permissions**: Grant only `ses:SendEmail` and required actions
2. **Access Key Rotation**: Regularly rotate AWS access keys
3. **Environment Isolation**: Use different AWS accounts for dev/prod
4. **Monitoring**: Enable CloudTrail logging for SES API calls

### Email Security

1. **DKIM Signing**: Always enable DKIM for domain authentication
2. **SPF Records**: Configure SPF records for sender verification
3. **DMARC Policy**: Implement DMARC for email authentication
4. **Bounce Handling**: Configure automatic bounce/complaint handling

## Migration Checklist

### Pre-Migration
- [ ] AWS account setup completed
- [ ] SES service configured in target region
- [ ] Sender domain/email verified
- [ ] IAM user created with appropriate permissions
- [ ] Environment variables updated
- [ ] Dependencies installed (`@aws-sdk/client-ses`)

### Migration
- [ ] Code changes deployed
- [ ] Test script executed successfully
- [ ] Integration tests passed
- [ ] Email functionality verified

### Post-Migration
- [ ] Production SES access requested (if needed)
- [ ] CloudWatch monitoring configured
- [ ] Bounce/complaint handling setup
- [ ] Documentation updated
- [ ] Team trained on new system
- [ ] Legacy Resend service deprecated

## Support and Resources

### AWS Documentation
- [Amazon SES Developer Guide](https://docs.aws.amazon.com/ses/)
- [SES API Reference](https://docs.aws.amazon.com/ses/latest/APIReference/)
- [CloudWatch SES Metrics](https://docs.aws.amazon.com/ses/latest/DeveloperGuide/monitor-usage.html)

### OpenLearn Resources
- [Email Service Flow Documentation](./EMAIL_SERVICE_FLOW.md)
- [Email Service Quick Reference](./EMAIL_SERVICE_QUICK_REFERENCE.md)
- [V2 Migration Documentation](./V2_MIGRATION_IMPLEMENTATION.md)

### Emergency Contacts
- **AWS Support**: Available through AWS Support Center
- **OpenLearn DevOps**: Internal team contact
- **Email Service Owner**: Lead Backend Developer

---

*Last Updated: Current Migration - Amazon SES Integration*
*Next Review: After production deployment and 30-day monitoring period*
