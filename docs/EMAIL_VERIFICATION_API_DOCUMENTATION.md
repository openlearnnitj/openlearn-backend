# Email Verification API Documentation

## Overview

The Email Verification API provides endpoints for verifying user email addresses using One-Time Passwords (OTP). This system is designed to be used after the `migrate-to-v2` endpoint to ensure users have verified email addresses before accessing the platform.

## Base URL
```
/api/auth/email-verification
```

## Authentication
All endpoints require authentication via JWT token in the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

Admin endpoints additionally require the `Pathfinder` role.

## Core Concepts

### Email Verification Flow
1. **Send OTP**: Generate and send 6-digit OTP to user's email
2. **Verify OTP**: User submits OTP to verify email ownership
3. **Mark as Verified**: Update user's `emailVerified` field to `true`

### OTP Properties
- **Format**: 6-digit numeric code
- **Expiry**: 15 minutes from generation
- **Rate Limiting**: 3 OTP requests per 15-minute window per IP
- **Single Use**: Each OTP can only be used once

## API Endpoints

### 1. Send OTP for Email Verification

**POST** `/api/auth/email-verification/send-verification-otp`

Generate and send OTP to the authenticated user's email address.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification OTP sent to your email",
  "data": {
    "email": "user@example.com",
    "expiresAt": "2024-01-15T10:45:00Z"
  }
}
```

**Rate Limiting**: 3 requests per 15 minutes per IP address.

### 2. Verify Email with OTP

**POST** `/api/auth/email-verification/verify-email-otp`

Verify the user's email using the provided OTP.

**Request Body:**
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Email verified successfully",
  "data": {
    "email": "user@example.com",
    "verified": true,
    "verifiedAt": "2024-01-15T10:35:00Z"
  }
}
```

**Error Response (Invalid OTP):**
```json
{
  "success": false,
  "error": "Invalid or expired OTP"
}
```

### 3. Check Email Verification Status

**GET** `/api/auth/email-verification/verification-status`

Check the current user's email verification status.

**Response:**
```json
{
  "success": true,
  "data": {
    "email": "user@example.com",
    "verified": true,
    "verifiedAt": "2024-01-15T10:35:00Z"
  }
}
```

### 4. Resend Verification OTP

**POST** `/api/auth/email-verification/resend-verification-otp`

Resend OTP to the user's email address (rate limited).

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification OTP resent to your email",
  "data": {
    "email": "user@example.com",
    "expiresAt": "2024-01-15T10:45:00Z"
  }
}
```

### 5. Get User Verification Status (Admin)

**GET** `/api/auth/email-verification/verification-status/:userId`

Get email verification status for any user (Pathfinder role required).

**Parameters:**
- `userId` (string): Target user ID

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "PIONEER"
    },
    "verification": {
      "verified": false,
      "verifiedAt": null
    }
  }
}
```

### 6. Admin Verify Email

**POST** `/api/auth/email-verification/admin-verify-email/:userId`

Manually verify a user's email (Pathfinder role required).

**Parameters:**
- `userId` (string): Target user ID

**Request Body:**
```json
{
  "reason": "Manual verification due to email delivery issues"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User email verified successfully by admin",
  "data": {
    "user": {
      "id": "user_123",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "verification": {
      "verified": true,
      "verifiedAt": "2024-01-15T10:35:00Z",
      "verifiedBy": "admin_456",
      "reason": "Manual verification due to email delivery issues"
    }
  }
}
```

## Integration with Migration Flow

### Post-Migration Verification

After a user completes the `migrate-to-v2` endpoint:

1. **Frontend redirects** to email verification page
2. **User initiates** email verification by calling `send-verification-otp`
3. **User receives** OTP via email
4. **User submits** OTP via `verify-email-otp`
5. **Email is marked verified** in the database
6. **User can proceed** to use the platform

### Example Integration Flow

```javascript
// After successful migration
const handlePostMigration = async () => {
  try {
    // Check if email is already verified
    const statusResponse = await fetch('/api/auth/email-verification/verification-status', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const statusData = await statusResponse.json();
    
    if (!statusData.data.verified) {
      // Redirect to email verification page
      router.push('/verify-email');
    } else {
      // Email already verified, proceed to dashboard
      router.push('/dashboard');
    }
  } catch (error) {
    console.error('Error checking verification status:', error);
  }
};
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Valid email is required"
}
```

```json
{
  "success": false,
  "error": "OTP must be a 6-digit number"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Pathfinder role required"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "User not found"
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": "Too many OTP requests, please try again later."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to send verification OTP"
}
```

## Frontend Integration Examples

### React/JavaScript Usage

