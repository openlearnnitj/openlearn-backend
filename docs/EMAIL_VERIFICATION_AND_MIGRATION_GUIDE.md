# OpenLearn Email Verification & Migration Complete Guide

This document provides comprehensive instructions for testing and using the OpenLearn V2 email verification and migration system.

## Table of Contents
- [Quick Start](#quick-start)
- [Email Verification System](#email-verification-system)
- [Migration System](#migration-system)
- [Complete Workflows](#complete-workflows)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

## Quick Start

### Prerequisites
- OpenLearn backend running on `localhost:3000`
- Valid email address for testing
- `jq` installed for JSON parsing

### Test Scripts Available
```bash
# Direct email verification test (no migration)
./scripts/test-email-verification-direct.sh

# Complete flow: Registration → Migration → Email Verification
./scripts/test-email-flow.sh

# Quick migration test with existing user
./scripts/test-migration-quick.sh

# Manual OTP verification
./scripts/verify-otp.sh <OTP_CODE>
```

## Email Verification System

### Overview
The email verification system uses OTP (One-Time Password) sent via email to verify user email addresses. The system supports:
- 6-digit numeric OTP codes
- 15-minute expiration time
- Automatic cleanup of expired OTPs
- Rate limiting protection

### API Endpoints

#### 1. Send Verification OTP
**Endpoint:** `POST /api/auth/email-verification/send-verification-otp`
**Authentication:** Required (Bearer token)

```bash
curl -X POST "http://localhost:3000/api/auth/email-verification/send-verification-otp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Verification OTP sent successfully",
  "email": "us***@example.com"
}
```

**Response (Error):**
```json
{
  "error": "Failed to send verification OTP",
  "details": "Email already verified"
}
```

#### 2. Verify Email OTP
**Endpoint:** `POST /api/auth/email-verification/verify-email-otp`
**Authentication:** Required (Bearer token)

```bash
curl -X POST "http://localhost:3000/api/auth/email-verification/verify-email-otp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "otp": "123456"
  }'
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "emailVerified": true,
    "verifiedAt": "2025-08-18T10:57:32.000Z"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Invalid or expired OTP"
}
```

#### 3. Check Verification Status
**Endpoint:** `GET /api/auth/email-verification/verification-status`
**Authentication:** Required (Bearer token)

```bash
curl -X GET "http://localhost:3000/api/auth/email-verification/verification-status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "email": "us***@example.com",
  "emailVerified": false,
  "pendingOTP": true,
  "otpExpiresAt": "2025-08-18T11:12:32.000Z",
  "lastOTPSent": "2025-08-18T10:57:32.000Z"
}
```

### Email Verification Workflow

1. **User Registration**
   ```bash
   curl -X POST "http://localhost:3000/api/auth/signup" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "John Doe",
       "email": "john@example.com",
       "password": "SecurePass123!"
     }'
   ```

2. **Send OTP** (using token from registration)
   ```bash
   curl -X POST "http://localhost:3000/api/auth/email-verification/send-verification-otp" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer REGISTRATION_TOKEN"
   ```

3. **Check Email** - Look for 6-digit OTP code

4. **Verify OTP**
   ```bash
   curl -X POST "http://localhost:3000/api/auth/email-verification/verify-email-otp" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer REGISTRATION_TOKEN" \
     -d '{
       "otp": "854554"
     }'
   ```

## Migration System

### Overview
The migration system helps transition users from OpenLearn V1 to V2, adding enhanced profile data and OLID (OpenLearn ID) generation.

### API Endpoints

#### 1. Check Migration Status
**Endpoint:** `GET /api/migration/status`
**Authentication:** Required (Bearer token)

```bash
curl -X GET "http://localhost:3000/api/migration/status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "needsMigration": true,
    "isOldUser": true,
    "migratedToV2": null,
    "hasOLID": false,
    "emailVerified": false,
    "userSince": "2025-08-18T10:54:54.751Z"
  },
  "message": "User needs migration to V2"
}
```

#### 2. Migrate to V2
**Endpoint:** `POST /api/migration/migrate-to-v2`
**Authentication:** Required (Bearer token)

```bash
curl -X POST "http://localhost:3000/api/migration/migrate-to-v2" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "institute": "Indian Institute of Technology",
    "department": "Computer Science and Engineering",
    "graduationYear": 2025,
    "phoneNumber": "+91-9876543210",
    "studentId": "STUDENT001",
    "discordUsername": "user#1234",
    "portfolioUrl": "https://github.com/username"
  }'
```

**Required Fields:**
- `institute` (string): Educational institution name

**Optional Fields:**
- `department` (string): Academic department
- `graduationYear` (number): Expected graduation year
- `phoneNumber` (string): Contact number
- `studentId` (string): Student ID or roll number
- `discordUsername` (string): Discord username
- `portfolioUrl` (string): Portfolio/GitHub URL

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cmeh005cv0001g8tc6udzs500",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "PIONEER",
      "status": "PENDING",
      "institute": "Indian Institute of Technology",
      "department": "Computer Science and Engineering",
      "graduationYear": 2025,
      "phoneNumber": "+91-9876543210",
      "studentId": "STUDENT001",
      "discordUsername": "user#1234",
      "portfolioUrl": "https://github.com/username",
      "olid": "OL025000007",
      "migratedToV2": true,
      "emailVerified": true,
      "currentCohort": {
        "id": "cmegz3vo70001g8yjrhdud5at",
        "name": "Beta Testing Cohort"
      }
    },
    "migrationCompleted": true
  },
  "message": "Successfully migrated to V2! Welcome to the enhanced OpenLearn platform."
}
```

## Complete Workflows

### Workflow 1: New User Registration with Email Verification

```bash
# Step 1: Register new user
SIGNUP_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "SecurePass123!"
  }')

