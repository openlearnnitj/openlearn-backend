import { Request, Response } from 'express';
import { UserRole, UserStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { TokenPayload } from '../types';

export class AdminController {
  /**
   * Get all users (pending approval, active, suspended)
   */
  static async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const { status, role, page = 1, limit = 10 } = req.query;
      
      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      // Build filter conditions
      const where: any = {};
      if (status) where.status = status as UserStatus;
      if (role) where.role = role as UserRole;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            
            // V2 Enhancement Fields
            institute: true,
            department: true,
            graduationYear: true,
            phoneNumber: true,
            studentId: true,
            olid: true,
            migratedToV2: true,
            emailVerified: true,
            
            // Current cohort association
            currentCohortId: true,
            currentCohort: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
            
            // Enhanced social profiles
            discordUsername: true,
            portfolioUrl: true,
            
            // Existing social profiles
            twitterHandle: true,
            linkedinUrl: true,
            githubUsername: true,
            kaggleUsername: true,
            
            // Approval info
            approvedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
        message: 'Users retrieved successfully',
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Approve a pending user
   */
  static async approveUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const currentUser = req.user as TokenPayload;

      // Validate role if provided
      const validRoles = Object.values(UserRole);
      if (role && !validRoles.includes(role)) {
        res.status(400).json({
          success: false,
          error: 'Invalid role specified',
        });
        return;
      }

      // Find the user to approve
      const userToApprove = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userToApprove) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      if (userToApprove.status !== UserStatus.PENDING) {
        res.status(400).json({
          success: false,
          error: 'User is not pending approval',
        });
        return;
      }

      // Update user status and role
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.ACTIVE,
          role: role || userToApprove.role, // Keep existing role if not specified
          approvedById: currentUser.userId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          approvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'USER_APPROVED',
          description: `Approved user ${updatedUser.email} with role ${updatedUser.role}`,
          metadata: {
            approvedUserId: userId,
            newRole: updatedUser.role,
            previousStatus: UserStatus.PENDING,
          },
        },
      });

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'User approved successfully',
      });
    } catch (error) {
      console.error('Approve user error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Approve a pending user (alternative method for POST /approve-user)
   */
  static async approveUserAlternative(req: Request, res: Response): Promise<void> {
    try {
      const { userId, role } = req.body;
      const currentUser = req.user as TokenPayload;

      // Validate required fields
      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required',
        });
        return;
      }

      // Validate role if provided
      const validRoles = Object.values(UserRole);
      if (role && !validRoles.includes(role)) {
        res.status(400).json({
          success: false,
          error: 'Invalid role specified',
        });
        return;
      }

      // Find the user to approve
      const userToApprove = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userToApprove) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      if (userToApprove.status !== UserStatus.PENDING) {
        res.status(400).json({
          success: false,
          error: 'User is not pending approval',
        });
        return;
      }

      // Update user status and role
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.ACTIVE,
          role: role || userToApprove.role, // Keep existing role if not specified
          approvedById: currentUser.userId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          approvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'USER_APPROVED',
          description: `Approved user ${updatedUser.email} with role ${updatedUser.role}`,
          metadata: {
            approvedUserId: userId,
            newRole: updatedUser.role,
            previousStatus: UserStatus.PENDING,
          },
        },
      });

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'User approved successfully',
      });
    } catch (error) {
      console.error('Approve user alternative error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Update user role
   */
  static async updateUserRole(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const currentUser = req.user as TokenPayload;

      // Validate role
      const validRoles = Object.values(UserRole);
      if (!validRoles.includes(role)) {
        res.status(400).json({
          success: false,
          error: 'Invalid role specified',
        });
        return;
      }

      // Find the user
      const userToUpdate = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userToUpdate) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Prevent role changes if user is suspended
      if (userToUpdate.status === UserStatus.SUSPENDED) {
        res.status(400).json({
          success: false,
          error: 'Cannot update role of suspended user',
        });
        return;
      }

      const previousRole = userToUpdate.role;

      // Update user role
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
        },
      });

      // Note: League assignments for PATHFINDER roles are now managed separately
      // via /api/admin/assign-leagues endpoint by GRAND_PATHFINDER

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'USER_ROLE_CHANGED',
          description: `Changed user ${updatedUser.email} role from ${previousRole} to ${role}`,
          metadata: {
            targetUserId: userId,
            previousRole,
            newRole: role,
          },
        },
      });

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'User role updated successfully',
      });
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Update user role (alternative method for PUT /update-role)
   */
  static async updateUserRoleAlternative(req: Request, res: Response): Promise<void> {
    try {
      const { userId, newRole } = req.body;
      const currentUser = req.user as TokenPayload;

      // Validate required fields
      if (!userId || !newRole) {
        res.status(400).json({
          success: false,
          error: 'User ID and new role are required',
        });
        return;
      }

      // Validate role
      const validRoles = Object.values(UserRole);
      if (!validRoles.includes(newRole)) {
        res.status(400).json({
          success: false,
          error: 'Invalid role specified',
        });
        return;
      }

      // Find the user
      const userToUpdate = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userToUpdate) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Prevent role changes if user is suspended
      if (userToUpdate.status === UserStatus.SUSPENDED) {
        res.status(400).json({
          success: false,
          error: 'Cannot update role of suspended user',
        });
        return;
      }

      const previousRole = userToUpdate.role;

      // Update user role
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role: newRole },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'USER_ROLE_CHANGED',
          description: `Changed user ${updatedUser.email} role from ${previousRole} to ${newRole}`,
          metadata: {
            targetUserId: userId,
            previousRole,
            newRole: newRole,
          },
        },
      });

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: 'User role updated successfully',
      });
    } catch (error) {
      console.error('Update user role alternative error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Suspend/Unsuspend user
   */
  static async updateUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { status } = req.body;
      const currentUser = req.user as TokenPayload;

      // Validate status
      if (status !== UserStatus.ACTIVE && status !== UserStatus.SUSPENDED) {
        res.status(400).json({
          success: false,
          error: 'Invalid status. Only ACTIVE and SUSPENDED are allowed',
        });
        return;
      }

      // Find the user
      const userToUpdate = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userToUpdate) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Prevent self-suspension
      if (userId === currentUser.userId && status === UserStatus.SUSPENDED) {
        res.status(400).json({
          success: false,
          error: 'Cannot suspend your own account',
        });
        return;
      }

      const previousStatus = userToUpdate.status;

      // Update user status
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { status },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'USER_STATUS_CHANGED',
          description: `Changed user ${updatedUser.email} status from ${previousStatus} to ${status}`,
          metadata: {
            targetUserId: userId,
            previousStatus,
            newStatus: status,
          },
        },
      });

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: `User ${status === UserStatus.SUSPENDED ? 'suspended' : 'activated'} successfully`,
      });
    } catch (error) {
      console.error('Update user status error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Update user status (alternative method for PUT /update-status)
   */
  static async updateUserStatusAlternative(req: Request, res: Response): Promise<void> {
    try {
      const { userId, newStatus } = req.body;
      const currentUser = req.user as TokenPayload;

      // Validate required fields
      if (!userId || !newStatus) {
        res.status(400).json({
          success: false,
          error: 'User ID and new status are required',
        });
        return;
      }

      // Validate status
      if (newStatus !== UserStatus.ACTIVE && newStatus !== UserStatus.SUSPENDED) {
        res.status(400).json({
          success: false,
          error: 'Invalid status. Only ACTIVE and SUSPENDED are allowed',
        });
        return;
      }

      // Find the user
      const userToUpdate = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!userToUpdate) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Prevent self-suspension
      if (userId === currentUser.userId && newStatus === UserStatus.SUSPENDED) {
        res.status(400).json({
          success: false,
          error: 'Cannot suspend your own account',
        });
        return;
      }

      const previousStatus = userToUpdate.status;

      // Update user status
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { status: newStatus },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: currentUser.userId,
          action: 'USER_STATUS_CHANGED',
          description: `Changed user ${updatedUser.email} status from ${previousStatus} to ${newStatus}`,
          metadata: {
            targetUserId: userId,
            previousStatus,
            newStatus: newStatus,
          },
        },
      });

      res.status(200).json({
        success: true,
        data: updatedUser,
        message: `User ${newStatus === UserStatus.SUSPENDED ? 'suspended' : 'activated'} successfully`,
      });
    } catch (error) {
      console.error('Update user status alternative error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get user details by ID
   */
  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          
          // V2 Enhancement Fields
          institute: true,
          department: true,
          graduationYear: true,
          phoneNumber: true,
          studentId: true,
          olid: true,
          migratedToV2: true,
          emailVerified: true,
          
          // Current cohort association
          currentCohortId: true,
          currentCohort: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
          
          // Enhanced social profiles
          discordUsername: true,
          portfolioUrl: true,
          
          // Existing social profiles
          twitterHandle: true,
          linkedinUrl: true,
          githubUsername: true,
          kaggleUsername: true,
          
          createdAt: true,
          updatedAt: true,
          approvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          enrollments: {
            include: {
              cohort: {
                select: {
                  id: true,
                  name: true,
                },
              },
              league: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          badges: {
            include: {
              badge: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: user,
        message: 'User details retrieved successfully',
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }

  /**
   * Get pending users specifically
   */
  static async getPendingUsers(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 10 } = req.query;
      
      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: {
            status: UserStatus.PENDING,
          },
          skip,
          take,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            
            // V2 Enhancement Fields
            institute: true,
            department: true,
            graduationYear: true,
            phoneNumber: true,
            studentId: true,
            olid: true,
            migratedToV2: true,
            emailVerified: true,
            
            // Current cohort association
            currentCohortId: true,
            currentCohort: {
              select: {
                id: true,
                name: true,
                isActive: true,
              },
            },
            
            // Enhanced social profiles
            discordUsername: true,
            portfolioUrl: true,
            
            // Existing social profiles
            twitterHandle: true,
            linkedinUrl: true,
            githubUsername: true,
            kaggleUsername: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.user.count({ 
          where: { status: UserStatus.PENDING } 
        }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit)),
          },
        },
        message: 'Pending users retrieved successfully',
      });
    } catch (error) {
      console.error('Get pending users error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
}
