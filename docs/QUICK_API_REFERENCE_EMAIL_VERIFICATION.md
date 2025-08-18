# OpenLearn Backend - Quick API Reference

## Core Endpoints

### Authentication
```bash
# Register
POST /api/auth/signup
Body: { "name": "...", "email": "...", "password": "..." }

# Login  
POST /api/auth/login
Body: { "email": "...", "password": "..." }
```

### Migration
```bash
# Check status
GET /api/migration/status
Header: Authorization: Bearer TOKEN

# Migrate to V2
POST /api/migration/migrate-to-v2
Header: Authorization: Bearer TOKEN
Body: { "institute": "...", "department": "...", "graduationYear": 2025, ... }
```

### Email Verification
```bash
# Check status
GET /api/auth/email-verification/verification-status
Header: Authorization: Bearer TOKEN

# Send OTP
POST /api/auth/email-verification/send-verification-otp
Header: Authorization: Bearer TOKEN

# Verify OTP
POST /api/auth/email-verification/verify-otp
Header: Authorization: Bearer TOKEN
Body: { "otp": "123456" }
```

## Quick Test Commands

```bash
# Start environment
npm run dev:docker && npx prisma migrate dev && npm run seed:dev

# Test full flow
./scripts/test-email-flow.sh

# Verify received OTP
./scripts/verify-otp.sh YOUR_OTP_CODE

# Check logs
docker logs -f openlearn-backend-app-1
```

## Manual Testing Flow

1. **Register:** `curl -X POST localhost:3000/api/auth/signup -H "Content-Type: application/json" -d '{"name":"Test","email":"test@example.com","password":"Test123!"}'`

2. **Extract token from response**

3. **Migrate:** `curl -X POST localhost:3000/api/migration/migrate-to-v2 -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" -d '{"institute":"Test Uni","department":"CS","graduationYear":2025,"phoneNumber":"+91-1234567890","studentId":"TEST001"}'`

4. **Send OTP:** `curl -X POST localhost:3000/api/auth/email-verification/send-verification-otp -H "Authorization: Bearer TOKEN"`

5. **Check email and verify:** `curl -X POST localhost:3000/api/auth/email-verification/verify-otp -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" -d '{"otp":"123456"}'`

## Database Access

```bash
# Connect to DB
docker exec -it openlearn-postgres psql -U openlearn_user -d openlearn_db

# Check users
SELECT id, name, email, "emailVerified", "isV2User" FROM "User" LIMIT 5;
```

See `docs/EMAIL_VERIFICATION_AND_MIGRATION_COMPLETE_GUIDE.md` for detailed documentation.
