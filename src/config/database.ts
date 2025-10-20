import { PrismaClient } from '@prisma/client';
import { dbQueryDuration, dbQueriesTotal, dbErrorsTotal } from '../metrics/dbMetrics';

// Create a singleton Prisma client instance with metrics tracking
class DatabaseConnection {
  private static instance: PrismaClient;

  private constructor() {}

  public static getInstance(): PrismaClient {
    if (!DatabaseConnection.instance) {
      const basePrisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
      });
      
      // Extend Prisma client with metrics middleware (Prisma v5+)
      DatabaseConnection.instance = basePrisma.$extends({
        name: 'metrics',
        query: {
          // This applies to all models and all operations
          $allModels: {
            async $allOperations({ model, operation, args, query }: {
              model: string;
              operation: string;
              args: any;
              query: (args: any) => Promise<any>;
            }) {
              const start = Date.now();
              const modelName = model || 'unknown';
              
              try {
                const result = await query(args);
                const duration = (Date.now() - start) / 1000; // Convert to seconds
                
                // Record successful query
                dbQueryDuration.observe({ operation, model: modelName }, duration);
                dbQueriesTotal.inc({ operation, model: modelName, status: 'success' });
                
                return result;
              } catch (error: any) {
                const duration = (Date.now() - start) / 1000;
                
                // Record failed query
                dbQueryDuration.observe({ operation, model: modelName }, duration);
                dbQueriesTotal.inc({ operation, model: modelName, status: 'error' });
                
                // Record error details
                const errorCode = error?.code || 'UNKNOWN';
                dbErrorsTotal.inc({ operation, model: modelName, error_code: errorCode });
                
                throw error; // Re-throw to maintain normal error handling
              }
            },
          },
        },
      }) as unknown as PrismaClient;
      
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
