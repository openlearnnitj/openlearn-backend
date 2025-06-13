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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }
        
        body {
            background: #fafafa;
            min-height: 100vh;
            margin: 0;
            color: #1f2937;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem 1rem;
        }
        
        .header {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 2rem;
            margin-bottom: 2rem;
        }
        
        .logo {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            object-fit: cover;
        }
        
        .status-operational { border-left: 3px solid #10b981; }
        .status-degraded { border-left: 3px solid #f59e0b; }
        .status-outage { border-left: 3px solid #ef4444; }
        .status-maintenance { border-left: 3px solid #3b82f6; }
        
        .card {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1rem;
        }
        
        .btn {
            background: #fbbf24;
            color: #1f2937;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .btn:hover {
            background: #f59e0b;
        }
        
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        
        .loading-spinner {
            border: 2px solid #e5e7eb;
            border-top: 2px solid #fbbf24;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            display: inline-block;
        }
        
        .uptime-chart {
            height: 60px;
            background: #f9fafb;
            border-radius: 6px;
            padding: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 1rem 0;
        }
        
        .uptime-bar {
            height: 32px;
            background: #f3f4f6;
            border-radius: 4px;
            overflow: hidden;
            display: flex;
        }
        
        .uptime-segment {
            height: 100%;
            flex: 1;
            margin-right: 1px;
        }
        
        .metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin: 1rem 0;
        }
        
        .metric-card {
            background: #f9fafb;
            padding: 1rem;
            border-radius: 8px;
            text-align: center;
        }
        
        .text-green { color: #059669; }
        .text-yellow { color: #d97706; }
        .text-red { color: #dc2626; }
        .text-blue { color: #2563eb; }
        .text-gray { color: #6b7280; }
        
        .bg-green { background-color: #10b981; }
        .bg-yellow { background-color: #f59e0b; }
        .bg-red { background-color: #ef4444; }
        .bg-blue { background-color: #3b82f6; }
        .bg-gray { background-color: #6b7280; }
    </style>
</head>
<body>
    <div id="status-page-root">
        <div class="min-h-screen flex items-center justify-center p-4">
            <div class="card text-center max-w-md w-full">
                <div class="mb-4">
                    <img 
                        src="https://avatars.githubusercontent.com/u/208047818?s=400&u=dfc76ca68211e1f2251c63e57982bae0855edec8&v=4" 
                        alt="OpenLearn" 
                        class="logo mx-auto"
                        onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                    >
                    <div class="text-2xl font-bold text-amber-600 hidden">OL</div>
                </div>
                <div class="loading-spinner mb-4"></div>
                <h2 class="text-xl font-semibold mb-2">Loading System Status</h2>
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
                        <div class="card text-center max-w-md w-full">
                            <div class="mb-4">
                                <img 
                                    src="https://avatars.githubusercontent.com/u/208047818?s=400&u=dfc76ca68211e1f2251c63e57982bae0855edec8&v=4" 
                                    alt="OpenLearn" 
                                    class="logo mx-auto"
                                    onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                                >
                                <div class="text-2xl font-bold text-amber-600 hidden">OL</div>
                            </div>
                            <div class="loading-spinner mb-4"></div>
                            <h2 class="text-xl font-semibold mb-2">Loading System Status</h2>
                            <p class="text-gray-600">Connecting to OpenLearn services...</p>
                        </div>
                    </div>
                \`;
            }

            renderError() {
                return \`
                    <div class="min-h-screen flex items-center justify-center p-4">
                        <div class="card text-center max-w-md w-full border-red-200">
                            <div class="mb-4">
                                <img 
                                    src="https://avatars.githubusercontent.com/u/208047818?s=400&u=dfc76ca68211e1f2251c63e57982bae0855edec8&v=4" 
                                    alt="OpenLearn" 
                                    class="logo mx-auto"
                                    onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                                >
                                <div class="text-2xl font-bold text-amber-600 hidden">OL</div>
                            </div>
                            <div class="text-red-500 text-4xl mb-4">⚠</div>
                            <h2 class="text-xl font-bold mb-3">Service Unavailable</h2>
                            <p class="text-gray-600 mb-6">\${this.error}</p>
                            <button
                                onclick="window.statusPage.fetchStatusData()"
                                class="btn"
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
                    <div class="container">
                        <!-- Header -->
                        <div class="header">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-4">
                                    <img 
                                        src="https://avatars.githubusercontent.com/u/208047818?s=400&u=dfc76ca68211e1f2251c63e57982bae0855edec8&v=4" 
                                        alt="OpenLearn" 
                                        class="logo"
                                        onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
                                    >
                                    <div class="text-2xl font-bold text-amber-600 hidden">OL</div>
                                    <div>
                                        <h1 class="text-2xl font-bold text-gray-900">OpenLearn Status</h1>
                                        <p class="text-gray-600">System health and uptime monitoring</p>
                                    </div>
                                </div>
                                
                                <div class="flex items-center space-x-3">
                                    <div class="status-dot \${overallConfig.dot}"></div>
                                    <span class="text-lg font-medium text-gray-900">
                                        \${isAllOperational ? 'All Systems Operational' : this.getOverallStatusMessage()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- Current Status -->
                        \${this.renderCurrentStatus()}
                        
                        <!-- System Components -->
                        \${this.renderComponents()}
                        
                        <!-- Uptime Metrics -->
                        \${this.renderUptimeMetrics()}
                        
                        <!-- Incidents -->
                        \${this.renderIncidents()}
                        
                        <!-- Footer -->
                        <div class="card mt-8">
                            <div class="flex items-center justify-between flex-wrap gap-4">
                                <div class="flex items-center space-x-4">
                                    <button
                                        id="refresh-btn"
                                        class="btn flex items-center space-x-2 \${this.isLoading ? 'opacity-50 cursor-not-allowed' : ''}"
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
                                            class="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                                        >
                                        <span>Auto-refresh (30s)</span>
                                    </label>
                                </div>
                                
                                <div class="text-sm text-gray-500">
                                    Last updated: \${formatRelativeTime(this.lastUpdated)}
                                </div>
                            </div>
                        </div>
                    </div>
                \`;
            }

            renderCurrentStatus() {
                if (!this.statusData) return '';

                const overallConfig = getStatusConfig(this.statusData.overallStatus);
                
                return \`
                    <div class="card \${overallConfig.class}">
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
                if (!this.statusData.components || this.statusData.components.length === 0) {
                    return \`
                        <div class="card">
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
                        <div class="card \${config.class}">
                            <div class="flex items-center justify-between mb-4">
                                <div class="flex items-center space-x-3">
                                    <div class="status-dot \${config.dot}"></div>
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
                            
                            <!-- Today's Uptime -->
                            \${this.renderTodayUptime(component)}
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
            }

            renderTodayUptime(component) {
                return \`
                    <div class="uptime-chart">
                        <div class="flex items-center space-x-2">
                            <div class="status-dot \${component.status === 'OPERATIONAL' ? 'bg-green' : component.status === 'DEGRADED_PERFORMANCE' ? 'bg-yellow' : 'bg-red'}"></div>
                            <span class="text-sm text-gray-600">
                                \${component.status === 'OPERATIONAL' ? 'Running smoothly today' : 
                                  component.status === 'DEGRADED_PERFORMANCE' ? 'Some performance issues today' : 
                                  'Experiencing issues today'}
                            </span>
                        </div>
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
                    <div class="card">
                        <h2 class="text-lg font-semibold text-gray-900 mb-6">Uptime Summary</h2>
                        <div class="metric-grid">
                            <div class="metric-card">
                                <div class="text-2xl font-bold \${getUptimeColor(this.statusData.uptime.last24h)} mb-1">
                                    \${formatUptime(this.statusData.uptime.last24h)}
                                </div>
                                <div class="text-sm font-medium text-gray-600">Last 24 Hours</div>
                            </div>
                            <div class="metric-card">
                                <div class="text-2xl font-bold \${getUptimeColor(this.statusData.uptime.last7d)} mb-1">
                                    \${formatUptime(this.statusData.uptime.last7d)}
                                </div>
                                <div class="text-sm font-medium text-gray-600">Last 7 Days</div>
                            </div>
                            <div class="metric-card">
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
                    <div class="card">
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
