import { Router } from 'express';
import { prisma } from '../config/database';
import Redis from 'ioredis';
import SMTPService from '../services/email/SMTPService';
import { EmailProviderFactory } from '../services/email/EmailProviderFactory';
import { EmailProvider } from '../services/email/interfaces/EmailProviderInterface';

const router = Router();

/**
 * Debug endpoint to check database relationships and service connectivity
 * Should be removed or secured in production
 */
router.get('/database-relationships', async (req, res) => {
  try {
    console.log('Debugging database relationships...');
    
    // Check Cohorts
    const cohorts = await prisma.cohort.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
        _count: {
          select: {
            specializations: true,
            enrollments: true,
          }
        }
      }
    });
    
    console.log('cohorts found:', cohorts);
    
    // Check Specializations
    const specializations = await prisma.specialization.findMany({
      select: {
        id: true,
        name: true,
        cohortId: true,
        _count: {
          select: {
            leagues: true,
          }
        }
      }
    });
    
    console.log('📊 Specializations found:', specializations);
    
    // Check SpecializationLeague junction table
    const specializationLeagues = await prisma.specializationLeague.findMany({
      select: {
        id: true,
        specializationId: true,
        leagueId: true,
        order: true,
        specialization: {
          select: {
            name: true,
            cohort: {
              select: {
                name: true
              }
            }
          }
        },
        league: {
          select: {
            name: true,
            _count: {
              select: {
                weeks: true
              }
            }
          }
        }
      }
    });
    
    console.log('SpecializationLeague relationships found:', specializationLeagues);
    
    // Check Leagues
    const leagues = await prisma.league.findMany({
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            weeks: true,
            specializations: true,
          }
        }
      }
    });
    
    console.log('Leagues found:', leagues);
    
    // Check Weeks
    const weeks = await prisma.week.findMany({
      select: {
        id: true,
        name: true,
        leagueId: true,
        order: true,
        league: {
          select: {
            name: true
          }
        }
      }
    });
    
    console.log('📊 Weeks found:', weeks);
    
    res.json({
      success: true,
      data: {
        cohorts,
        specializations,
        specializationLeagues,
        leagues,
        weeks,
        summary: {
          totalCohorts: cohorts.length,
          totalSpecializations: specializations.length,
          totalSpecializationLeagues: specializationLeagues.length,
          totalLeagues: leagues.length,
          totalWeeks: weeks.length,
        }
      },
      message: 'Database relationships debugged successfully'
    });
    
  } catch (error: any) {
    console.error('❌ Database debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * Debug Redis connectivity
 */
router.get('/redis-debug', async (req, res) => {
  try {
    console.log('🔍 Debugging Redis connectivity...');
    
    const redisUrl = process.env.REDIS_URL;
    console.log('📊 Redis URL (masked):', redisUrl ? redisUrl.replace(/\/\/[^@]+@/, '//***:***@') : 'NOT_SET');
    
    if (!redisUrl) {
      return res.json({
        success: false,
        error: 'REDIS_URL environment variable not set',
        debug: {
          envVars: {
            REDIS_URL: 'NOT_SET',
            NODE_ENV: process.env.NODE_ENV,
          }
        }
      });
    }
    
    // Try to connect to Redis
    const redis = new Redis(redisUrl, {
      connectTimeout: 5000,
      commandTimeout: 5000,
      maxRetriesPerRequest: 1,
    });
    
    // Test basic operations
    const pingResult = await redis.ping();
    await redis.set('test-key', 'test-value', 'EX', 10);
    const getValue = await redis.get('test-key');
    await redis.del('test-key');
    
    redis.disconnect();
    
    res.json({
      success: true,
      data: {
        connectionStatus: 'SUCCESS',
        pingResult,
        testWrite: 'SUCCESS',
        testRead: getValue === 'test-value' ? 'SUCCESS' : 'FAILED',
        redisUrl: redisUrl.replace(/\/\/[^@]+@/, '//***:***@'),
      },
      message: 'Redis connectivity test successful'
    });
    
  } catch (error: any) {
    console.error('❌ Redis debug error:', error);
    res.json({
      success: false,
      error: error.message,
      errorCode: error.code,
      debug: {
        redisUrl: process.env.REDIS_URL ? process.env.REDIS_URL.replace(/\/\/[^@]+@/, '//***:***@') : 'NOT_SET',
        errorStack: error.stack,
      }
    });
  }
});

/**
 * Debug Email service connectivity
 */
router.get('/email-debug', async (req, res) => {
  try {
    console.log('🔍 Debugging Resend Email service connectivity...');
    
    const emailConfig = {
      apiKey: process.env.RESEND_API_KEY,
      fromEmail: process.env.RESEND_FROM_EMAIL,
      provider: 'Resend',
      enabled: process.env.EMAIL_ENABLED === 'true',
    };
    
    console.log('📊 Email config:', {
      ...emailConfig,
      apiKey: emailConfig.apiKey ? emailConfig.apiKey.substring(0, 10) + '...' : 'NOT_SET',
    });
    
    if (!emailConfig.apiKey || !emailConfig.fromEmail) {
      return res.json({
        success: false,
        error: 'Resend configuration incomplete',
        debug: {
          missingVars: {
            RESEND_API_KEY: !emailConfig.apiKey,
            RESEND_FROM_EMAIL: !emailConfig.fromEmail,
          },
          config: {
            ...emailConfig,
            apiKey: emailConfig.apiKey ? emailConfig.apiKey.substring(0, 10) + '...' : 'NOT_SET',
          }
        }
      });
    }
    
    // Test Resend service
    const emailService = new SMTPService();
    const connectionTest = await emailService.testConnection();
    
    if (connectionTest.success) {
      res.json({
        success: true,
        data: {
          connectionStatus: 'SUCCESS',
          provider: 'Resend API',
          config: emailService.getConfig(),
        },
        message: 'Resend email service connectivity test successful'
      });
    } else {
      res.json({
        success: false,
        error: connectionTest.error,
        debug: {
          provider: 'Resend API',
          config: {
            ...emailConfig,
            apiKey: emailConfig.apiKey ? emailConfig.apiKey.substring(0, 10) + '...' : 'NOT_SET',
          }
        }
      });
    }
    
  } catch (error: any) {
    console.error('❌ Resend email debug error:', error);
    res.json({
      success: false,
      error: error.message,
      errorCode: error.code,
      debug: {
        provider: 'Resend API',
        emailConfig: {
          apiKey: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 10) + '...' : 'NOT_SET',
          fromEmail: process.env.RESEND_FROM_EMAIL,
          enabled: process.env.EMAIL_ENABLED,
        },
        errorStack: error.stack,
      }
    });
  }
});

// Email testing endpoints
router.post('/test-email-provider', async (req, res) => {
  try {
    const { provider } = req.body;
    
    if (!provider || !Object.values(EmailProvider).includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid provider. Must be one of: ' + Object.values(EmailProvider).join(', ')
      });
    }

    const emailProvider = new EmailProviderFactory().createProvider(provider as EmailProvider);
    const config = emailProvider.getConfig();

    return res.json({
      success: true,
      data: {
        provider: config.provider,
        fromEmail: config.fromEmail,
        fromName: config.fromName
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get('/test-email-connection', async (req, res) => {
  try {
    const emailProvider = EmailProviderFactory.createFromEnvironment();
    const connectionTest = await emailProvider.testConnection();

    return res.json({
      success: connectionTest.success,
      data: {
        provider: emailProvider.getConfig().provider,
        connectionSuccess: connectionTest.success,
        error: connectionTest.error
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.post('/send-test-email', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;

    if (!to || !subject) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, subject'
      });
    }

    const emailProvider = EmailProviderFactory.createFromEnvironment();
    const result = await emailProvider.sendEmail({
      to,
      subject,
      html: html || `<h1>${subject}</h1><p>Test email from OpenLearn Backend</p>`,
      text: text || `${subject}\n\nTest email from OpenLearn Backend`
    });

    return res.json({
      success: result.success,
      data: {
        provider: emailProvider.getConfig().provider,
        messageId: result.messageId,
        error: result.error
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
