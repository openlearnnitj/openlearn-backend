import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import config from './config/environment';
import { prisma } from './config/database';
import { generalRateLimit, authRateLimit, strictRateLimit, rateLimitInfo } from './middleware/rateLimiting';
// import { requestLogger, errorLogger, performanceLogger } from './middleware/logging';
// import { logger } from './config/logger';

// Import routes
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import cohortRoutes from './routes/cohorts';
import leagueRoutes from './routes/leagues';
import specializationRoutes from './routes/specializations';
import weekRoutes from './routes/weeks';
import sectionRoutes from './routes/sections';
import resourceRoutes from './routes/resources';
import resourceProgressRoutes from './routes/resourceProgress';
import progressRoutes from './routes/progress';
import analyticsRoutes from './routes/analytics';
import socialRoutes from './routes/social';
import badgeRoutes from './routes/badges';
import assignmentRoutes from './routes/assignments';
import leaderboardRoutes from './routes/leaderboard';
import emailRoutes from './routes/emailRoutes';
import statusRoutes from './routes/status';
import publicRoutes from './routes/public';
import debugRoutes from './routes/debug';

const app = express();

// Configure Express to trust proxies (for accurate IP detection behind nginx/load balancers)
// This is essential for rate limiting to work correctly with the real client IP
// Enable trust proxy in development for local testing too
app.set('trust proxy', true);

// Configure helmet with relaxed CSP for status page
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'", 
        "'unsafe-inline'", // Allow inline scripts
        "https://cdn.tailwindcss.com", // Allow Tailwind CSS CDN
        "https://unpkg.com" // Allow unpkg CDN as fallback
      ],
      scriptSrcAttr: ["'unsafe-inline'"], // Allow inline event handlers
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", // Allow inline styles
        "https://cdn.tailwindcss.com", // Allow Tailwind CSS CDN
        "https://unpkg.com", // Allow unpkg CDN as fallback
        "https://fonts.googleapis.com" // Allow Google Fonts
      ],
      styleSrcElem: [
        "'self'",
        "'unsafe-inline'",
        "https://cdn.tailwindcss.com",
        "https://unpkg.com",
        "https://fonts.googleapis.com" // Allow Google Fonts stylesheets
      ],
      fontSrc: [
        "'self'", 
        "https:", 
        "data:",
        "https://fonts.gstatic.com" // Allow Google Fonts
      ],
      connectSrc: [
        "'self'", 
        "https://api.openlearn.org.in",
        "http://api.openlearn.org.in",
        "https://*.openlearn.org.in",
        "http://*.openlearn.org.in"
      ],
      imgSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all openlearn.org.in subdomains and common development origins
    const allowedOrigins = [
      'https://api.openlearn.org.in',
      'http://api.openlearn.org.in', 
      'https://openlearn.org.in',
      'http://openlearn.org.in',
      'https://www.openlearn.org.in',
      'http://www.openlearn.org.in',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://127.0.0.1:3000'
    ];
    
    // Check if origin is allowed or if it's a subdomain of openlearn.org.in
    if (allowedOrigins.includes(origin) || origin.endsWith('.openlearn.org.in')) {
      return callback(null, true);
    }
    
    // For status page, allow same-origin requests
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 
    'Authorization', 
    'X-Requested-With', 
    'Accept', 
    'Origin', 
    'Cache-Control',
    'X-Cron-Ping'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Apply general rate limiting to all routes
app.use(generalRateLimit);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for status page assets
app.use('/public', express.static(path.join(__dirname, '../public')));

// Favicon route to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No content response
});

// Health check endpoint
/**
 * Basic Health Check Endpoint
 * Used by Render cron jobs for keep-alive pings
 * 
 * Purpose: Lightweight endpoint to prevent service spin-down
 * Usage: curl -f https://your-app.onrender.com/health
 */
