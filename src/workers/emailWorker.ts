#!/usr/bin/env node

/**
 * Email Worker Process
 * 
 * This worker process runs separately from the main server and handles
 * background email processing from the Redis queue using Bull.
 * 
 * Features:
 * - Processes queued email jobs
 * - Sends individual emails via SMTP
 * - Updates job status in the database
 * - Logs all email attempts
 * - Handles retries and failures
 * - Supports graceful shutdown
 */

import { Job } from 'bull';
import { EmailJobStatus, AuditAction } from '@prisma/client';
import { prisma } from '../config/database';
import SMTPService from '../services/email/SMTPService';
import TemplateService from '../services/email/TemplateService';
import QueueService from '../services/email/QueueService';
import { EmailJobData, EmailRecipient } from '../types';

interface ProcessEmailJobData {
  emailJobId: string;
}

/**
 * Email Worker Class
 * Handles the processing of email jobs from the Bull queue
 */
class EmailWorker {
  private smtpService: SMTPService;
  private templateService: TemplateService;
  private queueService: QueueService;
  private isShuttingDown = false;

  constructor() {
    this.smtpService = new SMTPService();
    this.templateService = new TemplateService();
    this.queueService = new QueueService();
  }

  /**
   * Initialize the worker and start processing jobs
   */
  async start(): Promise<void> {
    console.log('🚀 Email Worker starting...');

    // Test SMTP connection on startup
    const smtpTest = await this.smtpService.testConnection();
    if (!smtpTest.success) {
      console.error('❌ SMTP connection failed:', smtpTest.error);
      process.exit(1);
    }
    console.log('✅ SMTP connection verified');

    // Set up job processor
    await this.queueService.processEmailJobs(this.processEmailJob.bind(this));
    
    console.log('📧 Email Worker ready to process jobs');

    // Handle graceful shutdown
    this.setupShutdownHandlers();
  }

  /**
   * Process a single email job
   */
  async processEmailJob(job: Job<ProcessEmailJobData>): Promise<void> {
    const { emailJobId } = job.data;
    
    console.log(`📧 Processing email job: ${emailJobId}`);
    
    try {
      // Get email job from database
      const emailJob = await prisma.emailJob.findUnique({
        where: { id: emailJobId },
        include: {
          template: true,
          createdBy: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      if (!emailJob) {
        throw new Error(`Email job ${emailJobId} not found`);
      }

      // Update job status to processing
      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          status: EmailJobStatus.PROCESSING,
          startedAt: new Date()
        }
      });

      // Parse recipients
      const recipients = JSON.parse(JSON.stringify(emailJob.recipients)) as EmailRecipient[];
      console.log(`📨 Sending to ${recipients.length} recipients`);

      let sentCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Process each recipient
      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i];
        
        // Update job progress
        await job.progress(Math.round((i / recipients.length) * 100));

        try {
          // Render email content for this recipient
          let htmlContent = emailJob.htmlContent;
          let textContent = emailJob.textContent;
          let subject = emailJob.subject;

          // If template is used, render with recipient-specific data
          if (emailJob.template) {
            const templateData = {
              user: {
                name: recipient.name || recipient.email,
                email: recipient.email,
                id: recipient.id
              },
              // Add more template variables as needed
            };

            const renderResult = await this.templateService.renderTemplate(
              emailJob.template.id,
              templateData
            );

            if (renderResult.success && renderResult.rendered) {
              htmlContent = renderResult.rendered.html;
              textContent = renderResult.rendered.text || null;
              subject = renderResult.rendered.subject;
            }
          }

          // Send email
          const sendResult = await this.smtpService.sendEmail({
            to: recipient.email,
            subject,
            html: htmlContent,
            text: textContent || undefined
          });

          if (sendResult.success) {
            sentCount++;
            console.log(`✅ Sent to: ${recipient.email}`);
            
            // Log successful send
            await this.logEmailSend(
              emailJobId,
              recipient.id,
              'SENT',
              subject,
              recipient.email
            );
          } else {
            failedCount++;
            errors.push(`${recipient.email}: ${sendResult.error}`);
            console.log(`❌ Failed to send to ${recipient.email}: ${sendResult.error}`);
            
            // Log failed send
            await this.logEmailSend(
              emailJobId,
              recipient.id,
              'FAILED',
              subject,
              recipient.email,
              sendResult.error || 'Unknown error'
            );
          }

          // Small delay between emails to avoid overwhelming SMTP server
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error: any) {
          failedCount++;
          const errorMsg = error.message || 'Unknown error';
          errors.push(`${recipient.email}: ${errorMsg}`);
          console.log(`❌ Exception sending to ${recipient.email}: ${errorMsg}`);
          
          // Log exception
          await this.logEmailSend(
            emailJobId,
            recipient.id,
            'FAILED',
            emailJob.subject, // Use emailJob.subject since subject variable is not in scope
            recipient.email,
            errorMsg
          );
        }
      }

