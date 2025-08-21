# OpenLearn Backend - Development Testing Guide

This guide provides comprehensive testing workflows for backend developers working on OpenLearn. No more slow manual curl requests!

## Quick Setup

```bash
# 1. Setup development environment
npm run dev:setup

# 2. Start development server
npm run dev

# 3. In another terminal, run tests
npm run test:flows:quick
```

## Available Testing Scripts

### 🚀 Quick Tests (Most Used)

```bash
# Quick user setup (register, approve, login) - 30 seconds
npm run test:flows:quick

# Quick migration test - 1 minute  
npm run test:flows:migration

# Reset database and seed fresh data
npm run reset:quick
```

### 🔄 Complete Flow Tests

```bash
# Full registration flow (register → approve → login)
npm run test:flows:registration

# Complete migration flow (status → migrate → verify)
npm run test:flows:migration

# Email verification flow
npm run test:flows:email

# Admin functionality tests
npm run test:flows:admin

# Run ALL flows (comprehensive test)
npm run test:flows
```

### 🛠 Development Utilities

```bash
# Database management
npm run dev:db          # Start database containers
npm run dev:db:stop     # Stop database containers
npm run dev:db:reset    # Full reset (stop → start → migrate → seed)

# Quick database reset
npm run reset:quick     # Fast reset without Docker restart

# Database UI
npm run dev:adminer     # Start Adminer at http://localhost:8080
```

## Testing Workflows

### 1. New Feature Development

```bash
# Start fresh
npm run reset:quick

# Get test tokens quickly  
npm run test:flows:quick

# Now you have admin and user tokens for manual testing
```

### 2. Migration Testing

```bash
# Test migration flow end-to-end
npm run test:flows:migration
```

### 3. API Endpoint Testing

```bash
# Test specific flows
npm run test:flows:registration  # Test auth endpoints
npm run test:flows:admin        # Test admin endpoints
npm run test:flows:email        # Test email endpoints
```

## Manual Testing with Generated Tokens

After running `npm run test:flows:quick`, you'll get output like:

```
✅ Quick user setup complete!
User Token: eyJhbGciOiJIUzI1NiIsInR5cCI6...
Admin Token: eyJhbGciOiJIUzI1NiIsInR5cCI6...
```

Use these tokens for manual curl testing:

```bash
# Test with user token
curl -H "Authorization: Bearer USER_TOKEN_HERE" http://localhost:3000/api/migration/status

# Test with admin token  
curl -H "Authorization: Bearer ADMIN_TOKEN_HERE" http://localhost:3000/api/admin/users
```

## Pre-seeded Test Accounts

The development environment comes with these accounts:

```
Admin Account:
  Email: admin@openlearn.org.in
  Password: admin123!
  
Developer Account:
  Email: developer@openlearn.org.in  
  Password: dev123!
  
Pioneer Account:
  Email: test.pioneer@openlearn.org.in
  Password: pioneer123!
```

## Database Management

### Adminer Database UI
- URL: http://localhost:8080
- Server: postgres
- Username: postgres  
- Password: openlearn_dev_password
- Database: openlearn_dev

### Common Database Operations

```bash
# View database schema
npm run prisma:studio

# Generate Prisma client after schema changes
npm run prisma:generate

# Create new migration
npm run prisma:migrate

# Reset migrations (destructive)
npm run prisma:reset
```

## Debugging Tips

### 1. API Testing Failed?

```bash
# Check if database is running
npm run dev:db

# Check if server is running
curl http://localhost:3000/health

# Reset everything
npm run reset:quick
```

### 2. Migration Errors?

```bash
# Check user migration status
npm run test:flows:migration

# Look at logs
tail -f logs/app.log
```

### 3. Email Issues?

```bash
# Test email verification flow
npm run test:flows:email

# Check email service
npm run test:email-providers
```

## Development Workflow

1. **Start Development:**
   ```bash
   npm run dev:setup    # One-time setup
   npm run dev         # Start server
   ```

2. **Quick Testing:**
   ```bash
   npm run test:flows:quick  # Get tokens fast
   ```

3. **Feature Testing:**
   ```bash
   # Test specific features
   npm run test:flows:migration
   npm run test:flows:admin
   ```

4. **Reset When Needed:**
   ```bash
   npm run reset:quick  # Fast reset
   ```

## Performance Benefits

| Method | Time | Effort |
|--------|------|--------|
| Manual curl | 10+ minutes | High |
| Testing scripts | 30 seconds | Low |

### Before (Manual curl):
1. Register user manually
2. Login as admin manually  
3. Get admin token
4. Approve user manually
5. Login as user manually
6. Get user token
7. Test feature manually

**Time: 10+ minutes per test cycle**

### After (Testing scripts):
```bash
npm run test:flows:quick
```

**Time: 30 seconds, tokens ready to use**

## Advanced Usage

### Custom Flow Testing

You can modify `src/scripts/testApiFlows.ts` to add custom test flows:

```typescript
async customFlow() {
  await this.loginAsAdmin();
  // Your custom testing logic
  await this.testMyNewFeature();
}
```

### Environment-Specific Testing

```bash
# Test against different environments
API_BASE_URL=https://staging.api.openlearn.org.in npm run test:flows:quick
API_BASE_URL=https://api.openlearn.org.in npm run test:flows:quick
```

This testing setup saves hours of development time and makes backend testing as fast as frontend development!