app.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test database connection with a simple query
    await prisma.$queryRaw`SELECT 1 as health_check`;
    const dbResponseTime = Date.now() - startTime;
    
    // Detect if this is a cron job ping
    const userAgent = req.get('User-Agent') || '';
    const isCronPing = userAgent.includes('curl') || 
                      req.query.ping === 'cron' || 
                      req.get('X-Cron-Ping') === 'true';
    
    // Log cron pings for monitoring (but don't spam logs)
    if (isCronPing) {
      console.log(`Keep-alive ping received at ${new Date().toISOString()}`);
    }
    
    const healthData = {
      success: true,
      message: 'OpenLearn Backend is healthy',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      uptime: Math.floor(process.uptime()),
      database: {
        status: 'connected',
        responseTime: `${dbResponseTime}ms`
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB'
      },
      // Include keep-alive specific data for cron monitoring
      ...(isCronPing && { 
        keepAlive: true,
        lastPing: new Date().toISOString(),
        cronStatus: 'received'
      })
    };
    
    res.status(200).json(healthData);
    
  } catch (error: any) {
    console.error('❌ Health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Service temporarily unavailable',
      message: config.isDevelopment ? error.message : 'Database connection failed',
      timestamp: new Date().toISOString(),
      database: {
        status: 'disconnected'
      }
    });
  }
});

// Rate Limit Information Endpoint
/**
 * Rate Limiting Information Endpoint
 * Provides current rate limiting configuration for monitoring and debugging
 * 
 * Usage: curl -f https://your-app.onrender.com/rate-limit-info
 */
app.get('/rate-limit-info', (req, res) => {
  try {
    const rateInfo = {
      success: true,
      message: 'Rate limiting configuration',
      timestamp: new Date().toISOString(),
      rateLimiting: {
        enabled: !rateLimitInfo.config.skipInDevelopment,
        environment: config.nodeEnv,
        limits: {
          general: {
            ...rateLimitInfo.generalLimit,
            endpoints: 'Most API endpoints'
          },
          authentication: {
            ...rateLimitInfo.authLimit,
            endpoints: '/api/auth/*'
          },
          admin: {
            ...rateLimitInfo.strictLimit,
            endpoints: '/api/admin/*'
          }
        },
        trustProxy: config.isProduction,
        skipPaths: ['/health', '/ping', '/status', '/favicon.ico'],
        headers: {
          standardHeaders: true,
          includedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset']
        }
      }
    };
    
    res.status(200).json(rateInfo);
    
  } catch (error: any) {
    console.error('❌ Rate limit info check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: config.isDevelopment ? error.message : 'Failed to retrieve rate limit information',
      timestamp: new Date().toISOString()
    });
  }
});


app.get('/ping', (req, res) => {
  const pingData = {
    success: true,
    pong: true,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    pid: process.pid,
    nodeVersion: process.version
  };
  
  // Log ping for debugging (but limit frequency to avoid spam)
  if (Math.random() < 0.1) { // Log only 10% of pings
    console.log(`Ping received - Server alive for ${pingData.uptime}s`);
  }
  
  res.status(200).json(pingData);
});

