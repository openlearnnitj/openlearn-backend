import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { TokenPayload } from '../types';

interface TeamMember {
  name: string;
  email: string;
}

interface ProjectSubmissionData {
  teamNumber: number;
  teamName: string;
  teamLead: TeamMember;
  member2: TeamMember;
  member3?: TeamMember;
  member4?: TeamMember;
  projectTitle: string;
  projectDescription: string;
  demoYoutubeLink: string;
  githubUrl: string;
  deployedUrl?: string;
}

export class ProjectSubmissionController {
  /**
   * Submit a project submission
   * Validates that all team members are registered and verified users
   */
  static async submitProject(req: Request, res: Response): Promise<void> {
    try {
      const submissionData: ProjectSubmissionData = req.body;

      // Enhanced validation with type checking
      if (!submissionData || typeof submissionData !== 'object') {
        res.status(400).json({
          success: false,
          error: 'Invalid request body',
          details: 'Request body must be a valid JSON object'
        });
        return;
      }

      // Validate team number
      if (!submissionData.teamNumber || 
          typeof submissionData.teamNumber !== 'number' || 
          submissionData.teamNumber <= 0 || 
          !Number.isInteger(submissionData.teamNumber)) {
        res.status(400).json({
          success: false,
          error: 'Invalid team number',
          details: 'Team number must be a positive integer'
        });
        return;
      }

      // Validate required string fields
      const requiredStringFields = ['teamName', 'projectTitle', 'projectDescription', 'demoYoutubeLink', 'githubUrl'];
      for (const field of requiredStringFields) {
        if (!submissionData[field as keyof ProjectSubmissionData] || 
            typeof submissionData[field as keyof ProjectSubmissionData] !== 'string' ||
            (submissionData[field as keyof ProjectSubmissionData] as string).trim().length === 0) {
          res.status(400).json({
            success: false,
            error: `Invalid ${field}`,
            details: `${field} is required and must be a non-empty string`
          });
          return;
        }
      }

      // Validate team lead structure with enhanced checks
      if (!submissionData.teamLead || 
          typeof submissionData.teamLead !== 'object' ||
          !submissionData.teamLead.name || 
          !submissionData.teamLead.email ||
          typeof submissionData.teamLead.name !== 'string' ||
          typeof submissionData.teamLead.email !== 'string' ||
          submissionData.teamLead.name.trim().length === 0 ||
          submissionData.teamLead.email.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid team lead',
          details: 'Team lead must have valid name and email strings'
        });
        return;
      }

      // Validate member2 structure with enhanced checks
      if (!submissionData.member2 || 
          typeof submissionData.member2 !== 'object' ||
          !submissionData.member2.name || 
          !submissionData.member2.email ||
          typeof submissionData.member2.name !== 'string' ||
          typeof submissionData.member2.email !== 'string' ||
          submissionData.member2.name.trim().length === 0 ||
          submissionData.member2.email.trim().length === 0) {
        res.status(400).json({
          success: false,
          error: 'Invalid member 2',
          details: 'Member 2 must have valid name and email strings'
        });
        return;
      }

      // Email validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      // Validate team lead email
      if (!emailRegex.test(submissionData.teamLead.email.trim())) {
        res.status(400).json({
          success: false,
          error: 'Invalid team lead email',
          details: 'Team lead email must be a valid email address'
        });
        return;
      }

      // Validate member2 email
      if (!emailRegex.test(submissionData.member2.email.trim())) {
        res.status(400).json({
          success: false,
          error: 'Invalid member 2 email',
          details: 'Member 2 email must be a valid email address'
        });
        return;
      }

      // Collect all team member emails for validation
      const memberEmails: string[] = [
        submissionData.teamLead.email.trim().toLowerCase(),
        submissionData.member2.email.trim().toLowerCase()
      ];

      // Add optional members if provided with enhanced validation
      if (submissionData.member3) {
        if (!submissionData.member3.email || !submissionData.member3.name ||
            typeof submissionData.member3.email !== 'string' ||
            typeof submissionData.member3.name !== 'string' ||
            submissionData.member3.email.trim().length === 0 ||
            submissionData.member3.name.trim().length === 0) {
          res.status(400).json({
            success: false,
            error: 'Invalid member 3',
            details: 'Member 3 must have valid name and email strings if provided'
          });
          return;
        }
        
        if (!emailRegex.test(submissionData.member3.email.trim())) {
          res.status(400).json({
            success: false,
            error: 'Invalid member 3 email',
            details: 'Member 3 email must be a valid email address'
          });
          return;
        }
        
        memberEmails.push(submissionData.member3.email.trim().toLowerCase());
      }

