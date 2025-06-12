/**
 * Status Routes - API endpoints for system status monitoring
 * Provides public endpoints for status page and internal endpoints for incident management
 */

import { Router, Request, Response } from 'express';
import { StatusService, IncidentData, IncidentUpdateData } from '../services/StatusService';
import { SystemComponent, IncidentSeverity, IncidentStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { asyncHandler } from '../middleware/asyncHandler';
import { authMiddleware } from '../middleware/auth';
import { authorize } from '../middleware/authorize';

const router = Router();
const statusService = new StatusService(prisma);

/**
 * GET /api/status/test
 * Simple test endpoint to check if routes are working
 */
router.get('/test', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Status routes are working',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/status
 * Public endpoint - Get comprehensive status page data
 * This is what the frontend status page will consume
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const statusData = await statusService.getStatusPageData();
    
    res.json({
      success: true,
      data: statusData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get status page data', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve status data',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/status/components
 * Public endpoint - Get current status of all system components
 */
router.get('/components', asyncHandler(async (req: Request, res: Response) => {
  try {
    const componentStatuses = await statusService.getComponentStatuses();
    
    res.json({
      success: true,
      data: componentStatuses,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get component statuses', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve component statuses',
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * GET /api/status/uptime/:component
 * Public endpoint - Get uptime percentage for a specific component
 * Query params: hours (default: 24)
 */
router.get('/uptime/:component', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { component } = req.params;
    const hours = parseInt(req.query.hours as string) || 24;

    // Validate component
    if (!Object.values(SystemComponent).includes(component as SystemComponent)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid component specified',
        validComponents: Object.values(SystemComponent),
      });
    }

    const uptime = await statusService.getComponentUptime(component as SystemComponent, hours);
    
    res.json({
      success: true,
      data: {
        component,
        uptime,
        period: `${hours} hours`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get component uptime', { 
      component: req.params.component, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve uptime data',
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * GET /api/status/incidents
 * Public endpoint - Get active incidents
 */
router.get('/incidents', asyncHandler(async (req: Request, res: Response) => {
  try {
    const activeIncidents = await statusService.getActiveIncidents();
    
    res.json({
      success: true,
      data: activeIncidents,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to get active incidents', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve incidents',
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * POST /api/status/health-check
 * Internal endpoint - Trigger manual health check (requires authentication)
 */
router.post('/health-check', authMiddleware, authorize(['PATHFINDER', 'CHIEF_PATHFINDER', 'GRAND_PATHFINDER']), asyncHandler(async (req: Request, res: Response) => {
  try {
    await statusService.performSystemHealthCheck();
    
    res.json({
      success: true,
      message: 'Health check completed successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Manual health check failed', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * POST /api/status/incidents
 * Internal endpoint - Create a new incident (requires Pathfinder+ access)
 */
router.post('/incidents', authMiddleware, authorize(['PATHFINDER', 'CHIEF_PATHFINDER', 'GRAND_PATHFINDER']), asyncHandler(async (req: Request, res: Response) => {
  try {
    const { title, description, component, severity } = req.body;

    // Validate required fields
    if (!title || !description || !component || !severity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description, component, severity',
      });
    }

    // Validate enums
    if (!Object.values(SystemComponent).includes(component)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid component',
        validComponents: Object.values(SystemComponent),
      });
    }

    if (!Object.values(IncidentSeverity).includes(severity)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid severity',
        validSeverities: Object.values(IncidentSeverity),
      });
    }

    const incidentData: IncidentData = {
      title,
      description,
      component,
      severity,
      status: IncidentStatus.INVESTIGATING,
    };

    const incidentId = await statusService.createIncident(incidentData);
    
    res.status(201).json({
      success: true,
      data: { incidentId },
      message: 'Incident created successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to create incident', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      error: 'Failed to create incident',
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * POST /api/status/incidents/:incidentId/updates
 * Internal endpoint - Add update to an existing incident (requires Pathfinder+ access)
 */
router.post('/incidents/:incidentId/updates', authMiddleware, authorize(['PATHFINDER', 'CHIEF_PATHFINDER', 'GRAND_PATHFINDER']), asyncHandler(async (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;
    const { title, description, status } = req.body;

    // Validate required fields
    if (!title || !description || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description, status',
      });
    }

    // Validate status enum
    if (!Object.values(IncidentStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        validStatuses: Object.values(IncidentStatus),
      });
    }

    const updateData: IncidentUpdateData = {
      incidentId,
      title,
      description,
      status,
    };

    await statusService.addIncidentUpdate(updateData);
    
    res.json({
      success: true,
      message: 'Incident update added successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to add incident update', { 
      incidentId: req.params.incidentId, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    res.status(500).json({
      success: false,
      error: 'Failed to add incident update',
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * DELETE /api/status/cleanup
 * Internal endpoint - Clean up old status checks (requires admin access)
 */
router.delete('/cleanup', authMiddleware, authorize(['CHIEF_PATHFINDER', 'GRAND_PATHFINDER']), asyncHandler(async (req: Request, res: Response) => {
  try {
    await statusService.cleanupOldStatusChecks();
    
    res.json({
      success: true,
      message: 'Old status checks cleaned up successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to cleanup old status checks', { error: error instanceof Error ? error.message : 'Unknown error' });
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup old status checks',
      timestamp: new Date().toISOString(),
    });
  }
}));

/**
 * GET /api/status/enums
 * Public endpoint - Get available enum values for components, severities, and statuses
 * Useful for frontend forms and validation
 */
router.get('/enums', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      components: Object.values(SystemComponent),
      severities: Object.values(IncidentSeverity),
      statuses: Object.values(IncidentStatus),
    },
    timestamp: new Date().toISOString(),
  });
}));

export default router;
