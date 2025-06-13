import app from './app';
import config from './config/environment';
import DatabaseConnection from './config/database';
import HealthCheckScheduler from './services/HealthCheckScheduler';
// import { logger } from './config/logger';

const startServer = async () => {
  try {
    // Log startup information
    console.log('Starting OpenLearn Backend Server');
    console.log(`Environment: ${config.nodeEnv}`);
    console.log(`Port: ${config.port}`);
    console.log(`Node Version: ${process.version}`);

    // Test database connection
    console.log('Testing database connection...');
    await DatabaseConnection.getInstance().$connect();
    console.log('✅ Database connected successfully');

    // Initialize and start health check scheduler
    console.log('Starting health check scheduler...');
    const healthScheduler = new HealthCheckScheduler(DatabaseConnection.getInstance());
    healthScheduler.start();
    console.log('✅ Health check scheduler started');

    // Start the server
    const server = app.listen(config.port, '0.0.0.0', () => {
      console.log('OpenLearn API server started successfully');
      console.log(`Server running on port ${config.port}`);
      console.log(`Health check: http://localhost:${config.port}/health`);
      console.log(`Process ID: ${process.pid}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`🛑 Received ${signal}. Starting graceful shutdown...`);
      
      server.close(async () => {
        console.log('HTTP server closed');
        
        try {
          await DatabaseConnection.disconnect();
          console.log('Database connection closed');
          console.log('👋 Graceful shutdown completed');
          process.exit(0);
        } catch (error) {
          console.error('❌ Error during graceful shutdown:', error);
          process.exit(1);
        }
      });
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
startServer();