      // Update job completion status
      const isSuccess = sentCount > 0;
      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          status: isSuccess ? EmailJobStatus.COMPLETED : EmailJobStatus.FAILED,
          completedAt: isSuccess ? new Date() : undefined,
          failedAt: !isSuccess ? new Date() : undefined,
          sentCount,
          failedCount,
          errorMessage: errors.length > 0 ? errors.slice(0, 5).join('; ') : undefined
        }
      });

      // Log audit event
      await this.logEmailAudit(
        isSuccess ? 'BULK_EMAIL_COMPLETED' : 'BULK_EMAIL_FAILED',
        emailJob.createdById,
        {
          jobId: emailJobId,
          sentCount,
          failedCount,
          totalCount: recipients.length,
          subject: emailJob.subject
        }
      );

      console.log(`✅ Job ${emailJobId} completed: ${sentCount} sent, ${failedCount} failed`);

    } catch (error: any) {
      console.error(`❌ Error processing email job ${emailJobId}:`, error);
      
      // Update job status to failed
      await prisma.emailJob.update({
        where: { id: emailJobId },
        data: {
          status: EmailJobStatus.FAILED,
          failedAt: new Date(),
          errorMessage: error.message || 'Processing error'
        }
      });

      // Re-throw error to trigger Bull's retry mechanism
      throw error;
    }
  }

  /**
   * Log individual email send attempt
   */
  private async logEmailSend(
    emailJobId: string,
    recipientId: string,
    status: 'SENT' | 'FAILED',
    subject: string,
    recipientEmail: string,
    error?: string
  ): Promise<void> {
    try {
      await prisma.emailLog.create({
        data: {
          jobId: emailJobId, // Use jobId instead of emailJobId
          recipientId,
          email: recipientEmail,
          subject,
          status: status as any,
          sentAt: status === 'SENT' ? new Date() : undefined,
          error: error || undefined
        }
      });
    } catch (logError) {
      console.error('Error logging email send:', logError);
    }
  }

  /**
   * Log email audit event
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
          description: `Email worker: ${action}`,
          metadata
        }
      });
    } catch (error) {
      console.error('Error logging email audit:', error);
    }
  }

  /**
   * Set up graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      console.log(`\n📧 Email Worker received ${signal}, shutting down gracefully...`);
      
      try {
        // Close queue and SMTP connections
        await Promise.all([
          this.queueService.close(),
          this.smtpService.close()
        ]);
        
        console.log('✅ Email Worker shutdown complete');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    // Handle various shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGUSR2', () => shutdown('SIGUSR2')); // nodemon restart
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception in Email Worker:', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('❌ Unhandled Rejection in Email Worker:', reason);
      shutdown('unhandledRejection');
    });
  }
}

// Start the worker if this file is run directly
if (require.main === module) {
  const worker = new EmailWorker();
  worker.start().catch((error) => {
    console.error('❌ Failed to start Email Worker:', error);
    process.exit(1);
  });
}

export default EmailWorker;
