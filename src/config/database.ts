import { PrismaClient } from '@prisma/client';
import { dbQueryDuration, dbQueriesTotal, dbErrorsTotal } from '../metrics/dbMetrics';

// Create a singleton Prisma client instance
class DatabaseConnection {
  private static instance: PrismaClient;

  private constructor() {}

  public static getInstance(): PrismaClient {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
      });
      
      // Add Prisma middleware for metrics collection
      DatabaseConnection.instance.$use(async (params, next) => {
        const start = Date.now();
        const operation = params.action;
        const model = params.model || 'unknown';
        
        try {
          const result = await next(params);
          const duration = (Date.now() - start) / 1000; // Convert to seconds
          
          // Record successful query
          dbQueryDuration.observe({ operation, model }, duration);
          dbQueriesTotal.inc({ operation, model, status: 'success' });
          
          return result;
        } catch (error: any) {
          const duration = (Date.now() - start) / 1000;
          
          // Record failed query
          dbQueryDuration.observe({ operation, model }, duration);
          dbQueriesTotal.inc({ operation, model, status: 'error' });
          
          // Record error details
          const errorCode = error?.code || 'UNKNOWN';
          dbErrorsTotal.inc({ operation, model, error_code: errorCode });
          
          throw error; // Re-throw to maintain normal error handling
        }
      });
      
      console.log('✅ Prisma metrics middleware enabled');
    }
    return DatabaseConnection.instance;
  }

  public static async disconnect(): Promise<void> {
    if (DatabaseConnection.instance) {
      await DatabaseConnection.instance.$disconnect();
    }
  }
}

export const prisma = DatabaseConnection.getInstance();
export default DatabaseConnection;
