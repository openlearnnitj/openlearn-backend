/**
 * StatusService - Professional system status monitoring service
 * Tracks system health, uptime, and incidents for OpenLearn platform
 */

import { PrismaClient, SystemComponent, SystemStatus, IncidentSeverity, IncidentStatus } from '@prisma/client';
import { logger } from '../utils/logger';

export interface SystemHealthMetrics {
  component: SystemComponent;
  status: SystemStatus;
  responseTime?: number;
  uptime: boolean;
  details?: any;
}

export interface IncidentData {
  title: string;
  description: string;
  component: SystemComponent;
  severity: IncidentSeverity;
  status: IncidentStatus;
}

export interface IncidentUpdateData {
  incidentId: string;
  title: string;
  description: string;
  status: IncidentStatus;
}

export interface StatusPageData {
  overallStatus: SystemStatus;
  components: Array<{
    component: SystemComponent;
    status: SystemStatus;
    uptime: number; // percentage
    avgResponseTime: number;
    lastChecked: Date;
  }>;
  activeIncidents: Array<{
    id: string;
    title: string;
    description: string;
    component: SystemComponent;
    severity: IncidentSeverity;
    status: IncidentStatus;
    startedAt: Date;
    updates: Array<{
      title: string;
      description: string;
      status: IncidentStatus;
      createdAt: Date;
    }>;
  }>;
  uptime: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
}

