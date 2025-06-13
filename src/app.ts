import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
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
import statusRoutes from './routes/status';

const app = express();

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
      styleSrc: [
        "'self'", 
        "'unsafe-inline'", // Allow inline styles
        "https://cdn.tailwindcss.com", // Allow Tailwind CSS CDN
        "https://unpkg.com" // Allow unpkg CDN as fallback
      ],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

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


// Status Page Web Route - Serve HTML page directly
app.get('/status-page', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenLearn System Status</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="icon" type="image/png" href="https://avatars.githubusercontent.com/u/208047818?s=400&u=dfc76ca68211e1f2251c63e57982bae0855edec8&v=4">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background: #0f172a;
            min-height: 100vh;
            position: relative;
        }
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
                radial-gradient(circle at 25% 25%, #fbbf24 0%, transparent 50%),
                radial-gradient(circle at 75% 75%, #f59e0b 0%, transparent 50%),
                linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            opacity: 0.8;
            z-index: -1;
        }
        .status-container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(251, 191, 36, 0.2);
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .header-section {
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            color: #0f172a;
        }
        .loading-spinner {
            border: 3px solid rgba(251, 191, 36, 0.3);
            border-top: 3px solid #fbbf24;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .status-card {
            transition: all 0.3s ease;
            border-left: 4px solid transparent;
            background: rgba(255, 255, 255, 0.98);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(251, 191, 36, 0.1);
        }
        .status-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
        }
        .status-operational { border-left-color: #10b981; }
        .status-degraded { border-left-color: #f59e0b; }
        .status-outage { border-left-color: #ef4444; }
        .status-maintenance { border-left-color: #3b82f6; }
        .openlearn-logo {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            object-fit: cover;
            border: 2px solid rgba(251, 191, 36, 0.3);
            box-shadow: 0 0 20px rgba(251, 191, 36, 0.2);
        }
        .btn-primary {
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            color: #0f172a;
            font-weight: 600;
            transition: all 0.2s ease;
        }
        .btn-primary:hover {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
        }
        .uptime-info {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border: 1px solid #fbbf24;
            color: #92400e;
        }
        .uptime-bar {
            height: 24px;
            background: #f3f4f6;
            border-radius: 4px;
            overflow: hidden;
            position: relative;
            display: flex;
            gap: 1px;
        }
        .uptime-segment {
            height: 100%;
            flex: 1;
            border-radius: 1px;
            transition: all 0.2s ease;
        }
        .uptime-segment:hover {
            transform: scaleY(1.1);
        }
        .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 48px;
            height: 48px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            backdrop-filter: blur(10px);
        }
        .openlearn-brand {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            font-weight: 800;
            letter-spacing: -0.5px;
        }
    </style>
</head>
<body>
    <div id="status-page-root">
        <div class="min-h-screen flex items-center justify-center p-4">
            <div class="glass-effect rounded-xl p-8 text-center max-w-md w-full shadow-2xl">
                <div class="logo-container mx-auto mb-4">
                    <img 
                        src="https://avatars.githubusercontent.com/u/208047818?s=400&u=dfc76ca68211e1f2251c63e57982bae0855edec8&v=4" 
                        alt="OpenLearn" 
                        class="w-8 h-8 rounded-lg"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                    >
                    <div class="openlearn-brand text-xl hidden">OL</div>
                </div>
                <div class="loading-spinner mb-4"></div>
                <h2 class="text-xl font-semibold text-gray-900 mb-2">Loading System Status</h2>
                <p class="text-gray-600">Connecting to OpenLearn services...</p>
            </div>
        </div>
    </div>

    <script>
        const API_BASE = window.location.origin;
        
        const SystemStatus = {
            OPERATIONAL: 'OPERATIONAL',
            DEGRADED_PERFORMANCE: 'DEGRADED_PERFORMANCE',
            PARTIAL_OUTAGE: 'PARTIAL_OUTAGE',
            MAJOR_OUTAGE: 'MAJOR_OUTAGE',
            MAINTENANCE: 'MAINTENANCE',
        };

        const SystemComponent = {
            API: 'API',
            DATABASE: 'DATABASE',
            AUTHENTICATION: 'AUTHENTICATION',
        };

        const getStatusConfig = (status) => {
            switch (status) {
                case SystemStatus.OPERATIONAL:
                    return { 
                        color: 'text-green-700', 
                        bg: 'bg-green-50', 
                        border: 'border-green-200',
                        dot: 'bg-green-500',
                        class: 'status-operational'
                    };
                case SystemStatus.DEGRADED_PERFORMANCE:
                    return { 
                        color: 'text-yellow-700', 
                        bg: 'bg-yellow-50', 
                        border: 'border-yellow-200',
                        dot: 'bg-yellow-500',
                        class: 'status-degraded'
                    };
                case SystemStatus.PARTIAL_OUTAGE:
                    return { 
                        color: 'text-orange-700', 
                        bg: 'bg-orange-50', 
                        border: 'border-orange-200',
                        dot: 'bg-orange-500',
                        class: 'status-outage'
                    };
                case SystemStatus.MAJOR_OUTAGE:
                    return { 
                        color: 'text-red-700', 
                        bg: 'bg-red-50', 
                        border: 'border-red-200',
                        dot: 'bg-red-500',
                        class: 'status-outage'
                    };
                case SystemStatus.MAINTENANCE:
                    return { 
                        color: 'text-blue-700', 
                        bg: 'bg-blue-50', 
                        border: 'border-blue-200',
                        dot: 'bg-blue-500',
                        class: 'status-maintenance'
                    };
                default:
                    return { 
                        color: 'text-gray-700', 
                        bg: 'bg-gray-50', 
                        border: 'border-gray-200',
                        dot: 'bg-gray-500',
                        class: ''
                    };
            }
        };

        const formatComponentName = (component) => {
            const names = {
                [SystemComponent.API]: 'API Server',
                [SystemComponent.DATABASE]: 'Database',
                [SystemComponent.AUTHENTICATION]: 'Authentication'
            };
            return names[component] || component.replace(/_/g, ' ').toLowerCase().replace(/\\b\\w/g, l => l.toUpperCase());
        };

        const formatStatus = (status) => {
            const statuses = {
                [SystemStatus.OPERATIONAL]: 'Operational',
                [SystemStatus.DEGRADED_PERFORMANCE]: 'Degraded Performance',
                [SystemStatus.PARTIAL_OUTAGE]: 'Partial Outage',
                [SystemStatus.MAJOR_OUTAGE]: 'Major Outage',
                [SystemStatus.MAINTENANCE]: 'Under Maintenance'
            };
            return statuses[status] || status.replace(/_/g, ' ').toLowerCase().replace(/\\b\\w/g, l => l.toUpperCase());
        };

        const formatUptime = (uptime) => {
            if (uptime === 100) return '100.00%';
            if (uptime >= 99.9) return uptime.toFixed(2) + '%';
            if (uptime >= 99) return uptime.toFixed(1) + '%';
            return uptime.toFixed(0) + '%';
        };

        const formatResponseTime = (ms) => {
            if (ms < 1000) return Math.round(ms) + 'ms';
            return (ms / 1000).toFixed(1) + 's';
        };

        const getUptimeColor = (uptime) => {
            if (uptime >= 99.9) return 'text-green-600';
            if (uptime >= 99.0) return 'text-yellow-600';
            if (uptime >= 95.0) return 'text-orange-600';
            return 'text-red-600';
        };

        const formatRelativeTime = (date) => {
            const now = new Date();
            const diffMs = now.getTime() - new Date(date).getTime();
            const diffSeconds = Math.floor(diffMs / 1000);
            const diffMinutes = Math.floor(diffSeconds / 60);
            const diffHours = Math.floor(diffMinutes / 60);
            
            if (diffSeconds < 60) return 'just now';
            if (diffMinutes < 60) return diffMinutes + 'm ago';
            if (diffHours < 24) return diffHours + 'h ago';
            return new Date(date).toLocaleDateString();
        };

        class StatusPage {
            constructor() {
                this.statusData = null;
                this.lastUpdated = new Date();
                this.isLoading = true;
                this.error = null;
                this.autoRefresh = true;
                this.refreshInterval = null;
                this.init();
            }

            async init() {
                await this.fetchStatusData();
                this.render();
                this.startAutoRefresh();
            }

            startAutoRefresh() {
                if (this.autoRefresh) {
                    this.refreshInterval = setInterval(() => {
                        this.fetchStatusData();
                    }, 30000);
                }
            }

            stopAutoRefresh() {
                if (this.refreshInterval) {
                    clearInterval(this.refreshInterval);
                    this.refreshInterval = null;
                }
            }

            async fetchStatusData() {
                try {
                    this.isLoading = true;
                    this.error = null;
                    
                    const response = await fetch(API_BASE + '/api/status');
                    
                    if (!response.ok) {
                        throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                    }
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        this.statusData = result.data;
                        this.lastUpdated = new Date();
                    } else {
                        throw new Error(result.error || 'Failed to fetch status');
                    }
                } catch (error) {
                    this.error = error.message;
                    console.error('Failed to fetch status:', error);
                } finally {
                    this.isLoading = false;
                    this.render();
                }
            }

            render() {
                const root = document.getElementById('status-page-root');
                
                if (this.isLoading && !this.statusData) {
                    root.innerHTML = this.renderLoading();
                    return;
                }
                
                if (this.error && !this.statusData) {
                    root.innerHTML = this.renderError();
                    return;
                }

                root.innerHTML = this.renderStatusPage();
                this.attachEventListeners();
            }

            attachEventListeners() {
                const refreshBtn = document.getElementById('refresh-btn');
                if (refreshBtn) {
                    refreshBtn.addEventListener('click', () => this.fetchStatusData());
                }

                const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
                if (autoRefreshToggle) {
                    autoRefreshToggle.addEventListener('change', (e) => {
                        this.autoRefresh = e.target.checked;
                        if (this.autoRefresh) {
                            this.startAutoRefresh();
                        } else {
                            this.stopAutoRefresh();
                        }
                    });
                }
            }

            renderLoading() {
                return \`
                    <div class="min-h-screen flex items-center justify-center p-4">
                        <div class="glass-effect rounded-xl p-8 text-center max-w-md w-full shadow-2xl">
                            <div class="logo-container mx-auto mb-4">
                                <img 
                                    src="https://avatars.githubusercontent.com/u/208047818?s=400&u=dfc76ca68211e1f2251c63e57982bae0855edec8&v=4" 
                                    alt="OpenLearn" 
                                    class="w-8 h-8 rounded-lg"
                                    onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                                >
                                <div class="openlearn-brand text-xl hidden">OL</div>
                            </div>
                            <div class="loading-spinner mb-4"></div>
                            <h2 class="text-xl font-semibold text-gray-900 mb-2">Loading System Status</h2>
                            <p class="text-gray-600">Connecting to OpenLearn services...</p>
                        </div>
                    </div>
                \`;
            }

            renderError() {
                return \`
                    <div class="min-h-screen flex items-center justify-center p-4">
                        <div class="glass-effect rounded-xl p-8 text-center max-w-md w-full shadow-2xl border border-red-200">
                            <div class="logo-container mx-auto mb-4">
                                <img 
                                    src="https://avatars.githubusercontent.com/u/208047818?s=400&u=dfc76ca68211e1f2251c63e57982bae0855edec8&v=4" 
                                    alt="OpenLearn" 
                                    class="w-8 h-8 rounded-lg"
                                    onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                                >
                                <div class="openlearn-brand text-xl hidden">OL</div>
                            </div>
                            <div class="text-red-500 text-4xl mb-4">⚠</div>
                            <h2 class="text-xl font-bold text-gray-900 mb-3">Service Unavailable</h2>
                            <p class="text-gray-600 mb-6">\${this.error}</p>
                            <button
                                onclick="window.statusPage.fetchStatusData()"
                                class="btn-primary font-medium py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105"
                            >
                                Retry Connection
                            </button>
                        </div>
                    </div>
                \`;
            }

            renderStatusPage() {
                if (!this.statusData) return '';

                const overallConfig = getStatusConfig(this.statusData.overallStatus);
                const isAllOperational = this.statusData.overallStatus === SystemStatus.OPERATIONAL;

                return \`
                    <div class="min-h-screen">
                        <!-- Header -->
                        <header class="header-section shadow-lg">
                            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center space-x-4">
                                        <img 
                                            src="https://avatars.githubusercontent.com/u/208047818?s=400&u=dfc76ca68211e1f2251c63e57982bae0855edec8&v=4" 
                                            alt="OpenLearn" 
                                            class="openlearn-logo"
                                            onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                                        >
                                        <div class="text-4xl font-bold hidden" style="color: #fbbf24;">OL</div>
                                        <div>
                                            <h1 class="text-2xl font-bold">OpenLearn Status</h1>
                                            <p class="text-opacity-80">System health and uptime monitoring</p>
                                        </div>
                                    </div>
                                    
                                    <div class="flex items-center space-x-3">
                                        <div class="w-3 h-3 rounded-full \${overallConfig.dot}"></div>
                                        <span class="text-lg font-medium text-white">
                                            \${isAllOperational ? 'All Systems Operational' : this.getOverallStatusMessage()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </header>

                        <!-- Main Content -->
                        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                            <div class="space-y-8">
                                <!-- Current Status -->
                                \${this.renderCurrentStatus()}
                                
                                <!-- System Components -->
                                \${this.renderComponents()}
                                
                                <!-- Uptime Metrics -->
                                \${this.renderUptimeMetrics()}
                                
                                <!-- Incidents -->
                                \${this.renderIncidents()}
                            </div>
                        </main>

                        <!-- Footer -->
                        <footer class="glass-effect border-t border-white/20 mt-16">
                            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                                <div class="flex items-center justify-between flex-wrap gap-4">
                                    <div class="flex items-center space-x-4">
                                        <button
                                            id="refresh-btn"
                                            class="flex items-center space-x-2 btn-primary font-medium py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 \${this.isLoading ? 'opacity-50 cursor-not-allowed' : ''}"
                                            \${this.isLoading ? 'disabled' : ''}
                                        >
                                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                                            </svg>
                                            <span>\${this.isLoading ? 'Refreshing...' : 'Refresh'}</span>
                                        </button>
                                        
                                        <label class="flex items-center space-x-2 text-sm text-gray-600">
                                            <input
                                                type="checkbox"
                                                id="auto-refresh-toggle"
                                                \${this.autoRefresh ? 'checked' : ''}
                                                class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            >
                                            <span>Auto-refresh (30s)</span>
                                        </label>
                                    </div>
                                    
                                    <div class="text-sm text-gray-500">
                                        Last updated: \${formatRelativeTime(this.lastUpdated)}
                                    </div>
                                </div>
                            </div>
                        </footer>
                    </div>
                \`;
            }

            renderCurrentStatus() {
                if (!this.statusData) return '';

                const overallConfig = getStatusConfig(this.statusData.overallStatus);
                
                return \`
                    <div class="glass-effect rounded-lg shadow-lg border border-white/20 p-6">
                        <div class="flex items-center justify-between">
                            <div>
                                <h2 class="text-lg font-semibold text-gray-900 mb-1">Current Status</h2>
                                <p class="text-gray-600">\${this.getOverallStatusMessage()}</p>
                            </div>
                            <div class="text-right">
                                <div class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium \${overallConfig.bg} \${overallConfig.color} \${overallConfig.border} border">
                                    \${formatStatus(this.statusData.overallStatus)}
                                </div>
                                <div class="text-xs text-gray-500 mt-1">
                                    \${this.statusData.components ? this.statusData.components.length : 0} components monitored
                                </div>
                            </div>
                        </div>
                    </div>
                \`;
            }

            renderComponents() {
                if (!this.statusData.components || this.statusData.components.length === 0) {                return \`
                    <div class="glass-effect rounded-lg shadow-sm border border-white/20 p-6">
                        <h2 class="text-lg font-semibold text-gray-900 mb-4">System Components</h2>
                        <p class="text-gray-600">No component data available</p>
                    </div>
                \`;
                }

                const componentsHtml = this.statusData.components.map(component => {
                    const config = getStatusConfig(component.status);
                    const componentName = formatComponentName(component.component);
                    const statusText = formatStatus(component.status);
                    const uptimeColor = getUptimeColor(component.uptime);
                    
                    return \`
                        <div class="status-card bg-white rounded-lg shadow-sm border border-gray-200 p-6 \${config.class}">
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center space-x-3">
                                    <div class="w-3 h-3 rounded-full \${config.dot}"></div>
                                    <div>
                                        <h3 class="font-semibold text-gray-900">\${componentName}</h3>
                                        <p class="text-sm text-gray-500">Last checked: \${formatRelativeTime(component.lastChecked)}</p>
                                    </div>
                                </div>
                                
                                <div class="flex items-center space-x-6">
                                    <div class="text-right">
                                        <div class="text-sm font-bold \${uptimeColor}">
                                            \${formatUptime(component.uptime)}
                                        </div>
                                        <div class="text-xs text-gray-500">Uptime</div>
                                    </div>
                                    
                                    <div class="text-right">
                                        <div class="text-sm font-bold text-gray-900">
                                            \${formatResponseTime(component.avgResponseTime)}
                                        </div>
                                        <div class="text-xs text-gray-500">Response</div>
                                    </div>
                                    
                                    <div class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${config.bg} \${config.color} \${config.border} border">
                                        \${statusText}
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Uptime Chart -->
                            <div class="uptime-bar">
                                \${this.generateUptimeVisualization(component)}
                            </div>
                            <div class="flex justify-between text-xs text-gray-500 mt-2">
                                <span>90 days ago</span>
                                <span>Today</span>
                            </div>
                        </div>
                    \`;
                }).join('');

                return \`
                    <div class="space-y-4">
                        <h2 class="text-lg font-semibold text-gray-900">System Components</h2>
                        \${componentsHtml}
                    </div>
                \`;
            }

            generateUptimeVisualization(component) {
                // Since this is a new status monitoring system, we don't have 90 days of historical data yet
                // Instead of showing fake data, show a clean indicator with current status
                const currentColor = component.status === 'OPERATIONAL' ? 'bg-green-500' : 
                                   component.status === 'DEGRADED_PERFORMANCE' ? 'bg-yellow-500' : 
                                   'bg-red-500';
                
                return \`
                    <div class="flex items-center justify-center py-4 text-sm text-gray-600">
                        <div class="flex items-center space-x-2">
                            <div class="w-3 h-3 rounded-full \${currentColor}"></div>
                            <span>Historical data will be available after 90 days of monitoring</span>
                        </div>
                    </div>
                \`;
            }

            renderUptimeMetrics() {
                if (!this.statusData.uptime) return '';

                return \`
                    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <h2 class="text-lg font-semibold text-gray-900 mb-6">Uptime Summary</h2>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div class="text-center">
                                <div class="text-2xl font-bold \${getUptimeColor(this.statusData.uptime.last24h)} mb-1">
                                    \${formatUptime(this.statusData.uptime.last24h)}
                                </div>
                                <div class="text-sm font-medium text-gray-600">Last 24 Hours</div>
                            </div>
                            <div class="text-center">
                                <div class="text-2xl font-bold \${getUptimeColor(this.statusData.uptime.last7d)} mb-1">
                                    \${formatUptime(this.statusData.uptime.last7d)}
                                </div>
                                <div class="text-sm font-medium text-gray-600">Last 7 Days</div>
                            </div>
                            <div class="text-center">
                                <div class="text-2xl font-bold \${getUptimeColor(this.statusData.uptime.last30d)} mb-1">
                                    \${formatUptime(this.statusData.uptime.last30d)}
                                </div>
                                <div class="text-sm font-medium text-gray-600">Last 30 Days</div>
                            </div>
                        </div>
                    </div>
                \`;
            }

            renderIncidents() {
                const hasIncidents = this.statusData.activeIncidents && this.statusData.activeIncidents.length > 0;
                
                return \`
                    <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="text-lg font-semibold text-gray-900">Recent Incidents</h2>
                            <div class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${hasIncidents ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'} border">
                                \${hasIncidents ? this.statusData.activeIncidents.length + ' Active' : 'No Active Incidents'}
                            </div>
                        </div>
                        
                        \${hasIncidents ? \`
                            <div class="space-y-3">
                                <p class="text-gray-600">Incident details would be displayed here when available.</p>
                            </div>
                        \` : \`
                            <div class="flex items-center justify-center py-8 text-green-600">
                                <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                </svg>
                                <span class="font-medium">All systems are running smoothly</span>
                            </div>
                        \`}
                    </div>
                \`;
            }

            getOverallStatusMessage() {
                const messages = {
                    [SystemStatus.OPERATIONAL]: 'All systems are operational',
                    [SystemStatus.DEGRADED_PERFORMANCE]: 'Some systems are experiencing performance issues',
                    [SystemStatus.PARTIAL_OUTAGE]: 'Some systems are experiencing service disruptions',
                    [SystemStatus.MAJOR_OUTAGE]: 'Multiple systems are experiencing major issues',
                    [SystemStatus.MAINTENANCE]: 'Systems are under scheduled maintenance'
                };
                return messages[this.statusData.overallStatus] || 'System status unknown';
            }
        }

        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            window.statusPage = new StatusPage();
        });

        if (document.readyState !== 'loading') {
            window.statusPage = new StatusPage();
        }
    </script>
</body>
</html>`);
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
app.use('/api/status', statusRoutes); 
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
