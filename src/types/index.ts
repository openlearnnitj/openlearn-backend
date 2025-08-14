import { UserRole, UserStatus } from '@prisma/client';

// Auth Types
export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  // V2 Enhancement Fields (optional for backward compatibility)
  institute?: string | null;
  department?: string | null;
  graduationYear?: number | null;
  phoneNumber?: string | null;
  studentId?: string | null;
  discordUsername?: string | null;
  portfolioUrl?: string | null;
  olid?: string | null;
  migratedToV2?: boolean | null;
  emailVerified?: boolean;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Auth Request/Response Types
export interface SignupRequest {
  email: string;
  password: string;
  name: string;
  // V2 Enhancement Fields (optional for backward compatibility)
  institute?: string;
  department?: string;
  graduationYear?: number;
  phoneNumber?: string;
  studentId?: string;
  discordUsername?: string;
  portfolioUrl?: string;
  cohortId?: string; // Allow specifying cohort during signup
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken?: string;
}

// Email Service Types
export interface EmailRecipient {
  id: string;
  email: string;
  name: string;
}

export interface EmailTemplateData {
  [key: string]: any;
}

export interface SendEmailRequest {
  templateId?: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  recipients: EmailRecipient[];
  templateData?: EmailTemplateData;
  scheduledFor?: Date;
  priority?: number;
}

export interface BulkEmailRequest {
  templateId?: string;
  subject: string;
  htmlContent?: string;
  textContent?: string;
  recipientType: 'INDIVIDUAL' | 'ROLE_BASED' | 'COHORT_BASED' | 'LEAGUE_BASED' | 'ALL_USERS';
  roleFilter?: UserRole;
  cohortFilter?: string;
  leagueFilter?: string;
  statusFilter?: UserStatus;
  recipients?: EmailRecipient[];
  templateData?: EmailTemplateData;
  scheduledFor?: Date;
  priority?: number;
}

export interface EmailJobResult {
  success: boolean;
  jobId?: string;
  error?: string;
  estimatedRecipients?: number;
}

export interface EmailTemplateCreateRequest {
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  category: string;
  description?: string;
  variables?: string[];
  isActive?: boolean;
}

export interface EmailTemplateUpdateRequest {
  name?: string;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  category?: string;
  description?: string;
  variables?: string[];
  isActive?: boolean;
}

export interface EmailAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalOpened: number;
  totalClicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
}

// Email Job Data for queue processing
export interface EmailJobData {
  emailJobId: string;
  priority?: number;
  delay?: number;
  scheduledFor?: Date;
}
