# OpenLearn V2 Migration API Documentation

## Overview
This document covers the V2 Migration endpoints for the OpenLearn platform. These endpoints facilitate the seamless migration of existing users to the enhanced V2 system, which includes additional user profile fields, auto-approval systems, and the new OpenLearn ID (OLID) system.

## Migration System Purpose
The V2 migration system enables existing production users (120+ users) to upgrade to the enhanced platform features without losing any existing data or disrupting their current experience. The migration is designed to be:
- **Zero-downtime**: Existing users continue working normally
- **Backward compatible**: Old frontend code continues to function
- **User-controlled**: Users migrate at their own pace
- **Safe**: All new fields are nullable, ensuring data integrity

## Base URL
```
http://localhost:3001/api
```

## Authentication
All endpoints require JWT authentication via the `Authorization` header:
```
Authorization: Bearer <access_token>
```

## Migration States
Users can be in one of three migration states:

| State | `migratedToV2` Value | Description |
|-------|---------------------|-------------|
| **Legacy User** | `null` | Pre-V2 user who needs migration |
| **Migrated User** | `true` | Successfully migrated to V2 |
| **Failed Migration** | `false` | Migration attempt failed (rare) |

## User Fields Enhanced in V2

### New Profile Fields (All Optional)
| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `institute` | String | University/College name | "Indian Institute of Technology, Delhi" |
| `department` | String | Department/Field of study | "Computer Science and Engineering" |
| `graduationYear` | Integer | Expected graduation year | 2026 |
| `phoneNumber` | String | Contact number | "+91-9876543210" |
| `studentId` | String | College student ID | "2022CS10123" |
| `olid` | String | OpenLearn ID (auto-generated) | "OL025000200" |
| `discordUsername` | String | Discord username | "john_doe#1234" |
| `portfolioUrl` | String | Personal portfolio/GitHub URL | "https://github.com/johndoe" |

### OLID Generation System
The OpenLearn ID (OLID) follows the format: `OL025000200`
- `OL`: OpenLearn prefix
- `025`: Last 3 digits of current year (2025 → 025)
- `000200`: 6-digit padded sequence number (user count + 1)
- Automatic conflict resolution with random suffix if needed

---

## Migration Endpoints

### 1. Check Migration Status
Check if the authenticated user needs V2 migration and get current migration state.

**Endpoint:** `GET /api/migration/status`  
**Access:** All authenticated users  
**Headers:**
```json
{
  "Authorization": "Bearer <access_token>"
}
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
    "userSince": "2024-03-15T10:30:00.000Z",
    "currentUser": {
      "id": "cm5abc123def456",
      "email": "john.doe@university.edu",
      "name": "John Doe",
      "role": "PIONEER",
      "createdAt": "2024-03-15T10:30:00.000Z",
      "institute": null,
      "department": null,
      "graduationYear": null,
      "phoneNumber": null,
      "studentId": null,
      "olid": null,
      "discordUsername": null,
      "portfolioUrl": null
    }
  }
}
```

**Response for Already Migrated User:**
```json
{
  "success": true,
  "data": {
    "needsMigration": false,
    "isOldUser": true,
    "migratedToV2": true,
    "hasOLID": true,
    "emailVerified": true,
    "userSince": "2024-03-15T10:30:00.000Z",
    "currentUser": {
      "id": "cm5abc123def456",
      "email": "john.doe@university.edu",
      "name": "John Doe",
      "role": "PIONEER",
      "createdAt": "2024-03-15T10:30:00.000Z",
      "institute": "Indian Institute of Technology, Delhi",
      "department": "Computer Science and Engineering",
      "graduationYear": 2026,
      "phoneNumber": "+91-9876543210",
      "studentId": "2022CS10123",
      "olid": "OL025000200",
      "discordUsername": "john_doe#1234",
      "portfolioUrl": "https://github.com/johndoe"
    }
  }
}
```

