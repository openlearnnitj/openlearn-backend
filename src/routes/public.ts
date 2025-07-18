import { Router } from 'express';
import { prisma } from '../config/database';

const router = Router();

/**
 * GET /api/public/cohorts-structure
 * 
 * Fetch all cohorts with their leagues and weeks
 * Public endpoint - no authentication required
 * 
 * Response format:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": "cohort-id",
 *       "name": "Cohort Name",
 *       "description": "Description",
 *       "isActive": true,
 *       "leagues": [
 *         {
 *           "id": "league-id",
 *           "name": "League Name",
 *           "description": "Description",
 *           "weeks": [
 *             {
 *               "id": "week-id",
 *               "name": "Week Name",
 *               "description": "Description",
 *               "order": 1
 *             }
 *           ]
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
router.get('/cohorts-structure', async (req, res) => {
  try {
    // Debug: Let's first check what we have in the database step by step
    const debugMode = req.query.debug === 'true';
    
    if (debugMode) {
      // Step 1: Check cohorts
      const cohorts = await prisma.cohort.findMany({
        where: { isActive: true }
      });
      
      // Step 2: Check specializations
      const specializations = await prisma.specialization.findMany({
        include: { cohort: true }
      });
      
      // Step 3: Check specialization-league relationships
      const specLeagues = await prisma.specializationLeague.findMany({
        include: {
          specialization: true,
          league: true
        }
      });
      
      // Step 4: Check leagues
      const leagues = await prisma.league.findMany();
      
      // Step 5: Check weeks
      const weeks = await prisma.week.findMany({
        include: { league: true }
      });
      
      return res.json({
        success: true,
        debug: {
          cohorts: cohorts.length,
          specializations: specializations.length,
          specializationLeagues: specLeagues.length,
          leagues: leagues.length,
          weeks: weeks.length,
          data: {
            cohorts,
            specializations,
            specializationLeagues: specLeagues,
            leagues,
            weeks
          }
        }
      });
    }

    // SIMPLIFIED APPROACH: Work with existing production data structure
    // Get cohorts and all leagues with their weeks (bypassing specializations)
    const [cohorts, leagues] = await Promise.all([
      prisma.cohort.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          isActive: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.league.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          weeks: {
            select: {
              id: true,
              name: true,
              description: true,
              order: true,
            },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { name: 'asc' },
      })
    ]);

    // For now, attach all leagues to each cohort
    // In the future, when specializations are properly set up, we can use the proper relationships
    const transformedCohorts = cohorts.map(cohort => ({
      id: cohort.id,
      name: cohort.name,
      description: cohort.description,
      isActive: cohort.isActive,
      leagues: leagues.map(league => ({
        id: league.id,
        name: league.name,
        description: league.description,
        weeks: league.weeks,
      })),
    }));

    const totalWeeks = leagues.reduce((sum, league) => sum + league.weeks.length, 0);

    res.json({
      success: true,
      data: transformedCohorts,
      message: 'Cohorts structure fetched successfully',
      meta: {
        timestamp: new Date().toISOString(),
        totalCohorts: transformedCohorts.length,
        totalLeagues: leagues.length,
        totalWeeks,
        note: 'Using simplified structure: all leagues attached to all cohorts (pending specialization setup)',
      },
    });

  } catch (error: any) {
    console.error('❌ Error fetching cohorts structure:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cohorts structure',
      message: 'Internal server error',
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  }
});

export default router;