# Extract token
USER_TOKEN=$(echo $SIGNUP_RESPONSE | jq -r '.data.accessToken')

# Step 2: Check email verification status
curl -X GET "http://localhost:3000/api/auth/email-verification/verification-status" \
  -H "Authorization: Bearer $USER_TOKEN"

# Step 3: Send OTP email
curl -X POST "http://localhost:3000/api/auth/email-verification/send-verification-otp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN"

# Step 4: Verify OTP (after receiving email)
curl -X POST "http://localhost:3000/api/auth/email-verification/verify-email-otp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "otp": "YOUR_OTP_HERE"
  }'
```

### Workflow 2: Complete Registration → Migration → Email Verification

```bash
# Step 1: Register user
SIGNUP_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "email": "john.smith@university.edu",
    "password": "SecurePass123!"
  }')

USER_TOKEN=$(echo $SIGNUP_RESPONSE | jq -r '.data.accessToken')

# Step 2: Check migration status
curl -X GET "http://localhost:3000/api/migration/status" \
  -H "Authorization: Bearer $USER_TOKEN"

# Step 3: Perform migration
curl -X POST "http://localhost:3000/api/migration/migrate-to-v2" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "institute": "University of Technology",
    "department": "Computer Science",
    "graduationYear": 2025,
    "phoneNumber": "+1-555-123-4567",
    "studentId": "CS2025001",
    "discordUsername": "johnsmith#5678",
    "portfolioUrl": "https://github.com/johnsmith"
  }'

# Step 4: If email not auto-verified, send OTP
curl -X POST "http://localhost:3000/api/auth/email-verification/send-verification-otp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN"

# Step 5: Verify OTP
curl -X POST "http://localhost:3000/api/auth/email-verification/verify-email-otp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "otp": "YOUR_OTP_HERE"
  }'
```

### Workflow 3: Existing User Login and Migration

```bash
# Step 1: Login existing user
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "existing.user@openlearn.org.in",
    "password": "existingpassword"
  }')

USER_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')

# Step 2: Check if migration needed
MIGRATION_STATUS=$(curl -s -X GET "http://localhost:3000/api/migration/status" \
  -H "Authorization: Bearer $USER_TOKEN")

# Step 3: Migrate if needed
if echo "$MIGRATION_STATUS" | jq -e '.data.needsMigration' > /dev/null; then
  curl -X POST "http://localhost:3000/api/migration/migrate-to-v2" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_TOKEN" \
    -d '{
      "institute": "Your Institute Name",
      "department": "Your Department",
      "graduationYear": 2025
    }'
fi
```

## API Reference

### Authentication Headers
All protected endpoints require a Bearer token:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Content Type
For POST requests with JSON body:
```
Content-Type: application/json
```

### Base URL
All endpoints are relative to: `http://localhost:3000`

### Response Formats

#### Success Response
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully"
}
```

#### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details"
}
```

### Rate Limiting
- **General API**: 100 requests per 15 minutes
- **Authentication**: 10 requests per 15 minutes
- **Admin endpoints**: 30 requests per 15 minutes

Rate limit can be disabled for development:
```bash
# In .env file
RATE_LIMIT_SKIP_DEV=true
```

## Troubleshooting

### Common Issues

#### 1. "Route not found" errors
**Problem:** Using wrong endpoint URL
**Solution:** Verify endpoint paths:
- Email verification: `/api/auth/email-verification/*`
- Migration: `/api/migration/*`

#### 2. "Invalid or expired OTP"
**Problem:** OTP code incorrect or expired
**Solutions:**
- Check email for correct 6-digit code
- OTP expires in 15 minutes
- Request new OTP if expired

#### 3. "Email already verified"
**Problem:** Trying to send OTP to verified email
**Solution:** Check verification status first

#### 4. "User needs migration to V2"
**Problem:** User hasn't completed V2 migration
**Solution:** Complete migration before email verification

#### 5. Token expiration
**Problem:** "Unauthorized" or "Token expired"
**Solution:** 
- Access tokens expire in 15 minutes
- Use refresh token or re-login

### Debug Commands

#### Check server status
```bash
curl -s http://localhost:3000/health | jq .
```

#### Check rate limiting info
```bash
curl -s http://localhost:3000/rate-limit-info | jq .
```

#### Validate token
```bash
curl -s -X GET "http://localhost:3000/api/auth/profile" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq .
```

### Email Service Issues

#### Email not received
1. Check spam/junk folder
2. Verify email service is configured:
   ```bash
   curl -s http://localhost:3000/health/detailed | jq '.emailService'
   ```
3. Check server logs for email sending errors

#### OTP format
- Always 6 digits
- Numeric only (e.g., "123456")
- Case-sensitive (though numbers don't have case)

### Environment Variables

#### Required for email service
```bash
# SMTP Configuration
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=your_resend_api_key

# Email settings
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME="OpenLearn Platform"
```

#### Rate limiting
```bash
RATE_LIMIT_SKIP_DEV=false  # Set to true for testing
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_MAX=10
```

### Development Scripts

All test scripts are located in `scripts/` directory:

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Test email verification only
./scripts/test-email-verification-direct.sh

# Test full flow
./scripts/test-email-flow.sh

# Test migration only
./scripts/test-migration-quick.sh

# Verify OTP manually
./scripts/verify-otp.sh 123456
```

### Support

For additional support:
1. Check server logs in the terminal running the backend
2. Verify all environment variables are set
3. Ensure Docker services (PostgreSQL, Redis) are running
4. Test with curl commands directly before using scripts

---

**Last Updated:** August 18, 2025
**API Version:** V2
**Compatible with:** OpenLearn Backend V2.0+
