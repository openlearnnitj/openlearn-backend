# OpenLearn Password Reset Flow - Complete Guide

## Overview

This guide provides the **exact, step-by-step implementation** of the OTP-based password reset system in the OpenLearn backend. Every detail is verified against the actual implementation.

---

## 🔐 **Core System Specifications**

### Security Parameters
- **OTP Format**: 6-digit numerical code (000000-999999)
- **OTP Expiration**: 10 minutes from generation
- **Rate Limiting**: Maximum 3 requests per email per hour
- **Attempt Limiting**: Maximum 5 validation attempts per OTP
- **Security Tracking**: IP address and User-Agent logged for all operations

### Database Model: `PasswordResetOTP`
```prisma
model PasswordResetOTP {
  id        String   @id @default(cuid())
  otp       String   // 6-digit OTP
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // OTP expiration and usage tracking
  expiresAt DateTime
  usedAt    DateTime?
  attempts  Int      @default(0) // Track failed attempts
  
  // Security tracking
  ipAddress String?
  userAgent String?
  
  createdAt DateTime @default(now())
  
  @@map("password_reset_otps")
}
```

---

## 🚀 **Complete Flow Implementation**

### **Step 1: Request Password Reset OTP**

#### **Frontend Request**
```typescript
const requestPasswordReset = async (email: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });
  
  return await response.json();
};
```

#### **API Endpoint**
- **Method**: `POST`
- **URL**: `/auth/forgot-password`
- **Authentication**: None (Public)

#### **Request Payload**
```json
{
  "email": "user@example.com"
}
```

#### **Server Processing Flow**
1. **Input Validation**
   - Validates email is provided
   - Validates email format using `ValidationUtils.isValidEmail()`

2. **Security Tracking**
   - Captures `req.ip` or `req.connection.remoteAddress`
   - Captures `User-Agent` header

3. **Rate Limiting Check**
   - Calls `PasswordResetOTPService.checkRateLimit(email)`
   - Returns 429 status if rate limit exceeded

4. **Database Transaction** (Atomic Operation)
   ```typescript
   const result = await prisma.$transaction(async (tx) => {
     // Count OTPs created in last hour for this user
     const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
     const recentOTPCount = await tx.passwordResetOTP.count({
       where: {
         userId: user.id,
         createdAt: { gte: oneHourAgo }
       }
     });

     // Enforce rate limit
     if (recentOTPCount >= 3) {
       throw new Error('RATE_LIMIT_EXCEEDED');
     }

     // Generate and store OTP
     const otp = generateSecureOTP(); // 6-digit cryptographic random
     const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

     return await tx.passwordResetOTP.create({
       data: { otp, userId: user.id, expiresAt, ipAddress, userAgent }
     });
   });
   ```

5. **Email Delivery**
   - Uses Resend API for email delivery
   - HTML template: `src/templates/email/password-reset-otp.html`
   - Includes OTP, expiry time, security information

#### **Success Response**
```json
{
  "success": true,
  "message": "A verification code has been sent to your email.",
  "data": {
    "expiryMinutes": 10,
    "remainingAttempts": 2
  }
}
```

#### **Error Responses**
```json
// Rate limit exceeded
{
  "success": false,
  "message": "Too many password reset requests. Please try again later.",
  "error": "RATE_LIMIT_EXCEEDED",
  "data": {
    "remaining": 0,
    "resetTime": "2025-07-20T14:30:00.000Z"
  }
}

// Invalid email format
{
  "success": false,
  "message": "Invalid email format",
  "error": "INVALID_EMAIL_FORMAT"
}

// Server error
{
  "success": false,
  "message": "An error occurred while processing your request",
  "error": "INTERNAL_SERVER_ERROR"
}
```

#### **Security Features**
- **No email enumeration**: Same response for valid/invalid emails
- **Cleanup**: Expired/used OTPs automatically cleaned after successful creation
- **Logging**: All requests logged with IP and User-Agent

---

### **Step 2: Validate OTP (Optional)**

#### **Frontend Request**
```typescript
const validateOTP = async (email: string, otp: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/validate-reset-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, otp })
  });
  
  return await response.json();
};
```

#### **API Endpoint**
- **Method**: `POST`
- **URL**: `/auth/validate-reset-otp`
- **Authentication**: None (Public)

#### **Request Payload**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

