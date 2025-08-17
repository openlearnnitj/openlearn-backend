# OpenLearn Backend V2 - Troubleshooting Guide

## 🚨 Common Issues and Solutions

### Migration Issues

#### 1. "Internal server error during migration"

**Problem**: The migration endpoint returns `{"success":false,"error":"Internal server error during migration"}`

**Possible Causes**:
- OLID generation conflicts
- Database constraint violations  
- Missing required fields
- Invalid data types

**Solutions**:

1. **Check Server Logs**:
   ```bash
   # If using PM2
   pm2 logs openlearn-backend --lines 50
   
   # If using Docker
   docker logs openlearn-backend
   
   # If running directly
   tail -f logs/app.log
   ```

2. **Validate Request Data**:
   ```bash
   # Ensure required fields are present
   curl -X POST "https://api.openlearn.org.in/api/migration/migrate-to-v2" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{
       "institute": "Your Institute Name"  // Required field
     }'
   ```

3. **Check Database Constraints**:
   ```sql
   -- Check if OLID is unique
   SELECT olid, COUNT(*) FROM users GROUP BY olid HAVING COUNT(*) > 1;
   
   -- Check user migration status
   SELECT id, email, migratedToV2, olid FROM users WHERE id = 'your-user-id';
   ```

4. **OLID Conflict Resolution**:
   If you get OLID conflicts, the system will automatically retry with a random suffix. If it still fails:
   ```bash
   # Try migration again - the system will generate a new OLID
   curl -X POST "https://api.openlearn.org.in/api/migration/migrate-to-v2" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <token>" \
     -d '{"institute": "Your Institute"}'
   ```

#### 2. "User is already migrated to V2"

**Problem**: Trying to migrate a user who is already on V2

**Solution**: Check migration status first:
```bash
curl -X GET "https://api.openlearn.org.in/api/migration/status" \
  -H "Authorization: Bearer <token>"
```

---

### Email Verification Issues

#### 1. "Email is already verified"

**Problem**: Trying to send OTP to an already verified email

**Solution**: Check verification status:
```bash
curl -X GET "https://api.openlearn.org.in/api/auth/verification-status" \
  -H "Authorization: Bearer <token>"
```

#### 2. "OTP recently sent. Please wait before requesting another."

**Problem**: Rate limiting is active

**Solution**: Wait for the retry period (60 seconds for regular, 3 minutes for resend):
```bash
# Check current status
curl -X GET "https://api.openlearn.org.in/api/auth/verification-status" \
  -H "Authorization: Bearer <token>"

# Response will show when you can retry
# {
#   "pendingOTP": true,
#   "otpExpiresAt": "2025-08-17T10:30:00.000Z",
#   "lastOTPSent": "2025-08-17T10:15:00.000Z"
# }
```

#### 3. "Daily OTP limit reached"

**Problem**: User has exceeded 5 OTP requests per day

**Solution**: Wait until the next day or use admin override:
```bash
# Admin can manually verify
curl -X POST "https://api.openlearn.org.in/api/auth/admin-verify-email/user123" \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Daily limit exceeded - manual verification"}'
```

#### 4. "Failed to send verification OTP"

**Problem**: Email provider issues

**Solutions**:

1. **Check Email Provider Configuration**:
   ```env
   # For Resend
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
   
   # For Amazon SES  
   EMAIL_PROVIDER=amazon_ses
   AWS_SES_REGION=us-east-1
   AWS_ACCESS_KEY_ID=AKIAXXXXXXXXXXXXXXXX
   AWS_SECRET_ACCESS_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

2. **Test Email Provider Connection**:
   ```bash
   curl -X GET "https://api.openlearn.org.in/api/emails/test-connection" \
     -H "Authorization: Bearer <admin-token>"
   ```

3. **Check Email Templates**:
   ```bash
   # Verify email-verification template exists
   ls -la src/templates/email/email-verification.html
   ```

---

### PathfinderScope Issues

#### 1. "Permission denied" after role change

**Problem**: User promoted to PATHFINDER but can't access endpoints

**Solutions**:

1. **Check if scope was auto-created**:
   ```bash
   curl -X GET "https://api.openlearn.org.in/api/pathfinder-scopes/my-scopes" \
     -H "Authorization: Bearer <pathfinder-token>"
   ```

2. **Manually create scope**:
   ```bash
   curl -X POST "https://api.openlearn.org.in/api/pathfinder-scopes" \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json" \
     -d '{
       "pathfinderId": "user123",
       "cohortId": "cohort456",
       "canCreateContent": true,
       "canViewAnalytics": true,
       "canManageUsers": false
     }'
   ```

#### 2. "No access to this cohort"

**Problem**: Pathfinder trying to access cohort they don't have scope for

**Solution**: Assign cohort-specific scope:
```bash
curl -X POST "https://api.openlearn.org.in/api/pathfinder-scopes" \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "pathfinderId": "user123",
    "cohortId": "target-cohort-id",
    "canViewAnalytics": true
  }'
