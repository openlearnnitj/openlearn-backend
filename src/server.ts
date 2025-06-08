import createApp from './app';
import { config } from './config';
import { Logger } from './utils/common';

/**
 * Start the OpenLearn API server
 * This function initializes the Express app and starts listening for requests
 */
async function startServer(): Promise<void> {
  try {
    // Create Express application
    const app = createApp();
    
    // Start server
    const server = app.listen(config.app.port, () => {
      Logger.info(`OpenLearn API server started successfully!`);
      Logger.info(`Server running on port ${config.app.port}`);
      Logger.info(`Environment: ${config.app.env}`);
      Logger.info(`Database URL: ${config.database.url ? 'Connected' : 'Not configured'}`);
      Logger.info(`JWT Secret: ${config.jwt.accessSecret ? 'Configured' : 'Missing'}`);
      
      if (config.app.env === 'development') {
        Logger.info(`Development mode enabled`);
        Logger.info(`Health Check: http://localhost:${config.app.port}/health`);
        Logger.info(`Auth Endpoints: http://localhost:${config.app.port}/api/auth`);
      }
    });

    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      Logger.info(`\n Received ${signal}. Starting graceful shutdown...`);
      
      server.close(() => {
        Logger.info('HTTP server closed');
        
        // Close database connections if needed
        // prisma.$disconnect() would go here
        
        Logger.info('👋 Graceful shutdown completed');
        process.exit(0);
      });
      
      // Force shutdown after 30 seconds
      setTimeout(() => {
        Logger.error('Forceful shutdown due to timeout');
        process.exit(1);
      }, 30000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      Logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      Logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

  } catch (error) {
    Logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export default startServer;
