import { EmailTemplate, EmailCategory, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';

export interface CreateTemplateRequest {
  name: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  variables: Record<string, any>;
  category: EmailCategory;
  description?: string;
}

export interface UpdateTemplateRequest {
  id: string;
  name?: string;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  variables?: Record<string, any>;
  category?: EmailCategory;
  description?: string;
  isActive?: boolean;
}

export interface TemplateSearchRequest {
  category?: EmailCategory;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CompiledTemplate {
  subject: string;
  htmlContent: string;
  textContent?: string;
}

/**
 * Enhanced Email Template Service
 * Manages both database-stored templates (frontend-controlled) and file-based templates (backend-controlled)
 */
export class EmailTemplateService {
  
  private static templateCache = new Map<string, HandlebarsTemplateDelegate>();
  
  // Template directory resolution:
  // - Development: /path/to/project/src/templates/email
  // - Production (Docker): /app/src/templates/email (templates copied at build time)
  private static readonly TEMPLATE_DIR = path.join(
    process.cwd(), 
    'src', 
    'templates', 
    'email'
  );
  
  // Backend-controlled template types (stored as files)
  private static readonly SYSTEM_TEMPLATES = new Set([
    'password-reset',
    'password-reset-otp',
    'password-reset-success',
    'email-verification',
    'account-locked',
    'security-alert'
  ]);

  /**
   * Create a new email template (database-stored, frontend-controlled)
   */
  static async createTemplate(request: CreateTemplateRequest, userId: string): Promise<EmailTemplate> {
    try {
      // Validate template name is unique
      const existing = await prisma.emailTemplate.findUnique({
        where: { name: request.name }
      });

      if (existing) {
        throw new Error(`Template with name '${request.name}' already exists`);
      }

      // Prevent creation of system template names
      if (this.SYSTEM_TEMPLATES.has(request.name)) {
        throw new Error(`Template name '${request.name}' is reserved for system use`);
      }

      // Validate HTML content
      await this.validateTemplate(request.htmlContent, request.variables);

      const template = await prisma.emailTemplate.create({
        data: {
          name: request.name,
          subject: request.subject,
          htmlContent: request.htmlContent,
          textContent: request.textContent,
          variables: request.variables,
          category: request.category,
          description: request.description,
          createdById: userId
        }
      });

      return template;

    } catch (error: any) {
      console.error('Error creating email template:', error);
      throw new Error(`Failed to create template: ${error.message}`);
    }
  }

  /**
   * Update an existing email template
   */
  static async updateTemplate(request: UpdateTemplateRequest, userId: string): Promise<EmailTemplate> {
    try {
      const template = await prisma.emailTemplate.findUnique({
        where: { id: request.id }
      });

      if (!template) {
        throw new Error('Template not found');
      }

      // Check if user has permission (creator or admin)
      // This should be enhanced with proper role checking
      if (template.createdById !== userId) {
        // Add admin role check here when implementing
        throw new Error('Permission denied');
      }

      // If updating HTML content, validate it
      if (request.htmlContent) {
        const variables = request.variables || template.variables as Record<string, any>;
        await this.validateTemplate(request.htmlContent, variables);
      }

      const updatedTemplate = await prisma.emailTemplate.update({
        where: { id: request.id },
        data: {
          ...(request.name && { name: request.name }),
          ...(request.subject && { subject: request.subject }),
          ...(request.htmlContent && { htmlContent: request.htmlContent }),
          ...(request.textContent !== undefined && { textContent: request.textContent }),
          ...(request.variables && { variables: request.variables }),
          ...(request.category && { category: request.category }),
          ...(request.description !== undefined && { description: request.description }),
          ...(request.isActive !== undefined && { isActive: request.isActive })
        }
      });

      // Clear cache for this template
      this.templateCache.delete(template.name);

      return updatedTemplate;

    } catch (error: any) {
      console.error('Error updating email template:', error);
      throw new Error(`Failed to update template: ${error.message}`);
    }
  }

  /**
   * Get all templates with filtering and pagination
   */
  static async getTemplates(request: TemplateSearchRequest = {}): Promise<{
    templates: EmailTemplate[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const {
        category,
        isActive,
        search,
        page = 1,
        limit = 20
      } = request;

      const where: Prisma.EmailTemplateWhereInput = {};

      if (category) {
        where.category = category;
      }

      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { subject: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const skip = (page - 1) * limit;

      const [templates, total] = await Promise.all([
        prisma.emailTemplate.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            createdBy: {
              select: { id: true, name: true, email: true }
            }
          }
        }),
        prisma.emailTemplate.count({ where })
      ]);

      return {
        templates,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };

    } catch (error: any) {
      console.error('Error fetching templates:', error);
      throw new Error(`Failed to fetch templates: ${error.message}`);
    }
  }

  /**
   * Get a single template by ID or name
   */
  static async getTemplate(identifier: string): Promise<EmailTemplate | null> {
    try {
      // Try by ID first, then by name
      let template = await prisma.emailTemplate.findUnique({
        where: { id: identifier },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      if (!template) {
        template = await prisma.emailTemplate.findUnique({
          where: { name: identifier },
          include: {
            createdBy: {
              select: { id: true, name: true, email: true }
            }
          }
        });
      }

      return template;

    } catch (error: any) {
      console.error('Error fetching template:', error);
      throw new Error(`Failed to fetch template: ${error.message}`);
    }
  }

  /**
   * Delete a template
   */
  static async deleteTemplate(id: string, userId: string): Promise<void> {
    try {
      const template = await prisma.emailTemplate.findUnique({
        where: { id }
      });

      if (!template) {
        throw new Error('Template not found');
      }

      // Check if user has permission (creator or admin)
      if (template.createdById !== userId) {
        // Add admin role check here when implementing
        throw new Error('Permission denied');
      }

      // Check if template is being used in any email jobs
      const usageCount = await prisma.emailJob.count({
        where: { templateId: id }
      });

      if (usageCount > 0) {
        throw new Error('Cannot delete template that is being used in email jobs');
      }

      await prisma.emailTemplate.delete({
        where: { id }
      });

      // Clear cache
      this.templateCache.delete(template.name);

    } catch (error: any) {
      console.error('Error deleting template:', error);
      throw new Error(`Failed to delete template: ${error.message}`);
    }
  }

  /**
   * Compile a template with provided data
   * Works for both database templates and file-based system templates
   */
  static async compileTemplate(
    templateName: string, 
    data: Record<string, any>
  ): Promise<CompiledTemplate> {
    try {
      // Check if it's a system template (file-based)
      if (this.SYSTEM_TEMPLATES.has(templateName)) {
        return await this.compileSystemTemplate(templateName, data);
      }

      // It's a database template (frontend-controlled)
      return await this.compileDatabaseTemplate(templateName, data);

    } catch (error: any) {
      console.error('Error compiling template:', error);
      throw new Error(`Failed to compile template '${templateName}': ${error.message}`);
    }
  }

  /**
   * Compile a database-stored template
   */
  private static async compileDatabaseTemplate(
    templateName: string, 
    data: Record<string, any>
  ): Promise<CompiledTemplate> {
    const template = await prisma.emailTemplate.findUnique({
      where: { name: templateName }
    });

    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    if (!template.isActive) {
      throw new Error(`Template '${templateName}' is not active`);
    }

    // Compile subject
    const subjectTemplate = handlebars.compile(template.subject);
    const compiledSubject = subjectTemplate(data);

    // Compile HTML content
    const htmlTemplate = handlebars.compile(template.htmlContent);
    const compiledHtml = htmlTemplate(data);

    // Compile text content if available
    let compiledText: string | undefined;
    if (template.textContent) {
      const textTemplate = handlebars.compile(template.textContent);
      compiledText = textTemplate(data);
    }

    return {
      subject: compiledSubject,
      htmlContent: compiledHtml,
      textContent: compiledText
    };
  }

  /**
   * Compile a system template (file-based)
   */
  private static async compileSystemTemplate(
    templateName: string, 
    data: Record<string, any>
  ): Promise<CompiledTemplate> {
    const cacheKey = templateName;
    
    // Check cache first
    if (!this.templateCache.has(cacheKey)) {
      const templatePath = path.join(this.TEMPLATE_DIR, `${templateName}.html`);
      
      try {
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        const compiled = handlebars.compile(templateContent);
        this.templateCache.set(cacheKey, compiled);
        console.log(`✅ Loaded template: ${templateName} from ${templatePath}`);
      } catch (error) {
        // Enhanced error with debugging info
        console.error(`❌ Template not found: ${templateName}`);
        console.error(`   Expected path: ${templatePath}`);
        console.error(`   Working directory: ${process.cwd()}`);
        console.error(`   Template directory: ${this.TEMPLATE_DIR}`);
        
        // Try to list available templates for debugging
        try {
          const files = await fs.readdir(this.TEMPLATE_DIR);
          console.error(`   Available templates: ${files.join(', ')}`);
        } catch (listError) {
          console.error(`   Could not list template directory: ${listError}`);
        }
        
        throw new Error(`System template file '${templateName}.html' not found at ${templatePath}`);
      }
    }

    const compiledTemplate = this.templateCache.get(cacheKey)!;
    const compiledHtml = compiledTemplate(data);

    // For system templates, extract subject from HTML or use default
    const subjectMatch = compiledHtml.match(/<title>(.*?)<\/title>/i);
    const subject = subjectMatch ? subjectMatch[1] : `${templateName.replace('-', ' ')} - OpenLearn`;

    return {
      subject,
      htmlContent: compiledHtml
    };
  }

  /**
   * Get template variables/schema for frontend
   */
  static async getTemplateVariables(templateName: string): Promise<Record<string, any>> {
    try {
      // Check if it's a system template
      if (this.SYSTEM_TEMPLATES.has(templateName)) {
        return this.getSystemTemplateVariables(templateName);
      }

      // Get database template variables
      const template = await prisma.emailTemplate.findUnique({
        where: { name: templateName },
        select: { variables: true }
      });

      if (!template) {
        throw new Error(`Template '${templateName}' not found`);
      }

      return template.variables as Record<string, any>;

    } catch (error: any) {
      console.error('Error fetching template variables:', error);
      throw new Error(`Failed to fetch template variables: ${error.message}`);
    }
  }

  /**
   * Get system template variables (hardcoded schemas)
   */
  private static getSystemTemplateVariables(templateName: string): Record<string, any> {
    const systemVariables: Record<string, Record<string, any>> = {
      'password-reset': {
        userName: { type: 'string', required: true },
        otp: { type: 'string', required: true },
        expiryTime: { type: 'string', required: true },
        expiryMinutes: { type: 'number', required: true },
        supportEmail: { type: 'string', required: true }
      },
      'password-reset-otp': {
        userName: { type: 'string', required: true },
        userEmail: { type: 'string', required: true },
        otp: { type: 'string', required: true },
        expiryTime: { type: 'string', required: true },
        expiryMinutes: { type: 'number', required: true },
        requestTime: { type: 'string', required: true },
        ipAddress: { type: 'string', required: false }
      },
      'password-reset-success': {
        userName: { type: 'string', required: true },
        userEmail: { type: 'string', required: true },
        resetTime: { type: 'string', required: true },
        loginUrl: { type: 'string', required: true },
        ipAddress: { type: 'string', required: false }
      },
      'email-verification': {
        userName: { type: 'string', required: true },
        verificationUrl: { type: 'string', required: true },
        expiryTime: { type: 'string', required: true }
      }
    };

    return systemVariables[templateName] || {};
  }

  /**
   * Validate template syntax and variables
   */
  private static async validateTemplate(htmlContent: string, variables: Record<string, any>): Promise<void> {
    try {
      // Try to compile the template
      const template = handlebars.compile(htmlContent);
      
      // Create mock data based on variables schema
      const mockData: Record<string, any> = {};
      for (const [key, schema] of Object.entries(variables)) {
        if (typeof schema === 'object' && schema.type) {
          switch (schema.type) {
            case 'string':
              mockData[key] = 'sample text';
              break;
            case 'number':
              mockData[key] = 42;
              break;
            case 'boolean':
              mockData[key] = true;
              break;
            case 'url':
              mockData[key] = 'https://example.com';
              break;
            default:
              mockData[key] = 'sample value';
          }
        } else {
          mockData[key] = 'sample value';
        }
      }

      // Try to render with mock data
      template(mockData);

    } catch (error: any) {
      throw new Error(`Template validation failed: ${error.message}`);
    }
  }

  /**
   * Duplicate a template
   */
  static async duplicateTemplate(
    templateId: string, 
    newName: string, 
    userId: string
  ): Promise<EmailTemplate> {
    try {
      const originalTemplate = await prisma.emailTemplate.findUnique({
        where: { id: templateId }
      });

      if (!originalTemplate) {
        throw new Error('Template not found');
      }

      // Check if new name is unique
      const existing = await prisma.emailTemplate.findUnique({
        where: { name: newName }
      });

      if (existing) {
        throw new Error(`Template with name '${newName}' already exists`);
      }

      const duplicatedTemplate = await prisma.emailTemplate.create({
        data: {
          name: newName,
          subject: originalTemplate.subject,
          htmlContent: originalTemplate.htmlContent,
          textContent: originalTemplate.textContent,
          variables: originalTemplate.variables as Prisma.InputJsonValue,
          category: originalTemplate.category,
          description: `Copy of ${originalTemplate.description || originalTemplate.name}`,
          createdById: userId
        }
      });

      return duplicatedTemplate;

    } catch (error: any) {
      console.error('Error duplicating template:', error);
      throw new Error(`Failed to duplicate template: ${error.message}`);
    }
  }

  /**
   * Get template usage statistics
   */
  static async getTemplateStats(templateId: string): Promise<{
    totalSent: number;
    successfulSent: number;
    failedSent: number;
    lastUsed?: Date;
  }> {
    try {
      const stats = await prisma.emailJob.aggregate({
        where: { templateId },
        _count: { id: true },
        _max: { createdAt: true }
      });

      const successfulJobs = await prisma.emailJob.count({
        where: { 
          templateId,
          status: 'COMPLETED'
        }
      });

      const failedJobs = await prisma.emailJob.count({
        where: { 
          templateId,
          status: 'FAILED'
        }
      });

      return {
        totalSent: stats._count.id || 0,
        successfulSent: successfulJobs,
        failedSent: failedJobs,
        lastUsed: stats._max.createdAt || undefined
      };

    } catch (error: any) {
      console.error('Error fetching template stats:', error);
      throw new Error(`Failed to fetch template statistics: ${error.message}`);
    }
  }
}

export default EmailTemplateService;
