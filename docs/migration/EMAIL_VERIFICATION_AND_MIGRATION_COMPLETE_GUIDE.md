# Email Verification and Migration Complete Guide

## Overview

This guide provides the complete workflow for user migration to V2 and email verification in the OpenLearn backend. It includes all correct endpoints, curl commands, and troubleshooting steps.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [User Registration Flow](#user-registration-flow)
3. [Migration to V2 Flow](#migration-to-v2-flow)
4. [Email Verification Flow](#email-verification-flow)
5. [Complete Workflows](#complete-workflows)
6. [Automated Testing Scripts](#automated-testing-scripts)
7. [Troubleshooting](#troubleshooting)
8. [Environment Setup](#environment-setup)

## Prerequisites

### Development Environment
```bash
# Start the development environment
npm run dev:docker

# Run database migrations
npx prisma migrate dev

# Seed the database with test data
npm run seed:dev
```

### Environment Variables
Ensure your `.env` file contains:
```env
# Email Service (Resend)
RESEND_API_KEY=your_resend_api_key

# Database
DATABASE_URL=postgresql://openlearn_user:openlearn_pass@localhost:5432/openlearn_db

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=openlearn_redis_pass

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
```

## User Registration Flow

### 1. User Signup

**Endpoint:** `POST /api/auth/signup`

**Request:**
```bash
curl -X POST "http://localhost:3000/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rishi Test",
    "email": "rishi.test@nitj.ac.in",
    "password": "RishiTest123!"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "user_id_here",
      "name": "Rishi Test",
      "email": "rishi.test@nitj.ac.in",
      "emailVerified": false,
      "role": "PIONEER",
      "isV2User": false
    },
    "accessToken": "jwt_token_here",
    "refreshToken": "refresh_token_here"
  }
}
```

### 2. User Login

**Endpoint:** `POST /api/auth/login`

**Request:**
```bash
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "rishi.test@nitj.ac.in",
    "password": "RishiTest123!"
  }'
```

## Migration to V2 Flow

### 1. Check Migration Status

**Endpoint:** `GET /api/migration/status`

**Request:**
```bash
curl -X GET "http://localhost:3000/api/migration/status" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "isV2User": false,
    "requiresMigration": true,
    "migrationEligible": true
  }
}
```

### 2. Perform Migration to V2

**Endpoint:** `POST /api/migration/migrate-to-v2`

**Request:**
```bash
curl -X POST "http://localhost:3000/api/migration/migrate-to-v2" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "institute": "National Institute of Technology Jalandhar",
    "department": "Computer Science and Engineering",
    "graduationYear": 2025,
    "phoneNumber": "+91-9876543210",
    "studentId": "RISHI001",
    "discordUsername": "rishi#1234",
    "portfolioUrl": "https://github.com/rishi"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully migrated to V2",
  "data": {
    "user": {
      "id": "user_id_here",
      "isV2User": true,
      "emailVerified": false
    },
    "profile": {
      "institute": "National Institute of Technology Jalandhar",
      "department": "Computer Science and Engineering",
      "graduationYear": 2025
    }
  }
}
```

## Email Verification Flow

### 1. Check Email Verification Status

**Endpoint:** `GET /api/auth/email-verification/verification-status`

**Request:**
```bash
curl -X GET "http://localhost:3000/api/auth/email-verification/verification-status" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "emailVerified": false,
    "email": "rishi.test@nitj.ac.in",
    "lastOtpSentAt": null,
    "canRequestNewOtp": true
  }
}
```

### 2. Send OTP Email

**Endpoint:** `POST /api/auth/email-verification/send-verification-otp`

**Request:**
```bash
curl -X POST "http://localhost:3000/api/auth/email-verification/send-verification-otp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "otpSentAt": "2025-08-18T10:30:00.000Z",
    "expiresAt": "2025-08-18T10:40:00.000Z",
    "email": "rishi.test@nitj.ac.in"
  }
}
```

### 3. Verify OTP

**Endpoint:** `POST /api/auth/email-verification/verify-otp`

**Request:**
```bash
curl -X POST "http://localhost:3000/api/auth/email-verification/verify-otp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "otp": "123456"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "emailVerified": true,
    "verifiedAt": "2025-08-18T10:35:00.000Z"
  }
}
```

## Complete Workflows

### Workflow 1: New User Registration → Migration → Email Verification

```bash
# 1. Register new user
SIGNUP_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rishi Test",
    "email": "rishi.test@nitj.ac.in",
    "password": "RishiTest123!"
  }')

# Extract token
USER_TOKEN=$(echo $SIGNUP_RESPONSE | jq -r '.data.accessToken')

# 2. Check migration status
curl -X GET "http://localhost:3000/api/migration/status" \
  -H "Authorization: Bearer $USER_TOKEN"

# 3. Perform migration
curl -X POST "http://localhost:3000/api/migration/migrate-to-v2" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "institute": "National Institute of Technology Jalandhar",
    "department": "Computer Science and Engineering",
    "graduationYear": 2025,
    "phoneNumber": "+91-9876543210",
    "studentId": "RISHI001",
    "discordUsername": "rishi#1234",
    "portfolioUrl": "https://github.com/rishi"
  }'

# 4. Check email verification status
curl -X GET "http://localhost:3000/api/auth/email-verification/verification-status" \
  -H "Authorization: Bearer $USER_TOKEN"

# 5. Send OTP email
curl -X POST "http://localhost:3000/api/auth/email-verification/send-verification-otp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN"

# 6. Verify OTP (replace 123456 with actual OTP from email)
curl -X POST "http://localhost:3000/api/auth/email-verification/verify-otp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "otp": "123456"
  }'
```

### Workflow 2: Existing User Migration

```bash
# 1. Login as existing user
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test.pioneer@openlearn.org.in",
    "password": "pioneer123!"
  }')

# Extract token
USER_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.data.accessToken')

# 2. Check migration status
curl -X GET "http://localhost:3000/api/migration/status" \
  -H "Authorization: Bearer $USER_TOKEN"

# 3. Perform migration if needed
curl -X POST "http://localhost:3000/api/migration/migrate-to-v2" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "institute": "Test Institute",
    "department": "Computer Science",
    "graduationYear": 2026,
    "phoneNumber": "+91-9876543210",
    "studentId": "TEST001",
    "discordUsername": "test#1234",
    "portfolioUrl": "https://github.com/test"
  }'
```

### Workflow 3: Direct Email Verification (No Migration)

```bash
# 1. Register new user
SIGNUP_RESPONSE=$(curl -s -X POST "http://localhost:3000/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Rishi Direct",
    "email": "rishi.direct@nitj.ac.in",
    "password": "RishiTest123!"
  }')

# Extract token
USER_TOKEN=$(echo $SIGNUP_RESPONSE | jq -r '.data.accessToken')

# 2. Send OTP directly (skip migration)
curl -X POST "http://localhost:3000/api/auth/email-verification/send-verification-otp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN"

# 3. Verify OTP
curl -X POST "http://localhost:3000/api/auth/email-verification/verify-otp" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "otp": "123456"
  }'
```

## Automated Testing Scripts

### Available Scripts

1. **`./scripts/test-email-flow.sh`** - Complete flow: Registration → Migration → Email Verification
2. **`./scripts/test-email-verification-direct.sh`** - Direct email verification without migration
3. **`./scripts/test-migration-quick.sh`** - Quick migration test with existing user
4. **`./scripts/verify-otp.sh OTP_CODE`** - Verify OTP using saved token

### Running the Scripts

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Test complete email flow
./scripts/test-email-flow.sh

# Test direct email verification
./scripts/test-email-verification-direct.sh

# Test migration only
./scripts/test-migration-quick.sh

# Verify OTP after receiving email
./scripts/verify-otp.sh 123456
```

### Script Outputs

The scripts will:
- Create users with test emails
- Perform migrations
- Send real OTP emails
- Save user tokens to `/tmp/rishi_user_token.txt`
- Provide curl commands for manual verification

## Troubleshooting

### Common Issues

#### 1. Email Not Received

**Check:**
- Resend API key is configured correctly
- Email service is running
- Check spam/junk folder
- Verify email address format

**Debug:**
```bash
# Check email service logs
docker logs openlearn-backend-app-1

# Test email service directly
curl -X POST "http://localhost:3000/api/auth/email-verification/send-verification-otp" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 2. Migration Fails

**Common Errors:**
- User already migrated: `User has already been migrated to V2`
- Missing required fields: `Validation error: Required field missing`
- Invalid graduation year: `Graduation year must be between current year and 10 years from now`

**Debug:**
```bash
# Check migration status first
curl -X GET "http://localhost:3000/api/migration/status" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3. OTP Verification Fails

**Common Errors:**
- Invalid OTP: `Invalid or expired OTP`
- OTP expired: `OTP has expired`
- OTP already used: `OTP has already been used`

**Debug:**
```bash
# Check OTP status
curl -X GET "http://localhost:3000/api/auth/email-verification/verification-status" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Request new OTP if needed
curl -X POST "http://localhost:3000/api/auth/email-verification/send-verification-otp" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 4. Token Issues

**Symptoms:**
- `Unauthorized` errors
- `Invalid token` messages

**Solutions:**
```bash
# Re-login to get fresh token
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your.email@domain.com",
    "password": "your_password"
  }'

# Use refresh token
curl -X POST "http://localhost:3000/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "your_refresh_token"
  }'
```

### Database Debugging

```bash
# Connect to PostgreSQL
docker exec -it openlearn-postgres psql -U openlearn_user -d openlearn_db

# Check user data
SELECT id, name, email, "emailVerified", "isV2User" FROM "User" WHERE email = 'your.email@domain.com';

# Check user profiles
SELECT * FROM "UserProfile" WHERE "userId" = 'user_id_here';

# Check OTP records
SELECT * FROM "EmailVerificationOTP" WHERE "userId" = 'user_id_here' ORDER BY "createdAt" DESC;
```

### Logs and Monitoring

```bash
# View application logs
docker logs -f openlearn-backend-app-1

# View database logs
docker logs -f openlearn-postgres

# View Redis logs
docker logs -f openlearn-redis
```

## Environment Setup

### Docker Services

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f app
```

### Required Services

1. **PostgreSQL** - Main database
2. **Redis** - Caching and session storage
3. **Adminer** - Database management UI (http://localhost:8080)
4. **Express App** - Backend API (http://localhost:3000)

### Testing with Real Emails

To test with real emails, ensure:

1. **Resend API Key** is configured in `.env`
2. **From email** is verified in Resend dashboard
3. **Test emails** use valid email addresses you can access
4. **Email templates** are properly configured

### Production Considerations

1. **Rate Limiting** - OTP requests are limited to prevent abuse
2. **Email Templates** - Professional templates for production
3. **Error Handling** - Proper error responses without exposing sensitive data
4. **Monitoring** - Log all email sending attempts and failures
5. **Security** - Validate all inputs and sanitize data

## API Endpoint Summary

### Authentication Endpoints
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token

### Migration Endpoints
- `GET /api/migration/status` - Check migration status
- `POST /api/migration/migrate-to-v2` - Perform migration to V2

### Email Verification Endpoints
- `GET /api/auth/email-verification/verification-status` - Check verification status
- `POST /api/auth/email-verification/send-verification-otp` - Send OTP email
- `POST /api/auth/email-verification/verify-otp` - Verify OTP code

### Response Formats

All endpoints return responses in the format:
```json
{
  "success": boolean,
  "message": string,
  "data": object | null,
  "error": string | null
}
```

---

## Quick Reference

### Essential Commands

```bash
# Start development environment
npm run dev:docker

# Run migrations
npx prisma migrate dev

# Seed database
npm run seed:dev

# Test complete flow
./scripts/test-email-flow.sh

# Verify OTP
./scripts/verify-otp.sh 123456

# Check logs
docker logs -f openlearn-backend-app-1
```

### Key Files

- **Environment:** `.env`
- **Database Schema:** `prisma/schema.prisma`
- **Email Service:** `src/services/email/EmailService.ts`
- **Migration Controller:** `src/controllers/migrationController.ts`
- **Email Verification Controller:** `src/controllers/EmailVerificationController.ts`

This guide provides everything needed to test and implement email verification and migration workflows in the OpenLearn backend.
