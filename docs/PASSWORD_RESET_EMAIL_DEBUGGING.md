# 🔍 Password Reset Email Debugging Guide - Production Environment

## 🚨 **Issue**: Password reset emails not arriving to users

This guide will help you debug email delivery issues in the OpenLearn password reset flow.

---

## 🔧 **Quick Debugging Steps**

### 1. **Check Application Logs**

#### **View Recent Logs (Docker)**
```bash
# View container logs for the main app
docker logs openlearn-backend-app-1 --tail=100 -f

# View logs with timestamps
docker logs openlearn-backend-app-1 --timestamps --tail=100

# Search for email-related errors
docker logs openlearn-backend-app-1 --tail=1000 | grep -i "email\|smtp\|resend\|password"
```

#### **View Logs (PM2/Direct)**
```bash
# If using PM2
pm2 logs openlearn-backend --lines 100

# If running directly
tail -f /var/log/openlearn/app.log
journalctl -u openlearn-backend -f --lines=100
```

### 2. **Check Email Service Logs**

#### **Look for specific error patterns:**
```bash
# Search for email failures
grep -i "failed to send email\|resend.*error\|password reset.*error" /var/log/openlearn/*.log

# Check SMTP connection issues
grep -i "smtp\|resend.*api\|connection" /var/log/openlearn/*.log

# Look for template loading errors
grep -i "template.*error\|handlebars" /var/log/openlearn/*.log
```

### 3. **Test Email Service Directly**

#### **Check API endpoint:**
```bash
# Test the email test endpoint (admin required)
curl -X POST "https://your-domain.com/api/auth/password-reset/test-email" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "type": "otp"}'
```

---

## 🕵️ **Detailed Investigation Steps**

### **Step 1: Verify Environment Variables**

Check if all required email environment variables are set:

```bash
# Connect to your production server
ssh your-server

# Check environment variables
echo "RESEND_API_KEY: ${RESEND_API_KEY:0:10}..." 
echo "RESEND_FROM_EMAIL: $RESEND_FROM_EMAIL"
echo "SMTP_FROM_NAME: $SMTP_FROM_NAME"

# Or check in your .env file
cat /path/to/your/.env | grep -E "RESEND|SMTP|EMAIL"
```

**Required Variables:**
- `RESEND_API_KEY` - Your Resend API key
- `RESEND_FROM_EMAIL` - Sender email (e.g., "OpenLearn <noreply@openlearn.org.in>")
- `SMTP_FROM_NAME` - Sender name

### **Step 2: Check Resend Dashboard**

1. **Login to Resend Dashboard**: https://resend.com/dashboard
2. **Check Logs**: Look for recent email attempts
3. **Verify Domain**: Ensure your sending domain is verified
4. **Check API Usage**: Look for rate limits or quota issues

### **Step 3: Test Password Reset Flow**

#### **Enable Debug Logging**
Add this environment variable temporarily:
```bash
export DEBUG_EMAIL=true
export NODE_ENV=production
```

#### **Test with curl:**
```bash
# Request password reset
curl -X POST "https://your-domain.com/api/auth/password-reset/request" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Check the response and logs immediately after
```

### **Step 4: Common Issues & Solutions**

#### **🔴 Issue: "RESEND_API_KEY is required"**
```bash
# Solution: Set the API key
export RESEND_API_KEY="re_your_api_key_here"
# Then restart the application
```

#### **🔴 Issue: "From email domain not verified"**
- **Solution**: Verify your domain in Resend dashboard
- **Alternative**: Use a verified domain like `noreply@yourdomain.com`

#### **🔴 Issue: "Rate limit exceeded"**
- **Check**: Resend dashboard for rate limits
- **Solution**: Wait or upgrade plan

#### **🔴 Issue: "Template not found"**
```bash
# Check if template file exists
ls -la /path/to/openlearn/src/templates/email/
cat /path/to/openlearn/src/templates/email/password-reset-otp.html
```

---