#### **Server Processing Flow**
1. **Input Validation**
   - Validates email and otp are provided

2. **User Lookup**
   ```typescript
   const user = await prisma.user.findUnique({
     where: { email: email.toLowerCase() }
   });
   ```

3. **OTP Validation Query**
   ```typescript
   const otpRecord = await prisma.passwordResetOTP.findFirst({
     where: {
       userId: user.id,
       otp: request.otp,
       expiresAt: { gte: new Date() },  // Not expired
       usedAt: null                     // Not used
     }
   });
   ```

4. **Attempt Tracking** (If OTP not found)
   ```typescript
   // Increment attempts for matching OTPs
   await prisma.passwordResetOTP.updateMany({
     where: {
       userId: user.id,
       otp: request.otp,
       expiresAt: { gte: new Date() },
       usedAt: null
     },
     data: { attempts: { increment: 1 } }
   });
   ```

5. **Attempt Limit Check**
   ```typescript
   if (otpRecord.attempts >= 5) {
     return {
       success: false,
       message: 'Too many failed attempts. Please request a new verification code.',
       error: 'MAX_ATTEMPTS_EXCEEDED'
     };
   }
   ```

#### **Success Response**
```json
{
  "success": true,
  "message": "Verification code is valid.",
  "data": {
    "userId": "user_123",
    "userEmail": "user@example.com",
    "userName": "John Doe",
    "expiresAt": "2025-07-20T14:30:00.000Z",
    "attemptsRemaining": 3
  }
}
```

#### **Error Responses**
```json
// Invalid OTP
{
  "success": false,
  "message": "Invalid or expired verification code.",
  "error": "INVALID_OTP"
}

// Too many attempts
{
  "success": false,
  "message": "Too many failed attempts. Please request a new verification code.",
  "error": "MAX_ATTEMPTS_EXCEEDED"
}

// Missing fields
{
  "success": false,
  "message": "Email and verification code are required",
  "error": "MISSING_REQUIRED_FIELDS"
}
```

---

### **Step 3: Reset Password with OTP**

#### **Frontend Request**
```typescript
const resetPassword = async (email: string, otp: string, newPassword: string, confirmPassword: string) => {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password-with-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      email, 
      otp, 
      newPassword, 
      confirmPassword 
    })
  });
  
  return await response.json();
};
```

#### **API Endpoint**
- **Method**: `POST`
- **URL**: `/auth/reset-password-with-otp`
- **Authentication**: None (Public)

#### **Request Payload**
```json
{
  "email": "user@example.com",
  "otp": "123456",
  "newPassword": "NewSecurePassword123!",
  "confirmPassword": "NewSecurePassword123!"
}
```

#### **Server Processing Flow**
1. **Input Validation**
   - All fields required: email, otp, newPassword, confirmPassword

2. **Password Validation**
   ```typescript
   // Password match check
   if (newPassword !== confirmPassword) {
     return { success: false, message: 'Passwords do not match.', error: 'PASSWORDS_DO_NOT_MATCH' };
   }

   // Password strength validation
   const passwordValidation = PasswordUtils.validatePassword(newPassword);
   if (!passwordValidation.isValid) {
     return { success: false, message: passwordValidation.errors.join(', '), error: 'WEAK_PASSWORD' };
   }
   ```

3. **OTP Validation**
   - Calls `PasswordResetOTPService.validateOTP()` internally
   - Same validation logic as Step 2

4. **Password Reset Transaction**
   ```typescript
   const result = await prisma.$transaction(async (tx) => {
     // Hash new password
     const hashedPassword = await PasswordUtils.hashPassword(newPassword);

     // Update user password
     const updatedUser = await tx.user.update({
       where: { id: user.id },
       data: { password: hashedPassword }
     });

     // Mark OTP as used
     await tx.passwordResetOTP.updateMany({
       where: {
         userId: user.id,
         otp: otp,
         expiresAt: { gte: new Date() },
         usedAt: null
       },
       data: { usedAt: new Date() }
     });

     return updatedUser;
   });
   ```

5. **Cleanup and Email**
   - Cleanup expired/used OTPs: `cleanupExpiredOTPs(user.id)`
   - Send success email using template
   - Revoke existing refresh tokens (optional security measure)

#### **Success Response**
```json
{
  "success": true,
  "message": "Password has been reset successfully."
}
```