**Response for New V2 User:**
```json
{
  "success": true,
  "data": {
    "needsMigration": false,
    "isOldUser": false,
    "migratedToV2": true,
    "hasOLID": true,
    "emailVerified": false,
    "userSince": "2025-08-15T14:20:00.000Z",
    "currentUser": {
      "id": "cm5xyz789abc123",
      "email": "new.user@university.edu",
      "name": "New User",
      "role": "PIONEER",
      "createdAt": "2025-08-15T14:20:00.000Z",
      "institute": "Stanford University",
      "department": "Artificial Intelligence",
      "graduationYear": 2027,
      "phoneNumber": "+1-555-123-4567",
      "studentId": "SU2025AI001",
      "olid": "OL025000250",
      "discordUsername": "newuser#5678",
      "portfolioUrl": "https://newuser.dev"
    }
  }
}
```

**Usage Notes:**
- Call this endpoint after user login to determine if migration UI should be shown
- `needsMigration: true` indicates user should be prompted for migration
- `isOldUser: false` means user signed up with V2 system (no migration needed)

### 2. Migrate User to V2
Migrate an existing user to the V2 system with enhanced profile information.

**Endpoint:** `POST /api/migration/migrate-to-v2`  
**Access:** Authenticated users who need migration (`migratedToV2 === null`)  
**Headers:**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <access_token>"
}
```

**Request Body:**
```json
{
  "institute": "Indian Institute of Technology, Delhi",
  "department": "Computer Science and Engineering",
  "graduationYear": 2026,
  "phoneNumber": "+91-9876543210",
  "studentId": "2022CS10123",
  "discordUsername": "john_doe#1234",
  "portfolioUrl": "https://github.com/johndoe"
}
```

**Field Descriptions:**
- `institute` (string, **required**): Full name of university/college
- `department` (string, optional): Department or field of study
- `graduationYear` (integer, optional): Expected graduation year (must be current year or future)
- `phoneNumber` (string, optional): Contact phone number with country code
- `studentId` (string, optional): College/university student ID
- `discordUsername` (string, optional): Discord username with discriminator
- `portfolioUrl` (string, optional): Personal website, GitHub, or portfolio URL

**Validation Rules:**
- `institute` is mandatory (cannot be empty or just whitespace)
- `graduationYear` must be current year (2025) or later if provided
- `phoneNumber` basic format validation if provided
- `portfolioUrl` must be valid URL format if provided
- User must have `migratedToV2 === null` to perform migration

**Success Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cm5abc123def456",
      "email": "john.doe@university.edu",
      "name": "John Doe",
      "role": "PIONEER",
      "createdAt": "2024-03-15T10:30:00.000Z",
      "updatedAt": "2025-08-15T14:25:30.123Z",
      "institute": "Indian Institute of Technology, Delhi",
      "department": "Computer Science and Engineering",
      "graduationYear": 2026,
      "phoneNumber": "+91-9876543210",
      "studentId": "2022CS10123",
      "olid": "OL025000200",
      "migratedToV2": true,
      "emailVerified": false,
      "discordUsername": "john_doe#1234",
      "portfolioUrl": "https://github.com/johndoe",
      "currentCohortId": "cm5cohort123",
      "currentCohort": {
        "id": "cm5cohort123",
        "name": "Cohort 1.5",
        "description": "AI/ML Specialization - Batch 2025",
        "autoApprove": true,
        "isActive": true
      }
    },
    "migration": {
      "migratedAt": "2025-08-15T14:25:30.123Z",
      "generatedOLID": "OL025000200",
      "assignedToCohort": true,
      "cohortName": "Cohort 1.5"
    }
  },
  "message": "Successfully migrated to V2. Welcome to the enhanced OpenLearn platform!"
}
```

**Migration Process Details:**
1. **Validation**: Ensures user needs migration and validates input data
2. **OLID Generation**: Creates unique OpenLearn ID (format: OL025000200)
3. **Profile Update**: Updates user with provided V2 fields
4. **Cohort Assignment**: Assigns to active cohort if not already assigned
5. **Migration Flag**: Sets `migratedToV2 = true`
6. **Audit Logging**: Creates audit log entry with action `USER_MIGRATED_TO_V2`

**Error Responses:**

**Already Migrated:**
```json
{
  "success": false,
  "error": "User has already been migrated to V2 or is not eligible for migration"
}
```

