# OpenLearn Platform V2 Migration - Implementation Documentation

## Overview

This document details the major V2 upgrade implementation for the OpenLearn platform, focusing on enhanced user data collection, auto-approval system, pathfinder scope control, and backward compatibility for existing production users (120+ users).

## Schema Changes

### 1. Enhanced User Model

**New Fields Added (All Nullable for Production Safety):**
```prisma
model User {
  // V2 Enhancement Fields
  institute         String?   // University/College name
  department        String?   // Department/Field of study  
  graduationYear    Int?      // Expected graduation year
  phoneNumber       String?   // Contact number
  studentId         String?   // College student ID
  olid              String?   @unique // OpenLearn ID (auto-generated)
  migratedToV2      Boolean?  // null = old user, true = migrated, false = failed
  emailVerified     Boolean   @default(false)
  
  // Direct cohort association
  currentCohortId   String?
  currentCohort     Cohort?   @relation("UserCurrentCohort", fields: [currentCohortId], references: [id])
  
  // Enhanced social profiles
  discordUsername   String?
  portfolioUrl      String?
}
```

**Migration Strategy:**
- All new fields are nullable to ensure existing data remains intact
- Default values prevent breaking changes
- Unique constraint on `olid` with proper conflict handling

### 2. Enhanced Cohort Model

**New Fields:**
```prisma
model Cohort {
  // V2 Enhancement Fields
  autoApprove       Boolean @default(false)  // Dynamic auto-approval per cohort
  maxEnrollments    Int?    // Optional enrollment limit
  
  // Relations
  currentUsers      User[] @relation("UserCurrentCohort")
}
```

**Benefits:**
- Configurable approval process per cohort
- Support for different cohort sizes (Cohort 1.2: manual, Cohort 1.5: auto)

### 3. Pathfinder Scope Control System

**New Model:**
```prisma
model PathfinderScope {
  id               String    @id @default(cuid())
  pathfinderId     String
  pathfinder       User      @relation("PathfinderScopeUser")
  
  // Multi-level scoping
  cohortId         String?
  specializationId String?
  leagueId         String?
  
  // Granular permissions
  canManageUsers   Boolean   @default(true)
  canViewAnalytics Boolean   @default(true)
  canCreateContent Boolean   @default(false)
  
  assignedAt       DateTime  @default(now())
  assignedById     String
  assignedBy       User      @relation("PathfinderScopeAssigner")
}
```

**Access Control Logic:**
- Grand Pathfinder: Global access (unchanged)
- Chief/Pathfinder: Scope-limited access to assigned leagues/specializations
- Prevents cross-specialization data access

### 4. Enhanced Audit System

**New Audit Action:**
```prisma
enum AuditAction {
  // ... existing actions ...
  USER_MIGRATED_TO_V2  // New action for tracking V2 migrations
}
```

## API

### 1. Signup Endpoint

**Endpoint:** `POST /api/auth/signup` (Modified - Backward Compatible)

**Request Body (Enhanced):**
```typescript
interface SignupRequest {
  // Existing fields (required)
  email: string;
  password: string;
  name: string;
  
  // V2 Enhancement Fields (optional)
  institute?: string;
  department?: string;
  graduationYear?: number;
  phoneNumber?: string;
  studentId?: string;
  discordUsername?: string;
  portfolioUrl?: string;
  cohortId?: string;
}
```

**New Features:**
- Auto-approval based on cohort settings
- OLID generation for V2 users
- Automatic cohort assignment
- Enhanced user profile creation

**Backward Compatibility:**
- Old signup requests (without V2 fields) still work
- Existing frontend code requires no changes
- New frontends can leverage enhanced fields

### 2. Migration Endpoints (New)

#### GET /api/migration/status
**Purpose:** Check if user needs V2 migration
**Response:**
```typescript
{
  success: true,
  data: {
    needsMigration: boolean,
    isOldUser: boolean,
    migratedToV2: boolean | null,
    hasOLID: boolean,
    emailVerified: boolean,
    userSince: Date
  }
}
```

#### POST /api/migration/migrate-to-v2
**Purpose:** Migrate existing user to V2
**Request Body:**
```typescript
{
  institute: string,        // Required
  department?: string,
  graduationYear?: number,
  phoneNumber?: string,
  studentId?: string,
  discordUsername?: string,
  portfolioUrl?: string
}
```

**Migration Process:**
1. Validates user needs migration (`migratedToV2 === null`)
2. Generates unique OLID
3. Assigns to active cohort if not assigned
4. Updates user with V2 data
5. Sets `migratedToV2 = true`
6. Creates audit log

## OLID Generation System

### Format: `OL025000200`

**Components:**
- `OL`: OpenLearn prefix
- `025`: Current year (2025 → 025, last 3 digits)
- `000200`: 6-digit padded sequence number (user count + 1)

**Implementation:**
```typescript
private static async generateOLID(): Promise<string> {
  const prefix = 'OL';
  const year = new Date().getFullYear().toString().slice(-3); // Last 3 digits
  const userCount = await prisma.user.count();
  const sequence = (userCount + 1).toString().padStart(6, '0');
  const olid = `${prefix}${year}${sequence}`;
  
  // Conflict detection and resolution
  const existingUser = await prisma.user.findUnique({ where: { olid } });
  if (existingUser) {
    const randomSuffix = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    return `${prefix}${year}${sequence}${randomSuffix}`;
  }
  
  return olid;
}
```

**Benefits:**
- Unique and sequential
- Year-based for easy identification
- Scalable up to 999,999 users per year
- Conflict resolution with random suffix
- Easy to remember format

## Migration Strategy for Production

### Phase 1: Database Migration (✅ Completed)
- Added new nullable fields to existing tables
- Created PathfinderScope table
- All changes are additive and safe

### Phase 2: API Backward Compatibility (✅ Completed)
- Enhanced existing endpoints without breaking changes
- Added optional V2 fields to requests/responses
- Maintained existing authentication flow

### Phase 3: Production Deployment Strategy

**Zero-Downtime Deployment:**
1. Deploy new backend with V2 capabilities
2. Existing users continue working normally
3. Frontend shows migration prompt for `migratedToV2 === null`
4. Users migrate at their own pace

**Frontend Integration Points:**
```typescript
// Check migration status on login
const checkMigrationStatus = async () => {
  const response = await fetch('/api/migration/status');
  const { data } = await response.json();
  
  if (data.needsMigration) {
    // Show migration flow UI
    showMigrationModal();
  }
};

// Migration flow
const migrateToV2 = async (userData) => {
  const response = await fetch('/api/migration/migrate-to-v2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  
  if (response.ok) {
    // Redirect to enhanced dashboard
    window.location.href = '/dashboard';
  }
};
```