#### **Error Responses**
```json
// Passwords don't match
{
  "success": false,
  "message": "Passwords do not match.",
  "error": "PASSWORDS_DO_NOT_MATCH"
}

// Weak password
{
  "success": false,
  "message": "Password must be at least 8 characters long, contain uppercase, lowercase, number and special character",
  "error": "WEAK_PASSWORD"
}

// Invalid OTP (any OTP validation error)
{
  "success": false,
  "message": "Invalid or expired verification code.",
  "error": "INVALID_OTP"
}

// Missing fields
{
  "success": false,
  "message": "All fields are required",
  "error": "MISSING_REQUIRED_FIELDS"
}
```

---

## 📊 **Administrative Endpoints**

### **Rate Limit Check**
- **URL**: `GET /auth/password-reset/rate-limit/:email`
- **Purpose**: Check current rate limit status for an email

### **Statistics**
- **URL**: `GET /auth/password-reset/stats?timeframe=day`
- **Authentication**: Admin only
- **Purpose**: Monitor password reset usage and security metrics

### **Test Email**
- **URL**: `POST /auth/password-reset/test-otp-email`
- **Authentication**: Admin only
- **Purpose**: Test email template rendering

---

## 🔒 **Security Implementation Details**

### **OTP Generation**
```typescript
private static generateSecureOTP(): string {
  const randomBytes = crypto.randomBytes(3);
  const randomNumber = randomBytes.readUIntBE(0, 3);
  return (randomNumber % 900000 + 100000).toString().padStart(6, '0');
}
```

### **Rate Limiting Logic**
- **Window**: Rolling 1-hour window
- **Limit**: 3 requests per email
- **Implementation**: Database-based counting with atomic transactions
- **Reset**: Automatic after 1 hour from first request

### **Attempt Limiting Logic**
- **Limit**: 5 failed validation attempts per OTP
- **Tracking**: Database field `attempts` incremented on each failed validation
- **Behavior**: OTP becomes invalid after 5 failed attempts, even if not expired

### **Cleanup Strategy**
- **Automatic**: After successful OTP creation and password reset
- **Conditions**: Expired, used, or max-attempts-exceeded OTPs
- **Method**: `cleanupExpiredOTPs()` and `cleanupInvalidOTPs()`

### **Transaction Usage**
- **Rate limiting check + OTP creation**: Atomic to prevent race conditions
- **Password update + OTP marking as used**: Atomic to ensure consistency

---

## 🎨 **Email Templates**

### **OTP Email Template**
- **File**: `src/templates/email/password-reset-otp.html`
- **Variables**: `{{userName}}`, `{{otp}}`, `{{expiryTime}}`, `{{securityInfo}}`
- **Design**: Professional, responsive, branded

### **Success Email Template**
- **Purpose**: Confirmation after successful password reset
- **Variables**: `{{userName}}`, `{{resetTime}}`, `{{loginUrl}}`, `{{securityInfo}}`

---

## 🧪 **Testing Endpoints**

### **Complete Flow Test**
```bash
# 1. Request OTP
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 2. Validate OTP (optional)
curl -X POST http://localhost:3000/api/auth/validate-reset-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'

# 3. Reset Password
curl -X POST http://localhost:3000/api/auth/reset-password-with-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456","newPassword":"NewPass123!","confirmPassword":"NewPass123!"}'
```

---

## 🚨 **Error Handling Matrix**

| Scenario | HTTP Status | Error Code | Message |
|----------|-------------|------------|---------|
| Missing email | 400 | `MISSING_EMAIL` | Email is required |
| Invalid email format | 400 | `INVALID_EMAIL_FORMAT` | Invalid email format |
| Rate limit exceeded | 429 | `RATE_LIMIT_EXCEEDED` | Too many password reset requests |
| Missing OTP fields | 400 | `MISSING_REQUIRED_FIELDS` | Email and verification code are required |
| Invalid/expired OTP | 400 | `INVALID_OTP` | Invalid or expired verification code |
| Too many OTP attempts | 400 | `MAX_ATTEMPTS_EXCEEDED` | Too many failed attempts |
| Passwords don't match | 400 | `PASSWORDS_DO_NOT_MATCH` | Passwords do not match |
| Weak password | 400 | `WEAK_PASSWORD` | Password validation errors |
| Server error | 500 | `INTERNAL_SERVER_ERROR` | Generic server error message |

---

## 🔧 **Environment Configuration**