**Missing Required Field:**
```json
{
  "success": false,
  "error": "Institute is required for V2 migration"
}
```

**Invalid Graduation Year:**
```json
{
  "success": false,
  "error": "Graduation year must be current year (2025) or later"
}
```

**Invalid URL:**
```json
{
  "success": false,
  "error": "Portfolio URL must be a valid URL format"
}
```

**OLID Generation Conflict (Rare):**
```json
{
  "success": false,
  "error": "Failed to generate unique OLID. Please try again."
}
```

**Database Error:**
```json
{
  "success": false,
  "error": "Migration failed due to database error. Please try again."
}
```

---

## Frontend Integration Guide

### 1. Post-Login Migration Check
After successful user login, check if the user needs migration:

```javascript
// Check migration status after login
const checkUserMigrationStatus = async () => {
  try {
    const response = await fetch('/api/migration/status', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success && result.data.needsMigration) {
      // Show migration modal/page
      showMigrationFlow(result.data.currentUser);
    } else if (result.data.migratedToV2) {
      // User is already on V2, proceed normally
      redirectToDashboard();
    }
  } catch (error) {
    console.error('Migration status check failed:', error);
    // Proceed normally if check fails
    redirectToDashboard();
  }
};
```

### 2. Migration Form Implementation
Create a migration form with proper validation:

```javascript
const MigrationForm = ({ currentUser, onSuccess }) => {
  const [formData, setFormData] = useState({
    institute: '',
    department: '',
    graduationYear: '',
    phoneNumber: '',
    studentId: '',
    discordUsername: '',
    portfolioUrl: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const validateForm = () => {
    const newErrors = {};
    
    // Institute is required
    if (!formData.institute.trim()) {
      newErrors.institute = 'Institute is required';
    }
    
    // Graduation year validation
    if (formData.graduationYear && formData.graduationYear < 2025) {
      newErrors.graduationYear = 'Graduation year must be 2025 or later';
    }
    
    // URL validation
    if (formData.portfolioUrl && !isValidUrl(formData.portfolioUrl)) {
      newErrors.portfolioUrl = 'Please enter a valid URL';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/migration/migrate-to-v2', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          institute: formData.institute.trim(),
          department: formData.department.trim() || undefined,
          graduationYear: formData.graduationYear ? parseInt(formData.graduationYear) : undefined,
          phoneNumber: formData.phoneNumber.trim() || undefined,
          studentId: formData.studentId.trim() || undefined,
          discordUsername: formData.discordUsername.trim() || undefined,
          portfolioUrl: formData.portfolioUrl.trim() || undefined
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Show success message with OLID
        showSuccessMessage(`Welcome to V2! Your OpenLearn ID is: ${result.data.migration.generatedOLID}`);
        onSuccess(result.data.user);
      } else {
        setErrors({ general: result.error });
      }
    } catch (error) {
      setErrors({ general: 'Migration failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields implementation */}
    </form>
  );
};
```

### 3. Migration Flow States
Handle different migration states in your application:

```javascript
const useUserMigrationState = () => {
  const [migrationState, setMigrationState] = useState(null);
  
  useEffect(() => {
    const checkMigrationState = async () => {
      const response = await fetch('/api/migration/status', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const result = await response.json();
      
      if (result.success) {
        setMigrationState({
          needsMigration: result.data.needsMigration,
          isOldUser: result.data.isOldUser,
          migratedToV2: result.data.migratedToV2,
          hasOLID: result.data.hasOLID,
          user: result.data.currentUser
        });
      }
    };
    
    checkMigrationState();
  }, []);
  
  return migrationState;
};

// Usage in main app component
const App = () => {
  const migrationState = useUserMigrationState();
  
  if (!migrationState) return <LoadingSpinner />;
  
  if (migrationState.needsMigration) {
    return <MigrationFlow user={migrationState.user} />;
  }
  
  return <Dashboard user={migrationState.user} />;
};
```

### 4. Enhanced User Profile Display
Show V2 fields in user profiles:

