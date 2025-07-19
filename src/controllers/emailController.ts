import { Request, Response } from 'express';
import EmailService from '../services/email/EmailService';
import TemplateService from '../services/email/TemplateService';
import { EmailRecipient, SendEmailRequest, BulkEmailRequest } from '../types';
import { UserRole, EmailJobStatus, EmailCategory } from '@prisma/client';

/**
 * Email Controller
 * Handles all email-related API endpoints
 */
export class EmailController {
  private emailService: EmailService;
  private templateService: TemplateService;

  constructor() {
    this.emailService = new EmailService();
    this.templateService = new TemplateService();
  }

  /**
   * Send individual email
   * POST /api/emails/send
   */
  async sendEmail(req: Request, res: Response): Promise<void> {
    try {
      const { recipients, subject, htmlContent, textContent, templateId, templateData, priority } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Validate required fields
      if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        res.status(400).json({ error: 'Recipients are required' });
        return;
      }

      if (!templateId && (!subject || !htmlContent)) {
        res.status(400).json({ error: 'Subject and content are required when not using a template' });
        return;
      }

      // Validate recipients format
      for (const recipient of recipients) {
        if (!recipient.email || !recipient.id) {
          res.status(400).json({ error: 'Each recipient must have an email and id' });
          return;
        }
      }

      const emailRequest: SendEmailRequest = {
        recipients,
        subject,
        htmlContent,
        textContent,
        templateId,
        templateData,
        priority: priority || 0
      };

      const result = await this.emailService.sendEmail(emailRequest, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Email sent successfully',
          jobId: result.jobId,
          estimatedRecipients: result.estimatedRecipients
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      console.error('Error in sendEmail controller:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Send bulk email
   * POST /api/emails/bulk
   */
  async sendBulkEmail(req: Request, res: Response): Promise<void> {
    try {
      const { 
        recipientType, 
        roleFilter, 
        cohortFilter, 
        leagueFilter, 
        statusFilter,
        recipients,
        subject, 
        htmlContent, 
        textContent, 
        templateId, 
        templateData, 
        priority,
        scheduledFor
      } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Validate required fields
      if (!recipientType) {
        res.status(400).json({ error: 'Recipient type is required' });
        return;
      }

      if (!templateId && (!subject || !htmlContent)) {
        res.status(400).json({ error: 'Subject and content are required when not using a template' });
        return;
      }

      const emailRequest: BulkEmailRequest = {
        recipientType,
        roleFilter,
        cohortFilter,
        leagueFilter,
        statusFilter,
        recipients,
        subject,
        htmlContent,
        textContent,
        templateId,
        templateData,
        priority: priority || 0,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined
      };

      const result = await this.emailService.sendBulkEmail(emailRequest, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Bulk email job created successfully',
          jobId: result.jobId,
          estimatedRecipients: result.estimatedRecipients
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      console.error('Error in sendBulkEmail controller:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get email job status
   * GET /api/emails/jobs/:jobId
   */
  async getEmailJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const emailJob = await this.emailService.getEmailJob(jobId);

      if (!emailJob) {
        res.status(404).json({ error: 'Email job not found' });
        return;
      }

      // Check if user has permission to view this job
      if (emailJob.createdById !== userId && req.user?.role !== UserRole.PATHFINDER) {
        res.status(403).json({ error: 'Permission denied' });
        return;
      }

      res.status(200).json(emailJob);
    } catch (error: any) {
      console.error('Error in getEmailJob controller:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get email jobs list
   * GET /api/emails/jobs
   */
  async getEmailJobs(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { status, templateId, limit, offset } = req.query;
      
      const filters: any = {
        status: status as EmailJobStatus,
        templateId: templateId as string,
        limit: limit ? parseInt(limit as string, 10) : 50,
        offset: offset ? parseInt(offset as string, 10) : 0,
      };

      // Non-admin users can only see their own jobs
      if (userRole !== UserRole.PATHFINDER) {
        filters.createdById = userId;
      }

      const emailJobs = await this.emailService.getEmailJobs(filters);

      res.status(200).json({
        jobs: emailJobs,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          hasMore: emailJobs.length === filters.limit
        }
      });
    } catch (error: any) {
      console.error('Error in getEmailJobs controller:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Cancel email job
   * POST /api/emails/jobs/:jobId/cancel
   */
  async cancelEmailJob(req: Request, res: Response): Promise<void> {
    try {
      const { jobId } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Get the job to check permissions
      const emailJob = await this.emailService.getEmailJob(jobId);
      
      if (!emailJob) {
        res.status(404).json({ error: 'Email job not found' });
        return;
      }

      // Check if user has permission to cancel this job
      if (emailJob.createdById !== userId && req.user?.role !== UserRole.PATHFINDER) {
        res.status(403).json({ error: 'Permission denied' });
        return;
      }

      // Check if job can be cancelled
      if (emailJob.status === EmailJobStatus.COMPLETED || emailJob.status === EmailJobStatus.FAILED) {
        res.status(400).json({ error: 'Cannot cancel completed or failed job' });
        return;
      }

      const result = await this.emailService.cancelEmailJob(jobId, userId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Email job cancelled successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      console.error('Error in cancelEmailJob controller:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Test SMTP connection
   * GET /api/emails/test-smtp
   */
  async testSMTP(req: Request, res: Response): Promise<void> {
    try {
      const userRole = req.user?.role;

      // Only admin users can test SMTP
      if (userRole !== UserRole.PATHFINDER) {
        res.status(403).json({ error: 'Permission denied' });
        return;
      }

      const result = await this.emailService.testSMTPConnection();

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'SMTP connection successful'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      console.error('Error in testSMTP controller:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get email analytics
   * GET /api/emails/analytics
   */
  async getEmailAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { startDate, endDate, templateId } = req.query;
      
      const filters: any = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        templateId: templateId as string,
      };

      // Non-admin users can only see their own analytics
      if (userRole !== UserRole.PATHFINDER) {
        filters.userId = userId;
      }

      const analytics = await this.emailService.getEmailAnalytics(filters);

      res.status(200).json(analytics);
    } catch (error: any) {
      console.error('Error in getEmailAnalytics controller:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Create email template
   * POST /api/emails/templates
   */
  async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, category, subject, htmlContent, textContent, variables, isActive } = req.body;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Only admin users can create templates
      if (userRole !== UserRole.PATHFINDER) {
        res.status(403).json({ error: 'Permission denied' });
        return;
      }

      // Validate required fields
      if (!name || !subject || !htmlContent || !category) {
        res.status(400).json({ error: 'Name, subject, HTML content, and category are required' });
        return;
      }

      const result = await this.templateService.createTemplate({
        name,
        description,
        category: category as EmailCategory,
        subject,
        htmlContent,
        textContent,
        variables: variables || [],
        isActive: isActive !== false,
      }, userId);

      if (result.success && result.template) {
        res.status(201).json({
          success: true,
          message: 'Template created successfully',
          template: result.template
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      console.error('Error in createTemplate controller:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get email templates
   * GET /api/emails/templates
   */
  async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const { category, isActive, search, limit, offset } = req.query;
      
      const filters = {
        category: category as EmailCategory,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        search: search as string,
        limit: limit ? parseInt(limit as string, 10) : 50,
        offset: offset ? parseInt(offset as string, 10) : 0,
      };

      const templates = await this.templateService.getTemplates(filters);

      res.status(200).json({
        templates,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          hasMore: templates.length === filters.limit
        }
      });
    } catch (error: any) {
      console.error('Error in getTemplates controller:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get email template by ID
   * GET /api/emails/templates/:templateId
   */
  async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;

      const template = await this.templateService.getTemplate(templateId);

      if (!template) {
        res.status(404).json({ error: 'Template not found' });
        return;
      }

      res.status(200).json(template);
    } catch (error: any) {
      console.error('Error in getTemplate controller:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update email template
   * PUT /api/emails/templates/:templateId
   */
  async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const updates = req.body;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Only admin users can update templates
      if (userRole !== UserRole.PATHFINDER) {
        res.status(403).json({ error: 'Permission denied' });
        return;
      }

      const result = await this.templateService.updateTemplate(templateId, updates, userId);

      if (result.success && result.template) {
        res.status(200).json({
          success: true,
          message: 'Template updated successfully',
          template: result.template
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      console.error('Error in updateTemplate controller:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Delete email template
   * DELETE /api/emails/templates/:templateId
   */
  async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const userId = req.user?.userId;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Only admin users can delete templates
      if (userRole !== UserRole.PATHFINDER) {
        res.status(403).json({ error: 'Permission denied' });
        return;
      }

      const result = await this.templateService.deleteTemplate(templateId);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Template deleted successfully'
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error: any) {
      console.error('Error in deleteTemplate controller:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default EmailController;