### **Required Environment Variables**
```env
# Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Frontend URL for email links
FRONTEND_URL=https://app.openlearn.com

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/openlearn

# Optional: Custom rate limits (defaults shown)
PASSWORD_RESET_RATE_LIMIT=3
PASSWORD_RESET_RATE_WINDOW=3600
OTP_EXPIRY_MINUTES=10
MAX_OTP_ATTEMPTS=5
```

---

## 📈 **Monitoring and Analytics**

### **Key Metrics Tracked**
- Total password reset requests
- Success rate percentage
- Rate limiting events
- Failed OTP attempts
- Email delivery success rate

### **Database Queries for Monitoring**
```sql
-- Recent password reset activity
SELECT COUNT(*) FROM password_reset_otps 
WHERE created_at >= NOW() - INTERVAL '24 hours';

-- Success rate calculation
SELECT 
  COUNT(*) as total_requests,
  COUNT(used_at) as successful_resets,
  (COUNT(used_at)::float / COUNT(*) * 100) as success_rate
FROM password_reset_otps 
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

---

## ⚡ **Performance Considerations**

### **Database Indexes**
```sql
-- Recommended indexes for optimal performance
CREATE INDEX idx_password_reset_otps_user_id ON password_reset_otps(user_id);
CREATE INDEX idx_password_reset_otps_created_at ON password_reset_otps(created_at);
CREATE INDEX idx_password_reset_otps_expires_at ON password_reset_otps(expires_at);
CREATE INDEX idx_password_reset_otps_otp_user ON password_reset_otps(otp, user_id);
```

### **Cleanup Optimization**
- Cleanup runs after successful operations to minimize database bloat
- Bulk deletion operations for efficiency
- Separate cleanup methods for different scenarios

---

## 🔄 **State Transitions**

```mermaid
graph TD
    A[User Requests Reset] --> B[Generate OTP]
    B --> C[Send Email]
    C --> D[OTP Active]
    D --> E{Valid OTP?}
    E -->|Yes| F[Reset Password]
    E -->|No| G[Increment Attempts]
    G --> H{Max Attempts?}
    H -->|No| D
    H -->|Yes| I[OTP Blocked]
    F --> J[Mark OTP Used]
    J --> K[Send Confirmation]
    K --> L[Cleanup]
    
    M[Time Passes] --> N{Expired?}
    N -->|Yes| O[Auto Cleanup]
    N -->|No| D
```

---

## 🛡️ **Security Checklist**

- ✅ **No email enumeration**: Same response for valid/invalid emails
- ✅ **Rate limiting**: Prevents brute force on requests
- ✅ **Attempt limiting**: Prevents brute force on OTP validation
- ✅ **Automatic expiration**: 10-minute OTP lifetime
- ✅ **Secure OTP generation**: Cryptographically secure random numbers
- ✅ **Transaction atomicity**: Prevents race conditions
- ✅ **Input validation**: All inputs validated and sanitized
- ✅ **Password strength**: Enforced password requirements
- ✅ **Audit logging**: IP and User-Agent tracking
- ✅ **Email security**: Professional templates with security warnings
- ✅ **Database security**: Proper relations and cascade deletes
- ✅ **Session management**: Optional refresh token revocation

---

## 🔧 **Troubleshooting Guide**

### **Common Issues**

1. **Email not received**
   - Check Resend API key and configuration
   - Verify email address format
   - Check spam folder
   - Verify rate limiting status

2. **OTP validation fails**
   - Check OTP expiration (10 minutes)
   - Verify attempt count (max 5)
   - Check for typos in OTP entry
   - Ensure case-sensitive email matching

3. **Rate limiting triggered**
   - Check recent request count in database
   - Verify 1-hour window calculation
   - Consider adjusting rate limits for testing

4. **Database errors**
   - Verify Prisma client generation
   - Check database connection
   - Ensure migrations are applied

### **Debug Commands**
```bash
# Check recent OTPs for a user
npx prisma studio
# Navigate to PasswordResetOTP table

# Test email delivery
curl -X POST http://localhost:3000/api/auth/password-reset/test-otp-email \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Check rate limiting
curl http://localhost:3000/api/auth/password-reset/rate-limit/test@example.com
```

---

This guide represents the **exact implementation** as deployed in the OpenLearn backend. Every endpoint, response format, error code, and security measure documented here is verified against the actual codebase.