```

---

### Authentication Issues

#### 1. "Authentication required"

**Problem**: Missing or invalid JWT token

**Solutions**:

1. **Check token format**:
   ```bash
   # Correct format
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   
   # NOT just the token
   Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **Check token expiry**:
   ```bash
   # Decode JWT to check expiry (use jwt.io or similar)
   # Or try to get profile
   curl -X GET "https://api.openlearn.org.in/api/auth/profile" \
     -H "Authorization: Bearer <token>"
   ```

3. **Get new token**:
   ```bash
   curl -X POST "https://api.openlearn.org.in/api/auth/login" \
     -H "Content-Type: application/json" \
     -d '{
       "email": "your-email@example.com",
       "password": "your-password"
     }'
   ```

---

### Database Issues

#### 1. "User not found"

**Problem**: User ID doesn't exist in database

**Solution**: Verify user exists:
```sql
SELECT id, email, role, status FROM users WHERE id = 'user-id';
SELECT id, email, role, status FROM users WHERE email = 'user@example.com';
```

#### 2. Database connection errors

**Problem**: Cannot connect to database

**Solutions**:

1. **Check database status**:
   ```bash
   # For Docker
   docker ps | grep postgres
   
   # For local PostgreSQL
   pg_isready -h localhost -p 5432
   ```

2. **Check environment variables**:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/openlearn_db"
   ```

3. **Test database connection**:
   ```bash
   # In project directory
   npx prisma db pull
   ```

---

### Performance Issues

#### 1. Slow API responses

**Solutions**:

1. **Check Redis connection** (for caching):
   ```bash
   redis-cli ping
   ```

2. **Monitor database queries**:
   ```bash
   # Enable query logging in PostgreSQL
   # Check slow query log
   ```

3. **Check server resources**:
   ```bash
   # CPU and memory usage
   htop
   
   # Disk space
   df -h
   ```

---

### Development Environment Setup

#### 1. "Module not found" errors

**Solution**: Install dependencies:
```bash
npm install
npx prisma generate
```

#### 2. "Environment variable not found"

**Solution**: Create `.env` file:
```env
# Copy from .env.example
cp .env.example .env

# Edit with your values
nano .env
```

#### 3. Database migration issues

**Solution**: Reset and migrate:
```bash
# Reset database (WARNING: This deletes all data)
npx prisma migrate reset

# Or apply pending migrations
npx prisma migrate deploy
```

---

## 🔧 Debugging Tools

### 1. API Testing
```bash
# Test authentication
curl -X GET "https://api.openlearn.org.in/api/auth/profile" \
  -H "Authorization: Bearer <token>" \
  -v

# Test with verbose output for debugging
curl -X POST "https://api.openlearn.org.in/api/auth/send-verification-otp" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -v
```

### 2. Database Queries
```sql
-- Check user migration status
SELECT 
  id, 
  email, 
  role, 
  migratedToV2, 
  emailVerified, 
  olid 
FROM users 
WHERE email = 'user@example.com';

-- Check PathfinderScopes
SELECT 
  ps.*,
  u.email as pathfinder_email,
  c.name as cohort_name
FROM "PathfinderScope" ps
JOIN users u ON ps."pathfinderId" = u.id
LEFT JOIN "Cohort" c ON ps."cohortId" = c.id
WHERE u.email = 'pathfinder@example.com';

-- Check audit logs
SELECT 
  action,
  description,
  metadata,
  "createdAt"
FROM "AuditLog"
WHERE "userId" = 'user-id'
ORDER BY "createdAt" DESC
LIMIT 10;
```

### 3. Log Analysis
```bash
# Search for specific errors
grep -r "Internal server error" logs/

# Check API endpoint access
grep -r "POST /api/migration/migrate-to-v2" logs/

# Monitor real-time logs
tail -f logs/app.log | grep -i error
```

---

## 📞 Getting Help

1. **Check GitHub Issues**: [OpenLearn Backend Issues](https://github.com/your-org/openlearn-backend/issues)
2. **Review Documentation**: Latest API docs and migration guides
3. **Contact Support**: For critical production issues
4. **Community Discord**: For development questions and community support

---

## 🔄 Quick Fixes Summary

| Issue | Quick Fix |
|-------|-----------|
| Migration fails | Check required fields, retry with valid institute name |
| OTP not sending | Verify email provider config, test connection |
| Permission denied | Check PathfinderScope assignment for user |
| Token expired | Login again to get new token |
| Database error | Check DATABASE_URL and connection |
| Rate limited | Wait for retry period or use admin override |

This troubleshooting guide should help resolve most common issues with the OpenLearn Backend V2 system.
