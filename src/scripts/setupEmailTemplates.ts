#!/usr/bin/env node

/**
 * Email Service Setup Script
 * 
 * Sets up default email templates for the OpenLearn platform
 * Run this after setting up the database to initialize email templates
 */

import { prisma } from '../config/database';
import { EmailCategory } from '@prisma/client';

const defaultTemplates = [
  {
    name: 'welcome-pioneer',
    category: EmailCategory.WELCOME,
    subject: 'Welcome to OpenLearn, {{user.name}}! 🚀',
    description: 'Welcome email for new Pioneer (student) users',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0;">Welcome to OpenLearn! 🚀</h1>
          </div>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Hi {{user.name}},
          </p>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Welcome to OpenLearn! We're excited to have you join our community of learners and pioneers. 
            Your journey to mastering new skills and knowledge starts here.
          </p>
          
          <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1d4ed8; margin-top: 0;">Get Started:</h3>
            <ul style="color: #374151; margin: 0;">
              <li>Complete your profile setup</li>
              <li>Explore available courses and specializations</li>
              <li>Join a cohort to connect with fellow learners</li>
              <li>Start your first learning module</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{app.baseUrl}}/dashboard" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Go to Dashboard
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 30px;">
            Need help? Contact us at <a href="mailto:{{app.supportEmail}}" style="color: #2563eb;">{{app.supportEmail}}</a>
          </p>
        </div>
      </div>
    `,
    textContent: `
      Welcome to OpenLearn, {{user.name}}!
      
      We're excited to have you join our community of learners and pioneers.
      
      Get Started:
      - Complete your profile setup
      - Explore available courses and specializations
      - Join a cohort to connect with fellow learners
      - Start your first learning module
      
      Visit your dashboard: {{app.baseUrl}}/dashboard
      
      Need help? Contact us at {{app.supportEmail}}
    `,
    variables: [
      'user.name',
      'user.email',
      'app.baseUrl',
      'app.supportEmail'
    ]
  },
  {
    name: 'welcome-pathfinder',
    category: EmailCategory.WELCOME,
    subject: 'Welcome to OpenLearn Admin Panel, {{user.name}}! 🎯',
    description: 'Welcome email for new Pathfinder (admin) users',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #dc2626; margin: 0;">Welcome, Pathfinder! 🎯</h1>
          </div>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Hi {{user.name}},
          </p>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Welcome to the OpenLearn platform! As a Pathfinder, you have administrative access to guide 
            and mentor our community of learners. Your role is crucial in shaping the learning experience.
          </p>
          
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
            <h3 style="color: #dc2626; margin-top: 0;">Admin Responsibilities:</h3>
            <ul style="color: #374151; margin: 0;">
              <li>Manage courses and learning content</li>
              <li>Monitor student progress and engagement</li>
              <li>Send communications to cohorts and users</li>
              <li>Review and approve assignments</li>
              <li>Analyze platform analytics</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{app.baseUrl}}/admin/dashboard" 
               style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Go to Admin Dashboard
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 30px;">
            For admin support, contact: <a href="mailto:{{app.adminEmail}}" style="color: #dc2626;">{{app.adminEmail}}</a>
          </p>
        </div>
      </div>
    `,
    textContent: `
      Welcome to OpenLearn Admin Panel, {{user.name}}!
      
      As a Pathfinder, you have administrative access to guide and mentor our community.
      
      Admin Responsibilities:
      - Manage courses and learning content
      - Monitor student progress and engagement
      - Send communications to cohorts and users
      - Review and approve assignments
      - Analyze platform analytics
      
      Visit the admin dashboard: {{app.baseUrl}}/admin/dashboard
      
      For admin support, contact: {{app.adminEmail}}
    `,
    variables: [
      'user.name',
      'user.email',
      'app.baseUrl',
      'app.adminEmail'
    ]
  },
  {
    name: 'course-completion',
    category: EmailCategory.ACHIEVEMENT,
    subject: 'Congratulations! You completed {{course.name}} 🎉',
    description: 'Sent when a user completes a course',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #059669; margin: 0;">Congratulations! 🎉</h1>
          </div>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Hi {{user.name}},
          </p>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Amazing work! You've successfully completed <strong>{{course.name}}</strong>. 
            This is a significant milestone in your learning journey.
          </p>
          
          <div style="background-color: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <h3 style="color: #059669; margin: 10px 0;">Course Statistics</h3>
            <p style="margin: 5px 0; color: #374151;"><strong>Completion Time:</strong> {{completion.duration}}</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Final Score:</strong> {{completion.score}}%</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Rank in Cohort:</strong> {{completion.rank}}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{app.baseUrl}}/certificates/{{completion.certificateId}}" 
               style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-right: 10px;">
              View Certificate
            </a>
            <a href="{{app.baseUrl}}/courses" 
               style="background-color: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Explore More Courses
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 30px;">
            Keep learning and growing! 🚀
          </p>
        </div>
      </div>
    `,
    textContent: `
      Congratulations {{user.name}}!
      
      You've successfully completed {{course.name}}!
      
      Course Statistics:
      - Completion Time: {{completion.duration}}
      - Final Score: {{completion.score}}%
      - Rank in Cohort: {{completion.rank}}
      
      View your certificate: {{app.baseUrl}}/certificates/{{completion.certificateId}}
      Explore more courses: {{app.baseUrl}}/courses
      
      Keep learning and growing!
    `,
    variables: [
      'user.name',
      'course.name',
      'completion.duration',
      'completion.score',
      'completion.rank',
      'completion.certificateId',
      'app.baseUrl'
    ]
  },
  {
    name: 'assignment-reminder',
    category: EmailCategory.REMINDER,
    subject: 'Assignment Due Soon: {{assignment.title}} ⏰',
    description: 'Reminder for upcoming assignment deadlines',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #d97706; margin: 0;">Assignment Reminder ⏰</h1>
          </div>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Hi {{user.name}},
          </p>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            This is a friendly reminder that your assignment <strong>{{assignment.title}}</strong> 
            is due in {{assignment.timeUntilDue}}.
          </p>
          
          <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #d97706;">
            <h3 style="color: #92400e; margin-top: 0;">Assignment Details:</h3>
            <p style="margin: 5px 0; color: #374151;"><strong>Course:</strong> {{assignment.course}}</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Due Date:</strong> {{assignment.dueDate}}</p>
            <p style="margin: 5px 0; color: #374151;"><strong>Status:</strong> {{assignment.status}}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{app.baseUrl}}/assignments/{{assignment.id}}" 
               style="background-color: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Complete Assignment
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 30px;">
            Need help? Contact your instructor or visit our help center.
          </p>
        </div>
      </div>
    `,
    textContent: `
      Assignment Reminder
      
      Hi {{user.name}},
      
      Your assignment "{{assignment.title}}" is due in {{assignment.timeUntilDue}}.
      
      Assignment Details:
      - Course: {{assignment.course}}
      - Due Date: {{assignment.dueDate}}
      - Status: {{assignment.status}}
      
      Complete your assignment: {{app.baseUrl}}/assignments/{{assignment.id}}
      
      Need help? Contact your instructor or visit our help center.
    `,
    variables: [
      'user.name',
      'assignment.title',
      'assignment.timeUntilDue',
      'assignment.course',
      'assignment.dueDate',
      'assignment.status',
      'assignment.id',
      'app.baseUrl'
    ]
  },
  {
    name: 'weekly-digest',
    category: EmailCategory.MARKETING,
    subject: 'Your Weekly Learning Digest 📚',
    description: 'Weekly summary of user progress and platform updates',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8f9fa; padding: 20px;">
        <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #7c3aed; margin: 0;">Your Weekly Digest 📚</h1>
            <p style="color: #6b7280; margin: 5px 0;">{{digest.weekPeriod}}</p>
          </div>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Hi {{user.name}},
          </p>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Here's your weekly learning summary and what's happening on OpenLearn this week.
          </p>
          
          <div style="background-color: #f5f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #7c3aed; margin-top: 0;">Your Progress This Week</h3>
            <div style="display: flex; justify-content: space-around; text-align: center;">
              <div>
                <h4 style="color: #374151; margin: 5px 0;">{{progress.lessonsCompleted}}</h4>
                <p style="color: #6b7280; margin: 0; font-size: 14px;">Lessons Completed</p>
              </div>
              <div>
                <h4 style="color: #374151; margin: 5px 0;">{{progress.timeSpent}}</h4>
                <p style="color: #6b7280; margin: 0; font-size: 14px;">Time Spent</p>
              </div>
              <div>
                <h4 style="color: #374151; margin: 5px 0;">{{progress.rank}}</h4>
                <p style="color: #6b7280; margin: 0; font-size: 14px;">Cohort Rank</p>
              </div>
            </div>
          </div>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #0369a1; margin-top: 0;">What's New This Week</h3>
            <ul style="color: #374151; margin: 0; padding-left: 20px;">
              {{#each digest.updates}}
              <li style="margin: 10px 0;">{{this}}</li>
              {{/each}}
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{app.baseUrl}}/dashboard" 
               style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Continue Learning
            </a>
          </div>
        </div>
      </div>
    `,
    textContent: `
      Your Weekly Learning Digest
      {{digest.weekPeriod}}
      
      Hi {{user.name}},
      
      Your Progress This Week:
      - Lessons Completed: {{progress.lessonsCompleted}}
      - Time Spent: {{progress.timeSpent}}
      - Cohort Rank: {{progress.rank}}
      
      What's New This Week:
      {{#each digest.updates}}
      - {{this}}
      {{/each}}
      
      Continue learning: {{app.baseUrl}}/dashboard
    `,
    variables: [
      'user.name',
      'digest.weekPeriod',
      'progress.lessonsCompleted',
      'progress.timeSpent',
      'progress.rank',
      'digest.updates',
      'app.baseUrl'
    ]
  }
];

async function setupDefaultTemplates() {
  console.log('🎨 Setting up default email templates...');

  try {
    // Create a system admin user for template creation if needed
    let systemUser = await prisma.user.findFirst({
      where: { email: 'system@openlearn.com' }
    });

    if (!systemUser) {
      console.log('Creating system user for template management...');
      systemUser = await prisma.user.create({
        data: {
          email: 'system@openlearn.com',
          name: 'OpenLearn System',
          password: 'system-generated', // This won't be used for login
          role: 'PATHFINDER',
          status: 'ACTIVE'
        }
      });
    }

    for (const template of defaultTemplates) {
      console.log(`📧 Setting up template: ${template.name}`);
      
      // Check if template already exists
      const existingTemplate = await prisma.emailTemplate.findUnique({
        where: { name: template.name }
      });

      if (existingTemplate) {
        console.log(`   ⚠️  Template "${template.name}" already exists, skipping...`);
        continue;
      }

      // Create the template
      await prisma.emailTemplate.create({
        data: {
          name: template.name,
          category: template.category,
          subject: template.subject,
          description: template.description,
          htmlContent: template.htmlContent.trim(),
          textContent: template.textContent?.trim(),
          variables: template.variables,
          isActive: true,
          createdById: systemUser.id
        }
      });

      console.log(`   ✅ Created template: ${template.name}`);
    }

    console.log('\n🎉 Default email templates setup completed!');
    console.log('\nAvailable templates:');
    
    const templates = await prisma.emailTemplate.findMany({
      select: {
        name: true,
        category: true,
        subject: true,
        isActive: true
      },
      orderBy: { name: 'asc' }
    });

    templates.forEach((template: any) => {
      console.log(`  📧 ${template.name} (${template.category}) - ${template.isActive ? 'Active' : 'Inactive'}`);
      console.log(`     Subject: ${template.subject}`);
    });

    console.log('\n📝 To use these templates in your application:');
    console.log('   - Send emails via POST /api/emails/send with templateId');
    console.log('   - Create bulk campaigns via POST /api/emails/bulk');
    console.log('   - Manage templates via /api/emails/templates endpoints');
    console.log('   - View template documentation at GET /api/emails/templates');

  } catch (error) {
    console.error('❌ Error setting up email templates:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup if this file is executed directly
if (require.main === module) {
  setupDefaultTemplates();
}

export { setupDefaultTemplates };
