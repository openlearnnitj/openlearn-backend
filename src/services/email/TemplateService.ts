import handlebars from 'handlebars';
import { prisma } from '../../config/database';
import { EmailTemplate, EmailCategory } from '@prisma/client';
import { EmailTemplateCreateRequest, EmailTemplateUpdateRequest, EmailTemplateData } from '../../types';

/**
 * Template Service for managing email templates
 * Handles CRUD operations and template rendering
 */
export class TemplateService {
  
  /**
   * Create a new email template
   */
  async createTemplate(
    templateData: EmailTemplateCreateRequest,
    createdById: string
  ): Promise<{ success: boolean; template?: EmailTemplate; error?: string }> {
    try {
      // Validate template name uniqueness
      const existingTemplate = await prisma.emailTemplate.findUnique({
        where: { name: templateData.name }
      });

      if (existingTemplate) {
        return {
          success: false,
          error: 'Template with this name already exists'
        };
      }

      // Validate HTML content
      const validationResult = this.validateTemplate(templateData.htmlContent);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: `Template validation failed: ${validationResult.errors.join(', ')}`
        };
      }

      // Extract variables from template
      const extractedVariables = this.extractVariables(templateData.htmlContent);

      const template = await prisma.emailTemplate.create({
        data: {
          name: templateData.name,
          subject: templateData.subject,
          htmlContent: templateData.htmlContent,
          textContent: templateData.textContent,
          category: templateData.category as EmailCategory,
          description: templateData.description,
          variables: {
            available: extractedVariables,
            custom: templateData.variables || []
          },
          createdById,
        },
      });

      console.log(`Email template created: ${template.name} (ID: ${template.id})`);

