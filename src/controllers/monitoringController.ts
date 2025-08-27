import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { EmailProviderFactory } from '../services/email/EmailProviderFactory';

const prisma = new PrismaClient();

// Create Redis connection only if REDIS_URL is available
let redis: Redis | null = null;
if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
}

// Create email provider based on environment configuration
const emailProvider = EmailProviderFactory.createFromEnvironment();

export async function monitoringHealthStatusHandler(req: Request, res: Response) {
  const startOverall = process.hrtime.bigint();
  const components: any[] = [];
  let overallStatus = 'OPERATIONAL';

  // API server internal check
  const apiStart = process.hrtime.bigint();
  // Just a dummy operation to measure API response time
  const apiEnd = process.hrtime.bigint();
  const apiResponseTimeMs = Number(apiEnd - apiStart) / 1e6;
  components.push({
    name: 'api_server_internal_check',
    status: 'OPERATIONAL',
    responseTimeMs: apiResponseTimeMs,
  });

  // PostgreSQL check
  let dbStatus = 'OPERATIONAL';
  let dbResponseTimeMs = 0;
  try {
    const dbStart = process.hrtime.bigint();
    await prisma.$queryRaw`SELECT 1`;
    const dbEnd = process.hrtime.bigint();
    dbResponseTimeMs = Number(dbEnd - dbStart) / 1e6;
    components.push({ name: 'database', status: dbStatus, responseTimeMs: dbResponseTimeMs });
  } catch (err) {
    dbStatus = 'OUTAGE';
    if (overallStatus === 'OPERATIONAL') overallStatus = 'DEGRADED';
    components.push({ name: 'database', status: dbStatus, responseTimeMs: dbResponseTimeMs });
  }

  // Redis check
  let redisStatus = 'OPERATIONAL';
  let redisResponseTimeMs = 0;
  try {
    if (!redis) {
      throw new Error('Redis not configured');
    }
    const redisStart = process.hrtime.bigint();
    await redis.ping();
    const redisEnd = process.hrtime.bigint();
    redisResponseTimeMs = Number(redisEnd - redisStart) / 1e6;
    components.push({ name: 'redis', status: redisStatus, responseTimeMs: redisResponseTimeMs });
  } catch (err) {
    redisStatus = 'OUTAGE';
    if (overallStatus === 'OPERATIONAL') overallStatus = 'DEGRADED';
    components.push({ name: 'redis', status: redisStatus, responseTimeMs: redisResponseTimeMs });
  }

  // Email Service check using factory pattern
  let emailStatus = 'OPERATIONAL';
  let emailResponseTimeMs = 0;
  try {
    const emailStart = process.hrtime.bigint();
    // Use the provider's testConnection method
    const testResult = await emailProvider.testConnection();
    const emailEnd = process.hrtime.bigint();
    emailResponseTimeMs = Number(emailEnd - emailStart) / 1e6;
    
    if (!testResult.success) {
      throw new Error(testResult.error || 'Email service test failed');
    }
    
    components.push({ name: 'email_service', status: emailStatus, responseTimeMs: emailResponseTimeMs });
  } catch (err) {
    emailStatus = 'OUTAGE';
    if (overallStatus === 'OPERATIONAL') overallStatus = 'DEGRADED';
    components.push({ name: 'email_service', status: emailStatus, responseTimeMs: emailResponseTimeMs });
  }

  // If any component is OUTAGE, set overallStatus to OUTAGE
  if (components.some(c => c.status === 'OUTAGE')) {
    overallStatus = 'OUTAGE';
  }

  const endOverall = process.hrtime.bigint();
  const overallResponseTimeMs = Number(endOverall - startOverall) / 1e6;
  components[0].responseTimeMs = overallResponseTimeMs;

  return res.json({
    timestamp: new Date().toISOString(),
    overallStatus,
    components,
  });
}
