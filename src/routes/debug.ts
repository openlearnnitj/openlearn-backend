import { Router } from 'express';
import { prisma } from '../config/database';
import Redis from 'ioredis';
import nodemailer from 'nodemailer';

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
    console.log('🔍 Debugging Email service connectivity...');
    
    const emailConfig = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      enabled: process.env.EMAIL_ENABLED === 'true',
      from: process.env.EMAIL_FROM,
    };
    
    console.log('📊 Email config:', {
      ...emailConfig,
      user: emailConfig.user ? emailConfig.user.replace(/(.{3}).*(@.*)/, '$1***$2') : 'NOT_SET',
    });
    
    if (!emailConfig.host || !emailConfig.user || !process.env.SMTP_PASS) {
      return res.json({
        success: false,
        error: 'Email configuration incomplete',
        debug: {
          missingVars: {
            SMTP_HOST: !emailConfig.host,
            SMTP_USER: !emailConfig.user,
            SMTP_PASS: !process.env.SMTP_PASS,
          },
          config: {
            ...emailConfig,
            user: emailConfig.user ? emailConfig.user.replace(/(.{3}).*(@.*)/, '$1***$2') : 'NOT_SET',
          }
        }
      });
    }
    
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.user,
        pass: process.env.SMTP_PASS,
      },
    });
    
    // Test connection
    const connectionTest = await transporter.verify();
    
    res.json({
      success: true,
      data: {
        connectionStatus: 'SUCCESS',
        connectionTest,
        config: {
          ...emailConfig,
          user: emailConfig.user.replace(/(.{3}).*(@.*)/, '$1***$2'),
        },
      },
      message: 'Email service connectivity test successful'
    });
    
  } catch (error: any) {
    console.error('❌ Email debug error:', error);
    res.json({
      success: false,
      error: error.message,
      errorCode: error.code,
      debug: {
        emailConfig: {
          host: process.env.SMTP_HOST,
          port: process.env.SMTP_PORT,
          secure: process.env.SMTP_SECURE,
          user: process.env.SMTP_USER ? process.env.SMTP_USER.replace(/(.{3}).*(@.*)/, '$1***$2') : 'NOT_SET',
          enabled: process.env.EMAIL_ENABLED,
          from: process.env.EMAIL_FROM,
        },
        errorStack: error.stack,
      }
    });
  }
});

export default router;