```javascript
const UserProfile = ({ user }) => {
  return (
    <div className="user-profile">
      <h2>Profile Information</h2>
      
      {/* Basic Info */}
      <section>
        <h3>Basic Information</h3>
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>OpenLearn ID:</strong> {user.olid || 'Not assigned'}</p>
        <p><strong>Role:</strong> {user.role}</p>
      </section>
      
      {/* V2 Enhanced Fields */}
      {user.migratedToV2 && (
        <section>
          <h3>Academic Information</h3>
          <p><strong>Institute:</strong> {user.institute}</p>
          {user.department && <p><strong>Department:</strong> {user.department}</p>}
          {user.graduationYear && <p><strong>Graduation Year:</strong> {user.graduationYear}</p>}
          {user.studentId && <p><strong>Student ID:</strong> {user.studentId}</p>}
        </section>
      )}
      
      {/* Contact & Social */}
      {(user.phoneNumber || user.discordUsername || user.portfolioUrl) && (
        <section>
          <h3>Contact & Social</h3>
          {user.phoneNumber && <p><strong>Phone:</strong> {user.phoneNumber}</p>}
          {user.discordUsername && <p><strong>Discord:</strong> {user.discordUsername}</p>}
          {user.portfolioUrl && (
            <p><strong>Portfolio:</strong> 
              <a href={user.portfolioUrl} target="_blank" rel="noopener noreferrer">
                {user.portfolioUrl}
              </a>
            </p>
          )}
        </section>
      )}
    </div>
  );
};
```

---

## Testing Examples

### Complete Migration Workflow Testing

```bash
# 1. Login as a legacy user (pre-V2)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "legacy.user@university.edu",
    "password": "userpassword123"
  }'

# Save the access token from response
export ACCESS_TOKEN="your_access_token_here"

# 2. Check migration status
curl -X GET http://localhost:3001/api/migration/status \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Expected response for legacy user:
# {
#   "success": true,
#   "data": {
#     "needsMigration": true,
#     "isOldUser": true,
#     "migratedToV2": null,
#     "hasOLID": false,
#     ...
#   }
# }

# 3. Perform V2 migration with full profile
curl -X POST http://localhost:3001/api/migration/migrate-to-v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "institute": "Indian Institute of Technology, Delhi",
    "department": "Computer Science and Engineering",
    "graduationYear": 2026,
    "phoneNumber": "+91-9876543210",
    "studentId": "2022CS10123",
    "discordUsername": "john_doe#1234",
    "portfolioUrl": "https://github.com/johndoe"
  }'

# 4. Verify migration was successful
curl -X GET http://localhost:3001/api/migration/status \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Expected response after migration:
# {
#   "success": true,
#   "data": {
#     "needsMigration": false,
#     "isOldUser": true,
#     "migratedToV2": true,
#     "hasOLID": true,
#     ...
#   }
# }

# 5. Login as a new V2 user (signed up after V2 implementation)
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "new.v2.user@university.edu",
    "password": "newuserpass123"
  }'

export NEW_ACCESS_TOKEN="new_user_access_token_here"

# 6. Check migration status for new user
curl -X GET http://localhost:3001/api/migration/status \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN"

# Expected response for new V2 user:
# {
#   "success": true,
#   "data": {
#     "needsMigration": false,
#     "isOldUser": false,
#     "migratedToV2": true,
#     "hasOLID": true,
#     ...
#   }
# }
```

### Test Migration with Minimal Data

```bash
# Migrate with only required field (institute)
curl -X POST http://localhost:3001/api/migration/migrate-to-v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "institute": "Stanford University"
  }'

# Expected successful response with generated OLID
```

### Test Migration Error Scenarios

