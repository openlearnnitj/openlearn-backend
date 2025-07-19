# 🚨 Immediate Production Email Debug Guide

## **Issue**: Password reset emails not being delivered to users

This is a **step-by-step immediate debugging guide** for your production environment.

---

## 🔧 **STEP 1: Run the Enhanced Debug Script**

First, let's test the email service directly in production:

```bash
# 1. Navigate to your project
cd /home/rishi/git/openlearn-backend

# 2. Run the debug script with a test email
npm run debug-email-production your-test-email@gmail.com

# Or run directly with node/ts-node
npx ts-node src/scripts/debugEmailProduction.ts your-test-email@gmail.com
```

**What this will check:**
- ✅ Environment variables (RESEND_API_KEY, RESEND_FROM_EMAIL)
- ✅ Resend API connectivity
- ✅ Template loading
- ✅ Actual email sending

---

## 🔧 **STEP 2: Check Production Logs**

### **If using Docker:**
```bash
# Check recent logs
docker logs openlearn-backend-app-1 --tail=100 --timestamps

# Monitor logs in real-time for email attempts
docker logs openlearn-backend-app-1 -f | grep -i "email\|resend\|password\|otp"

# Check for specific errors
docker logs openlearn-backend-app-1 --tail=500 | grep -i "error\|failed\|timeout"
```

### **If using PM2:**
```bash
# Check PM2 logs
pm2 logs openlearn-backend --lines 100

# Monitor real-time
pm2 logs openlearn-backend -f | grep -i "email\|resend"
```

### **If using systemd:**
```bash
# Check systemd logs
journalctl -u openlearn-backend --lines=100 --no-pager

# Monitor real-time
journalctl -u openlearn-backend -f | grep -i "email\|resend"
```

---

## 🔧 **STEP 3: Check Resend Dashboard**

1. **Login to Resend Dashboard**: https://resend.com/dashboard
2. **Go to "Logs" section**
3. **Check recent email attempts**
4. **Look for:**
   - ✅ Emails being sent successfully
   - ❌ Failed deliveries
   - ⚠️ Bounced emails
   - ⏱️ Queued emails

---

## 🔧 **STEP 4: Environment Variables Check**

**Check if these are set correctly in production:**

```bash
# Check environment variables
echo "RESEND_API_KEY: ${RESEND_API_KEY:0:10}..."
echo "RESEND_FROM_EMAIL: $RESEND_FROM_EMAIL"
echo "SMTP_FROM_NAME: $SMTP_FROM_NAME"
echo "NODE_ENV: $NODE_ENV"
```

**Expected values:**
- `RESEND_API_KEY`: Should start with `re_` and be ~24 characters
- `RESEND_FROM_EMAIL`: Should be a verified email/domain in Resend
- `SMTP_FROM_NAME`: Human-readable sender name

---

## 🔧 **STEP 5: Test Password Reset Flow**

**Test the actual password reset endpoint:**

```bash
# Test OTP request endpoint
curl -X POST https://your-domain.com/api/auth/password-reset/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email": "your-test-email@gmail.com"}'

# Expected response:
# {"success": true, "message": "Password reset OTP sent successfully"}
```

---

## 🔧 **STEP 6: Common Issues & Fixes**

### **Issue 1: Template Not Found**
**Symptoms:** Logs show "Template loading error"
**Solution:**
```bash
# Check if template exists
ls -la src/templates/email/password-reset-otp.html

# If missing, recreate it:
mkdir -p src/templates/email
# Then copy the template content from the repository
```

### **Issue 2: Resend API Key Invalid**
**Symptoms:** "401 Unauthorized" or "API key invalid"
**Solution:**
1. Go to Resend Dashboard > API Keys
2. Create a new API key
3. Update your production environment variables
4. Restart the application

### **Issue 3: Domain Not Verified**
**Symptoms:** "Domain not verified" in Resend logs
**Solution:**
1. Go to Resend Dashboard > Domains
2. Verify your sending domain
3. Update DNS records as required

### **Issue 4: Rate Limiting**
**Symptoms:** "Rate limit exceeded" in logs
**Solution:**
1. Check Resend dashboard for rate limits
2. Implement proper retry logic
3. Consider upgrading Resend plan

---

## 🔧 **STEP 7: Manual Email Test**

**Create a quick test script:**

```bash
# Create test file
cat > test-email-manual.js << 'EOF'
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  try {
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'info@openlearn.org.in',
      to: ['your-test-email@gmail.com'],
      subject: 'Test Email from OpenLearn Production',
      html: '<h1>Test Email</h1><p>If you receive this, email service is working!</p>',
      text: 'Test Email - If you receive this, email service is working!'
    });
    
    console.log('✅ Email sent successfully:', result);
  } catch (error) {
    console.error('❌ Email failed:', error);
  }
}

testEmail();
EOF

# Run the test
node test-email-manual.js
```

---

## 🔧 **STEP 8: Check Network & Firewall**

```bash
# Test internet connectivity
ping -c 3 resend.com

# Test API connectivity
curl -I https://api.resend.com/

# Check if port 443 is accessible
nc -zv api.resend.com 443
```

---

## 📊 **STEP 9: Check Application Health**

```bash
# Check if the application is running
ps aux | grep node
# or
docker ps | grep openlearn

# Check memory usage
free -h

# Check disk space
df -h

# Check if the application responds
curl -I http://localhost:3000/health
# or your configured port/domain
```

---

## 🚨 **Quick Fixes to Try**

### **1. Restart the Application**
```bash
# Docker
docker restart openlearn-backend-app-1

# PM2
pm2 restart openlearn-backend

# systemd
sudo systemctl restart openlearn-backend
```

### **2. Clear Template Cache**
**Add this to your service temporarily:**
```javascript
// In PasswordResetOTPEmailService.ts
static clearTemplateCache() {
  this.templateCache.clear();
  console.log('Template cache cleared');
}
```

### **3. Check Template Path**
**Verify the template path is correct:**
```bash
# Check current working directory when app runs
pwd

# Verify template path
ls -la src/templates/email/
```

---

## 📋 **Debug Checklist**

- [ ] Run debug script with test email
- [ ] Check production logs for errors
- [ ] Verify Resend dashboard shows attempts
- [ ] Confirm environment variables are set
- [ ] Test password reset endpoint directly
- [ ] Check if template file exists
- [ ] Verify Resend API key validity
- [ ] Check domain verification in Resend
- [ ] Test manual email sending
- [ ] Check network connectivity
- [ ] Verify application is running properly

---

## 📞 **Need More Help?**

**If the issue persists after following this guide:**

1. **Share the output** of the debug script
2. **Share any error logs** found
3. **Share the response** from Resend dashboard
4. **Confirm your production setup** (Docker/PM2/systemd)

This will help identify the exact root cause of the email delivery issue.
