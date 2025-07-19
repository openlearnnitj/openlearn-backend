# OpenLearn Email Template Management - Implementation Summary

## **Implementation Details**

### **Architecture Components**

#### 1. **EmailTemplateService** (`/src/services/email/EmailTemplateService.ts`)
- **Dual-template management**: Handles both file-based system templates and database-stored user templates
- **System template protection**: Reserved template names cannot be used for new templates
- **Template compilation**: Unified Handlebars compilation for both template types
- **Caching**: System templates are cached for optimal performance
- **Variable schemas**: Predefined schemas for system templates, flexible schemas for database templates

#### 2. **EmailTemplateController** (`/src/controllers/EmailTemplateController.ts`)
- **Full CRUD operations** for frontend-controlled templates
- **Enhanced endpoints**:
  - `GET /templates` - List with filtering, pagination, search
  - `POST /templates` - Create new templates (excludes system template names)
  - `PUT /templates/:id` - Update existing templates
  - `DELETE /templates/:id` - Delete templates (with usage protection)
  - `POST /templates/:id/duplicate` - Duplicate templates as starting points
  - `POST /templates/:id/preview` - Real-time preview with sample data
  - `GET /templates/:id/variables` - Get variable schemas for both template types

#### 3. **Updated Routes** (`/src/routes/emailRoutes.ts`)
- Integrated new EmailTemplateController endpoints
- Maintained existing email sending and job management functionality
- Proper RBAC: PATHFINDER role required for template management

### **System Templates (Backend-Controlled)**

**Location**: `/src/templates/email/*.html`

**Protected Templates**:
- `password-reset-otp` - OTP delivery for password reset
- `password-reset-success` - Password reset confirmation  
- `email-verification` - Email address verification
- `account-locked` - Account security alerts
- `security-alert` - System security notifications

**Characteristics**:
- **Immutable via API** - Cannot be created, modified, or deleted through API
- **File-based storage** - Stored as HTML files with Handlebars syntax
- **Cached compilation** - Templates cached for performance
- **Security-focused** - Content controlled by backend security team
- **Fixed schema** - Variable schemas hardcoded and documented

### **Database Templates (Frontend-Controlled)**

**Storage**: PostgreSQL `EmailTemplate` table

**Use Cases**:
- Welcome emails for new users
- Marketing campaigns and newsletters
- Course updates and announcements
- Achievement notifications
- Custom admin communications

**Characteristics**:
- **Full CRUD operations** - Create, read, update, delete via API
- **Database storage** - Templates stored with metadata
- **Real-time management** - Frontend can modify instantly
- **User ownership** - Templates linked to creator with permissions
- **Flexible schema** - Variable schemas defined per template
- **Usage tracking** - Templates protected if in use by email jobs

---

## **Database Schema Updates**

### **EmailTemplate Model**
```sql
- id: UUID primary key
- name: Unique template identifier
- category: EmailCategory enum
- subject: Handlebars template string
- htmlContent: HTML body with Handlebars
- textContent: Plain text fallback (optional)
- variables: JSON object defining variable schema
- description: Template description
- isActive: Boolean status
- createdById: Foreign key to User
- createdAt: Timestamp
- updatedAt: Timestamp
```

### **Variable Schema Format**
```json
{
  "user": {
    "name": { "type": "string", "required": true },
    "email": { "type": "string", "required": true }
  },
  "course": {
    "name": { "type": "string", "required": true },
    "progress": { "type": "number", "required": false }
  }
}
```

---

## **Frontend Integration**

### **Template Management Workflow**

#### 1. **Create Template**
```javascript
const newTemplate = {
  name: 'welcome-pathfinder',
  category: 'WELCOME',
  subject: 'Welcome {{user.name}}!',
  htmlContent: '<h1>Welcome {{user.name}}</h1>...',
  variables: {
    user: { name: { type: 'string', required: true } }
  }
};

const response = await fetch('/api/emails/templates', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(newTemplate)
});
```

#### 2. **Preview Template**
```javascript
const preview = await fetch(`/api/emails/templates/${id}/preview`, {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    sampleData: { user: { name: 'John Doe' } }
  })
});
```

#### 3. **Send Email Using Template**
```javascript
const email = await fetch('/api/emails/send', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    recipients: [{ id: 'user_123', email: 'user@example.com' }],
    templateId: 'welcome-pathfinder',
    templateData: { user: { name: 'John Doe' } }
  })
});
```

