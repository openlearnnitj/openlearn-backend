import { Request, Response } from 'express';
import { EmailTemplateService, CreateTemplateRequest, UpdateTemplateRequest, TemplateSearchRequest } from '../services/email/EmailTemplateService';
import { ValidationUtils } from '../utils/validation';
import { EmailCategory } from '@prisma/client';

/**
 * Controller for managing email templates
 * Handles both frontend-controlled database templates and system templates
 */
export class EmailTemplateController {

  /**
   * Create a new email template
   * POST /api/email/templates
   */
  static async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { name, subject, htmlContent, textContent, variables, category, description } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      // Validate required fields
      if (!name || !subject || !htmlContent || !category) {
        res.status(400).json({
          success: false,
          message: 'Name, subject, HTML content, and category are required',
          error: 'MISSING_REQUIRED_FIELDS'
        });
        return;
      }

      // Validate category
      if (!Object.values(EmailCategory).includes(category)) {
        res.status(400).json({
          success: false,
          message: 'Invalid email category',
          error: 'INVALID_CATEGORY'
        });
        return;
      }

      const request: CreateTemplateRequest = {
        name: name.trim(),
        subject: subject.trim(),
        htmlContent,
        textContent: textContent || undefined,
        variables: variables || {},
        category,
        description: description?.trim()
      };

      const template = await EmailTemplateService.createTemplate(request, userId);