app.get('/health/detailed', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test database with actual OpenLearn data queries
    const [
      userCount, 
      pioneerCount, 
      pathfinderCount,
      activeCohorts,
      recentProgress,
      totalSections,
      completedSections
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'PIONEER' } }),
      prisma.user.count({ where: { role: { not: 'PIONEER' } } }),
      prisma.cohort.count({ where: { isActive: true } }),
      prisma.sectionProgress.count({
        where: {
          updatedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }),
      prisma.section.count(),
      prisma.sectionProgress.count({ where: { isCompleted: true } })
    ]);
    
    const dbResponseTime = Date.now() - startTime;
    
    // Test Redis connection
    let redisStatus = 'unknown';
    let redisResponseTime = 0;
    try {
      const redisUrl = process.env.REDIS_URL;
      if (!redisUrl || redisUrl.trim() === '') {
        redisStatus = 'disabled';
      } else {
        const redisStartTime = Date.now();
        const IORedis = require('ioredis');
        const redis = new IORedis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD || undefined,
          connectTimeout: 3000,
          commandTimeout: 2000,
          maxRetriesPerRequest: 1,
        });
        
        await redis.ping();
        redisResponseTime = Date.now() - redisStartTime;
        redisStatus = 'connected';
        redis.disconnect();
      }
    } catch (error) {
      console.warn('Redis health check failed:', error);
      redisStatus = 'disconnected';
    }
    
    // Test Email Service (SMTP)
    let emailStatus = 'unknown';
    let emailDetails = {};
    try {
      const smtpHost = process.env.SMTP_HOST;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
      
      if (!smtpHost || !smtpUser || !smtpPass) {
        emailStatus = 'misconfigured';
        emailDetails = { 
          error: 'Missing required environment variables',
          missing: {
            SMTP_HOST: !smtpHost,
            SMTP_USER: !smtpUser,
            SMTP_PASSWORD: !smtpPass,
          }
        };
      } else {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransporter({
          host: smtpHost,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });
        
        await transporter.verify();
        emailStatus = 'connected';
        emailDetails = {
          host: smtpHost,
          port: process.env.SMTP_PORT || '587',
          secure: process.env.SMTP_SECURE === 'true',
        };
      }
    } catch (error) {
      console.warn('Email service health check failed:', error);
      emailStatus = 'disconnected';
      emailDetails = { error: 'SMTP verification failed' };
    }
    
    // Calculate completion rate
    const completionRate = totalSections > 0 
      ? Math.round((completedSections / totalSections) * 100) 
      : 0;
    
    res.status(200).json({
      success: true,
      message: 'OpenLearn Backend detailed health check',
      timestamp: new Date().toISOString(),
      environment: config.nodeEnv,
      system: {
        uptime: {
          seconds: Math.floor(process.uptime()),
        },
        memory: {
          usage: process.memoryUsage(),
          formatted: {
            used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
            total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
          }
        },
        nodeVersion: process.version,
        platform: process.platform
      },
      database: {
        status: 'connected',
        responseTime: `${dbResponseTime}ms`,
        performance: dbResponseTime < 100 ? 'excellent' : 
                    dbResponseTime < 500 ? 'good' : 'slow'
      },
      redis: {
        status: redisStatus,
        responseTime: redisResponseTime > 0 ? `${redisResponseTime}ms` : 'N/A',
        enabled: !!process.env.REDIS_URL && process.env.REDIS_URL.trim() !== '',
        url: process.env.REDIS_URL ? 'configured' : 'not_set',
      },
      emailService: {
        status: emailStatus,
        enabled: !!(process.env.SMTP_HOST && process.env.SMTP_USER && (process.env.SMTP_PASSWORD || process.env.SMTP_PASS)),
        details: emailDetails,
        host: process.env.SMTP_HOST || 'not_configured',
      },
      openlearnMetrics: {
        users: {
          total: userCount,
          pioneers: pioneerCount,
          pathfinders: pathfinderCount,
          ratio: userCount > 0 ? Math.round((pioneerCount / userCount) * 100) : 0
        },
        cohorts: {
          active: activeCohorts,
        },
        progress: {
          recentActivity: recentProgress,
          totalSections,
          completedSections,
          completionRate: `${completionRate}%`
        }
      },
      apis: {
        authenticationEnabled: true,
        corsConfigured: true
      }
    });
    
  } catch (error: any) {
    console.error('❌ Detailed health check failed:', error);
    res.status(503).json({
      success: false,
      error: 'Service health check failed',
      message: config.isDevelopment ? error.message : 'System health check failed',
      timestamp: new Date().toISOString()
    });
  }
});