      return { success: true, template };
    } catch (error: any) {
      console.error('Error creating email template:', error);
      return {
        success: false,
        error: error.message || 'Failed to create email template'
      };
    }
  }

  /**
   * Get all templates with optional filtering
   */
  async getTemplates(filters?: {
    category?: EmailCategory;
    isActive?: boolean;
    createdById?: string;
  }): Promise<EmailTemplate[]> {
    try {
      return await prisma.emailTemplate.findMany({
        where: {
          ...(filters?.category && { category: filters.category }),
          ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
          ...(filters?.createdById && { createdById: filters.createdById }),
        },
        include: {
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
      });
    } catch (error: any) {
      console.error('Error fetching email templates:', error);
      return [];
    }
  }

  /**
   * Get a single template by ID
   */
  async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    try {
      return await prisma.emailTemplate.findUnique({
        where: { id: templateId },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch (error: any) {
      console.error('Error fetching email template:', error);
      return null;
    }
  }

  /**
   * Update an email template
   */
  async updateTemplate(
    templateId: string,
    updateData: EmailTemplateUpdateRequest,
    updatedById: string
  ): Promise<{ success: boolean; template?: EmailTemplate; error?: string }> {
    try {
      // Check if template exists
      const existingTemplate = await prisma.emailTemplate.findUnique({
        where: { id: templateId }
      });

      if (!existingTemplate) {
        return {
          success: false,
          error: 'Template not found'
        };
      }

      // Validate name uniqueness if name is being updated
      if (updateData.name && updateData.name !== existingTemplate.name) {
        const nameExists = await prisma.emailTemplate.findUnique({
          where: { name: updateData.name }
        });

        if (nameExists) {
          return {
            success: false,
            error: 'Template with this name already exists'
          };
        }
      }

      // Validate HTML content if being updated
      if (updateData.htmlContent) {
        const validationResult = this.validateTemplate(updateData.htmlContent);
        if (!validationResult.isValid) {
          return {
            success: false,
            error: `Template validation failed: ${validationResult.errors.join(', ')}`
          };
        }
      }

      // Extract variables if HTML content is updated
      const updateFields: any = {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.subject && { subject: updateData.subject }),
        ...(updateData.htmlContent && { htmlContent: updateData.htmlContent }),
        ...(updateData.textContent !== undefined && { textContent: updateData.textContent }),
        ...(updateData.category && { category: updateData.category as EmailCategory }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
        updatedAt: new Date(),
      };

      if (updateData.htmlContent) {
        const extractedVariables = this.extractVariables(updateData.htmlContent);
        updateFields.variables = {
          available: extractedVariables,
          custom: updateData.variables || (existingTemplate.variables as any)?.custom || []
        };
      }

      const template = await prisma.emailTemplate.update({
        where: { id: templateId },
        data: updateFields,
      });

      console.log(`Email template updated: ${template.name} (ID: ${template.id})`);

      return { success: true, template };
    } catch (error: any) {
      console.error('Error updating email template:', error);
      return {
        success: false,
        error: error.message || 'Failed to update email template'
      };
    }
  }

  /**
   * Delete an email template
   */
  async deleteTemplate(templateId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if template exists
      const template = await prisma.emailTemplate.findUnique({
        where: { id: templateId }
      });

      if (!template) {
        return {
          success: false,
          error: 'Template not found'
        };
      }

      // Check if template is being used in any email jobs
      const jobsUsingTemplate = await prisma.emailJob.count({
        where: { templateId }
      });

      if (jobsUsingTemplate > 0) {
        return {
          success: false,
          error: 'Cannot delete template that is being used in email jobs'
        };
      }

      await prisma.emailTemplate.delete({
        where: { id: templateId }
      });

      console.log(`Email template deleted: ${template.name} (ID: ${template.id})`);

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting email template:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete email template'
      };
    }
  }

  /**
   * Render template with data
   */
  async renderTemplate(
    templateId: string,
    templateData: EmailTemplateData
  ): Promise<{ success: boolean; rendered?: { html: string; text?: string; subject: string }; error?: string }> {
    try {
      const template = await this.getTemplate(templateId);
      if (!template) {
        return {
          success: false,
          error: 'Template not found'
        };
      }

      // Compile and render HTML content
      const htmlTemplate = handlebars.compile(template.htmlContent);
      const renderedHtml = htmlTemplate(templateData);

      // Compile and render text content if available
      let renderedText: string | undefined;
      if (template.textContent) {
        const textTemplate = handlebars.compile(template.textContent);
        renderedText = textTemplate(templateData);
      }

      // Compile and render subject
      const subjectTemplate = handlebars.compile(template.subject);
      const renderedSubject = subjectTemplate(templateData);

      return {
        success: true,
        rendered: {
          html: renderedHtml,
          text: renderedText,
          subject: renderedSubject
        }
      };
    } catch (error: any) {
      console.error('Error rendering template:', error);
      return {
        success: false,
        error: error.message || 'Failed to render template'
      };
    }
  }

  /**
   * Preview template with sample data
   */
  async previewTemplate(
    htmlContent: string,
    textContent: string | undefined,
    subject: string,
    sampleData: EmailTemplateData
  ): Promise<{ success: boolean; preview?: { html: string; text?: string; subject: string }; error?: string }> {
    try {
      // Validate template
      const validationResult = this.validateTemplate(htmlContent);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: `Template validation failed: ${validationResult.errors.join(', ')}`
        };
      }

      // Compile and render HTML content
      const htmlTemplate = handlebars.compile(htmlContent);
      const renderedHtml = htmlTemplate(sampleData);

      // Compile and render text content if available
      let renderedText: string | undefined;
      if (textContent) {
        const textTemplate = handlebars.compile(textContent);
        renderedText = textTemplate(sampleData);
      }

      // Compile and render subject
      const subjectTemplate = handlebars.compile(subject);
      const renderedSubject = subjectTemplate(sampleData);

      return {
        success: true,
        preview: {
          html: renderedHtml,
          text: renderedText,
          subject: renderedSubject
        }
      };
    } catch (error: any) {
      console.error('Error previewing template:', error);
      return {
        success: false,
        error: error.message || 'Failed to preview template'
      };
    }
  }

  /**
   * Validate template HTML content
   */
  private validateTemplate(htmlContent: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Basic HTML validation
    if (!htmlContent || htmlContent.trim().length === 0) {
      errors.push('HTML content cannot be empty');
    }

    // Check for basic HTML structure
    if (!htmlContent.includes('<html') && !htmlContent.includes('<body')) {
      errors.push('Template should contain basic HTML structure');
    }

    // Check for potentially dangerous content
    const dangerousPatterns = [
      /<script[\s\S]*?<\/script>/gi,
      /<iframe[\s\S]*?<\/iframe>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi, // onclick, onload, etc.
    ];

    dangerousPatterns.forEach(pattern => {
      if (pattern.test(htmlContent)) {
        errors.push('Template contains potentially dangerous content');
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Extract variables from template content
   */
  private extractVariables(content: string): string[] {
    const variablePattern = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_\.]*)\s*\}\}/g;
    const variables = new Set<string>();
    let match;

    while ((match = variablePattern.exec(content)) !== null) {
      variables.add(match[1]);
    }

    return Array.from(variables);
  }
}

export default TemplateService;