      res.status(201).json({
        success: true,
        message: 'Email template created successfully',
        data: template
      });

    } catch (error: any) {
      console.error('Error creating email template:', error);
      
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          message: error.message,
          error: 'TEMPLATE_EXISTS'
        });
        return;
      }

      if (error.message.includes('reserved')) {
        res.status(400).json({
          success: false,
          message: error.message,
          error: 'RESERVED_NAME'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to create email template',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * Get all email templates with filtering and pagination
   * GET /api/email/templates
   */
  static async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      const {
        category,
        isActive,
        search,
        page = '1',
        limit = '20'
      } = req.query;

      const request: TemplateSearchRequest = {
        ...(category && { category: category as EmailCategory }),
        ...(isActive !== undefined && { isActive: isActive === 'true' }),
        ...(search && { search: search as string }),
        page: parseInt(page as string) || 1,
        limit: Math.min(parseInt(limit as string) || 20, 100) // Max 100 per page
      };

      const result = await EmailTemplateService.getTemplates(request);

      res.status(200).json({
        success: true,
        message: 'Email templates retrieved successfully',
        data: result
      });

    } catch (error: any) {
      console.error('Error fetching email templates:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch email templates',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * Get a single email template by ID or name
   * GET /api/email/templates/:identifier
   */
  static async getTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { identifier } = req.params;

      if (!identifier) {
        res.status(400).json({
          success: false,
          message: 'Template identifier is required',
          error: 'MISSING_IDENTIFIER'
        });
        return;
      }

      const template = await EmailTemplateService.getTemplate(identifier);

      if (!template) {
        res.status(404).json({
          success: false,
          message: 'Template not found',
          error: 'TEMPLATE_NOT_FOUND'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Email template retrieved successfully',
        data: template
      });

    } catch (error: any) {
      console.error('Error fetching email template:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch email template',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * Update an email template
   * PUT /api/email/templates/:id
   */
  static async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, subject, htmlContent, textContent, variables, category, description, isActive } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Template ID is required',
          error: 'MISSING_ID'
        });
        return;
      }

      const request: UpdateTemplateRequest = {
        id,
        ...(name && { name: name.trim() }),
        ...(subject && { subject: subject.trim() }),
        ...(htmlContent && { htmlContent }),
        ...(textContent !== undefined && { textContent }),
        ...(variables && { variables }),
        ...(category && { category }),
        ...(description !== undefined && { description: description?.trim() }),
        ...(isActive !== undefined && { isActive })
      };

      const updatedTemplate = await EmailTemplateService.updateTemplate(request, userId);

      res.status(200).json({
        success: true,
        message: 'Email template updated successfully',
        data: updatedTemplate
      });

    } catch (error: any) {
      console.error('Error updating email template:', error);
      
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          message: error.message,
          error: 'TEMPLATE_NOT_FOUND'
        });
        return;
      }

      if (error.message.includes('Permission denied')) {
        res.status(403).json({
          success: false,
          message: error.message,
          error: 'PERMISSION_DENIED'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to update email template',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * Delete an email template
   * DELETE /api/email/templates/:id
   */
  static async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Template ID is required',
          error: 'MISSING_ID'
        });
        return;
      }

      await EmailTemplateService.deleteTemplate(id, userId);

      res.status(200).json({
        success: true,
        message: 'Email template deleted successfully'
      });

    } catch (error: any) {
      console.error('Error deleting email template:', error);
      
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          message: error.message,
          error: 'TEMPLATE_NOT_FOUND'
        });
        return;
      }

      if (error.message.includes('Permission denied')) {
        res.status(403).json({
          success: false,
          message: error.message,
          error: 'PERMISSION_DENIED'
        });
        return;
      }

      if (error.message.includes('being used')) {
        res.status(409).json({
          success: false,
          message: error.message,
          error: 'TEMPLATE_IN_USE'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to delete email template',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * Duplicate an email template
   * POST /api/email/templates/:id/duplicate
   */
  static async duplicateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newName } = req.body;
      const userId = req.user?.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'UNAUTHORIZED'
        });
        return;
      }

      if (!id || !newName) {
        res.status(400).json({
          success: false,
          message: 'Template ID and new name are required',
          error: 'MISSING_REQUIRED_FIELDS'
        });
        return;
      }

      const duplicatedTemplate = await EmailTemplateService.duplicateTemplate(id, newName.trim(), userId);

      res.status(201).json({
        success: true,
        message: 'Email template duplicated successfully',
        data: duplicatedTemplate
      });

    } catch (error: any) {
      console.error('Error duplicating email template:', error);
      
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          message: error.message,
          error: 'TEMPLATE_NOT_FOUND'
        });
        return;
      }

      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          message: error.message,
          error: 'TEMPLATE_EXISTS'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to duplicate email template',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * Get template variables/schema
   * GET /api/email/templates/:templateName/variables
   */
  static async getTemplateVariables(req: Request, res: Response): Promise<void> {
    try {
      const { templateName } = req.params;

      if (!templateName) {
        res.status(400).json({
          success: false,
          message: 'Template name is required',
          error: 'MISSING_TEMPLATE_NAME'
        });
        return;
      }

      const variables = await EmailTemplateService.getTemplateVariables(templateName);

      res.status(200).json({
        success: true,
        message: 'Template variables retrieved successfully',
        data: {
          templateName,
          variables
        }
      });

    } catch (error: any) {
      console.error('Error fetching template variables:', error);
      
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          message: error.message,
          error: 'TEMPLATE_NOT_FOUND'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to fetch template variables',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * Preview a template with sample data
   * POST /api/email/templates/:templateName/preview
   */
  static async previewTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { templateName } = req.params;
      const { data } = req.body;

      if (!templateName) {
        res.status(400).json({
          success: false,
          message: 'Template name is required',
          error: 'MISSING_TEMPLATE_NAME'
        });
        return;
      }

      const compiledTemplate = await EmailTemplateService.compileTemplate(templateName, data || {});

      res.status(200).json({
        success: true,
        message: 'Template preview generated successfully',
        data: {
          templateName,
          compiled: compiledTemplate
        }
      });

    } catch (error: any) {
      console.error('Error previewing template:', error);
      
      if (error.message.includes('not found')) {
        res.status(404).json({
          success: false,
          message: error.message,
          error: 'TEMPLATE_NOT_FOUND'
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to preview template',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * Get template usage statistics
   * GET /api/email/templates/:id/stats
   */
  static async getTemplateStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'Template ID is required',
          error: 'MISSING_ID'
        });
        return;
      }

      const stats = await EmailTemplateService.getTemplateStats(id);

      res.status(200).json({
        success: true,
        message: 'Template statistics retrieved successfully',
        data: stats
      });

    } catch (error: any) {
      console.error('Error fetching template stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch template statistics',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }

  /**
   * Get available template categories
   * GET /api/email/templates/categories
   */
  static async getTemplateCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = Object.values(EmailCategory).map(category => ({
        value: category,
        label: category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
      }));

      res.status(200).json({
        success: true,
        message: 'Template categories retrieved successfully',
        data: categories
      });

    } catch (error: any) {
      console.error('Error fetching template categories:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch template categories',
        error: 'INTERNAL_SERVER_ERROR'
      });
    }
  }
}

export default EmailTemplateController;
