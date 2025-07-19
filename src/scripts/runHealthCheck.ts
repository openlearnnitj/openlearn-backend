import HealthCheckScheduler from '../services/HealthCheckScheduler';
import DatabaseConnection from '../config/database';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runManualHealthCheck(): Promise<void> {
  console.log('🔍 Manual Health Check - OpenLearn Backend');
  console.log('═'.repeat(50));
  
  try {
    // Initialize database connection
    const prisma = DatabaseConnection.getInstance();
    
    // Create health check scheduler
    const healthScheduler = new HealthCheckScheduler(prisma);
    
    console.log('⚡ Running comprehensive health check...');
    await healthScheduler.runHealthCheckNow();
    
    console.log('✅ Health check completed successfully!');
    console.log('📊 Check status at: http://localhost:3000/api/status');
    
  } catch (error: any) {
    console.error('❌ Health check failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

// Run the health check
if (require.main === module) {
  runManualHealthCheck().catch(console.error);
}

export { runManualHealthCheck };
