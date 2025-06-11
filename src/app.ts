import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/environment';
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'OpenLearn API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
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
