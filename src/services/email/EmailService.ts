import { UserRole, UserStatus, EmailJobStatus, EmailCategory } from '@prisma/client';
import { prisma } from '../../config/database';
import { 
  EmailRecipient, 
  SendEmailRequest, 
  BulkEmailRequest,
  EmailJobResult,
  EmailTemplateData 
} from '../../types';
import { EmailProviderFactory } from './EmailProviderFactory';
import { EmailProviderInterface } from './interfaces/EmailProviderInterface';
import TemplateService from './TemplateService';
import QueueService from './QueueService';

/**
 * Main Email Service
 * Orchestrates email sending, template management, and queue operations using the factory pattern
 */
export class EmailService {
  private emailProvider: EmailProviderInterface;
  private templateService: TemplateService;
  private queueService: QueueService;

  constructor() {
    this.emailProvider = EmailProviderFactory.createFromEnvironment();
    this.templateService = new TemplateService();
    this.queueService = new QueueService();
  }

  /**
   * Send a single email or small batch (immediate)
   */
  async sendEmail(request: SendEmailRequest, userId: string): Promise<EmailJobResult> {
    try {
      // Validate recipients
      if (!request.recipients || request.recipients.length === 0) {
        return {
          success: false,
          error: 'No recipients specified'
        };
      }

      // For immediate sending (small batches < 5 recipients)
      if (request.recipients.length <= 5) {
        return await this.sendImmediateEmail(request, userId);
      }

      // For larger batches, use queue
      return await this.queueEmailJob(request, userId, 'INDIVIDUAL');
    } catch (error: any) {
      console.error('Error in sendEmail:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }

  /**
   * Send bulk emails (always queued)
   */
  async sendBulkEmail(request: BulkEmailRequest, userId: string): Promise<EmailJobResult> {
    try {
      // Get recipients based on filter criteria
      const recipients = await this.getRecipientsForBulkEmail(request);

      if (recipients.length === 0) {
        return {
          success: false,
          error: 'No recipients found matching the criteria'
        };
      }

      // Create email job
      return await this.queueEmailJob(
        {
          ...request,
          recipients
        },
        userId,
        request.recipientType
      );
    } catch (error: any) {
      console.error('Error in sendBulkEmail:', error);
      return {
        success: false,
        error: error.message || 'Failed to send bulk email'
      };
    }
  }

  /**
   * Send immediate email for small batches
   */
  private async sendImmediateEmail(request: SendEmailRequest, userId: string): Promise<EmailJobResult> {
    try {
      let htmlContent = request.htmlContent || '';
      let textContent = request.textContent;
      let subject = request.subject;

      // If template is specified, render it
      if (request.templateId) {
        const renderResult = await this.templateService.renderTemplate(
          request.templateId,
          request.templateData || {}
        );

        if (!renderResult.success) {
          return {
            success: false,
            error: renderResult.error
          };
        }

        htmlContent = renderResult.rendered!.html;
        textContent = renderResult.rendered!.text;
        subject = renderResult.rendered!.subject;
      }

      let sentCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Send to each recipient
      for (const recipient of request.recipients) {
        try {
          const result = await this.emailProvider.sendEmail({
            to: recipient.email,
            subject,
            html: htmlContent,
            text: textContent,
          });

          if (result.success) {
            sentCount++;
            
            // Log successful send
            await this.logEmailSent(recipient.id, subject, 'SENT');
          } else {
            failedCount++;
            errors.push(`${recipient.email}: ${result.error}`);
            
            // Log failed send
            await this.logEmailSent(recipient.id, subject, 'FAILED', result.error);
          }
        } catch (error: any) {
          failedCount++;
          errors.push(`${recipient.email}: ${error.message}`);
          await this.logEmailSent(recipient.id, subject, 'FAILED', error.message);
        }
      }

      // Log audit trail
      await this.logEmailAudit('EMAIL_SENT', userId, {
        recipientCount: request.recipients.length,
        sentCount,
        failedCount,
        subject,
        templateId: request.templateId
      });

      return {
        success: sentCount > 0,
        estimatedRecipients: request.recipients.length,
        error: errors.length > 0 ? errors.join('; ') : undefined
      };
    } catch (error: any) {
      console.error('Error sending immediate email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send immediate email'
      };
    }
  }

  /**
   * Queue an email job for background processing
   */
  private async queueEmailJob(
    request: SendEmailRequest,
    userId: string,
    recipientType: string
  ): Promise<EmailJobResult> {
    try {
      let htmlContent = request.htmlContent || '';
      let textContent = request.textContent;
      let subject = request.subject;

      // If template is specified, render it with sample data for storage
      if (request.templateId) {
        const template = await this.templateService.getTemplate(request.templateId);
        if (!template) {
          return {
            success: false,
            error: 'Template not found'
          };
        }

        // Store template content directly (will be re-rendered for each recipient)
        htmlContent = template.htmlContent;
        textContent = template.textContent || undefined;
        subject = template.subject;
      }

      // Create email job record
      const emailJob = await prisma.emailJob.create({
        data: {
          jobId: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique job ID
          templateId: request.templateId,
          subject,
          htmlContent,
          textContent,
          recipientType: recipientType as any,
          recipients: request.recipients as any,
          totalCount: request.recipients.length,
          priority: request.priority || 0,
          scheduledFor: request.scheduledFor,
          createdById: userId,
        },
      });

      // Add to queue
      const queueResult = await this.queueService.addEmailJob({
        emailJobId: emailJob.id,
        priority: request.priority,
        scheduledFor: request.scheduledFor,
      });

      if (!queueResult.success) {
        // Update job status to failed
        await prisma.emailJob.update({
          where: { id: emailJob.id },
          data: { 
            status: EmailJobStatus.FAILED,
            errorMessage: queueResult.error 
          },
        });

        return {
          success: false,
          error: queueResult.error
        };
      }

      // Log audit trail
      await this.logEmailAudit('BULK_EMAIL_STARTED', userId, {
        jobId: emailJob.id,
        recipientType,
        recipientCount: request.recipients.length,
        subject,
        templateId: request.templateId
      });

      return {
        success: true,
        jobId: emailJob.id,
        estimatedRecipients: request.recipients.length
      };
    } catch (error: any) {
      console.error('Error queueing email job:', error);
      return {
        success: false,
        error: error.message || 'Failed to queue email job'
      };
    }
  }

  /**
   * Get recipients for bulk email based on filters
   */
  private async getRecipientsForBulkEmail(request: BulkEmailRequest): Promise<EmailRecipient[]> {
    try {
      // If custom recipients are provided, use them
      if (request.recipients && request.recipients.length > 0) {
        return request.recipients;
      }

      // Build where clause based on filters
      const whereClause: any = {};

      if (request.roleFilter) {
        whereClause.role = request.roleFilter;
      }

      if (request.statusFilter) {
        whereClause.status = request.statusFilter;
      }

      // Handle cohort and league filters
      if (request.cohortFilter || request.leagueFilter) {
        whereClause.enrollments = {
          some: {
            ...(request.cohortFilter && { cohortId: request.cohortFilter }),
            ...(request.leagueFilter && { leagueId: request.leagueFilter }),
          }
        };
      }

      // Get users based on filters
      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      return users.map((user: any) => ({
        id: user.id,
        email: user.email,
        name: user.name,
      }));
    } catch (error: any) {
      console.error('Error getting bulk email recipients:', error);
      return [];
    }
  }

  /**
   * Log email send attempt
   */
  private async logEmailSent(
    recipientId: string,
    subject: string,
    status: 'SENT' | 'FAILED',
    error?: string
  ): Promise<void> {
    try {
      // Note: This would typically create an EmailLog entry
      // For now, we'll just log to console
      console.log(`Email ${status}: ${recipientId} - ${subject}${error ? ` - Error: ${error}` : ''}`);
    } catch (logError) {
      console.error('Error logging email send:', logError);
    }
  }

  /**
   * Log email-related audit events
   */
  private async logEmailAudit(
    action: string,
    userId: string,
    metadata: any
  ): Promise<void> {
    try {
      await prisma.emailAuditLog.create({
        data: {
          userId,
          action: action as any,
          description: `Email action: ${action}`,
          metadata,
        },
      });
    } catch (error) {
      console.error('Error logging email audit:', error);
    }
  }

  /**
   * Get email job status
   */
  async getEmailJob(jobId: string): Promise<any> {
    try {
      return await prisma.emailJob.findUnique({
        where: { id: jobId },
        include: {
          template: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          emailLogs: {
            select: {
              id: true,
              status: true,
              sentAt: true,
              error: true,
              recipient: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });
    } catch (error: any) {
      console.error('Error getting email job:', error);
      return null;
    }
  }

  /**
   * Get email jobs with pagination
   */
  async getEmailJobs(filters?: {
    status?: EmailJobStatus;
    createdById?: string;
    templateId?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]> {
    try {
      return await prisma.emailJob.findMany({
        where: {
          ...(filters?.status && { status: filters.status }),
          ...(filters?.createdById && { createdById: filters.createdById }),
          ...(filters?.templateId && { templateId: filters.templateId }),
        },
        include: {
          template: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      });
    } catch (error: any) {
      console.error('Error getting email jobs:', error);
      return [];
    }
  }

  /**
   * Cancel an email job
   */
  async cancelEmailJob(jobId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.queueService.cancelEmailJob(jobId);
      
      if (result.success) {
        await this.logEmailAudit('BULK_EMAIL_FAILED', userId, {
          jobId,
          reason: 'Cancelled by user'
        });
      }

      return result;
    } catch (error: any) {
      console.error('Error cancelling email job:', error);
      return {
        success: false,
        error: error.message || 'Failed to cancel email job'
      };
    }
  }

  /**
   * Test email provider connection
   */
  async testEmailProviderConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      return await this.emailProvider.testConnection();
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to test email provider connection'
      };
    }
  }

  /**
   * Get email analytics
   */
  async getEmailAnalytics(filters?: {
    startDate?: Date;
    endDate?: Date;
    templateId?: string;
    userId?: string;
  }): Promise<any> {
    try {
      // This would implement comprehensive analytics
      // For now, return basic stats
      const totalJobs = await prisma.emailJob.count({
        where: {
          ...(filters?.startDate && { createdAt: { gte: filters.startDate } }),
          ...(filters?.endDate && { createdAt: { lte: filters.endDate } }),
          ...(filters?.templateId && { templateId: filters.templateId }),
          ...(filters?.userId && { createdById: filters.userId }),
        },
      });

      const completedJobs = await prisma.emailJob.count({
        where: {
          status: EmailJobStatus.COMPLETED,
          ...(filters?.startDate && { createdAt: { gte: filters.startDate } }),
          ...(filters?.endDate && { createdAt: { lte: filters.endDate } }),
          ...(filters?.templateId && { templateId: filters.templateId }),
          ...(filters?.userId && { createdById: filters.userId }),
        },
      });

      const failedJobs = await prisma.emailJob.count({
        where: {
          status: EmailJobStatus.FAILED,
          ...(filters?.startDate && { createdAt: { gte: filters.startDate } }),
          ...(filters?.endDate && { createdAt: { lte: filters.endDate } }),
          ...(filters?.templateId && { templateId: filters.templateId }),
          ...(filters?.userId && { createdById: filters.userId }),
        },
      });

      return {
        totalJobs,
        completedJobs,
        failedJobs,
        successRate: totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0,
      };
    } catch (error: any) {
      console.error('Error getting email analytics:', error);
      return {
        totalJobs: 0,
        completedJobs: 0,
        failedJobs: 0,
        successRate: 0,
      };
    }
  }

  /**
   * Close all connections
   */
  async close(): Promise<void> {
    await Promise.all([
      this.emailProvider.close?.() || Promise.resolve(),
      this.queueService.close(),
    ]);
  }
}

export default EmailService;