      if (submissionData.member4) {
        if (!submissionData.member4.email || !submissionData.member4.name ||
            typeof submissionData.member4.email !== 'string' ||
            typeof submissionData.member4.name !== 'string' ||
            submissionData.member4.email.trim().length === 0 ||
            submissionData.member4.name.trim().length === 0) {
          res.status(400).json({
            success: false,
            error: 'Invalid member 4',
            details: 'Member 4 must have valid name and email strings if provided'
          });
          return;
        }
        
        if (!emailRegex.test(submissionData.member4.email.trim())) {
          res.status(400).json({
            success: false,
            error: 'Invalid member 4 email',
            details: 'Member 4 email must be a valid email address'
          });
          return;
        }
        
        memberEmails.push(submissionData.member4.email.trim().toLowerCase());
      }

      // Check for duplicate emails in the team
      const uniqueEmails = new Set(memberEmails);
      if (uniqueEmails.size !== memberEmails.length) {
        res.status(400).json({
          success: false,
          error: 'Duplicate email addresses found in team members'
        });
        return;
      }

      // Validate URLs
      try {
        new URL(submissionData.demoYoutubeLink.trim());
        new URL(submissionData.githubUrl.trim());
        if (submissionData.deployedUrl && submissionData.deployedUrl.trim()) {
          new URL(submissionData.deployedUrl.trim());
        }
      } catch (urlError) {
        res.status(400).json({
          success: false,
          error: 'Invalid URL format',
          details: 'All URLs must be valid URLs'
        });
        return;
      }

