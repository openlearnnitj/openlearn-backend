# OpenLearn Backend V2 Migration Guide

## Overview
This document outlines the migration from OpenLearn Backend V1 to V2, including new features, breaking changes, and upgrade procedures.

## Major Changes in V2

### 1. Email Verification System
- **New Feature**: Modular email verification with OTP
- **Email Provider Factory**: Support for multiple email providers (Resend, Amazon SES)
- **Template System**: HTML email templates with Handlebars
- **Rate Limiting**: Built-in protection against abuse

### 2. PathfinderScope System
- **New Feature**: Hierarchical permission management for Pathfinders
- **Granular Permissions**: Fine-grained access control
- **Scope-based Authorization**: Move from role-based to scope-based permissions
- **Backward Compatibility**: Old role system still supported during transition

### 3. Enhanced User Profiles
- **New Fields**: `emailVerified`, `pathfinderScopes`, `enrollments`, `specializations`
- **Extended Responses**: Richer user profile data

---

## Email Verification Migration

### V1 vs V2 Comparison

#### V1 (Password Reset OTP)
```bash
# V1 - Used password reset system for email verification
curl -X POST http://localhost:3000/api/auth/password-reset \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```

#### V2 (Dedicated Email Verification)
```bash
# V2 - Dedicated email verification endpoints
curl -X POST http://localhost:3000/api/auth/send-verification-otp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{}'
```

### Migration Steps for Email Verification

1. **Update Environment Variables**
   ```env
   # Add to .env
   EMAIL_PROVIDER=resend  # or amazon_ses
   RESEND_API_KEY=your_resend_key
   # or
   AWS_SES_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_key
   AWS_SECRET_ACCESS_KEY=your_secret
   ```

2. **Database Migration**
   ```bash
   # Run Prisma migration
   npx prisma migrate dev --name add_email_verification
   ```

3. **Update Frontend Code**
   ```javascript
   // V1 - Old approach
   const sendOTP = async () => {
     await fetch('/api/auth/password-reset', {
       method: 'POST',
       body: JSON.stringify({ email: userEmail })
     });
   };

   // V2 - New approach
   const sendVerificationOTP = async () => {
     await fetch('/api/auth/send-verification-otp', {
       method: 'POST',
       headers: {
         'Authorization': `Bearer ${token}`,
         'Content-Type': 'application/json'
       }
     });
   };
   ```

---

## PathfinderScope Migration

### V1 vs V2 Authorization

#### V1 (Role-based)
```javascript
// V1 - Simple role checking
router.post('/content', 
  AuthMiddleware.requireRole(UserRole.CHIEF_PATHFINDER), 
  createContent
);
```

#### V2 (Scope-based)
```javascript
// V2 - Permission-based checking
router.post('/content', 
  PathfinderScopeMiddleware.requirePermission('canCreateContent'), 
  createContent
);
```

### Migration Steps for PathfinderScope

1. **Auto-Assignment During Role Promotion**
   ```javascript
   // When promoting a user to PATHFINDER, a default scope is auto-created
   // This happens automatically in adminController.updateUserRole()
   ```

2. **Manual Scope Assignment**
   ```bash
   # Create scope for existing Pathfinder
   curl -X POST http://localhost:3000/api/pathfinder-scopes \
     -H "Authorization: Bearer <admin-token>" \
     -H "Content-Type: application/json" \
     -d '{
       "pathfinderId": "user123",
       "cohortId": "cohort456",
       "canCreateContent": true,
       "canManageUsers": false,
       "canViewAnalytics": true
     }'
   ```

3. **Update Route Middleware**
   ```javascript
   // Replace old role-based middleware
   // OLD:
   router.get('/analytics', 
     AuthMiddleware.requireRole(UserRole.PATHFINDER), 
     getAnalytics
   );

   // NEW:
   router.get('/analytics', 
     PathfinderScopeMiddleware.requirePermission('canViewAnalytics'), 
     getAnalytics
   );
   ```

---

## Backward Compatibility Strategy

### Phase 1: Dual Support (Current)
- Both old role-based and new scope-based systems work
- New endpoints available alongside old ones
- Gradual migration possible

### Phase 2: Deprecation Warnings
- Old endpoints return deprecation headers
- Documentation updated with migration paths
- 6-month deprecation period

### Phase 3: V1 Removal
- Old endpoints removed
- Only scope-based system remains
- Complete V2 migration

---

## Feature Comparison Matrix

| Feature | V1 | V2 | Migration Required |
|---------|----|----|-------------------|
| User Authentication | ✅ | ✅ | No |
| Email Verification | 🔄 Password Reset OTP | ✅ Dedicated System | Recommended |
| Authorization | 🔄 Role-based | ✅ Scope-based | Optional (gradual) |
| Email Templates | ❌ | ✅ | No |
| Rate Limiting | ❌ | ✅ | No |
| Audit Logging | ✅ | ✅ Enhanced | No |
| User Profiles | ✅ Basic | ✅ Extended | No |

---

## Quick Migration Checklist

### For Backend Developers
- [ ] Update environment variables for email provider
- [ ] Run database migrations
- [ ] Update import statements for new services
- [ ] Replace role-based middleware with scope-based (gradual)
- [ ] Test new email verification flow

### For Frontend Developers
- [ ] Update API endpoints for email verification
- [ ] Handle new user profile fields
- [ ] Implement scope-based UI permissions
- [ ] Update error handling for new response formats
- [ ] Test email verification UX

### For DevOps/Infrastructure
- [ ] Configure email provider credentials
- [ ] Update Redis configuration for email queues
- [ ] Monitor new audit log volume
- [ ] Update backup procedures for new tables
- [ ] Configure monitoring for email delivery

---

## Testing Migration

### 1. Email Verification Testing
```bash
# Test email provider connection
curl -X GET http://localhost:3000/api/emails/test-connection \
  -H "Authorization: Bearer <admin-token>"

# Test OTP sending
curl -X POST http://localhost:3000/api/auth/send-verification-otp \
  -H "Authorization: Bearer <user-token>"
```

### 2. PathfinderScope Testing
```bash
# Check user's scopes
curl -X GET http://localhost:3000/api/pathfinder-scopes/my-scopes \
  -H "Authorization: Bearer <pathfinder-token>"

# Test permission-based endpoint
curl -X GET http://localhost:3000/api/analytics \
  -H "Authorization: Bearer <pathfinder-token>"
```

---

## Troubleshooting

### Common Issues

1. **Email Not Sending**
   - Check email provider credentials
   - Verify template existence
   - Check Redis connection for queues

2. **Permission Denied After Migration**
   - Verify PathfinderScope creation
   - Check permission assignments
   - Ensure middleware order

3. **Database Migration Fails**
   - Check Prisma schema conflicts
   - Verify foreign key constraints
   - Backup database before migration

### Support Contacts
- Backend Issues: [GitHub Issues](https://github.com/your-org/openlearn-backend/issues)
- Email Provider Setup: See provider documentation
- Urgent Issues: Contact development team

---

## 📅 Migration Timeline

- **Week 1-2**: V2 features deployed alongside V1
- **Week 3-4**: Frontend migration to new endpoints
- **Week 5-8**: Gradual scope-based authorization rollout
- **Week 9-12**: V1 deprecation warnings
- **Month 4-6**: V1 endpoint removal

This migration guide ensures a smooth transition to OpenLearn Backend V2 while maintaining system stability and user experience.