#### Email Verification Component
```javascript
import React, { useState, useEffect } from 'react';

const EmailVerification = ({ token }) => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('send'); // 'send' or 'verify'
  const [loading, setLoading] = useState(false);

  // Check verification status on mount
  useEffect(() => {
    checkVerificationStatus();
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const response = await fetch('/api/auth/email-verification/verification-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success && data.data.verified) {
        // Already verified, redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        setEmail(data.data.email);
      }
    } catch (error) {
      console.error('Failed to check verification status:', error);
    }
  };

  const sendOTP = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/email-verification/send-verification-otp', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      if (data.success) {
        setStep('verify');
        alert('OTP sent to your email!');
      } else {
        alert(data.error || 'Failed to send OTP');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/email-verification/verify-email-otp', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, otp })
      });

      const data = await response.json();
      if (data.success) {
        alert('Email verified successfully!');
        window.location.href = '/dashboard';
      } else {
        alert(data.error || 'Invalid OTP');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendOTP = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/email-verification/resend-verification-otp', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      const data = await response.json();
      if (data.success) {
        alert('OTP resent to your email!');
      } else {
        alert(data.error || 'Failed to resend OTP');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="email-verification">
      <h2>Verify Your Email</h2>
      
      {step === 'send' ? (
        <div>
          <p>We need to verify your email address: {email}</p>
          <button onClick={sendOTP} disabled={loading}>
            {loading ? 'Sending...' : 'Send Verification Code'}
          </button>
        </div>
      ) : (
        <div>
          <p>Enter the 6-digit code sent to: {email}</p>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP"
            maxLength="6"
          />
          <button onClick={verifyOTP} disabled={loading || otp.length !== 6}>
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
          <button onClick={resendOTP} disabled={loading}>
            Resend Code
          </button>
        </div>
      )}
    </div>
  );
};

export default EmailVerification;
```

#### Admin User Management
```javascript
const AdminUserManagement = ({ token }) => {
  const [users, setUsers] = useState([]);

  const fetchUnverifiedUsers = async () => {
    try {
      const response = await fetch('/api/auth/email-verification/admin/unverified-users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setUsers(data.data.users);
      }
    } catch (error) {
      console.error('Failed to fetch unverified users:', error);
    }
  };

  const adminVerifyUser = async (userId, reason) => {
    try {
      const response = await fetch(`/api/auth/email-verification/admin-verify-email/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      const data = await response.json();
      if (data.success) {
        alert('User email verified successfully!');
        fetchUnverifiedUsers(); // Refresh list
      } else {
        alert(data.error || 'Failed to verify user');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    }
  };

  return (
    <div>
      <h3>Unverified Users</h3>
      {users.map(user => (
        <div key={user.id} className="user-item">
          <span>{user.name} ({user.email})</span>
          <button 
            onClick={() => adminVerifyUser(user.id, 'Manual admin verification')}
          >
            Verify Email
          </button>
        </div>
      ))}
    </div>
  );
};
```

## Security Considerations

### Rate Limiting
- **OTP Generation**: Limited to 3 requests per 15 minutes per IP
- **Protection**: Prevents spam and abuse
- **Headers**: Rate limit info included in response headers

### OTP Security
- **Expiry**: All OTPs expire after 15 minutes
- **Single Use**: Each OTP is invalidated after successful verification
- **Format**: 6-digit numeric codes for user-friendliness

### Authentication
- **JWT Required**: All endpoints require valid authentication
- **Role-based Access**: Admin endpoints require Pathfinder role
- **User Context**: Operations are performed in the context of the authenticated user

## Audit Logging

All email verification operations are logged with:
- User ID performing the action
- Action type (OTP sent, email verified, admin verification)
- Timestamp and relevant metadata
- IP address and user agent (for security)

## Database Schema Updates

The email verification system uses these schema changes:

```prisma
model User {
  // ... existing fields
  emailVerified Boolean @default(false)
  // ... existing fields
}
```

## Best Practices

### Frontend Implementation
1. **Check Status First**: Always check verification status before showing verification UI
2. **Handle Rate Limits**: Show appropriate messages when rate limited
3. **Clear Instructions**: Provide clear steps and expected wait times
4. **Resend Option**: Always provide option to resend OTP
5. **Error Handling**: Handle all possible error states gracefully

### Backend Integration
1. **Post-Migration Hook**: Trigger verification flow after successful migration
2. **Email Templates**: Ensure OTP emails are well-formatted and branded
3. **Monitoring**: Track verification success rates and common failure points
4. **Admin Tools**: Provide admin interfaces for manual verification when needed

## Troubleshooting

### Common Issues
1. **Email Not Received**: Check spam folder, provide resend option
2. **OTP Expired**: Clear error message, provide new OTP option  
3. **Rate Limited**: Show countdown timer, explain limits
4. **Invalid Email**: Validate email format on frontend and backend

### Admin Actions
- Use admin verification for users with email delivery issues
- Monitor verification rates to identify systematic problems
- Check audit logs for suspicious verification patterns