export class StatusService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Record a health check for a system component
   */
  async recordHealthCheck(metrics: SystemHealthMetrics): Promise<void> {
    try {
      await this.prisma.statusCheck.create({
        data: {
          component: metrics.component,
          status: metrics.status,
          responseTime: metrics.responseTime,
          uptime: metrics.uptime,
          details: metrics.details,
          checkedAt: new Date(),
        },
      });

      logger.info(`Health check recorded for ${metrics.component}`, {
        component: metrics.component,
        status: metrics.status,
        responseTime: metrics.responseTime,
        uptime: metrics.uptime,
      });
    } catch (error) {
      logger.error('Failed to record health check', {
        component: metrics.component,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get the latest status for all components
   */
  async getComponentStatuses(): Promise<Array<{ component: SystemComponent; status: SystemStatus; lastChecked: Date; responseTime?: number }>> {
    try {
      // Get the latest status check for each component
      const components = Object.values(SystemComponent);
      const statuses = await Promise.all(
        components.map(async (component) => {
          const latestCheck = await this.prisma.statusCheck.findFirst({
            where: { component },
            orderBy: { checkedAt: 'desc' },
          });

          return {
            component,
            status: latestCheck?.status || SystemStatus.MAJOR_OUTAGE,
            lastChecked: latestCheck?.checkedAt || new Date(0),
            responseTime: latestCheck?.responseTime || undefined,
          };
        })
      );

      return statuses;
    } catch (error) {
      logger.error('Failed to get component statuses', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Calculate uptime percentage for a component over a time period
   */
  async getComponentUptime(component: SystemComponent, hours: number = 24): Promise<number> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const checks = await this.prisma.statusCheck.findMany({
        where: {
          component,
          checkedAt: { gte: since },
        },
        orderBy: { checkedAt: 'asc' },
      });

      if (checks.length === 0) return 0;

      const uptimeChecks = checks.filter(check => check.uptime);
      return (uptimeChecks.length / checks.length) * 100;
    } catch (error) {
      logger.error(`Failed to calculate uptime for ${component}`, { 
        component, 
        hours, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return 0;
    }
  }

  /**
   * Calculate average response time for a component over a time period
   */
  async getAverageResponseTime(component: SystemComponent, hours: number = 24): Promise<number> {
    try {
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const checks = await this.prisma.statusCheck.findMany({
        where: {
          component,
          checkedAt: { gte: since },
          responseTime: { not: null },
        },
      });

      if (checks.length === 0) return 0;

      const totalResponseTime = checks.reduce((sum, check) => sum + (check.responseTime || 0), 0);
      return totalResponseTime / checks.length;
    } catch (error) {
      logger.error(`Failed to calculate average response time for ${component}`, { 
        component, 
        hours, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return 0;
    }
  }

  /**
   * Create a new incident
   */
  async createIncident(incidentData: IncidentData): Promise<string> {
    try {
      const incident = await this.prisma.statusIncident.create({
        data: {
          title: incidentData.title,
          description: incidentData.description,
          component: incidentData.component,
          severity: incidentData.severity,
          status: incidentData.status,
          startedAt: new Date(),
        },
      });

      logger.warn('New incident created', {
        incidentId: incident.id,
        title: incident.title,
        component: incident.component,
        severity: incident.severity,
      });

      return incident.id;
    } catch (error) {
      logger.error('Failed to create incident', { 
        incident: incidentData, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Add an update to an existing incident
   */
  async addIncidentUpdate(updateData: IncidentUpdateData): Promise<void> {
    try {
      await this.prisma.incidentUpdate.create({
        data: {
          incidentId: updateData.incidentId,
          title: updateData.title,
          description: updateData.description,
          status: updateData.status,
        },
      });

      // Update the incident status if it's being resolved
      if (updateData.status === IncidentStatus.RESOLVED) {
        await this.prisma.statusIncident.update({
          where: { id: updateData.incidentId },
          data: {
            status: IncidentStatus.RESOLVED,
            resolvedAt: new Date(),
          },
        });
      }

      logger.info('Incident update added', {
        incidentId: updateData.incidentId,
        status: updateData.status,
        title: updateData.title,
      });
    } catch (error) {
      logger.error('Failed to add incident update', { 
        updateData, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  /**
   * Get active incidents (not resolved)
   */
  async getActiveIncidents(): Promise<StatusPageData['activeIncidents']> {
    try {
      const incidents = await this.prisma.statusIncident.findMany({
        where: {
          status: { not: IncidentStatus.RESOLVED },
        },
        include: {
          updates: {
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { startedAt: 'desc' },
      });

      return incidents.map(incident => ({
        id: incident.id,
        title: incident.title,
        description: incident.description,
        component: incident.component,
        severity: incident.severity,
        status: incident.status,
        startedAt: incident.startedAt,
        updates: incident.updates.map(update => ({
          title: update.title,
          description: update.description,
          status: update.status,
          createdAt: update.createdAt,
        })),
      }));
    } catch (error) {
      logger.error('Failed to get active incidents', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Determine overall system status based on component statuses and active incidents
   */
  async getOverallSystemStatus(): Promise<SystemStatus> {
    try {
      const componentStatuses = await this.getComponentStatuses();
      const activeIncidents = await this.getActiveIncidents();

      // Check for any critical incidents
      const hasCriticalIncident = activeIncidents.some(
        incident => incident.severity === IncidentSeverity.CRITICAL
      );
      if (hasCriticalIncident) {
        return SystemStatus.MAJOR_OUTAGE;
      }

      // Check for high severity incidents
      const hasHighSeverityIncident = activeIncidents.some(
        incident => incident.severity === IncidentSeverity.HIGH
      );
      if (hasHighSeverityIncident) {
        return SystemStatus.PARTIAL_OUTAGE;
      }

      // Check component statuses
      const componentStatusPriority = {
        [SystemStatus.MAJOR_OUTAGE]: 4,
        [SystemStatus.PARTIAL_OUTAGE]: 3,
        [SystemStatus.DEGRADED_PERFORMANCE]: 2,
        [SystemStatus.MAINTENANCE]: 1,
        [SystemStatus.OPERATIONAL]: 0,
      };

      let worstStatus: SystemStatus = SystemStatus.OPERATIONAL;
      for (const componentStatus of componentStatuses) {
        if (componentStatusPriority[componentStatus.status] > componentStatusPriority[worstStatus]) {
          worstStatus = componentStatus.status;
        }
      }

      return worstStatus;
    } catch (error) {
      logger.error('Failed to determine overall system status', { error: error instanceof Error ? error.message : 'Unknown error' });
      return SystemStatus.MAJOR_OUTAGE; // Fail safe
    }
  }

  /**
   * Get comprehensive status page data
   */
  async getStatusPageData(): Promise<StatusPageData> {
    try {
      const [overallStatus, componentStatuses, activeIncidents] = await Promise.all([
        this.getOverallSystemStatus(),
        this.getComponentStatuses(),
        this.getActiveIncidents(),
      ]);

      // Calculate uptime and response times for each component
      const components = await Promise.all(
        componentStatuses.map(async (componentStatus) => ({
          component: componentStatus.component,
          status: componentStatus.status,
          uptime: await this.getComponentUptime(componentStatus.component, 24),
          avgResponseTime: await this.getAverageResponseTime(componentStatus.component, 24),
          lastChecked: componentStatus.lastChecked,
        }))
      );

      // Calculate overall uptime metrics
      const uptime = {
        last24h: await this.getSystemUptime(24),
        last7d: await this.getSystemUptime(24 * 7),
        last30d: await this.getSystemUptime(24 * 30),
      };

      return {
        overallStatus,
        components,
        activeIncidents,
        uptime,
      };
    } catch (error) {
      logger.error('Failed to get status page data', { error: error instanceof Error ? error.message : 'Unknown error' });
      throw error;
    }
  }

  /**
   * Calculate overall system uptime by averaging all component uptimes
   */
  private async getSystemUptime(hours: number): Promise<number> {
    try {
      const components = Object.values(SystemComponent);
      const uptimes = await Promise.all(
        components.map(component => this.getComponentUptime(component, hours))
      );

      if (uptimes.length === 0) return 0;
      return uptimes.reduce((sum, uptime) => sum + uptime, 0) / uptimes.length;
    } catch (error) {
      logger.error(`Failed to calculate system uptime for ${hours} hours`, { 
        hours, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return 0;
    }
  }

  /**
   * Perform health checks on all system components
   */
  async performSystemHealthCheck(): Promise<void> {
    try {
      logger.info('Starting system health check');

      // API Health Check
      const apiStartTime = Date.now();
      const apiHealthy = await this.checkAPIHealth();
      const apiResponseTime = Date.now() - apiStartTime;

      await this.recordHealthCheck({
        component: SystemComponent.API,
        status: apiHealthy ? SystemStatus.OPERATIONAL : SystemStatus.MAJOR_OUTAGE,
        responseTime: apiResponseTime,
        uptime: apiHealthy,
      });

      // Database Health Check
      const dbStartTime = Date.now();
      const dbHealthy = await this.checkDatabaseHealth();
      const dbResponseTime = Date.now() - dbStartTime;

      await this.recordHealthCheck({
        component: SystemComponent.DATABASE,
        status: dbHealthy ? SystemStatus.OPERATIONAL : SystemStatus.MAJOR_OUTAGE,
        responseTime: dbResponseTime,
        uptime: dbHealthy,
      });

      // Authentication Health Check
      const authStartTime = Date.now();
      const authHealthy = await this.checkAuthenticationHealth();
      const authResponseTime = Date.now() - authStartTime;

      await this.recordHealthCheck({
        component: SystemComponent.AUTHENTICATION,
        status: authHealthy ? SystemStatus.OPERATIONAL : SystemStatus.MAJOR_OUTAGE,
        responseTime: authResponseTime,
        uptime: authHealthy,
      });

      // Redis Health Check
      const redisStartTime = Date.now();
      const redisHealthy = await this.checkRedisHealth();
      const redisResponseTime = Date.now() - redisStartTime;

      await this.recordHealthCheck({
        component: SystemComponent.REDIS,
        status: redisHealthy ? SystemStatus.OPERATIONAL : SystemStatus.MAJOR_OUTAGE,
        responseTime: redisResponseTime,
        uptime: redisHealthy,
      });

      // Email Service Health Check
      const emailStartTime = Date.now();
      const emailHealthy = await this.checkEmailServiceHealth();
      const emailResponseTime = Date.now() - emailStartTime;

      await this.recordHealthCheck({
        component: SystemComponent.EMAIL_SERVICE,
        status: emailHealthy ? SystemStatus.OPERATIONAL : SystemStatus.MAJOR_OUTAGE,
        responseTime: emailResponseTime,
        uptime: emailHealthy,
      });

      logger.info('System health check completed', {
        api: { healthy: apiHealthy, responseTime: apiResponseTime },
        database: { healthy: dbHealthy, responseTime: dbResponseTime },
        authentication: { healthy: authHealthy, responseTime: authResponseTime },
        redis: { healthy: redisHealthy, responseTime: redisResponseTime },
        email: { healthy: emailHealthy, responseTime: emailResponseTime },
      });
    } catch (error) {
      logger.error('System health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  /**
   * Check API health by testing basic functionality
   */
  private async checkAPIHealth(): Promise<boolean> {
    try {
      // Simple check - if we can execute this function, API is running
      return true;
    } catch (error) {
      logger.error('API health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  /**
   * Check database health by performing a simple query
   */
  private async checkDatabaseHealth(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      logger.error('Database health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  /**
   * Check authentication system health
   */
  private async checkAuthenticationHealth(): Promise<boolean> {
    try {
      // Test basic user query to ensure auth-related tables are accessible
      await this.prisma.user.count();
      return true;
    } catch (error) {
      logger.error('Authentication health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  /**
   * Check Redis health by testing connection and basic operations
   */
  private async checkRedisHealth(): Promise<boolean> {
    try {
      const Redis = require('ioredis');
      
      // Parse Redis URL for proper connection
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      // Create Redis connection with proper configuration
      const redis = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 1, // Reduce retries for faster failure detection
        connectTimeout: 5000, // 5 second timeout
        lazyConnect: true
      });
      
      // Test connection
      await redis.connect();
      
      // Test basic Redis operations
      const pingResult = await redis.ping();
      if (pingResult !== 'PONG') {
        throw new Error('Redis ping failed');
      }
      
      await redis.set('health_check', 'test', 'EX', 60);
      const result = await redis.get('health_check');
      await redis.del('health_check');
      
      await redis.disconnect();
      
      return result === 'test';
    } catch (error) {
      logger.error('Redis health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      
      // In development, Redis might not be available - this is acceptable
      if (process.env.NODE_ENV === 'development') {
        logger.warn('Redis not available in development mode - this is acceptable');
      }
      
      return false;
    }
  }

  /**
   * Check Email service health by testing Resend API connection
   */
  private async checkEmailServiceHealth(): Promise<boolean> {
    try {
      // Test Resend API connection
      const { Resend } = require('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      // Test API key validity by attempting to get domains (this doesn't send an email)
      const domains = await resend.domains.list();
      
      // If we get here without throwing, the API key is valid
      return true;
    } catch (error) {
      logger.error('Email service health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  /**
   * Clean up old status checks (keep only last 30 days)
   */
  async cleanupOldStatusChecks(): Promise<void> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const result = await this.prisma.statusCheck.deleteMany({
        where: {
          checkedAt: { lt: thirtyDaysAgo },
        },
      });

      logger.info(`Cleaned up ${result.count} old status checks`);
    } catch (error) {
      logger.error('Failed to cleanup old status checks', { error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}