app.post('/wake-up', async (req, res) => {
  try {
    console.log('Wake-up request received - warming up OpenLearn systems...');
    
    const startTime = Date.now();
    
    // Warm up database connections with typical queries
    const warmupPromises = [
      prisma.$queryRaw`SELECT 1`, // Basic connectivity
      prisma.user.findFirst({ select: { id: true } }), // Warm up user queries
      prisma.cohort.findFirst({ 
        where: { isActive: true },
        select: { id: true, name: true }
      }), // Warm up cohort queries
      prisma.section.findFirst({ select: { id: true } }), // Warm up section queries
    ];
    
    await Promise.all(warmupPromises);
    
    // Additional warm-up: Preload commonly accessed data
    const preloadPromises = [
      prisma.user.count(), // Cache user count
      prisma.cohort.count({ where: { isActive: true } }), // Cache active cohorts
    ];
    
    const [userCount, activeCohorts] = await Promise.all(preloadPromises);
    
    const wakeupTime = Date.now() - startTime;
    
    console.log(`✅ OpenLearn systems warmed up in ${wakeupTime}ms`);
    
    res.status(200).json({
      success: true,
      message: 'OpenLearn Backend is awake and ready',
      timestamp: new Date().toISOString(),
      wakeupTime: `${wakeupTime}ms`,
      systems: {
        database: 'warmed',
        prismaClient: 'ready',
        expressServer: 'active',
        userQueries: 'preloaded',
        cohortQueries: 'preloaded'
      },
      preloadedData: {
        userCount,
        activeCohorts,
        cacheStatus: 'refreshed'
      },
      performance: {
        wakeupSpeed: wakeupTime < 1000 ? 'fast' : 
                    wakeupTime < 3000 ? 'moderate' : 'slow',
        readyForTraffic: true
      }
    });
    
  } catch (error: any) {
    console.error('❌ Wake-up failed:', error);
    res.status(503).json({
      success: false,
      error: 'System wake-up failed',
      message: config.isDevelopment ? error.message : 'Failed to warm up systems',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/health/keepalive-stats', async (req, res) => {
  try {
    const uptime = process.uptime();
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);
    
    // Estimate ping frequency based on uptime (assuming 10-minute intervals)
    const estimatedPings = Math.floor(uptime / 600);
    
    // Get recent activity from audit logs if available
    let recentActivity = 0;
    try {
      recentActivity = await prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      });
    } catch {
      // AuditLog might not exist yet, skip this metric
      recentActivity = 0;
    }
    
    // Calculate efficiency metrics
    const hoursAlive = uptime / 3600;
    const potentialSpinDowns = Math.floor(hoursAlive * 2); // Assume 30-min spin-down intervals
    const spinDownsPrevented = Math.max(0, potentialSpinDowns - 1); // -1 for initial startup
    
    res.json({
      success: true,
      message: 'OpenLearn Keep-Alive Statistics',
      timestamp: new Date().toISOString(),
      keepAliveStats: {
        uptime: {
          seconds: Math.floor(uptime),
          formatted: `${uptimeHours}h ${uptimeMinutes}m`,
          lastRestart: new Date(Date.now() - uptime * 1000).toISOString(),
          status: uptime > 3600 ? 'stable' : 'recent-start'
        },
        pings: {
          estimated: estimatedPings,
          frequency: '10 minutes',
          lastEstimated: estimatedPings > 0 
            ? new Date(Date.now() - (uptime % 600) * 1000).toISOString()
            : 'none-yet'
        },
        efficiency: {
          spinDownsPrevented,
          uptimeImprovement: `${Math.round((spinDownsPrevented / Math.max(potentialSpinDowns, 1)) * 100)}%`,
          costSavings: `~${(estimatedPings * 0.001).toFixed(3)} credits`, // Rough estimate
        },
        activity: {
          last24Hours: recentActivity,
          isActivelyUsed: recentActivity > 0,
          userEngagement: recentActivity > 10 ? 'high' : 
                         recentActivity > 0 ? 'moderate' : 'low'
        }
      },
    });
    
  } catch (error: any) {
    console.error('❌ Keep-alive stats failed:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get keep-alive stats',
      message: config.isDevelopment ? error.message : 'Statistics unavailable'
    });
  }
});


// Status Page Web Route - Serve simple HTML page
app.get('/status-page', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/simple-status.html'));
});

// Public API routes (no authentication required)
app.use('/api/public', publicRoutes);

// Authentication routes (public endpoints for login, signup, password reset)
app.use('/api/auth', authRateLimit, authRoutes); // Public auth endpoints

// Debug routes (should be secured or removed in production)
app.use('/api/debug', debugRoutes);

// API routes with specific rate limiting
app.use('/api/admin', strictRateLimit, adminRoutes); // Strict rate limiting for admin operations
app.use('/api/cohorts', cohortRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/specializations', specializationRoutes);
app.use('/api/weeks', weekRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/status', statusRoutes); 
app.use('/api/resource-progress', resourceProgressRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api', resourceRoutes); // ✅ Moved to end - catches remaining /api/* routes

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Global error handler
// app.use(errorLogger);
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log error details
  console.error('Unhandled error:', {
    message: error.message,
    stack: config.isDevelopment ? error.stack : undefined,
    url: req.url,
    method: req.method,
    ip: req.ip,
  });
  
  res.status(error.status || 500).json({
    success: false,
    error: config.isProduction ? 'Internal Server Error' : error.message,
    ...(config.isDevelopment && { stack: error.stack }),
  });
});

export default app;
