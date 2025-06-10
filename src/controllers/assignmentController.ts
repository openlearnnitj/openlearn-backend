import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { TokenPayload } from '../types';
import { ValidationUtils } from '../utils/validation';
import { AuditAction } from '@prisma/client';

export class AssignmentController {
  /**
   * Create assignment for a league (Pathfinder+ only)
   */
  static async createAssignment(req: Request, res: Response): Promise<void> {
    try {
      const { title, description, dueDate, leagueId } = req.body;
      const currentUser = req.user as TokenPayload;

      // Validate required fields
      const validation = ValidationUtils.validateRequired({ title, description, leagueId });
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: validation.errors.join(', '),
        });
        return;
      }

      // Check if league exists
      const league = await prisma.league.findUnique({
        where: { id: leagueId }
      });

      if (!league) {
        res.status(404).json({
          success: false,
          error: 'League not found',
        });
        return;
      }

      // Check if assignment already exists for this league
      const existingAssignment = await prisma.assignment.findUnique({
        where: { leagueId }
      });

      if (existingAssignment) {
        res.status(409).json({
          success: false,
          error: 'Assignment already exists for this league',
        });
        return;
      }

      // Create assignment
      const assignment = await prisma.assignment.create({
        data: {
          title: ValidationUtils.sanitizeString(title),
          description: ValidationUtils.sanitizeString(description),
          dueDate: dueDate ? new Date(dueDate) : null,
          leagueId,
        },
        include: {
          league: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: AuditAction.ASSIGNMENT_SUBMITTED,
          description: `Created assignment "${title}" for league "${league.name}"`,
          metadata: {
            assignmentId: assignment.id,
            leagueId,
          },
        },
      });

      res.status(201).json({
        success: true,
        data: assignment,
        message: 'Assignment created successfully',
      });
    } catch (error) {
      console.error('Create assignment error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get assignment by league ID
   */
  static async getAssignmentByLeague(req: Request, res: Response): Promise<void> {
    try {
      const { leagueId } = req.params;

      const assignment = await prisma.assignment.findUnique({
        where: { leagueId },
        include: {
          league: {
            select: {
              id: true,
              name: true,
            },
          },
          submissions: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      if (!assignment) {
        res.status(404).json({
          success: false,
          error: 'Assignment not found for this league',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: assignment,
        message: 'Assignment retrieved successfully',
      });
    } catch (error) {
      console.error('Get assignment error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Submit assignment (Students)
   */
  static async submitAssignment(req: Request, res: Response): Promise<void> {
    try {
      const { assignmentId } = req.params;
      const { content, fileUrl, githubUrl, liveUrl } = req.body;
      const currentUser = req.user as TokenPayload;

      // Check if assignment exists
      const assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        include: {
          league: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!assignment) {
        res.status(404).json({
          success: false,
          error: 'Assignment not found',
        });
        return;
      }

      // Check if user is enrolled in the league
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId: currentUser.userId,
          leagueId: assignment.leagueId,
        },
      });

      if (!enrollment) {
        res.status(403).json({
          success: false,
          error: 'You must be enrolled in this league to submit assignments',
        });
        return;
      }

      // Create or update submission
      const submission = await prisma.assignmentSubmission.upsert({
        where: {
          assignmentId_userId: {
            assignmentId,
            userId: currentUser.userId,
          },
        },
        update: {
          content: content || null,
          fileUrl: fileUrl || null,
          githubUrl: githubUrl || null,
          liveUrl: liveUrl || null,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
        create: {
          assignmentId,
          userId: currentUser.userId,
          content: content || null,
          fileUrl: fileUrl || null,
          githubUrl: githubUrl || null,
          liveUrl: liveUrl || null,
          status: 'SUBMITTED',
          submittedAt: new Date(),
        },
        include: {
          assignment: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      res.status(200).json({
        success: true,
        data: submission,
        message: 'Assignment submitted successfully',
      });
    } catch (error) {
      console.error('Submit assignment error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get user's assignment submissions
   */
  static async getUserSubmissions(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.query;
      const currentUser = req.user as TokenPayload;

      // Determine target user
      const targetUserId = userId as string || currentUser.userId;

      // Check permissions
      if (targetUserId !== currentUser.userId) {
        if (!['GRAND_PATHFINDER', 'CHIEF_PATHFINDER', 'PATHFINDER'].includes(currentUser.role)) {
          res.status(403).json({
            success: false,
            error: 'Insufficient permissions to view other users\' submissions',
          });
          return;
        }
      }

      const submissions = await prisma.assignmentSubmission.findMany({
        where: { userId: targetUserId },
        include: {
          assignment: {
            include: {
              league: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          submittedAt: 'desc',
        },
      });

      res.status(200).json({
        success: true,
        data: submissions,
        message: 'Submissions retrieved successfully',
      });
    } catch (error) {
      console.error('Get submissions error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get all assignments (Admin view)
   */
  static async getAllAssignments(req: Request, res: Response): Promise<void> {
    try {
      const { page = '1', limit = '10' } = req.query;
      
      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const [assignments, total] = await Promise.all([
        prisma.assignment.findMany({
          include: {
            league: {
              select: {
                id: true,
                name: true,
              },
            },
            _count: {
              select: {
                submissions: true,
              },
            },
          },
          skip,
          take: limitNum,
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.assignment.count(),
      ]);

      const totalPages = Math.ceil(total / limitNum);

      res.status(200).json({
        success: true,
        data: {
          assignments,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages,
            hasNextPage: pageNum < totalPages,
            hasPreviousPage: pageNum > 1,
          },
        },
        message: 'Assignments retrieved successfully',
      });
    } catch (error) {
      console.error('Get all assignments error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}
