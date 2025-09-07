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

      // Basic validation
      if (!submissionData.teamNumber || !submissionData.teamName || 
          !submissionData.teamLead || !submissionData.member2 ||
          !submissionData.projectTitle || !submissionData.projectDescription ||
          !submissionData.demoYoutubeLink || !submissionData.githubUrl) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields',
          details: 'teamNumber, teamName, teamLead, member2, projectTitle, projectDescription, demoYoutubeLink, and githubUrl are required'
        });
        return;
      }

      // Validate team lead structure
      if (!submissionData.teamLead.name || !submissionData.teamLead.email) {
        res.status(400).json({
          success: false,
          error: 'Team lead must have name and email'
        });
        return;
      }

      // Validate member2 structure
      if (!submissionData.member2.name || !submissionData.member2.email) {
        res.status(400).json({
          success: false,
          error: 'Member 2 must have name and email'
        });
        return;
      }

      // Collect all team member emails for validation
      const memberEmails: string[] = [
        submissionData.teamLead.email.toLowerCase(),
        submissionData.member2.email.toLowerCase()
      ];

      // Add optional members if provided
      if (submissionData.member3?.email) {
        if (!submissionData.member3.name) {
          res.status(400).json({
            success: false,
            error: 'Member 3 email provided but name is missing'
          });
          return;
        }
        memberEmails.push(submissionData.member3.email.toLowerCase());
      }

      if (submissionData.member4?.email) {
        if (!submissionData.member4.name) {
          res.status(400).json({
            success: false,
            error: 'Member 4 email provided but name is missing'
          });
          return;
        }
        memberEmails.push(submissionData.member4.email.toLowerCase());
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

      // Check if all team members are registered and verified users
      const users = await prisma.user.findMany({
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

      // Create a map of found users for easy lookup
      const userMap = new Map(users.map(user => [user.email.toLowerCase(), user]));

      // Check each team member
      const invalidMembers: string[] = [];
      const unverifiedMembers: string[] = [];
      const inactiveMembers: string[] = [];

      for (const email of memberEmails) {
        const user = userMap.get(email);
        
        if (!user) {
          invalidMembers.push(email);
        } else {
          if (!user.emailVerified) {
            unverifiedMembers.push(email);
          }
          if (user.status !== 'ACTIVE') {
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
      const existingSubmission = await prisma.projectSubmission.findFirst({
        where: {
          teamNumber: submissionData.teamNumber
        }
      });

      if (existingSubmission) {
        res.status(400).json({
          success: false,
          error: 'Team number already exists',
          details: 'This team number has already been used. Please choose a different team number.'
        });
        return;
      }

      // Create the submission
      const submission = await prisma.projectSubmission.create({
        data: {
          teamNumber: submissionData.teamNumber,
          teamName: submissionData.teamName,
          teamLeadName: submissionData.teamLead.name,
          teamLeadEmail: submissionData.teamLead.email.toLowerCase(),
          member2Name: submissionData.member2.name,
          member2Email: submissionData.member2.email.toLowerCase(),
          member3Name: submissionData.member3?.name || null,
          member3Email: submissionData.member3?.email?.toLowerCase() || null,
          member4Name: submissionData.member4?.name || null,
          member4Email: submissionData.member4?.email?.toLowerCase() || null,
          projectTitle: submissionData.projectTitle,
          projectDescription: submissionData.projectDescription,
          demoYoutubeLink: submissionData.demoYoutubeLink,
          githubUrl: submissionData.githubUrl,
          deployedUrl: submissionData.deployedUrl || null
        }
      });

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
      console.error('Project submission error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to submit project. Please try again.'
      });
    }
  }

  /**
   * Get all project submissions (Admin only - GRAND_PATHFINDER)
   */
  static async getSubmissions(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as TokenPayload;

      // Check if user is GRAND_PATHFINDER
      if (currentUser.role !== 'GRAND_PATHFINDER') {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'Only Grand Pathfinders can view project submissions'
        });
        return;
      }

      const { page = 1, limit = 20 } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const [submissions, total] = await Promise.all([
        prisma.projectSubmission.findMany({
          skip,
          take,
          orderBy: {
            submittedAt: 'desc'
          }
        }),
        prisma.projectSubmission.count()
      ]);

      res.status(200).json({
        success: true,
        data: {
          submissions,
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / Number(limit))
          }
        },
        message: 'Project submissions retrieved successfully'
      });

    } catch (error) {
      console.error('Get submissions error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to retrieve submissions'
      });
    }
  }

  /**
   * Get submission statistics (Admin only)
   */
  static async getSubmissionStats(req: Request, res: Response): Promise<void> {
    try {
      const currentUser = req.user as TokenPayload;

      if (currentUser.role !== 'GRAND_PATHFINDER') {
        res.status(403).json({
          success: false,
          error: 'Access denied'
        });
        return;
      }

      const [totalSubmissions, todaySubmissions] = await Promise.all([
        prisma.projectSubmission.count(),
        prisma.projectSubmission.count({
          where: {
            submittedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        })
      ]);

      res.status(200).json({
        success: true,
        data: {
          totalSubmissions,
          todaySubmissions,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Get submission stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}