```bash
# Test already migrated user
curl -X POST http://localhost:3001/api/migration/migrate-to-v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "institute": "Some University"
  }'

# Expected error:
# {
#   "success": false,
#   "error": "User has already been migrated to V2 or is not eligible for migration"
# }

# Test missing required field
curl -X POST http://localhost:3001/api/migration/migrate-to-v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "department": "Computer Science"
  }'

# Expected error:
# {
#   "success": false,
#   "error": "Institute is required for V2 migration"
# }

# Test invalid graduation year
curl -X POST http://localhost:3001/api/migration/migrate-to-v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "institute": "Some University",
    "graduationYear": 2020
  }'

# Expected error:
# {
#   "success": false,
#   "error": "Graduation year must be current year (2025) or later"
# }

# Test invalid URL format
curl -X POST http://localhost:3001/api/migration/migrate-to-v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "institute": "Some University",
    "portfolioUrl": "not-a-valid-url"
  }'

# Expected error:
# {
#   "success": false,
#   "error": "Portfolio URL must be a valid URL format"
# }

# Test empty institute (whitespace only)
curl -X POST http://localhost:3001/api/migration/migrate-to-v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d '{
    "institute": "   "
  }'

# Expected error:
# {
#   "success": false,
#   "error": "Institute is required for V2 migration"
# }
```

### Test Different User Types

```bash
# Test PATHFINDER migration
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pathfinder@openlearn.edu",
    "password": "pathfinderpass123"
  }'

export PATHFINDER_TOKEN="pathfinder_access_token_here"

curl -X POST http://localhost:3001/api/migration/migrate-to-v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PATHFINDER_TOKEN" \
  -d '{
    "institute": "University of California, Berkeley",
    "department": "Data Science",
    "portfolioUrl": "https://pathfinder.academy"
  }'

# Test PIONEER migration
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "pioneer@student.edu",
    "password": "pioneerpass123"
  }'

export PIONEER_TOKEN="pioneer_access_token_here"

curl -X POST http://localhost:3001/api/migration/migrate-to-v2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $PIONEER_TOKEN" \
  -d '{
    "institute": "MIT",
    "department": "Electrical Engineering and Computer Science",
    "graduationYear": 2027,
    "studentId": "MIT2025001",
    "discordUsername": "pioneer_student#9999"
  }'
```

---

## Business Logic & Security

### Migration Eligibility
- Only users with `migratedToV2 === null` can perform migration
- Users with `migratedToV2 === true` have already completed migration
- Users with `migratedToV2 === false` had failed migrations (rare, contact support)

### Data Validation
- **Institute**: Required, non-empty after trimming whitespace
- **Graduation Year**: Must be current year (2025) or later if provided
- **Phone Number**: Basic format validation (no strict international format required)
- **Portfolio URL**: Must be valid URL format if provided
- **Discord Username**: No specific validation (flexible format)

### OLID Generation Security
- Unique constraint ensures no duplicate OLIDs
- Automatic conflict resolution with random suffix
- Sequential numbering based on total user count
- Year-based prefix for easy identification

### Audit Trail
All migration activities are logged with:
- User ID and email
- Migration timestamp
- Generated OLID
- Provided migration data (institute, department, etc.)
- IP address and user agent
- Audit action: `USER_MIGRATED_TO_V2`

### Rate Limiting
Migration endpoints are subject to standard API rate limiting:
- Status check: 100 requests per hour per user
- Migration: 5 attempts per hour per user (prevents abuse)

---

## Production Deployment Notes

### Zero-Downtime Migration Strategy
1. **Phase 1**: Deploy V2-capable backend (maintains backward compatibility)
2. **Phase 2**: Update frontend to show migration prompts for eligible users
3. **Phase 3**: Users migrate at their own pace
4. **Phase 4**: Monitor migration progress and support users

### Database Considerations
- All new fields are nullable (production-safe)
- Existing users continue working normally
- Migration adds data incrementally
- No breaking schema changes

### Monitoring & Analytics
Track migration progress with:
- Total eligible users (`migratedToV2 === null`)
- Successfully migrated users (`migratedToV2 === true`)
- Migration completion rate
- Common migration errors
- Time to complete migration

### Support Considerations
- Clear error messages for user self-service
- Audit logs for troubleshooting failed migrations
- Ability to reset migration state if needed (admin function)
- Documentation for support team

---

## API Versioning Note

These migration endpoints are designed for the V2 transition period. Once all users have migrated:
- Status endpoint can be deprecated
- Migration endpoint can be removed
- Signup flow becomes the primary V2 user creation method
- `migratedToV2` field becomes informational only

The migration system is built to be temporary and self-completing as users naturally migrate to the enhanced V2 system.