## 📊 **Enhanced Logging Setup**

To get better visibility into email delivery, let's add enhanced logging:

### **Production Logging Configuration**

Create this file to enhance email logging:

\`\`\`typescript
// scripts/debug-email.ts
import { PasswordResetOTPEmailService } from '../src/services/email/PasswordResetOTPEmailService';

async function debugEmailFlow(email: string) {
  console.log('🔍 Starting email debug flow...');
  
  try {
    const testData = {
      userName: 'Test User',
      userEmail: email,
      otp: '123456',
      requestTime: new Date().toLocaleString(),
      expiryTime: new Date(Date.now() + 10 * 60 * 1000).toLocaleString(),
      expiryMinutes: 10,
      ipAddress: '127.0.0.1'
    };

    console.log('📧 Test data:', testData);
    
    const result = await PasswordResetOTPEmailService.sendPasswordResetOTP(testData);
    
    console.log('✅ Email result:', result);
    
    if (result.success) {
      console.log('🎉 Email sent successfully!');
      console.log('📝 Message ID:', result.messageId);
    } else {
      console.log('❌ Email failed:', result.error);
    }
    
  } catch (error) {
    console.error('💥 Debug flow error:', error);
  }
}

// Usage: npm run ts-node scripts/debug-email.ts
const email = process.argv[2] || 'test@example.com';
debugEmailFlow(email);
\`\`\`

Run this script:
```bash
npx ts-node scripts/debug-email.ts your-email@example.com
```

---

## 🛠️ **Immediate Fixes to Try**

### **1. Restart Email Service**
```bash
# If using Docker Compose
docker-compose restart app

# If using PM2
pm2 restart openlearn-backend

# If using systemd
sudo systemctl restart openlearn-backend
```

### **2. Check Network Connectivity**
```bash
# Test outbound HTTPS (Resend uses HTTPS)
curl -I https://api.resend.com

# Test DNS resolution
nslookup api.resend.com
```

### **3. Verify Resend API Key**
```bash
# Test API key manually
curl -X POST "https://api.resend.com/emails" \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "test@yourdomain.com",
    "to": ["test@resend.dev"],
    "subject": "Test",
    "html": "<p>Test email</p>"
  }'
```

### **4. Check Application Health**
```bash
# Check if the app is responding
curl -I https://your-domain.com/api/status

# Check specific password reset endpoint
curl -X POST "https://your-domain.com/api/auth/password-reset/request" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@test.com"}' \
  -v
```

---

## 🔍 **Log Analysis Patterns**

### **Look for these patterns in logs:**

#### **✅ Success Patterns:**
```
Email sent successfully to user@example.com. Message ID: abc123
Password reset OTP sent successfully
```

#### **❌ Error Patterns:**
```
Failed to send email to user@example.com: API key is invalid
Password reset OTP email error: 
Template loading error for password-reset-otp:
Resend API test failed:
```

#### **⚠️ Warning Patterns:**
```
Failed to send password reset OTP email: 
RESEND_API_KEY is required
From email domain not verified
```

---

## 📞 **Escalation Steps**

If the issue persists:

1. **Check Resend Status**: https://status.resend.com
2. **Review Resend Logs**: Dashboard → Logs → Filter by date/email
3. **Contact Support**: If API issues persist
4. **Fallback**: Consider implementing backup email provider

---

## 🎯 **Quick Resolution Checklist**

- [ ] ✅ Environment variables are set correctly
- [ ] ✅ Resend API key is valid and not expired
- [ ] ✅ From domain is verified in Resend
- [ ] ✅ Application logs show email attempts
- [ ] ✅ No rate limiting issues
- [ ] ✅ Template files exist and are readable
- [ ] ✅ Network connectivity to Resend API works
- [ ] ✅ Recent successful emails in Resend dashboard

**Most Common Issue**: Missing or incorrect `RESEND_API_KEY` environment variable.

**Quick Fix**: Set the correct API key and restart the application.
