import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/environment';
import { prisma } from './config/database';
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

const app = express();

app.use(helmet());

const corsOptions = {
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

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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


// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cohorts', cohortRoutes);
app.use('/api/leagues', leagueRoutes);
app.use('/api/specializations', specializationRoutes);
app.use('/api/weeks', weekRoutes);
app.use('/api/sections', sectionRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api', resourceRoutes);
app.use('/api/resource-progress', resourceProgressRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

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
