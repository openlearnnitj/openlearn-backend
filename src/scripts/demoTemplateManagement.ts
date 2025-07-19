/**
 * Demo script showing how Frontend can interact with the dual-template system
 * 
 * This demonstrates:
 * 1. Frontend-controlled templates (create, read, update, delete, preview)
 * 2. System template inspection (read-only)
 * 3. Email sending using both template types
 */

// Helper function for API calls (using native fetch or your preferred HTTP client)
async function apiCall(endpoint: string, options: any = {}) {
  const BASE_URL = 'http://localhost:3000/api/emails';
  const AUTH_TOKEN = 'your-auth-token-here'; // Replace with actual token
  
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Authorization': `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`API Error: ${data.message || response.statusText}`);
    }
    
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`API call failed for ${endpoint}:`, message);
    throw error;
  }
}

/**
 * Demo 1: Working with Frontend-Controlled Templates
 */
async function demoFrontendTemplates() {
  console.log('\n🎨 === Frontend-Controlled Template Management ===\n');

  try {
    // 1. Create a new marketing template
    console.log('1. Creating a new marketing template...');
    const newTemplate = {
      name: 'weekly-newsletter',
      category: 'MARKETING',
      subject: 'OpenLearn Weekly Newsletter - {{newsletter.title}}',
      htmlContent: `
        <h1>{{newsletter.title}}</h1>
        <p>Hello {{user.name}},</p>
        <p>Here's what's happening this week at OpenLearn:</p>
        
        <div class="highlights">
          {{#each newsletter.highlights}}
          <div class="highlight">
            <h3>{{this.title}}</h3>
            <p>{{this.description}}</p>
          </div>
          {{/each}}
        </div>
        
        <p>Happy learning!</p>
        <p>The OpenLearn Team</p>
      `,
      textContent: `
        {{newsletter.title}}
        
        Hello {{user.name}},
        
        Here's what's happening this week at OpenLearn:
        
        {{#each newsletter.highlights}}
        - {{this.title}}: {{this.description}}
        {{/each}}
        
        Happy learning!
        The OpenLearn Team
      `,
      description: 'Weekly newsletter template for marketing campaigns',
      variables: {
        user: {
          name: { type: 'string', required: true }
        },
        newsletter: {
          title: { type: 'string', required: true },
          highlights: {
            type: 'array',
            required: true,
            items: {
              title: { type: 'string', required: true },
              description: { type: 'string', required: true }
            }
          }
        }
      }
    };

    const createdTemplate = await apiCall('/templates', {
      method: 'POST',
      body: JSON.stringify(newTemplate)
    });
    
    const templateId = createdTemplate.data.id;
    console.log('✅ Template created:', createdTemplate.data.name);

    // 2. Preview the template with sample data
    console.log('\n2. Previewing template with sample data...');
    const previewData = {
      sampleData: {
        user: {
          name: 'John Doe'
        },
        newsletter: {
          title: 'March Innovation Update',
          highlights: [
            {
              title: 'New AI Course Released',
              description: 'Learn machine learning fundamentals with our new interactive course.'
            },
            {
              title: 'Student Showcase',
              description: 'Amazing projects from our learners this month.'
            }
          ]
        }
      }
    };

    const preview = await apiCall(`/templates/${templateId}/preview`, {
      method: 'POST',
      body: JSON.stringify(previewData)
    });
    
    console.log('✅ Preview generated:');
    console.log('Subject:', preview.data.subject);
    console.log('HTML length:', preview.data.htmlContent.length, 'characters');

    // 3. Update the template
    console.log('\n3. Updating template description...');
    const updateData = {
      description: 'Updated weekly newsletter template with enhanced styling'
    };

    const updatedTemplate = await apiCall(`/templates/${templateId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
    
    console.log('✅ Template updated:', updatedTemplate.data.description);

    // 4. Duplicate the template
    console.log('\n4. Duplicating template...');
    const duplicateData = {
      newName: 'monthly-newsletter',
      newDescription: 'Monthly version of the newsletter template'
    };

    const duplicatedTemplate = await apiCall(`/templates/${templateId}/duplicate`, {
      method: 'POST',
      body: JSON.stringify(duplicateData)
    });
    
    console.log('✅ Template duplicated:', duplicatedTemplate.data.name);

    // 5. Send an email using the template
    console.log('\n5. Sending email using the template...');
    const emailData = {
      recipients: [
        {
          id: 'user_123',
          email: 'test@example.com',
          name: 'John Doe'
        }
      ],
      templateId: 'weekly-newsletter',
      templateData: previewData.sampleData,
      priority: 5
    };

    const emailJob = await apiCall('/send', {
      method: 'POST',
      body: JSON.stringify(emailData)
    });
    
    console.log('✅ Email queued:', emailJob.data.jobId);

    return { templateId, duplicatedId: duplicatedTemplate.data.id };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Frontend template demo failed:', message);
    throw error;
  }
}

/**
 * Demo 2: Working with System Templates (Read-Only)
 */
async function demoSystemTemplates() {
  console.log('\n🔒 === System Template Inspection ===\n');

  try {
    // 1. Get variables for password reset OTP template
    console.log('1. Inspecting password-reset-otp template variables...');
    const otpVariables = await apiCall('/templates/password-reset-otp/variables');
    
    console.log('✅ System template variables:');
    console.log('Template type:', otpVariables.data.templateType);
    console.log('Variables:', JSON.stringify(otpVariables.data.variables, null, 2));

    // 2. Try to send a password reset email (this would typically be done by the backend service)
    console.log('\n2. Demonstrating system template usage...');
    console.log('ℹ️ System templates like password-reset-otp are typically used by backend services only');
    console.log('ℹ️ Frontend cannot create, modify, or delete system templates for security');

    // 3. Show that we cannot create a template with a system name
    console.log('\n3. Attempting to create template with reserved name...');
    try {
      const invalidTemplate = {
        name: 'password-reset-otp', // This should fail
        category: 'SYSTEM',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
        variables: {}
      };

      await apiCall('/templates', {
        method: 'POST',
        body: JSON.stringify(invalidTemplate)
      });
      
      console.log('❌ This should not have succeeded!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log('✅ Correctly blocked system template name:', message);
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ System template demo failed:', message);
    throw error;
  }
}

/**
 * Demo 3: Template Discovery and Management
 */
async function demoTemplateDiscovery() {
  console.log('\n📋 === Template Discovery and Management ===\n');

  try {
    // 1. List all templates with filtering
    console.log('1. Discovering available templates...');
    const allTemplates = await apiCall('/templates?page=1&limit=10');
    
    console.log('✅ Found templates:');
    console.log(`Total: ${allTemplates.data.total} templates`);
    console.log(`Page: ${allTemplates.data.page}/${allTemplates.data.totalPages}`);
    
    allTemplates.data.templates.forEach((template: any) => {
      console.log(`- ${template.name} (${template.category}) - ${template.isActive ? 'Active' : 'Inactive'}`);
    });

    // 2. Search for marketing templates
    console.log('\n2. Searching for marketing templates...');
    const marketingTemplates = await apiCall('/templates?category=MARKETING&search=newsletter');
    
    console.log('✅ Marketing templates found:', marketingTemplates.data.templates.length);

    // 3. Get detailed view of a specific template
    if (allTemplates.data.templates.length > 0) {
      const firstTemplate = allTemplates.data.templates[0];
      console.log('\n3. Getting detailed template information...');
      
      const templateDetail = await apiCall(`/templates/${firstTemplate.id}`);
      console.log('✅ Template details loaded:');
      console.log(`Name: ${templateDetail.data.name}`);
      console.log(`Created by: ${templateDetail.data.createdBy?.name || 'Unknown'}`);
      console.log(`Last updated: ${templateDetail.data.updatedAt}`);
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Template discovery demo failed:', message);
    throw error;
  }
}

/**
 * Demo 4: Cleanup (Delete templates created in demo)
 */
async function cleanupDemo(templateIds: string[]) {
  console.log('\n🧹 === Cleanup ===\n');

  for (const templateId of templateIds) {
    try {
      await apiCall(`/templates/${templateId}`, {
        method: 'DELETE'
      });
      console.log('✅ Deleted template:', templateId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.log('⚠️ Could not delete template:', templateId, message);
    }
  }
}

/**
 * Main demo function
 */
async function runDemo() {
  console.log('🚀 OpenLearn Email Template Management Demo');
  console.log('==========================================');

  try {
    // Run all demos
    const { templateId, duplicatedId } = await demoFrontendTemplates();
    await demoSystemTemplates();
    await demoTemplateDiscovery();
    
    // Cleanup
    await cleanupDemo([templateId, duplicatedId]);
    
    console.log('\n✅ Demo completed successfully!');
    console.log('\nKey takeaways:');
    console.log('- Frontend can create, edit, preview, and delete custom templates');
    console.log('- System templates are read-only and secure');
    console.log('- Templates support rich Handlebars templating');
    console.log('- Variable schemas provide structure and validation');
    console.log('- Real-time preview helps with template development');

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('\n❌ Demo failed:', message);
    process.exit(1);
  }
}

// Export for use in other files or run directly
if (require.main === module) {
  runDemo().catch(console.error);
}

export {
  demoFrontendTemplates,
  demoSystemTemplates,
  demoTemplateDiscovery,
  apiCall
};
