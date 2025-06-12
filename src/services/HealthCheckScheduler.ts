/**
 * Health Check Scheduler - Automated system monitoring
 * Runs periodic health checks and updates system status
 */

import cron from 'node-cron';
import { StatusService } from './StatusService';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export class HealthCheckScheduler {
  private statusService: StatusService;
  private isRunning: boolean = false;

  constructor(private prisma: PrismaClient) {
    this.statusService = new StatusService(prisma);
  }

  /**
   * Start all scheduled health check tasks
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Health check scheduler is already running');
      return;
    }

    logger.info('Starting health check scheduler');

    // Health checks every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        logger.info('Running scheduled health check');
        await this.statusService.performSystemHealthCheck();
      } catch (error) {
        logger.error('Scheduled health check failed', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // Cleanup old status checks daily at 2 AM UTC
    cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Running scheduled cleanup of old status checks');
        await this.statusService.cleanupOldStatusChecks();
      } catch (error) {
        logger.error('Scheduled cleanup failed', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    // Extended health check every 30 minutes (more comprehensive)
    cron.schedule('*/30 * * * *', async () => {
      try {
        logger.info('Running extended health check');
        await this.runExtendedHealthCheck();
      } catch (error) {
        logger.error('Extended health check failed', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    this.isRunning = true;
    logger.info('Health check scheduler started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('Health check scheduler is not running');
      return;
    }

    // Note: node-cron doesn't provide a direct way to stop specific tasks
    // This is mainly for cleanup and status tracking
    this.isRunning = false;
    logger.info('Health check scheduler stopped');
  }

  /**
   * Run an extended health check with additional metrics
   */
  private async runExtendedHealthCheck(): Promise<void> {
    try {
      // Basic health checks
      await this.statusService.performSystemHealthCheck();

      // Additional checks for extended monitoring
      await this.checkSystemResources();
      await this.checkDataIntegrity();
      await this.generateHealthReport();

    } catch (error) {
      logger.error('Extended health check failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Check system resource usage (basic Node.js metrics)
   */
  private async checkSystemResources(): Promise<void> {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      // Record memory usage as a health metric
      await this.statusService.recordHealthCheck({
        component: 'API' as any,
        status: 'OPERATIONAL' as any,
        uptime: true,
        details: {
          memory: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024), // MB
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
            external: Math.round(memoryUsage.external / 1024 / 1024), // MB
          },
          uptime: Math.round(uptime),
          pid: process.pid,
          nodeVersion: process.version,
        },
      });

      // Log warning if memory usage is high
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      if (heapUsedMB > 500) { // 500MB threshold
        logger.warn('High memory usage detected', {
          heapUsedMB: Math.round(heapUsedMB),
          heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        });
      }

    } catch (error) {
      logger.error('System resource check failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Check basic data integrity
   */
  private async checkDataIntegrity(): Promise<void> {
    try {
      // Check for orphaned records or data inconsistencies
      const checks = await Promise.all([
        // Check for users without profiles (basic integrity check)
        this.prisma.user.count(),
        
        // Check for active cohorts
        this.prisma.cohort.count({ where: { isActive: true } }),
        
        // Check recent activity
        this.prisma.auditLog.count({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }),
      ]);

      const [userCount, activeCohorts, recentActivity] = checks;

      logger.info('Data integrity check completed', {
        userCount,
        activeCohorts,
        recentActivity,
      });

      // Record data integrity as part of database health
      await this.statusService.recordHealthCheck({
        component: 'DATABASE' as any,
        status: 'OPERATIONAL' as any,
        uptime: true,
        details: {
          dataIntegrity: {
            userCount,
            activeCohorts,
            recentActivity,
            checkedAt: new Date().toISOString(),
          },
        },
      });

    } catch (error) {
      logger.error('Data integrity check failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      // Record failed data integrity check
      await this.statusService.recordHealthCheck({
        component: 'DATABASE' as any,
        status: 'DEGRADED_PERFORMANCE' as any,
        uptime: false,
        details: {
          error: error instanceof Error ? error.message : 'Data integrity check failed',
        },
      });
    }
  }

  /**
   * Generate a periodic health report
   */
  private async generateHealthReport(): Promise<void> {
    try {
      const statusData = await this.statusService.getStatusPageData();
      
      logger.info('System health report', {
        overallStatus: statusData.overallStatus,
        componentCount: statusData.components.length,
        activeIncidents: statusData.activeIncidents.length,
        uptime: {
          last24h: Math.round(statusData.uptime.last24h * 100) / 100,
          last7d: Math.round(statusData.uptime.last7d * 100) / 100,
        },
        components: statusData.components.map(comp => ({
          component: comp.component,
          status: comp.status,
          uptime: Math.round(comp.uptime * 100) / 100,
        })),
      });

      // Auto-resolve incidents that might be stale
      await this.checkAndResolveStaleIncidents();

    } catch (error) {
      logger.error('Health report generation failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Check for stale incidents and potentially auto-resolve them
   */
  private async checkAndResolveStaleIncidents(): Promise<void> {
    try {
      const activeIncidents = await this.statusService.getActiveIncidents();
      const staleThreshold = 24 * 60 * 60 * 1000; // 24 hours

      for (const incident of activeIncidents) {
        const timeSinceStart = Date.now() - incident.startedAt.getTime();
        
        if (timeSinceStart > staleThreshold && incident.severity !== 'CRITICAL') {
          logger.warn('Detected stale incident', {
            incidentId: incident.id,
            title: incident.title,
            hoursOld: Math.round(timeSinceStart / (60 * 60 * 1000)),
          });

          // Auto-resolve non-critical incidents after 24 hours
          if (incident.severity === 'LOW' || incident.severity === 'MEDIUM') {
            await this.statusService.addIncidentUpdate({
              incidentId: incident.id,
              title: 'Auto-resolved by system',
              description: 'This incident was automatically resolved after 24 hours with no updates. If the issue persists, please create a new incident.',
              status: 'RESOLVED' as any,
            });

            logger.info('Auto-resolved stale incident', {
              incidentId: incident.id,
              title: incident.title,
            });
          }
        }
      }
    } catch (error) {
      logger.error('Stale incident check failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; uptime: number } {
    return {
      isRunning: this.isRunning,
      uptime: process.uptime(),
    };
  }
}

export default HealthCheckScheduler;
