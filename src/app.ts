import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config/environment';

// Import routes
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import cohortRoutes from './routes/cohorts';
import leagueRoutes from './routes/leagues';
import specializationRoutes from './routes/specializations';
import weekRoutes from './routes/weeks';
import sectionRoutes from './routes/sections';
import resourceRoutes from './routes/resources';
import progressRoutes from './routes/progress';

const app = express();

// Security middleware
app.use(helmet());

// CORS middleware - Relaxed for testing
app.use(cors({
  origin: true, // Allow all origins during testing
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

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

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal Server Error',
    ...(config.nodeEnv === 'development' && { stack: error.stack }),
  });
});

export default app;