      // Check if all team members are registered and verified users
      let users;
      try {
        users = await prisma.user.findMany({
          where: {
            email: {
              in: memberEmails
            }
          },
          select: {
            email: true,
            name: true,
            emailVerified: true,
            status: true
          }
        });
      } catch (dbError) {
        console.error('Database error finding users:', dbError);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: 'Unable to validate team members. Please try again.',
          details: process.env.NODE_ENV === 'development' ? String(dbError) : undefined
        });
        return;
      }

      // Create a map of found users for easy lookup
      const userMap = new Map(users.map(user => [user.email.toLowerCase(), user]));

      // Check each team member with robust validation
      const invalidMembers: string[] = [];
      const unverifiedMembers: string[] = [];
      const inactiveMembers: string[] = [];

      for (const email of memberEmails) {
        const user = userMap.get(email);
        
        if (!user) {
          invalidMembers.push(email);
        } else {
          // Check email verification - be explicit about what we consider verified
          // emailVerified can be true, false, or null
          // We only reject if it's explicitly false
          if (user.emailVerified === false) {
            unverifiedMembers.push(email);
          }
          
          // Check user status - handle various status values safely
          // Accept ACTIVE, active, or null/undefined (assuming active)
          if (user.status && 
              typeof user.status === 'string' && 
              user.status.toUpperCase() !== 'ACTIVE') {
            inactiveMembers.push(email);
          }
        }
      }

      // Return detailed error messages
      if (invalidMembers.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Some team members are not registered on the platform',
          details: {
            unregisteredEmails: invalidMembers,
            message: 'These email addresses are not registered. Please ensure all team members have accounts on the platform.'
          }
        });
        return;
      }

      if (unverifiedMembers.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Some team members have unverified email addresses',
          details: {
            unverifiedEmails: unverifiedMembers,
            message: 'These team members need to verify their email addresses before submitting.'
          }
        });
        return;
      }

      if (inactiveMembers.length > 0) {
        res.status(400).json({
          success: false,
          error: 'Some team members have inactive accounts',
          details: {
            inactiveEmails: inactiveMembers,
            message: 'These team members have inactive accounts. Please contact support.'
          }
        });
        return;
      }

      // Check if team number already exists
      let existingSubmission;
      try {
        existingSubmission = await prisma.projectSubmission.findFirst({
          where: {
            teamNumber: submissionData.teamNumber
          }
        });
      } catch (dbError) {
        console.error('Database error checking existing submission:', dbError);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: 'Unable to validate team number. The project submissions table might not exist.',
          details: process.env.NODE_ENV === 'development' ? dbError : undefined
        });
        return;
      }

      if (existingSubmission) {
        res.status(400).json({
          success: false,
          error: 'Team number already exists',
          details: 'This team number has already been used. Please choose a different team number.'
        });
        return;
      }

      // Create the submission with additional error handling and input sanitization
      let submission;
      try {
        // Sanitize input data
        const sanitizedData = {
          teamNumber: submissionData.teamNumber,
          teamName: submissionData.teamName.trim().substring(0, 100), // Limit to DB varchar length
          teamLeadName: submissionData.teamLead.name.trim().substring(0, 100),
          teamLeadEmail: submissionData.teamLead.email.trim().toLowerCase().substring(0, 150),
          member2Name: submissionData.member2.name.trim().substring(0, 100),
          member2Email: submissionData.member2.email.trim().toLowerCase().substring(0, 150),
          member3Name: submissionData.member3?.name ? 
            submissionData.member3.name.trim().substring(0, 100) : null,
          member3Email: submissionData.member3?.email ? 
            submissionData.member3.email.trim().toLowerCase().substring(0, 150) : null,
          member4Name: submissionData.member4?.name ? 
            submissionData.member4.name.trim().substring(0, 100) : null,
          member4Email: submissionData.member4?.email ? 
            submissionData.member4.email.trim().toLowerCase().substring(0, 150) : null,
          projectTitle: submissionData.projectTitle.trim().substring(0, 200),
          projectDescription: submissionData.projectDescription.trim(),
          demoYoutubeLink: submissionData.demoYoutubeLink.trim(),
          githubUrl: submissionData.githubUrl.trim(),
          deployedUrl: submissionData.deployedUrl ? 
            submissionData.deployedUrl.trim() : null
        };

        submission = await prisma.projectSubmission.create({
          data: sanitizedData
        });
      } catch (createError) {
        console.error('Database error creating submission:', createError);
        
        // Handle specific database errors
        const errorMessage = String(createError);
        
        if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate')) {
          res.status(400).json({
            success: false,
            error: 'Duplicate submission',
            message: 'A submission with this team number already exists.'
          });
        } else if (errorMessage.includes('relation') || errorMessage.includes('table')) {
          res.status(500).json({
            success: false,
            error: 'Database configuration error',
            message: 'The project submissions table is not properly configured. Please contact support.'
          });
        } else {
          res.status(500).json({
            success: false,
            error: 'Database error',
            message: 'Unable to save project submission. Please try again.',
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
          });
        }
        return;
      }

      res.status(201).json({
        success: true,
        data: {
          submissionId: submission.submissionId,
          teamNumber: submission.teamNumber,
          teamName: submission.teamName,
          submittedAt: submission.submittedAt
        },
        message: 'Project submitted successfully!'
      });

    } catch (error) {
      // Log the full error for debugging
      console.error('Project submission error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        requestBody: req.body
      });
      
      // Don't expose internal error details in production
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your submission. Please try again.',
        timestamp: new Date().toISOString(),
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : String(error)) : undefined
      });
    }
  }

  /**
   * Get all project submissions (Admin only - GRAND_PATHFINDER)
   */
  static async getSubmissions(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as TokenPayload;

      // Enhanced role validation
      if (!currentUser || !currentUser.role || currentUser.role !== 'GRAND_PATHFINDER') {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Only Grand Pathfinders can view project submissions'
        });
        return;
      }

      // Enhanced pagination validation
      let page = 1;
      let limit = 20;
      
      if (req.query.page) {
        const parsedPage = parseInt(String(req.query.page), 10);
        if (isNaN(parsedPage) || parsedPage < 1) {
          res.status(400).json({
            success: false,
            error: 'Invalid page number',
            message: 'Page must be a positive integer'
          });
          return;
        }
        page = parsedPage;
      }
      
      if (req.query.limit) {
        const parsedLimit = parseInt(String(req.query.limit), 10);
        if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
          res.status(400).json({
            success: false,
            error: 'Invalid limit',
            message: 'Limit must be between 1 and 100'
          });
          return;
        }
        limit = parsedLimit;
      }

      const skip = (page - 1) * limit;

      let submissions, total;
      try {
        [submissions, total] = await Promise.all([
          prisma.projectSubmission.findMany({
            skip,
            take: limit,
            orderBy: {
              submittedAt: 'desc'
            }
          }),
          prisma.projectSubmission.count()
        ]);
      } catch (dbError) {
        console.error('Database error fetching submissions:', dbError);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: 'Unable to fetch submissions. The project submissions table might not exist.'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          submissions,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit)
          }
        },
        message: 'Project submissions retrieved successfully'
      });

    } catch (error) {
      console.error('Get submissions error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching submissions'
      });
    }
  }

  /**
   * Get submission statistics (Admin only)
   */
  static async getSubmissionStats(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as TokenPayload;

      if (!currentUser || !currentUser.role || currentUser.role !== 'GRAND_PATHFINDER') {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Only Grand Pathfinders can view submission statistics'
        });
        return;
      }

      let totalSubmissions, todaySubmissions;
      try {
        [totalSubmissions, todaySubmissions] = await Promise.all([
          prisma.projectSubmission.count(),
          prisma.projectSubmission.count({
            where: {
              submittedAt: {
                gte: new Date(new Date().setHours(0, 0, 0, 0))
              }
            }
          })
        ]);
      } catch (dbError) {
        console.error('Database error fetching stats:', dbError);
        res.status(500).json({
          success: false,
          error: 'Database error',
          message: 'Unable to fetch statistics. The project submissions table might not exist.'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          totalSubmissions,
          todaySubmissions,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Get submission stats error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching statistics'
      });
    }
  }

  /**
   * Health check for project submission system
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      // Test if project submissions table exists
      const count = await prisma.projectSubmission.count();
      
      res.status(200).json({
        success: true,
        data: {
          tableExists: true,
          totalSubmissions: count,
          timestamp: new Date().toISOString()
        },
        message: 'Project submission system is operational'
      });

    } catch (error) {
      console.error('Project submission health check error:', error);
      res.status(500).json({
        success: false,
        error: 'Project submission system not available',
        message: 'The project submissions table does not exist or is not accessible',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      });
    }
  }
}
